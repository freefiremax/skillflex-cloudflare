import { env } from '../../lib/env.js'

/**
 * The AI Support engine.
 *
 * Two implementations behind one interface. Which one runs is decided once, at
 * module load, by whether a key is configured — so /ai-support is never a dead
 * page: with no key it answers from a hand-written table, with a key it answers
 * conversationally.
 *
 * `reply()` takes the whole thread rather than one message because a support
 * conversation is stateful in a way a drill is not ("still not working" only
 * means something after the previous turn).
 */
export interface SupportEngine {
  /** Reported by GET /api/support/history so the UI can label the answers. */
  readonly name: 'groq' | 'built-in'
  reply(history: SupportTurn[]): Promise<string>
}

export interface SupportTurn {
  sender: 'user' | 'bot'
  body: string
}

/**
 * What the model is allowed to know.
 *
 * This is the entire context besides the conversation itself. Note what is NOT
 * here and cannot be added without changing this file: any student's
 * submissions, rubric scores, feedback, level, or drill history. The support bot
 * is blind to all of it, which is why it can never be turned into an assessment
 * of anyone — the same structural argument as PronunciationAttempt having no
 * score column, applied to a prompt instead of a table.
 */
const APP_FACTS = `
SkillFlex is a soft-skills mentorship app for Indian college students. Screens:

- Home — links only. Every section has its own page.
- Lessons (/lessons, /lessons/:id) — short videos. A language dropdown in the top
  bar switches the lesson language (English, Hindi and others).
- This week (/assignments) — the tasks to record. "Record my answer" opens the
  camera; recordings are capped at a per-assignment length.
- Feedback (/feedback) — written by a real mentor who watched the video. Includes
  rubric scores, what worked, and one next step.
- Plan (/plan) — a weekly plan assembled only from what mentors already wrote.
- Mentor (/mentor, /mentor/browse) — the assigned mentor; students can switch, and
  keep all past feedback when they do.
- Live (/live, /live/:id) — live lectures and recordings.
- Pet (/pet) — two doors: Fun Time and AI Support.
- Fun Time (/fun-time) — four games: Spell Check, Sentence Quiz, Pronunciation
  Check (needs a microphone), Soft-skills Quiz.
- Progress (/progress) and Leaderboard (/leaderboard) — effort, not quality.
- Account (/account) — profile, consent and data export.

Facts that matter for support:
- No AI scores anyone. Feedback is written by a person. If a student asks how good
  they are, the honest answer is that only their mentor can tell them, and it will
  be on the Feedback page.
- Feedback appears only after a mentor reviews a recording. It is not instant.
- Pronunciation Check and recording need microphone/camera permission and a
  browser that supports speech recognition — Chrome, Edge, Safari or Samsung
  Internet. Firefox has no speech recognition.
- Recordings upload after the camera stops; on a slow connection this takes a
  while. Nothing is lost if the page is left open.
- A college never sees a student's video or their drill data.
`.trim()

const SYSTEM_PROMPT = `
You are the in-app support assistant for SkillFlex. You help with the APP, not
with English.

In scope: bugs, blank or broken screens, error messages, navigation ("where do I
find X"), sign-in and account trouble, microphone and camera permissions, uploads
that fail, missing feedback, switching mentors, joining live classes.

Out of scope: teaching English, grammar or pronunciation lessons, practice
exercises, and any judgement of how good the user is. If asked for those, say in
one line that you are the app-problems assistant, then point them at the page
that does it — Fun Time for practice, Feedback for how they are doing.

How to answer:
- Two to four sentences. Plain English, short words, no jargon.
- Give the concrete next tap: name the page and the button.
- Ask one diagnostic question when you genuinely cannot tell what broke.
- If you do not know, say so and tell them to describe what they saw — a human
  reads these conversations. Never invent a SkillFlex feature, screen, setting or
  button that is not listed below.
- Never comment on the user's ability, progress or work. You cannot see any of it.
- No markdown headings, no bullet lists, no emoji. Just talk.

${APP_FACTS}
`.trim()

/** Keep the request small and the last turn intact. */
const MAX_TURNS = 12
const TIMEOUT_MS = 20_000

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null } | null } | null>
  error?: { message?: string } | null
}

/**
 * Groq, or anything else that speaks OpenAI's /chat/completions.
 *
 * Deliberately `fetch` and not an SDK. The API surface used here is one POST with
 * a JSON body, and this module gets bundled by esbuild into a single Vercel
 * function where every added dependency is cold-start latency. It also means
 * SUPPORT_LLM_BASE_URL can point at OpenRouter or Together with no code change.
 */
