# Redeemy - Product Brief

## 📋 Document Information
- **Product Name:** Redeemy
- **Version:** 1.0 (MVP)
- **Date:** April 16, 2026
- **Status:** Planning Phase
- **Document Owner:** Product Strategy

---

## 🎯 Executive Summary

Redeemy is a mobile application designed to solve a universal problem: **people lose money on expired store credits**. Whether from returned items or gift certificates, store credits are easy to forget, hard to find, and often expire unused. Redeemy provides a simple, intuitive digital wallet for managing all store credits in one place, with smart reminders and family sharing capabilities.

---

## 💡 Problem Statement

### The Problem
People regularly receive store credits from two main sources:
1. **Product Returns** - Instead of cash refunds, stores issue credit
2. **Gifts** - Gift certificates and store credit cards

### Current Pain Points
- ❌ **Credits expire unused** - People forget about them and lose money
- ❌ **Hard to locate** - Physical credits get lost or buried in photo galleries
- ❌ **No visibility** - When shopping, people don't know which stores they have credits for
- ❌ **No reminders** - Nothing alerts users before expiration
- ❌ **Fragmented management** - Credits scattered across wallets, photos, emails

### Impact
Every expired credit is money lost. For families managing multiple credits across different stores, this can add up to significant amounts annually.

---

## ✨ Solution Overview

Redeemy is a **mobile-first digital wallet** for store credits that enables users to:

1. **Capture & Store** - Photograph and digitally store all store credits
2. **Organize** - Categorize credits by store, category, and amount
3. **Never Forget** - Set customizable reminders before expiration
4. **Find Quickly** - Search by store name when shopping
5. **Share** - Transfer credits to others or sync with family members
6. **Track History** - Maintain an archive of redeemed credits

### Value Proposition
**"Never lose money on expired store credits again"**

Redeemy transforms scattered, forgettable paper credits into an organized, searchable, reminder-enabled digital system.

---

## 👥 Target Users

### Primary Audience
**Everyone** - This is a universal problem with no demographic restrictions:
- All age groups
- All genders
- Anyone who shops and receives store credits

### User Personas

#### Persona 1: "The Gift Receiver"
- Receives multiple gift cards during holidays and birthdays
- Struggles to remember which stores they have credits for
- Often discovers expired credits months later

#### Persona 2: "The Serial Returner"
- Frequently returns items and receives store credit
- Has credits across 5-10 different stores
- Wants to maximize value before expiration

#### Persona 3: "The Family Manager"
- Manages household shopping and finances
- Collects credits from multiple family members
- Needs shared visibility across the family

### Usage Patterns
- **Volume:** Variable - 0-4 active credits at any time
- **Seasonality:** Spikes around holidays, sales events, and return periods
- **Frequency:** Periodic additions, infrequent usage, constant monitoring

---

## 🚀 MVP Feature Specification

### 1. Add New Credit

#### Required Fields
- **Photo** (mandatory)
  - Camera integration for capturing credit image
  - Gallery import support
  - Image preview and editing

- **Store Name** (mandatory)
  - Text input field
  - Auto-complete from existing stores
  - New stores added automatically to store list

- **Amount** (mandatory)
  - Numeric input
  - Currency symbol (₪, $, €, etc.)
  - Decimal support

- **Category** (mandatory)
  - Hybrid approach:
    - Pre-defined categories: Fashion, Electronics, Food & Dining, Health & Beauty, Home & Garden, Sports & Outdoors, Entertainment, Services, Other
    - User can add custom categories
  - Dropdown selection with "Add New Category" option

- **Expiration Date** (mandatory)
  - Date picker
  - Calendar view
  - Format: DD/MM/YYYY or localized

- **Reminder** (mandatory)
  - Quick select options:
    - 1 Day before
    - 1 Week before
    - 1 Month before
    - 3 Months before
  - Custom input option (X days/weeks/months before)

- **Notes** (optional)
  - Free-text field
  - Examples: "Valid only at specific branches", "Cannot be combined with sales"
  - Multi-line support

#### User Flow: Add Credit
```
1. User taps "+" or "Add Credit" button
2. Camera opens OR option to choose from gallery
3. User captures/selects image
4. Form appears with image preview at top
5. User fills required fields (store, amount, category, expiration, reminder)
6. Optional: User adds notes
7. User taps "Save"
8. Credit appears in Active Credits list
9. If new store → automatically added to Stores list
10. Reminder scheduled automatically
```

---

### 2. Active Credits View

