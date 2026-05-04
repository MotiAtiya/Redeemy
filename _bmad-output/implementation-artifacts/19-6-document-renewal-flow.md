# Story 19.6: Document renewal flow

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-6-document-renewal-flow
**Author:** Moti
**Date:** 2026-05-04
**Status:** done

---

## User Story

As a Redeemy user with a personal document (ID, license, passport, insurance) whose `expirationDate` has passed,
I want the app to ask me whether I renewed it,
So that I can either record the new expiration date (most common — I went to the office and got a new passport) or remove the document entirely if it's no longer relevant — instead of leaving an expired document silently sitting in my list with a red badge forever.

---

## Background & Context

Story 19.4 added auto-expire for warranties (status flips ACTIVE → EXPIRED) and Story 19.5 added the manual-renewal prompt for subscriptions (advance commitment-end date or move to history). Documents needed their own variant because a document is a different kind of entity:

- A renewed passport is **the same document** with a new date — it doesn't make sense to archive the old record.
- A document the user no longer needs (expired insurance for a car they sold) should be **removed entirely**, not kept in a history view — there's no analytical value in a list of dead documents.

So the flow is two-button:
- **"I renewed"** → pick a new `expirationDate`, write it back, log `document_renewed`. Document stays in the active list with a fresh badge.
- **"No longer needed"** → confirm dialog → delete the document (existing `deleteDocument` helper, which already logs `item_deleted`).

Documents have **no scheduled notifications** today (unlike credits/warranties/subscriptions), so the renewal flow has nothing to cancel/reschedule — keeps the implementation tighter than Story 19.5.

**What this story does NOT do:**
- Add notifications to documents (separate scope; documents stay passive — user opens app and sees badge).
- Add a `DocumentStatus` enum or a "history of expired documents" view (intentionally rejected — see above).
- Bulk renewal across multiple documents.
- Any change to the document add/edit forms.

---

## Acceptance Criteria

### Helper

**Given** a document
**When** `documentNeedsRenewal(doc)` is called
**Then** it returns `true` iff `expirationDate.getTime() < Date.now()`. Otherwise `false`.

The helper is exported alongside `DocumentRenewalPrompt` from `src/components/redeemy/DocumentRenewalPrompt.tsx`.

### Confirm renewal action

**Given** the user is on the document detail screen and the document is past its expiration date
**When** the renewal prompt is showing and the user taps "✓ I renewed"
**Then**:
- A date picker opens with today as the minimum date and one-year-from-today as the default starting value.
- iOS: an inline spinner inside a bottom-sheet modal with Save / Cancel.
- Android: the system date dialog opens; selection auto-confirms (no extra tap).
- On Save:
  - The store is optimistically updated with the new `expirationDate`.
  - `confirmDocumentRenewal(id, newExpirationDate)` writes to Firestore.
  - Event `document_renewed` is logged.
  - `onResolved` fires (parent screen navigates back).
- On error: rollback the store update, show an error alert.

### Discard action

**Given** the prompt is showing
**When** the user taps "✗ No longer needed"
**Then**:
- A confirm dialog asks "Remove document?".
- On confirm:
  - The document is optimistically removed from the store.
  - `deleteDocument(id)` runs (deletes Firestore doc + storage images, logs `item_deleted`).
  - `onResolved` fires (parent screen navigates back).
- On error: show an error alert (no rollback — store removal is acceptable since the user explicitly asked to delete).

### UI placement

**Given** the user is on a document detail screen
**When** `documentNeedsRenewal(document)` is true
**Then** `<DocumentRenewalPrompt>` renders directly below the HeroCard, above the details card.

The existing `ExpirationBadge` already displays "פג תוקף" / "Expired" on document cards in the list — no separate "needs renewal" card badge is added.

### New event type

**Given** the type system
**Then** `EventType` includes `'document_renewed'` (mobile + admin).

### Admin dashboard

**Given** events arrive
**When** Moti views `/activity`
**Then**:
- `document_renewed` renders with the `RefreshCw` icon and the description "חידש מסמך" / "renewed a document".
- The Status filter group includes `document_renewed`.

**And** the `/users/[uid]` page event timeline renders it correctly via the same `UserDetailEventRow` icon mapping.

### Quality

- [x] `npx tsc --noEmit` passes (mobile + admin)
- [ ] Manual test: edit an existing document so its `expirationDate` is in the past → open detail screen → see prompt → tap "I renewed" → pick a date → verify Firestore + admin event
- [ ] Manual test: same flow → tap "No longer needed" → confirm → verify document is removed from the list and `item_deleted` event appears in admin

---

## Technical Notes

### Mobile new code

- `src/components/redeemy/DocumentRenewalPrompt.tsx` — banner component + `documentNeedsRenewal` helper. Handles the iOS inline-spinner modal + the Android system date dialog.
- `src/lib/firestoreDocuments.ts` — `confirmDocumentRenewal(id, newExpirationDate)` action. Decline reuses existing `deleteDocument`.
- `src/types/eventTypes.ts` — adds `'document_renewed'`.
- `src/app/document/[id].tsx` — render `<DocumentRenewalPrompt>` below the HeroCard when `documentNeedsRenewal(document)`.

### Admin updates

- `src/lib/events.ts` — adds `'document_renewed'` to the `EventType` union.
- `src/app/(app)/activity/ActivityList.tsx` — icon mapping (`RefreshCw`) + describer switch case.
- `src/app/(app)/activity/ActivityFilters.tsx` — adds `'document_renewed'` to the `status` TYPE_GROUP.
- `src/app/(app)/users/[uid]/UserDetailEventRow.tsx` — same icon mapping + describer.
- `messages/he.json` + `messages/en.json` — `activity.events.document_renewed`.

### i18n strings (mobile)

- `document.renewalPrompt.{title,body,renew,discard,pickDateTitle,confirmDate,confirmDiscardTitle,confirmDiscardMessage,discardConfirm,errorTitle}` (he + en)

---

## Dependencies / Sequencing

- No Firestore rule changes.
- No new env vars.
- No new Firestore indexes.
- Independent of 19.4 (warranty auto-expire) and 19.5 (subscription manual-renewal prompt).
- `@react-native-community/datetimepicker` already a dependency (used by `StepDatePicker`).

---

## Done Definition

- [x] All AC pass
- [x] Both repos commit + push
- [x] Story file marked done; epics.md updated
