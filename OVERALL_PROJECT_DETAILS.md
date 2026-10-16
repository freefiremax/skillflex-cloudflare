# SkillFlex: Comprehensive Master Project Documentation

> **Complete end-to-end technical, architectural, functional, and operational specification of the SkillFlex platform.**  
> *Last updated: September 2026*

---

## Table of Contents

1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [Target Audience & Commercial Model](#2-target-audience--commercial-model)
3. [System Architecture & Monorepo Structure](#3-system-architecture--monorepo-structure)
4. [Technology Stack](#4-technology-stack)
5. [Database Architecture & Data Models](#5-database-architecture--data-models)
6. [User Roles & Access Control](#6-user-roles--access-control)
7. [Comprehensive Feature Breakdown (Minor to Minor)](#7-comprehensive-feature-breakdown-minor-to-minor)
   - 7.1. [Authentication & Account Identity](#71-authentication--account-identity)
   - 7.2. [Curriculum Tracks, Modules & Lessons](#72-curriculum-tracks-modules--lessons)
   - 7.3. [In-Browser Recording Studio & Submissions](#73-in-browser-recording-studio--submissions)
   - 7.4. [Human Mentorship & Review Queue](#74-human-mentorship--review-queue)
   - 7.5. [Weekly Action Plans & Progress Tracking](#75-weekly-action-plans--progress-tracking)
   - 7.6. [Live Lectures & Scheduling Engine](#76-live-lectures--scheduling-engine)
   - 7.7. [Mentor Live Now Interactive Broadcast Room](#77-mentor-live-now-interactive-broadcast-room)
   - 7.8. [Interactive Mascot Companion (Angry Owl)](#78-interactive-mascot-companion-angry-owl)
   - 7.9. [Practice Suite & Fun Time Games](#79-practice-suite--fun-time-games)
   - 7.10. [Multilingual Localization Engine (EN / HI / MR)](#710-multilingual-localization-engine-en--hi--mr)
   - 7.11. [DPDP Act 2023 Privacy & Compliance Architecture](#711-dpdp-act-2023-privacy--compliance-architecture)
   - 7.12. [College Admin Reporting & Analytics](#712-college-admin-reporting--analytics)
8. [Master UI Design System & Component Library](#8-master-ui-design-system--component-library)
9. [Complete API Endpoint Catalog](#9-complete-api-endpoint-catalog)
10. [Media Pipeline & Storage Infrastructure](#10-media-pipeline--storage-infrastructure)
11. [Environment Variables & Configuration](#11-environment-variables--configuration)
12. [Setup, Local Development & Deployment Guide](#12-setup-local-development--deployment-guide)

---

## 1. Executive Summary & Core Philosophy

**SkillFlex** is a soft-skills training and placement-readiness mentorship platform built primarily for engineering and professional college students in India. 

### The Core Problem
Students graduating from Tier-2 and Tier-3 institutions often possess strong technical knowledge but face high rejection rates in campus recruitment due to communication bottlenecks:
- Fear of speaking during self-introductions and group discussions (GDs).
- Hesitation switching from mother tongues (Marathi, Hindi) to fluent professional English.
- Automated AI-based speech/video scoring tools that penalize vernacular accents, misinterpret cultural colloquialisms, and offer vague, un-actionable scores without explaining *how* to improve.
- Institutional placement cells that lack the mentor-to-student bandwidth to give personal feedback to hundreds of students every week.

### The Foundational Guarantee: "Assessed by People, Not by AI"
SkillFlex enforces an absolute product promise:
- **No artificial intelligence evaluates, grades, or assigns scores to a student's speech or video.**
- Every submitted video recording is reviewed by a **vetted human mentor** who writes actionable notes, scores standard rubrics (e.g., Clarity, Active Listening, Contribution), and dictates the exact **Next Action Step**.
- Generative AI is strictly constrained to **reorganizing human instructions** into structured weekly task lists without ever hallucinating evaluation criteria.

---

## 2. Target Audience & Commercial Model

### 2.1. Commercial Model: B2B2C Institutional Licensing
- **Colleges Buy the Seats**: The platform is licensed by institutions (Colleges, Universities, Training & Placement Cells) on an annual per-student subscription model.
- **Zero Cost to Students**: Students access all features, mentors, practice games, and live sessions without personal payments, paywalls, or in-app purchases.
- **Cross-Institutional Mentor Pool**: Mentors do not belong to the student's college. Students can switch mentors without losing their historical progress, recordings, or feedback logs.

### 2.2. Value to Educational Institutions
- **NAAC / NBA Placement Metrics**: Colleges receive aggregate, cohort-level analytics demonstrating student practice hours, skill improvements, and placement readiness.
- **Absolute Student Privacy**: Colleges **never** receive raw video recordings of students practicing, ensuring psychological safety and student willingness to experiment and make mistakes without fear of academic penalty.

---

## 3. System Architecture & Monorepo Structure

SkillFlex is organized as an **npm workspaces** monorepo:

```
skillflex/
├── apps/
│   ├── api/                 # Fastify REST backend
│   │   ├── src/
│   │   │   ├── routes/      # Modular route controllers
│   │   │   ├── services/    # Business logic (plans, auth, media)
│   │   │   ├── plugins/     # Fastify plugins (JWT, CORS, static)
│   │   │   ├── server.ts    # Server entry point
│   │   │   └── vercel.ts    # Serverless wrapper for Vercel
│   │   └── package.json
│   │
│   └── web/                 # React 18 frontend (Vite)
│       ├── src/
│       │   ├── components/  # AppShell, IosTabBar, MascotGuide, UI primitives
│       │   ├── features/    # Page components grouped by domain
│       │   │   ├── auth/            # Sign-in & Onboarding
│       │   │   ├── home/            # Student Home Dashboard
│       │   │   ├── learn/           # Lessons & Curriculum tracks
│       │   │   ├── live/            # Student Live Classes & Live Room
│       │   │   ├── feedback/        # Mentor Feedback Feed
│       │   │   ├── plans/           # Weekly Action Plan
│       │   │   ├── account/         # DPDP Consents & Data Export
│       │   │   ├── mentor-console/  # Review Queue, Live Mgr, Profile
│       │   │   ├── mentorship/      # Mentor browsing & switching
│       │   │   ├── practice/        # Practice hub
│       │   │   ├── progress/        # Effort trackers & Leaderboards
│       │   │   ├── funtime/         # Educational mini-games
│       │   │   ├── pet/             # Owl Mascot interactions
│       │   │   ├── support/         # AI Support guide
│       │   │   ├── languages/       # Language selection
│       │   │   └── admin/           # College Admin Analytics
│       │   ├── lib/                 # Auth context, API client, i18n
│       │   ├── styles/              # Global CSS & Master UI tokens
│       │   └── main.tsx
│       ├── public/
│       │   └── assets/
│       │       ├── master/          # High-resolution Master UI assets
│       │       └── real/            # Authentic student photography
│       └── package.json
│
├── packages/
│   ├── db/                  # Prisma schema, migrations, seed data
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/index.ts     # Exported PrismaClient instance
│   │
│   └── shared/              # Shared TypeScript contracts & enums
│       ├── src/
│       │   ├── enums.ts     # Skills, languages, roles, statuses
│       │   ├── contracts/   # Zod validation schemas
│       │   ├── language.ts  # Language labels & mapping
│       │   └── index.ts
│       └── package.json
│
├── storage/                 # Local filesystem storage for uploads (dev)
├── scripts/                 # Environment validation and utilities
└── work/                    # Offline mock server (stub-api.mjs)
```

---

## 4. Technology Stack

### 4.1. Frontend (`apps/web`)
- **Framework**: React 18.3.1 with TypeScript (Strict mode).
- **Bundler**: Vite 6.4.3 with Rollup.
- **Server State & Caching**: `@tanstack/react-query` (v5) with optimistic updates and query invalidation.
- **Routing**: `react-router-dom` (v6) with nested routes and role-based route guards.
- **Styling**: Vanilla CSS with custom properties, Glassmorphism, and Master UI specification. No Tailwind or runtime CSS-in-JS.
- **Media**: Native HTML5 `MediaRecorder`, Web Audio API, Web Speech Recognition API.
- **Animation**: CSS animations, `@lottiefiles/dotlottie-react` for mascot expressions.

### 4.2. Backend (`apps/api`)
- **Runtime**: Node.js 20+ (ESM).
- **Framework**: Fastify 4.x / 5.x.
- **Validation**: Zod 4.x for request payload parsing and response serialization.
- **Authentication**: JWT (`@fastify/jwt`) with HTTP Bearer authorization headers and salted bcrypt passwords.
- **Multipart Uploads**: `@fastify/multipart` with streaming direct-to-disk or signed S3 uploads.

### 4.3. Database & Shared (`packages/db`, `packages/shared`)
- **Database**: PostgreSQL (Hardened with foreign keys and cascade rules).
- **ORM**: Prisma 6.19.3.
- **Type Safety**: End-to-end type sharing between Prisma models, Fastify endpoint contracts, and React queries.

---

## 5. Database Architecture & Data Models

The Prisma database schema defines the full domain:

```mermaid
erDiagram
    College ||--o{ User : "belongs to"
    User ||--o| StudentProfile : "has"
    User ||--o| MentorProfile : "has"
    StudentProfile ||--o{ MentorshipAssignment : "assigned to"
    MentorProfile ||--o{ MentorshipAssignment : "assigned to"
    Track ||--o{ Module : "contains"
    Module ||--o{ Lesson : "contains"
    Lesson ||--o{ Assignment : "attaches"
    Assignment ||--o{ Submission : "receives"
    StudentProfile ||--o{ Submission : "submits"
    Submission ||--o| Review : "evaluated by"
    MentorProfile ||--o{ Review : "writes"
    Review ||--o{ RubricScore : "contains"
    StudentProfile ||--o{ Plan : "follows"
    Plan ||--o{ PlanItem : "contains"
    MentorProfile ||--o{ LiveClass : "hosts"
    LiveClass ||--o{ LiveClassRegistration : "books"
    StudentProfile ||--o{ LiveClassRegistration : "registers"
    User ||--o{ ConsentLog : "records"
```

### Key Data Entities

1. **`User`**:
   - `id`, `email`, `passwordHash`, `name`, `role` (`student`, `mentor`, `college_admin`, `platform_admin`), `collegeId`, `createdAt`, `updatedAt`.
2. **`StudentProfile`**:
   - `userId`, `preferredLanguages` (`en`, `hi`, `mr`), `cohort` (e.g., "TE Computer 2026"), `enrollmentNumber`, `currentMentorId`.
3. **`MentorProfile`**:
   - `userId`, `headline`, `bio`, `languages`, `skills`, `maxActiveStudents` (default 25), `isAcceptingStudents` (boolean).
4. **`MentorshipAssignment`**:
   - Tracks current and historical mentor relationships with `assignedAt`, `endedAt`, and `switchReason`.
5. **`Track`, `Module`, `Lesson`, `Assignment`**:
   - Hierarchical learning structure. `Assignment` specifies duration limits (e.g., 60s, 120s) and rubrics.
6. **`Submission`**:
   - `studentId`, `assignmentId`, `mediaAssetId`, `status` (`draft`, `submitted`, `in_review`, `reviewed`, `rejected`), `submittedAt`.
7. **`Review`**:
   - `submissionId`, `mentorId`, `freeform` (human written note), `strengths`, `nextStep`, `reviewedAt`.
8. **`RubricScore`**:
   - `reviewId`, `rubricKey` (e.g., "contribution", "clarity"), `score` (integer 1-5), `maxScore` (5).
9. **`Plan` & `PlanItem`**:
   - Weekly practice targets: `weekOf`, `title`, `why` (feedback attribution), `done` (boolean), `sourceFeedbackIds`.
10. **`LiveClass`**:
    - `mentorId`, `title`, `description`, `skill`, `language`, `status` (`scheduled`, `live`, `ended`, `cancelled`), `scheduledAt`, `durationMinutes`, `capacity`, `seatsTaken`, `joinUrl`, `recordingMediaId`.
11. **`ConsentLog`**:
    - DPDP Act compliance entity: `userId`, `scope` (`video_recording`, `aggregate_sharing`, `email_updates`), `granted` (boolean), `policyVersion`, `decidedAt`.

---

## 6. User Roles & Access Control

| Role | Purpose | Capabilities | Privacy Boundaries |
| --- | --- | --- | --- |
| **Student** | Learner & job seeker | Watch lessons, submit videos, read feedback, track plans, attend live classes, play practice games, export data. | Can only view their own submissions, plans, and consent. |
| **Mentor** | Coach & reviewer | Review pending student recordings, write scores and guidance, host live lectures, publish recordings. | Sees work only of students actively in their queue or assigned roster. |
| **College Admin** | T&P Officer / Dean | Monitor cohort completion rates, average scores, mentor switch counts, lecture attendance. | **Strictly forbidden** from viewing student video recordings or individual practice submissions. |
| **Platform Admin** | System operator | Provision colleges, manage mentors, manage curriculum tracks, inspect system health. | Full system management via authenticated APIs. |

---

## 7. Comprehensive Feature Breakdown (Minor to Minor)

### 7.1. Authentication & Account Identity
- **JWT Authentication**: Token-based authentication with auto-refresh and secure local storage.
- **Role Detection**: Decodes user role immediately on mount to route students to `/`, mentors to `/queue`, and admins to `/admin`.
- **Demo Seed Quick-Logins**: For testing and evaluation, pre-configured roles (Student Rahul, Mentor Anjali, Admin Dr. Patil) are accessible with one click.
- **Account Screen**:
  - Displays user avatar with first-name initial in emerald gradient.
  - Organization name and academic cohort badge.
  - Preferred language selector with instant language switching.

### 7.2. Curriculum Tracks, Modules & Lessons
- **Tracks**: High-level employability domains (e.g., *Placement Readiness*, *Professional Speaking*, *Interview Mastery*).
- **Modules**: Step-by-step subdivisions within a track (e.g., *Introducing Yourself*, *Group Discussions*, *Answering Behavioral Questions*).
- **Lessons**:
  - Short 5–8 minute video lectures.
  - Multilingual audio track availability indicator (EN, HI, MR).
  - High-fidelity preview thumbnail with level badge (*Beginner*, *Intermediate*, *Placement Ready*).
  - Direct link to the attached practical assignment.

### 7.3. In-Browser Recording Studio & Submissions
- **MediaStream API**: Directly accesses user camera and microphone in the browser without plugins or external apps.
- **Pre-flight Audio & Video Checks**: Live video viewfinder with audio input level visualizer.
- **Timed Recording**: Automatic countdown timer matching the assignment's maximum allowed duration (e.g., 60 seconds).
- **Instant Playback Review**: Student can re-watch their recording immediately before submitting.
- **One-Click Re-record**: Discards current blob and resets the timer for another take.
- **Resilient Upload**: Streams the recorded `video/webm` or `video/mp4` blob with loading progress and server-side media asset reservation.

### 7.4. Human Mentorship & Review Queue
- **Mentor Queue**: Shows all student submissions pending review, ordered by "Newest first" with submission timestamps and student names.
- **Mentor Watching State**: Displays status when another mentor opens a video to prevent duplicate evaluations.
- **Rubric Grading Interface**:
  - Interactive 1–5 scoring scales for specific criteria (Clarity, Structure, Confidence, Active Listening).
  - Text area for **Freeform Note** (candid feedback).
  - Explicit **Strengths** input ("What is working well").
  - Explicit **Next Step** input ("What to focus on next take").
- **Audit Trail**: Every review records the mentor ID, exact timestamp, and cannot be edited after submission.

### 7.5. Weekly Action Plans & Progress Tracking
- **The Provenance Guarantee**:
  - Features an explicit provenance banner: *"Restructured from your mentor's feedback. No AI watched or scored your videos — it only reorganised what a human already told you."*
- **Checklist of Tasks**:
  - Each task links directly back to the mentor's written feedback.
  - Includes priority badges: `High Priority`, `Important`, `Recommended`, `Completed`.
  - Strikethrough style and persistent completion toggle via `PATCH /plans/:id/items/:index`.
- **Visual Progress Ring**: Circular conic-gradient gauge indicating fraction completed (e.g., `3/5 done`) and weekly days remaining.
- **Motivation Banner**: Daily quote reminding students that consistency drives placement success.

### 7.6. Live Lectures & Scheduling Engine
- **One-to-Many Group Sessions**: Mentors can teach entire cohorts live instead of individual 1:1 calls.
- **Lecture Scheduling**:
  - Title, description, skill tag, language selection (EN, HI, MR), max capacity (25, 50, 100, 200).
  - Date & time picker with local timezone adjustment.
  - Video room URL input (Google Meet, Zoom, Jitsi).
  - "Save recording to library" toggle switch.
- **Student Discovery & Registration**:
  - Filter by skill chip or "Only in my language".
  - One-click seat reservation with live capacity meter (e.g., `28/50 registered`).
- **Automatic Recording Library**:
  - Once a live lecture concludes, the mentor uploads the recording file.
  - Students who registered or missed the session can watch the recording anytime.
  - Tracks playback progress and resumes automatically where the student paused.

### 7.7. Mentor Live Now Interactive Broadcast Room
- **Real-Time Live Monitor**:
  - Large live video stage with active `LIVE` indicator and mentor badge.
  - Live statistics bar: Participant count, running session duration timer, and recording status indicator (`🔴 ON`).
- **Interactive Control Bar**:
  - Microphone, Camera, Screen Share, and Roster controls.
  - Quick action shortcuts: *Show slides*, *Take questions*, *Add poll*, *Share resource*.
- **Sidebar Tabs**:
  - **Participants List**: View all attendees with mute indicators.
  - **Live Chat**: Real-time message bubbles with student name, message, and timestamp.

### 7.8. Interactive Mascot Companion (Angry Owl)
- **Visual Identity**: Fixed bottom-right circular avatar with green online status dot.
- **Contextual Awareness**:
  - Greets students on login.
  - Provides encouraging advice on the Lessons and Practice pages.
  - Reacts to completed tasks and game wins.
- **Interactive Animations**: Clicking the owl opens quick encouragement tips and links to the AI Support assistant.

### 7.9. Practice Suite & Fun Time Games
- **Spell Game**: Fast-paced vocabulary practice to correct common spelling errors in technical interviews.
- **Sentence Builder**: Interactive word-tile arrangement to master formal corporate sentence structure.
- **Speak Game (Pronunciation Coach)**:
  - Uses the browser's Web Speech Recognition API.
  - Prompts students with difficult business and technical words.
  - Evaluates clarity and displays phonetic feedback.
- **Quiz Game**: Quick-fire soft skills, body language, and corporate etiquette questions.
- **Battles**: Peer-to-peer friendly soft-skills challenge modes.

### 7.10. Multilingual Localization Engine (EN / HI / MR)
- **Supported Languages**: English (`en`), Hindi (`hi`), Marathi (`mr`).
- **Real-Time UI Localization**:
  - Dynamic translation dictionary (`useTranslation()`) translating all navigation links, buttons, headers, and placeholders instantly.
  - No page reload required when switching languages in the top bar.
- **Curriculum Filtering**: Filters video lectures and live classes by student's spoken language.

### 7.11. DPDP Act 2023 Privacy & Compliance Architecture
Built from the ground up to comply with India's **Digital Personal Data Protection (DPDP) Act 2023**:
1. **Granular Versioned Consent**:
   - `video_recording`: Permission to record and store practice videos for human mentor review.
   - `aggregate_sharing`: Permission to share anonymized score trends with the student's college.
   - `email_updates`: Optional product communications.
2. **Destructive Revocation (Right to Erasure)**:
   - When a student revokes `video_recording` consent, all historical video recordings are immediately marked and scheduled for permanent deletion within 7 days.
   - The student's written notes and grades remain safe, but video files are purged from storage.
3. **Data Portability (Download My Data)**:
   - One-click export button generates a clean, readable JSON file containing the student's complete profile, mentor feedback history, weekly plans, and timestamped consent audit logs.

### 7.12. College Admin Reporting & Analytics
- **Cohort Health Overview**: Total active students, total video submissions recorded, percentage of submissions reviewed by mentors.
- **Skill Proficiency Breakdown**: Average rubric scores across all 8 soft-skill competencies.
- **Mentor Switch Tracking**: Monitors student satisfaction and reasons for requesting a new mentor.
- **Zero Raw Media Access**: Admins see charts and metrics, never student videos.

---

## 8. Master UI Design System & Component Library

The user interface follows the **SkillFlex Master UI Specification**:

### 8.1. Color Palette & Design Tokens
- **Background**: Soft fresh mint gradient (`linear-gradient(180deg, #e4f6ee, #f5fbf8)`).
- **Surfaces**: Frosted glass (`rgba(255, 255, 255, 0.94)`) with 1px translucent borders (`#dbeae3`) and subtle daylight drop shadows (`0 12px 30px rgba(24, 78, 58, 0.10)`).
- **Primary Brand Green**: Emerald `#15a96d` with deep forest `#087e50` for active states and high-contrast text.
- **Typography**: Inter / System UI with bold heading weights (750–850) and tight negative letter-spacing (`-1px` to `-3.5px`) for modern editorial impact.

### 8.2. Component Hierarchy
1. **Master Topbar**: Logo with colored span (`SkillFlex`), language switcher pill, user profile pill, and exit/signout button.
2. **Master Hero**: Two-column layout with bold h1, lead description, floating kicker badges (`●●● Real human feedback`, `▮▮▮ Track progress`), and authentic photography.
3. **Master Lesson Card**: High-contrast grid with 150px thumbnail, module eyebrow, title, duration pill, and vibrant circular play button (`▶`).
4. **Master Progress Ring**: Circular SVG/conic-gradient widget displaying completion fractions and remaining sprint days.
5. **Master Floating Bottom Nav**: Floating rounded iOS-style tab bar (`IosTabBar`) with smooth active indicator pills, keeping navigation accessible within thumb reach.

---

## 9. Complete API Endpoint Catalog

All routes are served under the `/api` prefix:

### 9.1. Authentication & Profile
- `POST /api/auth/register`: Create user account.
- `POST /api/auth/login`: Authenticate email/password; returns JWT token.
- `POST /api/auth/logout`: Invalidate session.
- `GET /api/auth/me`: Fetch currently authenticated user, profile, and organization.

### 9.2. Curriculum & Lessons
- `GET /api/curriculum/tracks?language=:lang`: Fetch all tracks, modules, and lessons.
- `GET /api/curriculum/lessons/:id`: Fetch specific lesson details and video playback URL.
- `GET /api/curriculum/my-week`: Fetch student's assigned practice tasks for the week.

### 9.3. Submissions & Recording
- `POST /api/submissions`: Initiate a practice video submission.
- `POST /api/submissions/:id/complete`: Confirm upload and mark submission as `submitted`.
- `GET /api/submissions/:id`: Retrieve submission details and status.

### 9.4. Feedback & Reviews
- `GET /api/feedback/mine`: Fetch all human feedback received by the student.
- `GET /api/feedback/:id`: Fetch single feedback with video player and rubric scores.

### 9.5. Weekly Action Plans
- `GET /api/plans/current`: Retrieve active weekly plan and provenance metadata.
- `PATCH /api/plans/:id/items/:index`: Toggle task completion state (`done: true/false`).

### 9.6. Live Lectures
- `GET /api/live/classes`: Fetch upcoming and scheduled live classes.
- `GET /api/live/classes/:id`: Fetch single live class details and room status.
- `POST /api/live/classes/:id/register`: Reserve a seat in a live class.
- `DELETE /api/live/classes/:id/register`: Cancel a reserved seat.
- `POST /api/live/classes/:id/join`: Enter live room (records attendance and returns room URL).
- `GET /api/live/my-classes`: Fetch student's registered and past classes.
- `GET /api/live/recordings`: Fetch published recording catalog.
- `POST /api/live/recordings/:id/progress`: Save student watch timestamp for resuming.

### 9.7. Mentor Console
- `GET /api/submissions/queue`: Fetch submissions waiting for mentor review.
- `POST /api/reviews`: Submit rubric scores, notes, and next step for a submission.
- `GET /api/mentorship/students`: Fetch mentor's assigned student roster.
- `PATCH /api/mentorship/profile`: Update mentor headline, bio, languages, and capacity.
- `POST /api/live/classes`: Schedule a new live lecture.
- `PATCH /api/live/classes/:id`: Edit scheduled lecture time, title, or room link.
- `POST /api/live/classes/:id/:verb`: Execute action (`start`, `end`, `cancel`).
- `POST /api/live/classes/:id/recording`: Publish lecture recording.

### 9.8. Privacy, Consent & Data Export
- `GET /api/consent`: Fetch versioned consent states for all scopes.
- `POST /api/consent`: Grant or revoke specific consent scope.
- `GET /api/consent/export`: Download complete user portfolio as JSON.

---

## 10. Media Pipeline & Storage Infrastructure

1. **Storage Provider Abstraction**:
   - In Development: Uploads are stored locally in the `/storage` directory and served via `@fastify/static`.
   - In Production: Generates presigned `PUT` URLs to private S3 / Cloud Storage buckets.
2. **Access Control**:
   - Media URLs are private and signed with time-limited expirations (e.g., 15 minutes).
   - Only the owning student and their assigned mentor can request playback tokens for a submission.
3. **Retention & Auto-Purge Worker**:
   - Background worker checks for submissions marked with `scheduledForDeletion` (triggered by consent revocation).
   - Once the 7-day grace period expires, video blobs are permanently deleted from storage.

---

## 11. Environment Variables & Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/skillflex?schema=public"

# Authentication secret
JWT_SECRET="super-secret-jwt-key-change-in-production"

# Application server ports
PORT=4000
VITE_API_URL="http://localhost:4000"

# Media storage configuration
STORAGE_DRIVER="local" # "local" or "s3"
STORAGE_LOCAL_DIR="./storage"

# Optional AWS S3 settings (production)
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="skillflex-private-media"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

---

## 12. Setup, Local Development & Deployment Guide

### 12.1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended).
- **npm**: `v10.x` or higher.
- **PostgreSQL**: Local instance or hosted service (e.g., Supabase, Neon).

### 12.2. Installation & Database Setup
```bash
# 1. Clone repository
git clone https://github.com/freefiremax/skillflex-cloudflare.git
cd skillflex

# 2. Install monorepo dependencies
npm install

# 3. Generate Prisma client and push schema to database
npm run db:generate
npm run db:push

# 4. Seed database with test curriculum, users, and mentors
npm run db:seed
```

### 12.3. Running the Development Environment
```bash
# Run both Backend API (:4000) and Web Frontend (:5173) concurrently:
npm run dev

# Or run frontend only with the standalone mock API:
node work/stub-api.mjs &
npm run dev -w @skillflex/web
```

### 12.4. Production Build & Verification
```bash
# Typecheck and build all workspaces
npm run build

# Verify build bundles in web app
npm --prefix apps/web run build
```

---

## 13. Summary Matrix

| Capability | Supported Details |
| --- | --- |
| **Supported Devices** | Mobile-first responsive (Optimized for Android Chrome, iOS Safari, Desktop Web). |
| **Supported Languages** | English (`en`), Hindi (`hi`), Marathi (`mr`) with instant UI toggling. |
| **Soft Skills Covered** | Self-Introduction, Group Discussion, Presentation, Interview Answering, Body Language, Email Writing, Teamwork, Conflict Handling. |
| **Assessment Model** | 100% Human Mentor Evaluation. Zero automated grading of speech or video. |
| **Compliance** | India Digital Personal Data Protection (DPDP) Act 2023 compliant with full export & deletion. |
| **Live Capabilities** | Live lectures, reservation caps, real-time participant roster, live chat, auto-recording library. |

---
*End of SkillFlex Master Documentation.*
