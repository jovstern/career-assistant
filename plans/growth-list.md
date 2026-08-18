# Growth list: track and work through rejection weaknesses

## Context

The app tracks applications through a flat pipeline (`applied → phoneScreen → interviewing → offer → rejected`) with only a generic free-text `notes` field. There's an `analyzeSkillGap` AI feature that compares a candidate's profile against one job and produces a structured, checkable list — but nothing captured *why* an application was actually rejected, and nothing gave the user one place to see and work through weaknesses across all their rejections.

This feature adds: when a rejection happens, a place to jot down whatever's known about why (no distinction between "told explicitly" vs. "self-assessed" — that didn't matter). Whatever weaknesses surface — typed in by the user directly, or found by AI analyzing a rejection — land in **one unified list** the user can also add to directly, and work through over time by checking things off.

## Data model

One unified collection, not a per-application sub-object plus a separately-synthesized plan — manual entries and AI-found ones are the same kind of record in the same place.

```ts
export interface GrowthItem {
  id: string
  title: string
  notes?: string
  priority: 'high' | 'medium' | 'low'
  suggestedActions?: string[]
  source: 'manual' | 'ai'
  relatedApplicationIds: string[]   // empty for pure manual entries
  done: boolean
  createdAt: number
  updatedAt: number
}
```

A minimal capture field on `Application`, just enough to jot down what's known about a rejection:

```ts
export interface RejectionInfo {
  reasonText: string
}
```

**Persistence**: `users/{uid}/growthItems/{id}`, following the same convention as `applications`/`resumes`/`matches` — individual docs, not one array-in-a-doc, so manual adds and AI adds are both independent writes with no read-modify-write races.

## Flow

1. On a rejected application's card, the user can jot down what they know about why (optional free text) and click "Find weaknesses" to have AI infer/expand on likely causes from the job description, profile, and whatever reason text was given.
2. AI results are written directly as new `growthItems` docs (tagged `source: 'ai'`, `relatedApplicationIds: [applicationId]`) — not stored on the application itself, and not a separate synthesized "plan" document.
3. The `/growth` page is the single place to see and manage all of it: add items directly, check items off as addressed, see which application (if any) an item came from.

## Implementation

- `src/types/index.ts` — `GrowthItem`, `RejectionInfo`, `Application.rejection?`.
- `src/stores/useGrowthItems.ts` — CRUD store cloned from `useApplications.ts`'s Firestore pattern.
- `src/stores/useApplications.ts` — `rejection` added to the `update()` Pick union.
- `src/components/board/CardModal.tsx` — rejection-reason textarea (gated on `stage === 'rejected'`), "Find weaknesses" AI action alongside the existing skill-gap/resume tools.
- `functions/src/ai.ts` — `analyzeRejection` callable, cloned from `analyzeSkillGap`'s skeleton, writes results as new `growthItems` docs via a batch instead of patching the application doc.
- `functions/src/index.ts` — export `analyzeRejection`.
- `src/lib/ai.ts` — `analyzeRejection()` client wrapper.
- `src/pages/GrowthPage.tsx` — the unified list page: add form, checklist, priority badges, AI-source badge, related-application tags.
- `src/App.tsx` / `src/components/Layout.tsx` — `/growth` route and nav link.

## Verification

- Move a card to Rejected, add a reason, click "Find weaknesses" — confirm items show up on `/growth` tagged with that application and persist across reload.
- Add an item manually on `/growth` — confirm it appears identically (minus the AI badge/source tag) and its checkbox persists.
