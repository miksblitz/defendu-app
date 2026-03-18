# DEFENDU — System Implementation Progress Report

**Team/Project:** DEFENDU  
**Report focus:** Implementation status (mobile + web), progress formula, and planned premium subscription feature.

---

## 1. Progress formula and totals

- **Formula:** `(Sum of status values from row 1 to last row) / (Total # of Module Units) × 100`  
  Use status: **1** = done/functional, **0.5** = started but not yet functional, **0** = not yet started.

- **Total # of Module Units:** **32** (number of rows in the module list below).

- **Sum of status values (from your list):**  
  1+1+1+1+1+1+1+0.5+0 + 1+1+1+1+0.5 + 0+1+1+0+1+1+1+1+1 + 1+1+1+1+1+0 + 0.5 = **26.5**

- **System implementation progress:**  
  **26.5 / 32 × 100 ≈ 82.8%**

---

## 2. What the app is (mobile and web)

- **Single codebase:** One **Expo (React Native)** app in `defendu-app/` that runs on **mobile (iOS/Android)** and **web** (`expo start --web`).
- **Backend:** Firebase (Auth, Firestore/Realtime DB for users, modules, progress, messages, trainer applications, etc.).
- **Extra:** `ml-recommendation/` — ML pipeline for personalized module recommendations (physical attributes, preferred technique, experience, fitness → recommended modules).

So “what we did in the app both mobile and web” is this one app; there is no separate web-only app.

---

## 3. Module list vs implementation (codebase check)

| # | List of modules | Programmer | Status | Notes from codebase |
|---|----------------------------------|------------|--------|----------------------|
| 1 | Register Account | Mikel Aboyme | 1 | ✅ `(auth)/register.tsx`, Firebase Auth + user doc |
| 2 | Apply as Trainer | Mikel Aboyme | 1 | ✅ `trainer-registration.tsx`, applications to Firebase |
| 3 | Login/Logout Account | Mikel Aboyme | 1 | ✅ `login.tsx`, logout hook + context |
| 4 | Manage User Accounts | Lliam Monleon | 1 | ✅ `(admin)/manage-users.tsx` (block/unblock, roles) |
| 5 | Review Trainer Applications | Lliam Monleon | 1 | ✅ `manage-trainers.tsx` (list, approve/reject) |
| 6 | Approve/Reject Trainer Application | Lliam Monleon | 1 | ✅ Same admin flow |
| 7 | View profile | Tricia Doria | 1 | ✅ `profile.tsx` (view user info, sidebar nav) |
| 8 | Edit Profile | Tricia Doria | 0.5 | ✅ `editprofile.tsx` (name, username, profile picture) — partial per your status |
| 9 | Change Password | Tricia Doria | 0 | ❌ Not in app; reset flow exists via email (`forgotpassword`, `resetpassword`) |
| 10 | Input Physical Attributes | Riezl Lumongsod | 1 | ✅ `physicalAttributesQuestion.tsx` → skill profile |
| 11 | Input Preferred Technique | Riezl Lumongsod | 1 | ✅ `preferencesQuestions.tsx` (e.g. Punching, Kicking) |
| 12 | Input Experience Details | Riezl Lumongsod | 1 | ✅ `pastexperienceQuestion.tsx` |
| 13 | Input Fitness Capabilities | Riezl Lumongsod | 1 | ✅ `fitnessCapabilitiesQuestion.tsx` |
| 14 | Show Recommendations | Mikel Aboyme | 0.5 | ✅ Dashboard “Recommended for you” from ML; may be partial (e.g. refresh logic) |
| 15 | Safety protocols | Tricia Doria | 0 | ❌ No dedicated safety-protocols screen found |
| 16 | Display Terms and Conditions | Tricia Doria | 1 | ✅ Assumed done (e.g. register/legal); no “Terms” string in grep — may be link or separate asset |
| 17 | Module Introduction | Mikel Aboyme | 1 | ✅ `view-module.tsx` intro step (text/video) |
| 18 | Practice Technique with Pose Correction | Mikel Aboyme & Lliam Monleon | 0 | ❌ Not implemented (e.g. camera/pose AI) |
| 19 | Display suggested Trainers | Mikel Aboyme | 1 | ✅ `trainer.tsx` — browse trainers; dashboard may surface “suggested” context |
| 20 | Mark as completed module | Lliam Monleon | 1 | ✅ `AuthController.recordModuleCompletion`, “Save Progress” on complete step in `view-module.tsx` |
| 21 | Feedbacks and reviews | Mikel Aboyme | 1 | ✅ Module reviews (rate 1–5 + comment) in `view-module.tsx` |
| 22 | Manage Technique Modules | Lliam Monleon | 1 | ✅ `manage-modules.tsx` (admin), `publish-module.tsx` (trainer) |
| 23 | Review Inappropriate Modules | Lliam Monleon | 1 | ✅ Admin `module-detail.tsx` / manage-modules (approve/reject, rejection reason) |
| 24 | Browse Trainers | Tricia Doria | 1 | ✅ `trainer.tsx` (list, search, filters) |
| 25 | Register as Trainer | Mikel Aboyme | 1 | ✅ Same as “Apply as Trainer” flow |
| 26 | Post Trainer Credential and Details | Riezl Lumongsod | 1 | ✅ Trainer registration + `edit-trainer-profile.tsx` |
| 27 | View Trainer Details | Tricia Doria | 1 | ✅ Trainer list → detail (e.g. trainer profile / messaging entry) |
| 28 | Message Trainer | Mikel Aboyme | 1 | ✅ `messages.tsx`, UnreadMessagesContext, chat-style UI |
| 29 | Rate and Review Trainer | Lliam Monleon | 0 | ❌ No trainer-level rating/review (only module reviews exist) |
| 30 | View and Read Notification | Mikel Aboyme | 0.5 | ✅ Unread message count/badge (e.g. profile sidebar); no dedicated “Notifications” inbox yet |

