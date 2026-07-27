# AI-Powered Career Assistant — Plan

**Persona:** Tech professionals (frontend, backend, data science) across seniority levels.
**Goal:** Potential multi-user product — security and scalability matter.

## Architecture

- **Frontend:** Vite + React + TypeScript + Tailwind + Zustand, react-router-dom v6
- **Backend:** Firebase — Auth, Firestore, Cloud Functions (Blaze plan required)
- **AI:** Claude API (`claude-sonnet-5`), called only from Cloud Functions — key never ships to client
- **Jobs source:** mock job data for now (swappable adapter → real API later) via a scheduled Cloud Function
- **Board:** `@dnd-kit` drag-and-drop Kanban

### Firestore data model

```
users/{uid}                    profile: name, title, seniority, skills[], preferences (roles, locations, remote, salary)
users/{uid}/applications/{id}  job snapshot, status (saved|applied|interviewing|offer|rejected), notes, timestamps
users/{uid}/resumes/{id}       jobTitle, tailored markdown, createdAt
users/{uid}/skillGaps/{id}     jobId, missing skills[], checklist items with done flags
jobs/{id}                      fetched jobs cache: title, company, location, url, description, source, fetchedAt
interviewQuestions/{id}        role, seniority, category, question, answer/hints
```

Security rules: users read/write only their own subtree; `jobs` and `interviewQuestions` read-only to authenticated users, written by Functions/admin.

---

## Phase 1 — Auth + Dashboard (Kanban board)

1. Scaffold Vite + React + TS + Tailwind; Firebase project init (Auth, Firestore, Functions, Hosting)
2. Auth: email/password + Google sign-in; route guards; login/signup pages
3. Profile page: basic info, skills, job preferences (drives job search + resume builder)
4. Jira-style board: columns Saved → Applied → Interviewing → Offer → Rejected; drag-and-drop persists status; application card modal (job details, notes)
5. Firestore security rules + deploy to Firebase Hosting

## Phase 2 — Job-fetching agent

1. Mock job source behind a `JobProvider` adapter interface (real API drop-in later)
2. Scheduled function (daily) fetches + filters per user preferences, dedupes into `jobs` cache
3. "New matches" inbox in UI → one click adds job to board's Saved column
4. Manual "fetch now" trigger + filter tuning UI

## Phase 3 — AI resume builder + skill gap checklist

1. Cloud Function wrapping Claude API (auth-gated, rate-limited)
2. Resume builder: user profile + target job title/description → tailored resume (markdown preview, PDF export)
3. Skill gap analysis: compare profile skills vs job description → checklist stored per application, trackable progress
4. Resume history per application

## Phase 4 — Interview prep DB + final testing

1. AI-generated interview questions (Claude via Cloud Function) per role × seniority × category (behavioral, system design, coding, domain), cached in `interviewQuestions`
2. Prep UI: browse/filter by role + seniority; linked from application card ("prep for this interview")
3. Generate job-specific questions from a job description
4. End-to-end flow test: signup → profile → fetch jobs → board → resume → gap checklist → interview prep
5. Polish: loading/error states, empty states, mobile pass

---

## Decisions

1. Project name: `career-assistant`
2. Jobs source: mock for now (adapter for real API later)
3. Fetch schedule: daily
4. Interview questions: AI-generated (Claude)
5. Resume PDF export: yes
6. Firebase Blaze plan: yes; frontend Vite + React + TS + Tailwind