#### Display
- **List view** of all active (unredeemed) credits
- **Card-based UI** - each credit is a card showing:
  - Store name (prominent)
  - Amount (large, bold)
  - Category icon/label
  - Expiration date
  - Thumbnail of credit image
  - Days until expiration indicator (color-coded: green >30 days, yellow 7-30 days, red <7 days)

#### Sorting & Filtering
- **Sort by:**
  - Expiration date (soonest first - default)
  - Amount (highest first)
  - Store name (alphabetical)
  - Recently added

- **Filter by:**
  - Store
  - Category
  - Date range

- **Search:**
  - Text search across store names and notes

#### Actions
- Tap credit card → View Credit Details
- Swipe actions:
  - Mark as Redeemed
  - Edit
  - Delete
  - Share

---

### 3. Stores List

#### Display
- **List of all stores** that have active or historical credits
- Each store entry shows:
  - Store name
  - Number of active credits
  - Total active credit amount
  - Category icon (if applicable)

#### Features
- **Search bar** at top for filtering stores
- **Alphabetical sorting** by default
- **Tap store** → Shows all credits (active + redeemed) for that store

#### Auto-population
- When user adds a credit with a new store name
- Store is automatically added to this list
- No manual store management needed

---

### 4. Credit Details View

When user taps on a credit, full details screen shows:

- **Full-size image** of the credit (pinch to zoom)
- **All information:**
  - Store name
  - Amount
  - Category
  - Expiration date
  - Reminder setting
  - Notes (if any)
  - Date added

- **Actions:**
  - Edit any field
  - Mark as Redeemed
  - Share credit
  - Delete credit
  - View full-size image

---

### 5. Reminders & Notifications

#### Push Notifications
- Triggered automatically based on reminder setting
- **Notification content:**
  - Title: "Store Credit Expiring Soon!"
  - Body: "[Store Name] - ₪[Amount] expires in [X days]"
  - Tap notification → Opens credit details

#### In-App Alerts
- Badge on app icon showing number of expiring credits (< 7 days)
- Alert banner in app when credits are close to expiration

#### Reminder Management
- Users can edit reminder timing at any time
- Option to snooze reminder (1 day, 3 days, 1 week)
- Multiple reminders per credit (future enhancement)

---

### 6. Redeem Credit

#### Process
1. User marks credit as "Redeemed"
2. Optional: Enter actual amount used (if partial)
3. Optional: Add redemption note
4. Credit moves from "Active" to "Redeemed" archive

#### Redeemed Archive
- Separate view for redeemed credits
- Shows:
  - Original credit details
  - Date redeemed
  - Amount used (if specified)
  - Redemption notes
- **Purpose:** History tracking, record keeping, satisfaction of completion

#### Search & Filter
- Same search/filter capabilities as Active Credits
- Sort by redemption date, original expiration date, store, amount

---

### 7. Sharing Features

#### Share Individual Credit
- **Use case:** Give credit to a friend/family member
- **Flow:**
  1. User selects "Share" on a credit
  2. Choose recipient (from contacts or enter email/phone)
  3. Optional: Add message
  4. Credit transferred to recipient's account
  5. Credit removed from sender's active list
  6. Recipient receives notification

- **Technical:** Requires both users to have Redeemy accounts

#### Family/Group Sharing
- **Use case:** Shared household credit management
- **Features:**
  - Create a "Family Group"
  - Invite members (via email/phone)
  - **All credits visible to all members** in the group
  - Any member can add, edit, or redeem credits
  - Changes sync in real-time
  - Notifications to all members for expiring credits

- **UI Indication:**
  - Shared credits have a "family" icon
  - Show which member added the credit

- **Settings:**
  - Group name
  - Member management (add/remove)
  - Leave group option
  - One person can be in multiple groups

---

### 8. User Account & Cloud Sync

#### Account Creation
- **Sign up methods:**
  - Email + password
  - Google Sign-In
  - Apple Sign-In (iOS)

- **Required information:**
  - Email (for account recovery)
  - Name (for sharing features)

#### Cloud Sync
- **Automatic sync** across all devices
- **Real-time updates** when changes made on any device
- **Conflict resolution:** Last-write-wins with timestamp
- **Sync includes:**
  - All credit data
  - Images (stored in cloud)
  - Categories (custom)
  - Group memberships

#### Data Backup
- All data backed up to cloud automatically
- Users can restore if they reinstall app or get new device

#### Security
- **No PIN/Biometric required** for app launch
- Standard HTTPS encryption for data transmission
- Secure cloud storage (encrypted at rest)
- Account password requirements (standard strength)

---

## 🔄 User Flows

### Primary User Flow: Add & Redeem Credit

