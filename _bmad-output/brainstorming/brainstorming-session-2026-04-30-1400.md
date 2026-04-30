---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'האם Redeemy מוכנה לשחרור / בדיקות בטא, ומה ניתן לשפר'
session_goals: 'לזהות פיצ׳רים חסרים, שיפורי עיצוב, הגדרות, ממשק, תמיכה נוספת, ולהחליט אם הגיע הזמן לצאת לבדיקות'
selected_approach: 'AI-Recommended Techniques'
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session — Redeemy App Readiness Review

**Date:** 2026-04-30
**Facilitator:** Claude (BMAD)
**User:** Moti

---

## Session Overview

**Topic:** האם Redeemy מוכנה לשחרור / בדיקות בטא, ומה ניתן לשפר?
**Goals:** לזהות פיצ׳רים חסרים, שיפורי עיצוב, הגדרות, ממשק, תמיכה נוספת, ולהחליט אם הגיע הזמן לצאת לבדיקות

### App Audit Summary (pre-session research)

**Status:** Feature-complete, production-ready with minor gaps.  
5 core features all implemented (Credits, Warranties, Subscriptions, Occasions, Documents).  
Family sharing, onboarding, history, notifications, i18n (he+en) — all complete.  
Main open items: App Store ID placeholder, Rate Us/Share disabled, no privacy policy/ToS.

---

## Ideas & Findings

### Security Fixes — DONE (2026-04-30)

**Firestore Rules — families collection:**
- Fixed: non-member could join any family without invite code (crafted `request.resource.data.members` bypass)
- Fixed: any member could promote themselves to admin by updating `adminId`
- Fixed: any member could rename family, regenerate invite code
- Solution: split update rule into 3 cases — admin (unrestricted), non-admin member (protected fields locked), non-member join (requires valid unexpired code, all critical fields immutable)

**Back navigation exit confirmation:**
- Created `src/hooks/useFormExitConfirmation.ts` using `usePreventRemove` from `@react-navigation/native`
- Applied to all 5 add forms (add-credit, add-warranty, add-subscription, add-occasion, add-document)
- Triggers on: Android hardware back button, iOS swipe-back gesture
- Condition: new item only (`!isEditing`), when user has entered data or moved past step 0
- Added i18n keys: `common.exitForm.title/message/confirm` in he.json + en.json

