# SkillFlex: Complete Project Overview

## Summary

SkillFlex is a mobile-first, B2B2C soft-skills mentorship platform for Indian college students. Colleges purchase seats; students use the product without paying directly. It helps students improve placement-ready skills such as self-introduction, group discussion, presentations, interviews, professional communication, teamwork, and conflict handling.

The platform is built around a simple promise:

> Students are assessed by people, not by AI.

A student watches learning content, records a practical response, and receives structured written feedback from a human mentor. The app can turn that human feedback into a small, traceable weekly practice plan, but it does not invent scores, grades, or quality judgements.

## Verification note

This guide was cross-checked against the current repository, including the Prisma schema, Fastify routes, React feature screens, shared rules, deployment configuration, and change record. It also incorporates the supplied historical master brief where that material describes the product’s business rationale.

The distinction matters:

- **Implemented** means the capability is represented in the current codebase.
- **Planned** means it is modelled, described, or intended but does not yet have the complete user-facing flow.
- **Business assumptions** are commercial or market statements from the master brief, not facts established by the source code.

The configured Git remote is https://github.com/freefiremax/skillflex-cloudflare.git. The current main branch was fetched and compared with this working branch while preparing this guide. Its later merge commits restore the current UI tree, so they introduce no documentation-relevant source difference.

