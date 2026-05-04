# Story 19.5: Subscription manual-renewal prompt

**Epic:** 19 — Admin Dashboard V1.5 quick wins
**Story Key:** 19-5-subscription-manual-renewal-prompt
**Author:** Moti
**Date:** 2026-05-04
**Status:** done

---

## User Story

As a Redeemy user with a manual-renewal annual subscription whose billing date has passed,
I want the app to ask me whether I actually renewed it,
So that I either advance the cycle (if I did renew in real life) or move it to history (if I let it lapse) — instead of the system silently auto-bumping the date and pretending the subscription is still active.

---

## Background & Context

The subscription model has a `renewalType: 'auto' | 'manual'` field. Auto subscriptions are advanced by the system whenever the billing date passes (the listener handles that). Manual subscriptions, however, were also being silently auto-advanced — which is a bug, because the user might have actually let the subscription lapse, but the app would still show it as active forever.

This story fixes that for the **annual + manual** case (the common one — domain renewals, gym memberships, annual software, etc.). Monthly + manual is left as-is for now (the listener resets notification IDs each month so reminders fire — no auto-archive); could be revisited later if it becomes a problem.

Documents and warranties were addressed in Stories 19.4 / 19.6. Occasions and credits are out of scope (different lifecycles).

**What this story does NOT do:**
- Monthly manual-renewal handling (different UX questions; deferred)
- Editing subscription dates from the prompt
- Bulk renewal across multiple subscriptions
- Reminders to confirm (existing notification system already does this 7d/1d before billing)

---

## Acceptance Criteria

### Helper

**Given** a subscription
**When** `subscriptionNeedsRenewalConfirmation(sub)` is called
**Then** it returns `true` only when ALL of:
- `renewalType === 'manual'`
- `status === SubscriptionStatus.ACTIVE`
- `billingCycle === SubscriptionBillingCycle.ANNUAL`
- `nextBillingDate` is set and in the past (≤ now)

Otherwise returns `false`.

### Listener gate

**Given** a manual-renewal annual subscription whose `nextBillingDate` has just passed
**When** `useSubscriptionsListener` fires
**Then** `maybeAdvance` does NOT call `advanceBillingCycle` (so the date is not silently bumped). The subscription remains in its current state until the user resolves the prompt.

Auto-renewal subscriptions and free-trial transitions are unchanged — the listener still advances those.

### New status + events

**Given** the type system
**Then** `SubscriptionStatus.EXPIRED = 'expired'` exists, and `Subscription` has an optional `expiredAt?: Date`.
**And** `EventType` includes `'subscription_renewed'` and `'subscription_expired'` (mobile + admin).

### Confirm renewal action

**Given** the user is on the subscription detail screen
**When** the renewal prompt is showing and the user taps "✓ I renewed"
**Then**:
- The store is optimistically updated with the advance-billing patch.
- Existing notifications are cancelled, new ones scheduled for the new cycle.
- `confirmSubscriptionRenewal(id, patch)` writes to Firestore.
- Event `subscription_renewed` is logged.
- The screen navigates back (handled by `onResolved` callback).
- On error: rollback the store update, show an error alert.

### Decline renewal action

**Given** the prompt is showing
**When** the user taps "✗ I didn't renew"
**Then**:
- A confirm dialog asks "Move to history?".
- On confirm: existing notifications cancelled; status → EXPIRED with expiredAt; Firestore write.
- Event `subscription_expired` is logged.
- Subscription disappears from the active subscriptions tab and shows in History (under the existing subscriptions filter).

### UI placements

**Given** the user is on a subscription detail screen
**When** the subscription needs renewal confirmation
**Then** the `<SubscriptionRenewalPrompt>` component renders right below the HeroCard, with two buttons (confirm / decline).

**Given** the user is on the subscriptions list
**When** any card needs renewal confirmation
**Then** that card's urgency badge shows the amber "needs renewal" label instead of the normal billing-cycle countdown.

### Admin dashboard

**Given** events arrive
**When** Moti views `/activity`
**Then**:
- `subscription_renewed` renders with the Repeat icon and the description "חידש מנוי" / "renewed a subscription".
- `subscription_expired` renders with the Hourglass icon and "מנוי פג תוקף" / "subscription expired".
- The Status filter group includes both new types.

**And** the `/users/[uid]` page event timeline renders both correctly via the same UserDetailEventRow icon mapping.

### Quality

- [ ] `npx tsc --noEmit` passes (mobile + admin)
- [ ] Manual test: create an annual manual subscription with past nextBillingDate → see prompt → tap confirm → verify date advances + event in admin
- [ ] Manual test: same flow → tap decline → verify subscription moves to History + event in admin

---

## Technical Notes

### Mobile new code

- `src/lib/subscriptionUtils.ts` — `subscriptionNeedsRenewalConfirmation(sub)` helper.
- `src/lib/firestoreSubscriptions.ts` — `confirmSubscriptionRenewal(id, patch)` and `declineSubscriptionRenewal(id)` actions. Each writes its own semantic event.
- `src/components/redeemy/SubscriptionRenewalPrompt.tsx` — banner component with confirm/decline buttons; handles notification cancellation/rescheduling on confirm.
- `src/types/subscriptionTypes.ts` — adds `EXPIRED` to enum; adds `expiredAt?: Date` field.
- `src/types/eventTypes.ts` — adds `subscription_renewed` + `subscription_expired`.
- `src/hooks/useSubscriptionsListener.ts` — early-return from `maybeAdvance` when `subscriptionNeedsRenewalConfirmation(sub)` is true.

### Mobile UI integration

- `src/app/subscription/[id].tsx` — render `<SubscriptionRenewalPrompt>` below HeroCard when needed.
- `src/components/redeemy/SubscriptionCard.tsx` — when `needsRenewalConfirmation`, render an amber "needs renewal" badge instead of the normal urgency badge.

### Admin updates

- EventType union: `subscription_renewed`, `subscription_expired`.
- ActivityList + UserDetailEventRow: icon mapping (`Repeat`, `Hourglass`) and describeEvent switch.
- ActivityFilters TYPE_GROUPS.status: add both.
- i18n: he/en `activity.events.subscription_{renewed,expired}`.

### i18n strings (mobile)

- `subscription.renewalPrompt.{title,body,confirm,decline,confirmDeclineTitle,confirmDeclineMessage,declineConfirm,errorTitle}` (he + en)
- `subscriptionCard.needsRenewal` (he + en)

---

## Dependencies / Sequencing

- No Firestore rule changes.
- No new env vars.
- No new Firestore indexes.
- Independent of 19.4 (warranty auto-expire) and 19.6 (document renewal).

---

## Done Definition

- [x] All AC pass
- [x] Both repos commit + push
- [x] Story file marked done; epics.md updated