```
📱 User receives store credit (physical card/paper)
    ↓
🆕 Opens Redeemy → Taps "Add Credit"
    ↓
📸 Takes photo of credit
    ↓
✏️ Fills in: Store, Amount, Category, Expiration, Reminder
    ↓
💾 Saves credit
    ↓
✅ Credit appears in Active Credits list
    ↓
⏰ Reminder automatically scheduled
    ↓
⏳ [Time passes...]
    ↓
🔔 User receives reminder notification: "Store credit expiring in 1 week!"
    ↓
🛍️ User goes shopping at that store
    ↓
📱 Opens Redeemy → Finds credit in list or via Stores search
    ↓
💳 Views credit details → Uses credit in store
    ↓
✔️ Marks credit as "Redeemed"
    ↓
📦 Credit moves to Redeemed archive
```

### Secondary Flow: Family Sharing

```
👤 User A creates Family Group
    ↓
📧 Invites User B (spouse) via email
    ↓
📬 User B receives invitation → Accepts
    ↓
🔗 Both users now share all credits
    ↓
User A adds credit → Appears instantly for User B
    ↓
User B edits credit → Changes sync to User A
    ↓
🔔 Both receive reminder notifications
    ↓
User A redeems credit → Updated for User B
```

### Tertiary Flow: Shopping Discovery

```
🛍️ User walks into a mall/shopping area
    ↓
🤔 "Do I have any credits here?"
    ↓
📱 Opens Redeemy → Taps "Stores" tab
    ↓
🔍 Uses search or scrolls list
    ↓
👀 Sees "Zara - 2 active credits - ₪250"
    ↓
Taps Zara → Views both credits
    ↓
✅ Decides to shop there and use credits
```

---

## 🛠️ Technical Considerations

### Platform & Technology

#### Mobile Platforms
- **iOS** (iPhone)
  - Target: iOS 15+
  - Swift/SwiftUI or React Native

- **Android**
  - Target: Android 8.0+
  - Kotlin or React Native

#### Recommended Approach
- **Cross-platform framework:** React Native or Flutter
  - Single codebase for both platforms
  - Faster development
  - Easier maintenance
  - Native performance for this use case

### Backend & Infrastructure

#### Cloud Services
- **Backend-as-a-Service (BaaS)** recommended:
  - Firebase (Google)
  - AWS Amplify
  - Supabase

#### Required Services
- **Authentication:** User accounts, social login
- **Database:** Real-time sync, offline support
- **Storage:** Image hosting and CDN
- **Push Notifications:** FCM (Android) + APNs (iOS)
- **Analytics:** Usage tracking (optional)

#### Data Storage
- **Local:** SQLite or Realm for offline access
- **Cloud:** NoSQL database (Firestore, DynamoDB, PostgreSQL)
- **Images:** Cloud storage (Firebase Storage, S3)

### Key Technical Features

#### Offline Support
- App must work offline
- Queue changes and sync when online
- Local image caching

#### Image Handling
- Compress images before upload
- Thumbnail generation for list view
- Full-res storage for detail view
- Max image size limits (e.g., 5MB)

#### Real-time Sync
- WebSocket or similar for instant updates
- Family group changes propagate immediately
- Conflict resolution strategy

#### Push Notifications
- Schedule local notifications for reminders
- Cloud messaging for sharing notifications
- Notification permissions handling

#### Data Model (Simplified)

```
Users
- userId
- email
- name
- createdAt

Credits
- creditId
- userId
- groupId (nullable)
- storeName
- amount
- currency
- category
- expirationDate
- reminderDays
- notes
- imageUrl
- status (active/redeemed)
- redeemedDate (nullable)
- createdAt
- updatedAt

Stores
- (derived from Credits, no separate table needed)

Groups
- groupId
- groupName
- createdBy
- createdAt

GroupMembers
- groupId
- userId
- role (admin/member)
- joinedAt

Categories
- categoryId
- name
- isDefault (boolean)
- createdBy (nullable - null if default)
```

### Security & Privacy

#### Data Protection
- HTTPS only
- Encrypted data at rest
- Secure authentication tokens
- No sensitive financial data stored (credit card numbers, etc.)

#### Privacy
- Users own their data
- Clear data deletion policy
- GDPR compliance (if applicable)
- No data selling or third-party sharing

---

## 🚫 Out of Scope (Not in MVP)

The following features are explicitly **not included** in the first version:

1. **OCR / Automatic Recognition**
   - No automatic extraction of store name, amount, or expiration from photos
   - Manual entry only
   - *Future enhancement*

2. **GPS / Location-Based Features**
   - No automatic detection of nearby stores
   - No location-based reminders
   - *Future enhancement*

3. **PIN / Biometric Lock**
   - No app-level security lock
   - Relies on device security only
   - *May add later based on user feedback*

