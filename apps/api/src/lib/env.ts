import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

/**
 * One .env at the repo root, shared by api + web + prisma. `dotenv/config` reads
 * from process.cwd(), which would be apps/api here — so find the root ourselves.
 *
 * Walk up looking for the file rather than counting directories: this module is
 * loaded from src/lib/ under tsx and from dist/ once esbuild has bundled it for
 * Vercel, and those are different depths. A hardcoded ../../../../ silently
 * resolves to the wrong directory in one of the two, and dotenv does not
 * complain about a path that isn't there.
 */
function findEnvFile(): string | undefined {
  try {
    if (typeof import.meta.url !== 'string' || !import.meta.url) return undefined
    let dir = path.dirname(fileURLToPath(import.meta.url))
    for (let i = 0; i < 8; i += 1) {
      const candidate = path.join(dir, '.env')
      if (existsSync(candidate)) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  } catch {
    return undefined
  }
  return undefined
}

// On Vercel or Cloudflare the platform injects env vars directly and there is no .env to find.
if (!process.env.VERCEL && !process.env.CLOUDFLARE && !process.env.CF_PAGES && !process.env.WORKER) {
  try {
    const envFile = findEnvFile()
    if (envFile) dotenv.config({ path: envFile })
  } catch {
    // Ignore in serverless/workers environments without filesystem access
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  MEDIA_PROVIDER: z.enum(['local', 'supabase', 'bunny', 'cloudflare']).default('local'),
  STORAGE_DIR: z.string().default('../../storage'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Supabase Storage — required only when MEDIA_PROVIDER=supabase, enforced below.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('submissions'),

  /** Shared secret for the retention cron. Vercel Cron sends it as a Bearer token. */
  CRON_SECRET: z.string().min(16).optional(),

  // --- AI Support chatbot -------------------------------------------------
  // Any OpenAI-compatible chat-completions endpoint. Groq by default because it
  // has a free tier; swapping to OpenRouter or Together is a URL change, not a
  // code change. With no key set the support bot falls back to a deterministic
  // responder, so /ai-support works out of the box.
  SUPPORT_LLM_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  SUPPORT_LLM_API_KEY: z.string().min(1).optional(),
  // Not an enum: hosted model IDs get retired on their own schedule, and a stale
  // one should surface as the chat saying it is unavailable, never as a boot
  // failure that takes the rest of the API with it.
  SUPPORT_LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
})

/**
 * NODE_ENV is the one variable here that is not worth dying over.
 *
 * It drives log formatting and nothing else — unlike DATABASE_URL or
 * JWT_SECRET, where continuing with a wrong value would be worse than not
 * booting. A typo in a hosting dashboard field taking down every route is a bad
 * trade, so normalise instead of rejecting, and say so in the log.
 */
function normaliseNodeEnv(raw: string | undefined): 'development' | 'test' | 'production' {
  if (raw === 'development' || raw === 'test' || raw === 'production') return raw
  // Being deployed is the strongest signal available about which way to guess.
  const isCloud = process.env.VERCEL || process.env.CLOUDFLARE || process.env.CF_PAGES || process.env.WORKER
  const fallback = isCloud ? 'production' : 'development'
  if (raw !== undefined) {
    console.warn(`[env] NODE_ENV="${raw}" is not a known value — treating it as "${fallback}".`)
  }
  return fallback
}

/**
 * Treat obvious paste artefacts as "not set" rather than as real values.
 *
 * Hosting dashboards make two mistakes easy: pasting a variable's own name into
 * its value field, and pasting a REPLACE_WITH_* placeholder straight out of a
 * template. Both satisfy `z.string().min(1)` and then fail much later, somewhere
 * with no obvious connection to the real cause. This deploy hit exactly that:
 * Vercel held SUPABASE_STORAGE_BUCKET="SUPABASE_STORAGE_BUCKET", so the API went
 * looking for a bucket named after the variable and only complained at upload
 * time, three layers away from the field that was wrong.
 *
 * Dropping the value lets a zod default apply where there is one, and turns a
 * required-but-placeholder var into a boot failure that names the variable.
 *
 * Only keys this schema knows about are inspected — process.env is full of
 * unrelated OS entries and some of them legitimately echo their own name.
 */
function scrubPlaceholders(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...source }
  for (const key of Object.keys(envSchema.shape)) {
    const raw = out[key]
    if (raw === undefined) continue
    const value = raw.trim()

    // Present-but-blank is the same mistake as a placeholder and harder to spot.
    // `.optional()` does not apply to "" — the key exists, so zod validates it and
    // rejects, which takes down every route over a variable the schema calls
    // optional. `.env.example` ships SUPABASE_URL=, CRON_SECRET= and the support
    // LLM keys blank on purpose, so this is the common case, not the edge case.
    // No warning: three blank lines in a template are not a misconfiguration.
    if (!value) {
      delete out[key]
      continue
    }

    const isPlaceholder =
      value === key ||
      value === `<${key}>` ||
      value === `\${${key}}` ||
      /^replace[-_ ]?with/i.test(value) ||
      /^(your|my|the)[-_ ]?(value|key|secret|url|password)[-_ ]?here$/i.test(value)
    if (isPlaceholder) {
      console.warn(`[env] ${key} is set to the placeholder "${value}" — treating it as unset.`)
      delete out[key]
    }
  }
  return out
}

let cachedEnv: z.infer<typeof envSchema> | undefined

export function loadEnv(extra?: Record<string, unknown>): z.infer<typeof envSchema> {
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (typeof value === 'string' && value.length > 0) {
        process.env[key] = value
      }
    }
  }

  const parsed = envSchema
    .superRefine((value, ctx) => {
      // Fail at boot rather than on the first upload, which is where a missing
      // key would otherwise surface — long after the deploy looked healthy.
      if (value.MEDIA_PROVIDER !== 'supabase') return
      for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when MEDIA_PROVIDER=supabase`,
          })
        }
      }
    })
    .safeParse(scrubPlaceholders({ ...process.env, NODE_ENV: normaliseNodeEnv(process.env.NODE_ENV) }))

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `   - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    // Throw, don't process.exit(1): on Vercel/Cloudflare the exit code is swallowed
    throw new Error(
      `Invalid environment configuration:\n${detail}\n\nCopy .env.example to .env and fill it in.`,
    )
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export const env: z.infer<typeof envSchema> = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    if (!cachedEnv) {
      loadEnv()
    }
    return (cachedEnv as any)[prop]
  },
})

export const isProd = Boolean(process.env.NODE_ENV === 'production')

/** True inside a Vercel or Cloudflare serverless function: read-only FS, no long-lived timers. */
export const isServerless = Boolean(
  process.env.VERCEL || process.env.CLOUDFLARE || process.env.CF_PAGES || process.env.WORKER,
)