function createGroqEngine(apiKey: string): SupportEngine {
  return {
    name: 'groq',
    async reply(history) {
      const turns = history.slice(-MAX_TURNS).map((t) => ({
        role: t.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: t.body,
      }))

      const res = await fetch(`${env.SUPPORT_LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.SUPPORT_LLM_MODEL,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...turns],
          temperature: 0.3,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      const raw = await res.text()
      let data: ChatCompletion | undefined
      try {
        data = JSON.parse(raw) as ChatCompletion
      } catch {
        data = undefined
      }

      if (!res.ok) {
        // The upstream message names the real problem (bad key, retired model
        // id, rate limit) and it is worth surfacing rather than flattening — but
        // it is an untrusted string, so it is truncated and never given the
        // user's own words back.
        const detail = data?.error?.message ?? raw.slice(0, 200)
        throw new Error(`Support model returned ${res.status}: ${detail}`)
      }

      const text = data?.choices?.[0]?.message?.content?.trim()
      if (!text) throw new Error('Support model returned an empty reply')
      return text
    },
  }
}

/**
 * The no-key path.
 *
 * A keyword table, not a model. It exists so that /ai-support is a working page
 * on a fresh clone and so the UI can be tested without a network call — and
 * because for the five things that actually break, a canned answer written by
 * someone who knows the app beats a generated one.
 *
 * Ordered: the first rule with any matching keyword wins, so the specific rules
 * go above the general ones.
 */
const RULES: Array<{ any: string[]; reply: string }> = [
  {
    // First on purpose. "How good is my English, based on my recordings" also
    // contains "recording", and the upload rule below would happily answer it
    // with camera advice — turning the one question this bot must decline into a
    // question it appears to have missed. Scope beats topic.
    any: ['how good', 'my level', 'score me', 'rate me', 'am i improving', 'how am i doing', 'grade'],
    reply:
      'I cannot tell you that, and not because I am being coy: I never see your recordings or your feedback. Nothing in this app scores you automatically. Your mentor writes what is working and one next step, and it is all on the Feedback page. Progress shows your effort — words practised, work sent — which is a different thing.',
  },
  {
    any: ['mic', 'microphone', 'permission', 'allow', 'blocked'],
    reply:
      'Recording and Pronunciation Check both need microphone permission. Tap the padlock (or ⓘ) next to the address bar, set Microphone to Allow, then reload the page. If there is no microphone option at all, you are probably on Firefox — speech recognition needs Chrome, Edge, Safari or Samsung Internet.',
  },
  {
    any: ['camera', 'record', 'recording', 'video won', 'upload', 'stuck'],
    reply:
      'Open the assignment from This week and tap Record my answer — the camera asks for permission the first time. If the upload stalls, keep the page open: it finishes in the background and only fails if you close the tab. If the camera never appears, check the padlock next to the address bar and set Camera to Allow.',
  },
  {
    any: ['feedback', 'reviewed', 'no reply', 'nothing yet'],
    reply:
      'Feedback is written by a real person after they watch your recording, so it is not instant. It shows up on the Feedback page, and the lesson and assignment pages both link straight to it once it lands. If it has been several days, tell me which assignment and a human will pick this up.',
  },
  {
    any: ['sign in', 'signin', 'login', 'log in', 'password', 'account', 'locked'],
    reply:
      'Sign-in trouble is usually one of two things: the email is slightly different from the one you registered with, or the app still has an old session. Tap Exit in the top right, then sign in again. If it still refuses, tell me the exact message on screen and a human will check the account.',
  },
  {
    any: ['mentor', 'switch', 'change mentor'],
    reply:
      'Your mentor is on the Mentor page, and Browse mentors there lets you switch. Switching never costs you anything you have already been given — all your past feedback stays on the Feedback page under the mentor who wrote it.',
  },
  {
    any: ['live', 'class', 'lecture', 'join'],
    reply:
      'Live lectures are on the Live page — the one starting soonest is at the top, and the Join button appears once it is live. Recordings of past classes are on the same page. If Join does nothing, reload once; the page checks the class status when it loads.',
  },
  {
    any: ['blank', 'broke', 'error', 'something went wrong', 'not loading', "won't load", 'crash'],
    reply:
      'Reload the page first — most of these are a request that timed out. If the same screen breaks every time, tell me which page and what it said, and a human will see it in this thread. If several pages are broken at once it is the server, not you, and it is already visible on our side.',
  },
  {
    any: ['game', 'fun time', 'spell', 'quiz', 'practice', 'practise', 'pronunciation'],
    reply:
      'The games are in Fun Time, reached from the Pet page: Spell Check, Sentence Quiz, Pronunciation Check and a soft-skills quiz. Pronunciation Check is the only one that needs a microphone. None of them are scored on you — they count what you got right against a fixed answer key, nothing more.',
  },
  {
    any: ['delete', 'data', 'privacy', 'export', 'consent'],
    reply:
      'Everything about your data is on the Account page — what you have agreed to, an export of your own records, and deletion. Your college never sees your videos or your practice data, only that you have been active.',
  },
]

const FALLBACK_REPLY =
  'I help with the app itself — things that will not load, permissions, logins, missing feedback, finding a page. Tell me what you were doing and what you saw on screen, and I will point you at the fix. A human reads these conversations too, so nothing here is lost.'

function createBuiltInEngine(): SupportEngine {
  return {
    name: 'built-in',
    async reply(history) {
      const last = [...history].reverse().find((t) => t.sender === 'user')
      const text = last?.body.toLowerCase() ?? ''
      const hit = RULES.find((r) => r.any.some((k) => text.includes(k)))
      return hit?.reply ?? FALLBACK_REPLY
    },
  }
}

/**
 * Chosen once. A key that appears later needs a restart, which on Vercel is what
 * setting the variable does anyway.
 */
let engineInstance: SupportEngine | undefined

function getEngine(): SupportEngine {
  if (!engineInstance) {
    engineInstance = env.SUPPORT_LLM_API_KEY
      ? createGroqEngine(env.SUPPORT_LLM_API_KEY)
      : createBuiltInEngine()
  }
  return engineInstance
}

export const supportEngine: SupportEngine = {
  chat(history, systemPrompt) {
    return getEngine().chat(history, systemPrompt)
  },
}
