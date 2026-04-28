# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story's `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2026-04-28 | 17.1 | 17 | Bug | Low | TBD | Open | Remove duplicate 'Banggood' from `src/data/warrantyStores.ts:150` |
| 2026-04-28 | 17.1 | 17 | TechDebt | Low | TBD | Open | Add `storeList` to useMemo deps in `StoreAutocomplete.tsx:149` to satisfy exhaustive-deps lint |
| 2026-04-28 | 17.1 | 17 | Enhancement | Medium | TBD | Open | `history.tsx:227,274` — search warranties by `productType`/`brand`/`model` for new records (currently only searches `productName`, misses new-format records) |
| 2026-04-28 | 17.1 | 17 | TechDebt | Low | TBD | Open | Add unit tests for `getProductDisplay()` (warranty/[id].tsx) and `getWarrantyProductLabel()` (warranties.tsx) backward-compat fallback chains |