The current prototype deployment is [skillflex-avcoe.vercel.app](https://skillflex-avcoe.vercel.app). Its public sign-in screen was successfully reached on 13 September 2026; this confirms availability of the landing/authentication screen, not end-to-end operation against a production database.

## What changed since the master brief

The earlier brief accurately describes the core mentoring proposition, but the current repository has expanded beyond that original watch, record, review, and plan loop.

| Area | Earlier brief | Current codebase |
| --- | --- | --- |
| Teaching languages | Hindi and English | English, Hindi, and Marathi are supported lesson and mentor-matching languages. |
| Live learning | Optional 1:1 sessions proposed | One-to-many live lectures, registration, attendance, recordings, and resume progress are implemented. 1:1 remains model-only. |
| Student engagement | Assignment loop | The product also includes an effort-only progress view, college-scoped effort leaderboard, pronunciation practice, three objective games, and language phrasebooks. |
| Support | Not described | An app-scoped AI Support assistant with deterministic fallback is implemented. |
| Privacy surface | Risks and planned DPDP work | Versioned consent, revocation-triggered deletion scheduling, retention cleanup, guardian-consent fields, and data export are implemented; important compliance gaps remain. |
| Media hardening | Signed direct uploads to private storage | The same production pattern is implemented through a media-provider abstraction; local disk upload remains available only for development. |
| College reporting | Dashboard proposition | Aggregate cohort metrics include submissions, review rate, skill averages, mentor-switch reasons, lecture registrations/attendance, and recording engagement. |

## Positioning and commercial model

**Switch mentors, not subscriptions.** SkillFlex is sold to colleges as a per-student annual licence; students are the end users and are not charged directly. The buyer is typically the placement, training, or T&P function, while the product is aimed at students in placement-facing years.

The commercial case is that a college already spends on employability and soft-skills delivery but needs stronger evidence of participation and outcomes. SkillFlex combines practice and human review with organisation-level aggregate reporting, while deliberately withholding student recordings and drill data from the college.

The following items from the master brief are **business hypotheses or proposed commercial terms**, rather than features implemented by the application:

| Topic | Historical brief position | Implementation status |
| --- | --- | --- |
| Licence price | ₹1,500–₹4,000 per student per year | No payments, invoicing, or billing workflow is implemented. |
| Mentor cost | Approximately ₹530 per student per year, based on a review-time model | A planning assumption; the repository does not measure verified mentor cost. |
| Gross margin | Approximately 65% at the stated price floor | A pre-pilot model, not an application metric. |
| 1:1 sessions | Optional paid mentor sessions | Models exist, but there are no routes or UI flows for 1:1 session booking. |
| Accreditation value | NAAC/NBA-oriented placement-outcome dashboard | Aggregate organisation reporting is implemented; any accreditation claim must be validated with pilot evidence and applicable requirements. |

## The problem

Students often have access to course content but not to repeated, personal coaching. A lesson alone does not show whether a student can introduce themselves, answer an interview question, or present clearly. Generic automated scoring can be opaque and unreliable, especially for multilingual learners. Fixed mentor assignments also leave students stuck when the mentor’s language, teaching style, availability, or skill focus does not fit.

SkillFlex addresses all three gaps:

1. It converts lesson viewing into recorded practice.
2. It keeps quality assessment with a human mentor.
3. It lets students change mentor while preserving their full learning history.

## The key product loop

~~~text
Watch a lesson in a suitable language
                ↓
Open the weekly assignment
                ↓
Record a timed answer in the browser
                ↓
Upload the private recording
                ↓
A human mentor watches and reviews it
                ↓
Receive rubric scores, written feedback, and a next step
                ↓
Follow a short plan derived from that feedback
                ↓
Practise and submit again
~~~

This loop works because it changes passive consumption into a concrete action, creates an accountable feedback moment, and gives the student a manageable next task rather than a vague instruction to improve.

## Users and their roles

| User | Primary purpose | What they can access |
| --- | --- | --- |
| Student | Learn, practise, submit, get coached, and track effort. | Their own lessons, submissions, feedback, plans, mentor history, live lectures, account data, consent, and export. |
| Mentor | Review work and run live lectures. | Assigned student review queue, feedback forms, mentor profile, and live-class management. |
| College admin | Manage a college’s use of the platform. | Student/cohort aggregates and subscription information, never student recordings. |
| Platform admin | Provision platform entities. | Platform-level administrative actions through the API. |

Mentors are deliberately not members of one college. The mentor pool is cross-institutional so changing mentors provides a real alternative rather than merely another person from the same training cell.

## Major product features

### Multilingual learning

Curriculum follows this hierarchy:

~~~text
Track → Module → Lesson → LessonAsset
                         └→ Assignment
~~~

A LessonAsset stores a separate lesson video for each supported teaching language: English, Hindi, and Marathi. This is not a subtitle-only feature. The product can therefore offer lessons that are genuinely recorded for the learner’s language context.

Language resolution falls back from the requested language to Hindi and then English when a particular recording is unavailable. The UI indicates which languages truly have material.

### Browser-recorded assignments

Assignments have a brief, a structured rubric, and a maximum recording duration. Students record a response with their browser camera and microphone. This is built as a PWA experience, so a student with a shared phone or a modest connection does not first need to install a native app.

A submission follows this lifecycle:

~~~text
draft → uploading → submitted → in_review → reviewed
~~~

A submission moves to in_review when the mentor opens it. This tells the student that a person is actively reviewing their work instead of leaving the wait unexplained.

### Human mentor feedback

Feedback is one record per submission. A mentor writes:

- Rubric scores
- Freeform feedback
- Strengths
- One recommended next step

The API validates every submitted score against the assignment rubric, including the allowed criterion keys and maximum values. Feedback is linked to the Submission rather than the temporary mentor assignment, so it persists after a student switches mentors.

### Weekly plan, derived from feedback

The current plan generator is deterministic and identified as rule-based-v1. It is not an LLM assessment.

It works as follows:

1. Load up to five recent mentor feedback records.
2. Return no weekly plan if there is no human feedback.
3. Add each mentor’s explicit next step.
4. Add practice tasks for up to two rubric criteria below 70%.
5. Remove duplicates and cap the result at five items.
6. Store the source feedback ID on every plan item.

Each plan item explains which mentor and assignment produced it. This makes the plan useful to students and prevents it from becoming an untraceable AI judgement.

### Mentor matching and switching

New students are matched by:

1. Overlap between the student’s preferred languages and the mentor’s coaching languages.
2. Remaining mentor capacity.

Students can browse mentors by language, skill, or text search. They can change mentor with an explicit reason such as language mismatch, teaching style, slow feedback, scheduling, different skill focus, or another concern.

The system enforces a seven-day cooldown after a student-selected change to avoid rapid switching. It does not apply this cooldown to a student’s first automatic assignment, allowing a new student to correct a poor initial fit promptly.

Mentor history is append-only:

~~~text
Close existing MentorAssignment
             ↓
Create new MentorAssignment
             ↓
Create MentorSwitchEvent with a reason code
~~~

The reason history is a strategic feedback loop for the platform. It identifies recurring mentorship problems that a competitor cannot learn merely by copying a switch button.

### Live lectures and recordings

Mentors can run one-to-many live lectures. A class can be open across colleges or associated with one organisation. Students may register, join while the room is available, and resume watching a published recording later.

The meeting URL is hidden until the join action, which records attendance at the same time. A class status is also time-aware: if a mentor forgets to press End, the app stops presenting an old live session as currently active once its join window has passed.

One-to-one availability and session tables exist in the schema, but that product flow is intentionally not yet implemented. Group lectures and one-to-one sessions remain separate because their capacity, registration, and recording needs differ.

### Practice, games, and language phrasebooks

SkillFlex includes low-stakes practice features:

- Pronunciation Check
- Spell Check
- Sentence Quiz
- Soft-skills Quiz
- Foreign-language phrasebook content with device speech synthesis

The games have objective fixed answers. Pronunciation Check uses the browser’s speech-recognition engine to recognise a word, suggest a likely missed syllable, and show a curated diagnosis for supported words.

Pronunciation practice is intentionally not an assessment system. A practice attempt stores whether the recogniser matched a word, but there is no quality score, grade, level, or accuracy percentage. It cannot create feedback, produce a weekly-plan task, appear in organisation reporting, or be viewed by mentors. The wording is therefore no error detected rather than a deceptive claim that a word was spoken perfectly.

Speech recognition is available in Chrome, Edge, Safari, and Samsung Internet. Firefox does not support this dependency.

### Progress and leaderboard

The student’s displayed level is calculated on request from two visible sources:

| Source | Meaning |
| --- | --- |
| Human rubric average | The average of scores written by mentors who reviewed recordings. |
| Effort facts | Counts of submitted work, distinct drill words, streak days, live attendance, completed plan items, and objectively perfect game rounds. |

The level is not stored as an unexplained permanent number. Public leaderboard ranking uses effort facts only. It never reveals private mentor assessments to classmates.

### Support assistant

The AI Support screen is for help with the application: navigation, camera and microphone permissions, upload issues, login trouble, missing feedback, mentor switching, and live classes. It is not a tutor or evaluator.

With a configured API key, the support engine uses an OpenAI-compatible chat-completions endpoint; the default example is Groq. Without a key, it uses written deterministic fallback replies so a fresh local project still has a working support page.

In both cases, the support engine receives only the user’s own support conversation and static facts about the application. It never receives recordings, submissions, feedback, rubric scores, plans, levels, or practice history. It cannot assess a student because it has no access to their work.

## Architecture

SkillFlex is a TypeScript npm-workspaces monorepo.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web application | React 18, Vite 6, React Router, TanStack Query, plain CSS | Mobile-first student, mentor, and administrator interface. |
| API | Node.js 20+, Fastify 5, TypeScript, Zod, JWT | Business rules, validation, authorisation, routes, and consistent error responses. |
| Shared package | TypeScript and Zod | Shared contracts, roles, language data, rules, progress calculations, pronunciation logic, and game content. |
| Database | PostgreSQL, Supabase, Prisma 6 | Relational application data and media metadata. |
| Media | Browser MediaRecorder and MediaProvider abstraction | Recorded submission uploads and authorised playback. |
| Deployment | Vercel | Serves the SPA and Fastify API from a single project. |

### Repository structure

~~~text
api/
  server.mjs                 Vercel serverless entry point
apps/
  api/                       Fastify app, feature route modules, jobs
  web/                       React PWA, UI components, feature screens
packages/
  db/                        Prisma schema, DB client, seeds, hardening SQL
  shared/                    Shared enums, Zod contracts, domain logic
docs/                         Data model, DPDP notes, architecture decision record
~~~

The shared package is a key reliability decision. The browser and API use one vocabulary for roles, supported languages, switch reasons, consent scopes, rubric shapes, and other domain values, avoiding mismatched client/server definitions.

## API modules

All API endpoints are under /api.

| Module | Responsibility |
| --- | --- |
| /auth | Registration, login, and current user. |
| /curriculum | Tracks, lessons, assignments, and weekly curriculum. |
| /submissions | Student submissions and mentor review queue. |
| /feedback | Human mentor feedback creation and retrieval. |
| /mentorship | Current mentor, directory, switching, profile, and history. |
| /plans | Current and historic plans, plus task completion. |
| /media | Media asset creation, upload completion, playback access, and provider webhook. |
| /live | Lecture discovery, registration, joining, recordings, watch progress, and mentor management. |
| /practice | Pronunciation-attempt recording and summary. |
| /battles | Objective game attempts and summary. |
| /progress | Personal progress and effort-only leaderboard. |
| /support | Support-message history and responses. |
| /orgs | Organisations, cohorts, subscription data, and aggregate reporting. |
| /consent | Consent records and a user’s data export. |
| /internal | Protected scheduled retention cleanup. |

API errors share the same shape: error.message and error.code. Incoming requests are validated by Zod, with field-specific issues returned for validation failures.

## Core data model

~~~text
Organization ──< OrgMembership >── User
     │                                  │
     ├──< Cohort ──< StudentProfile     ├── MentorProfile
     └──< Subscription                  └── ConsentRecord

Track ──< Module ──< Lesson ──< LessonAsset
                           └──< Assignment ──< Submission ──1:1── Feedback
                                                                  │
                                                          WeeklyPlan

StudentProfile ──< MentorAssignment >── MentorProfile
       │
       └──< MentorSwitchEvent
~~~

Supporting models hold MediaAsset records, live-class registrations, future one-to-one sessions, pronunciation attempts, objective game attempts, and support messages.

Important invariants in the model include:

- Colleges purchase seats; students belong to an organisation through membership.
- Student and mentor language preferences drive matching, not just interface decoration.
- Rubrics are structured data, so feedback is validatable and reportable.
- Feedback remains attached to the student’s submission after mentor changes.
- Weekly plans retain feedback provenance.
- Consent is versioned and append-only.
- Enum-like values are shared TypeScript constants, validated at the API edge, rather than duplicated database-only enums.

## Media workflow

The application uses two media paths.

~~~text
Local development:
Browser → API multipart upload → local storage directory → local playback

Production:
Browser → signed upload ticket → private Supabase Storage bucket
        → upload completion API call → media metadata in Postgres
        → signed playback access
~~~

Production video bytes bypass the API. This avoids serverless request-body limits, reduces API load, and keeps recordings in a private object store. The MediaProvider abstraction supports local development and the intended Supabase Storage path. Bunny and Cloudflare extension points exist, but Bunny is currently only a stub.

## Privacy and data protection

Student recordings are the most sensitive platform asset. Privacy is therefore built into data flow rather than only described in policy text.

- Consent stores policy version, scope, grant/revocation times, and guardian information where required.
- Revoking video consent schedules owned recordings for deletion after seven days.
- Every student-owned media asset has a retention deadline.
- The retention process deletes stored video bytes and marks their metadata record deleted while retaining non-video coaching history.
- In a local server, retention runs after start and then hourly. On Vercel, the protected endpoint is invoked daily by cron.
- College reporting contains cohort aggregates only, not videos or pronunciation-practice data.
- Production storage is intended to be a private bucket with signed playback access.
- The support assistant is isolated from student work and assessment data.

The project contains a DPDP-focused document at docs/dpdp-compliance.md. It describes current protections and known gaps. The project should not be described as legally compliant until outstanding obligations have been completed and reviewed appropriately.

## Authentication and deployment

The API signs JWTs with a configurable expiry and enforces role-aware access. The web app makes relative same-origin requests to /api.

During development, Vite proxies API and local media requests to Fastify. In production, Vercel rewrite rules direct /api requests to a catch-all Fastify serverless function and all other routes to the React SPA. Keeping the app same-origin reduces configuration complexity and supports browser camera/microphone usage on localhost or HTTPS.

Deployment is a single Vercel project:

1. Run the Vercel build command.
2. Generate Prisma client and bundle the Fastify handler.
3. Build the React app into apps/web/dist.
4. Serve the API through api/server.mjs.
5. Run the protected retention endpoint daily with Vercel Cron.

Production requires a secure JWT secret, PostgreSQL connection string, private Supabase Storage bucket and server credentials for the Supabase media provider, plus a CRON_SECRET for retention.

## Local setup

Prerequisites:

- Node.js 20 or newer
- A PostgreSQL DATABASE_URL, typically from Supabase

Copy .env.example to .env, set DATABASE_URL, and use the local media provider for the simplest local run. The documented Supabase connection uses the session-mode pooler on port 5432 because the app uses interactive database transactions.

~~~bash
npm run setup
npm run dev
~~~

Local services:

- Web: http://localhost:5173
- API: http://localhost:4000
- Health check: http://localhost:4000/api/health

Useful commands:

~~~bash
npm run typecheck
npm run build
npm run db:studio
npm run db:reset
~~~

The reset command destroys local database data before reseeding. Demo accounts are listed in README.md and use the documented demonstration password only; they must not be used for a real deployment.

## Why the project’s approach works

### It keeps assessment trustworthy

Soft-skills coaching requires context that cannot be reduced safely to an automatic score. SkillFlex reserves evaluation for a mentor who has watched the response. The database model reinforces this: practice attempts cannot become feedback or weekly-plan provenance.

### It makes feedback usable

A mentor’s review becomes a small list of next actions, but each action stays linked to the feedback that caused it. Students receive direction without the platform inventing a new judgement.

### It handles language as a core learning need

Separate language-specific lesson assets and language-aware mentor matching make teaching language a genuine product capability rather than a superficial translation option.

### It makes mentor fit visible and reversible

Switching preserves all history, respects mentor capacity, limits rapid churn, and records the student’s reason. It protects the learner while giving the platform useful operational evidence.

### It separates effort from quality

Students can be encouraged by an effort leaderboard without revealing private human assessments. Quality remains between the student and mentor; participation can be social.

### It fits the target environment

A PWA, short recording limits, direct-to-storage uploads, private media, local development storage, and one-project deployment all reduce friction for demos and for students with modest devices or connections.

## Current scope and limitations

The complete P1 loop is:

~~~text
watch → record → human feedback → derived weekly plan → mentor switch
~~~

The project also includes live lectures, recordings, effort progress, games, support, aggregate college reporting, and the DPDP consent surface.

The following are incomplete, intentionally deferred, or require hardening:

- One-to-one live mentoring is present in the schema but has no user-facing implementation.
- The platform does not host video calls; mentors provide a meeting link.
- Live recordings are uploaded after a lecture; the app does not record meetings itself.
- Payments, invoicing, notifications, and a curriculum-authoring console are not implemented.
- Automated tests are not yet present.
- Firefox cannot run the speech-recognition drill.
- Pronunciation diagnosis is syllable-level rather than phoneme-level, and curated notes cover only the word bank.
- Support conversations are stored but not routed into a human ticket queue or notification workflow.
- Playback URLs are minted at upload time; re-signing access on every authorised read remains a security hardening task.
- Provider webhooks do not yet verify a provider signature before accepting a media-status update.
- Data export and consent-triggered recording deletion are implemented, but there is no full user data-erasure workflow or grievance-redressal flow.
- JSON list columns remain from the earlier database design; native PostgreSQL arrays are a future cleanup.
- The SQL hardening script for the single-active-mentor constraint must be run in Supabase as documented in packages/db/prisma/postgres-hardening.sql.

## Where to read next

| File | Purpose |
| --- | --- |
| README.md | Setup, demo flow, deployment, design decisions, and implementation status. |
| docs/data-model.md | Explanation of why major database relationships exist. |
| docs/dpdp-compliance.md | Privacy and DPDP work, safeguards, and gaps. |
| docs/adr/0001-sqlite-dev-postgres-prod.md | History and outcome of the database-provider decision. |
| packages/db/prisma/schema.prisma | Authoritative schema. |
| packages/shared/src | Shared contracts, domain logic, level rules, language content, games, and pronunciation rules. |

## One-sentence description

**SkillFlex helps Indian college students turn soft-skills lessons into real practice and human coaching, while keeping mentorship multilingual, switchable, accountable, and private by design.**