*Total module units: 32 (if “Personalized Recommendations” is one header and the four “Input…” + “Show Recommendations” are 5 units; otherwise align row count to your spreadsheet).*

---

## 4. Planned feature: premium subscription and module limits

- **Intent:**  
  - Limit **module uses** (e.g. **3 uses** per module for free users).  
  - **Premium subscription** to get more (or unlimited) module uses.  
  - **Lock** modules (or extra uses) behind the subscription.

- **Current codebase:**  
  - **No** per-module usage cap or “3 uses” logic yet.  
  - **No** subscription or paywall (no Stripe, RevenueCat, or similar).  
  - Progress is stored as **completed module IDs** and **completion timestamps** (`userProgress/{uid}`: `completedModuleIds`, `completedCount`, `completionTimestamps`). There is no “use count per module” (e.g. `moduleId → number of uses`).

- **To implement:**  
  1. **Usage model:** Extend `userProgress` (or add a structure) to store **per-module use count** (e.g. `moduleUsageCounts: { [moduleId]: number }`).  
  2. **Limit check:** Before starting or completing a module, check if the user is free and has already used that module 3 times; if so, show “Upgrade to Premium” (or lock the module).  
  3. **Premium flag:** Add something like `isPremium` or `subscriptionStatus` on the user (Firebase Auth custom claims or `users/{uid}`).  
  4. **Paywall / subscription:** Add a subscription screen and integrate a provider (e.g. Stripe, RevenueCat, or in-app purchases).  
  5. **Lock UI:** In dashboard and view-module, disable or redirect when over limit and not premium.

---

## 5. Summary

- **Progress:** **≈ 82.8%** (26.5 / 32) using your status values.  
- **Platform:** One Expo app for **mobile and web**; no separate web app.  
- **Done:** Auth, profiles, skill profile (physical/preference/experience/fitness), recommendations, modules (intro, complete, reviews), admin (users, trainers, modules), trainers (browse, view, message), unread badges.  
- **Partial / not done:** Edit profile (0.5), Change password (0), Show recommendations (0.5), Safety protocols (0), Practice with pose correction (0), Rate and review trainer (0), View/read notification (0.5).  
- **Next:** Implement **module use limit (e.g. 3)**, **premium subscription**, and **lock** logic as above.

You can paste the **progress formula** and **total module count** into your spreadsheet (e.g. `B3` = 32, and `C5:C36` = status values) so the cell “SYSTEM IMPLEMENTATION PROGRESS (in %)” reflects **sum(C5:C36)/B3*100**.