4. **Store Database Integration**
   - No API connections to stores
   - No automatic credit validation
   - No barcode/QR scanning
   - *Future B2B opportunity*

5. **Multi-Currency Conversion**
   - User enters amount as-is
   - No automatic currency conversion
   - *Future enhancement for international users*

6. **Partial Redemption Tracking**
   - Credits marked as fully redeemed only
   - *May add "partial use" tracking later*

7. **Receipt Scanning**
   - No integration with purchase receipts
   - *Future enhancement*

8. **Analytics Dashboard**
   - No "total credits saved" or usage statistics
   - *Future engagement feature*

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 2 - Enhanced Intelligence
- **OCR Integration:** Auto-extract data from credit images
- **Smart Reminders:** ML-based reminder optimization based on user behavior
- **Spending Insights:** Analytics on credits saved vs. expired

### Phase 3 - Discovery & Integration
- **Location Awareness:** "You're near [Store] - you have ₪150 credit!"
- **Store Partnerships:** Verified store integrations, digital-only credits
- **Barcode/QR Scanning:** Quick add via scanning credit barcodes

### Phase 4 - Monetization (if pursuing)
- **Premium Features:**
  - Unlimited credits (free tier limit)
  - Advanced analytics
  - Priority support
- **B2B Model:**
  - Store partnerships
  - White-label for retailers

### Phase 5 - Expansion
- **Web App:** Desktop access via browser
- **Browser Extension:** Auto-detect credits in emails
- **API:** Integration with finance tracking apps

---

## 📊 Success Metrics

### User Acquisition
- App downloads
- Active users (DAU/MAU)
- Registration completion rate

### Engagement
- **Primary:** Credits added per user
- **Primary:** Credits redeemed vs. expired ratio
- Credits viewed per session
- Reminder effectiveness (notification open rate)
- Search usage frequency

### Retention
- Day 7 retention
- Day 30 retention
- Monthly active users (MAU)

### Feature Adoption
- Family sharing usage %
- Categories created (custom)
- Share feature usage

### Business Value (User Perspective)
- Total credit value saved (not expired)
- User-reported savings
- App Store ratings & reviews

### Technical Health
- App crash rate
- Sync success rate
- Image upload success rate
- Push notification delivery rate

---

## 🎯 Success Criteria for MVP

The MVP will be considered successful if:

1. ✅ Users can add, view, and redeem credits without friction
2. ✅ Reminders effectively prevent credit expiration
3. ✅ Family sharing works reliably across devices
4. ✅ App is stable (crash rate < 1%)
5. ✅ Users report saving money (via surveys/reviews)
6. ✅ 60%+ of added credits are redeemed (not expired)
7. ✅ App Store rating > 4.0 stars

---

## 📅 Next Steps

### Immediate Next Steps
1. **UX Design:**
   - Wireframes for all screens
   - User flow diagrams
   - Interactive prototype

2. **Technical Architecture:**
   - Technology stack selection
   - Backend infrastructure design
   - Data model finalization

3. **Development Planning:**
   - Epic and story breakdown
   - Sprint planning
   - Resource allocation

### Design Priorities
- Simplicity above all - fast credit addition
- Visual hierarchy - most important info upfront
- Mobile-first - thumb-friendly interactions
- Accessibility - readable text, color contrast

### Development Priorities
- Core CRUD operations (Create, Read, Update, Delete credits)
- Image handling and storage
- Reminder scheduling
- Cloud sync
- Family sharing

---

## 📝 Appendix

### Terminology
- **Credit:** Store credit, gift card, refund voucher - any form of store value
- **Active Credit:** Credit that has not been redeemed
- **Redeemed Credit:** Credit that has been used/spent
- **Family Group:** Shared account for household members

### Assumptions
- Users have smartphones (iOS or Android)
- Users have internet connectivity (for sync)
- Users can read and navigate mobile apps
- Users want to maximize credit value

### Risks
- **Adoption:** Will users actually photograph and enter credits?
- **Habit Formation:** Can we make it sticky enough to become a habit?
- **Competition:** Are there existing solutions users already love?

### Open Questions
- Currency support - start with ₪ (Israeli Shekel) only or multi-currency?
- Language support - Hebrew, English, or both from start?
- App Store categories - Finance? Productivity? Lifestyle?

---

## ✅ Document Approval

This Product Brief serves as the foundation for all subsequent design, development, and launch activities for Redeemy MVP.

**Status:** ✅ Ready for UX Design Phase

---

*Generated by Mary, Business Analyst*
*For questions or clarifications, please refer to the source interviews and user research.*
