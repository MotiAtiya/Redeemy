# Story 18.1: Admin Dashboard — Foundation, Auth & Theme

**Epic:** 18 — Admin Dashboard
**Story Key:** 18-1-admin-dashboard-foundation-auth-and-theme
**Author:** Moti
**Date:** 2026-05-03
**Status:** done

---

## User Story

As Moti (the only admin user of Redeemy),
I want a deployed Next.js admin web app with login that only my email can access, Hebrew/English toggle with RTL/LTR support, and a visual identity that matches the Redeemy mobile app,
So that I have a secure, on-brand foundation to build the actual dashboard pages on top of.

---

## Background & Context

This is the **first story of Epic 18** — Redeemy's web admin dashboard. It scaffolds a brand-new Next.js project, sets up the Firebase Admin SDK connection to the existing Redeemy Firebase project, gates the entire app behind a single-email allowlist, configures Hebrew (default) + English with proper RTL/LTR direction switching, and applies a Tailwind theme that matches the mobile app's Sage-teal Wallet-card style.

It does NOT implement any actual dashboard content — that comes in Stories 18.2, 18.3, 18.4. After this story, hitting `/` will show a logged-in shell with a top navigation bar, language toggle, sign-out button, and a placeholder home screen that says "Welcome, Moti." Anyone whose email is not in the allowlist must be denied access.

**Repository decision:** This is a **separate repository** named `redeemy-admin`, not a folder in the existing Redeemy mobile-app repo. Justification is in the tech spec (different runtime, different deploy target, cleanest secret separation).

**What this story does NOT implement:**
- User List screen (Story 18.2)
- Recent Activity Feed (Story 18.2)
- Mobile-app event logging (Story 18.2)
- Health Status Banner (Story 18.3)
- Cost Widget (Story 18.3)
- Daily Digest Email (Story 18.4)
- Mobile-responsive polish (Story 18.4) — basic responsiveness yes, but no phone-specific tuning
- Dark mode — V1 is light mode only

---

## Acceptance Criteria

### Repository & Project Setup

**Given** a fresh `redeemy-admin` Git repository
**When** the project is initialized
**Then**:
- `npx create-next-app@latest redeemy-admin --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` has been run (Next.js 15+, App Router)
- `tsconfig.json` has `strict: true`
- `.gitignore` excludes `.env.local`, `.env*.local`, `node_modules`, `.next`
- README.md documents how to run dev (`npm run dev`), build, and deploy

### Dependencies

**Given** the project has been scaffolded
**Then** these packages are installed:
- `firebase` (web SDK — for client login)
- `firebase-admin` (server SDK — for Firestore reads)
- `next-intl` (i18n)
- `lucide-react` (icons)
- All shadcn/ui primitives needed for V1: `button`, `card`, `dropdown-menu`, `avatar`, `separator`, `badge`
  - Initialized via `npx shadcn@latest init`

### Environment Variables

**Given** the deployment is configured
**Then** these env vars are documented in `.env.example` and set in Vercel:
- `FIREBASE_ADMIN_PROJECT_ID` — Redeemy production project ID
- `FIREBASE_ADMIN_CLIENT_EMAIL` — service account email
- `FIREBASE_ADMIN_PRIVATE_KEY` — service account private key (newlines escaped)
- `NEXT_PUBLIC_FIREBASE_API_KEY` — for client-side Firebase Auth
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `ADMIN_EMAILS` — comma-separated allowlist; initially `a.moti96@gmail.com`
- `SESSION_SECRET` — 32+ char random string for signing session cookies
- `NEXT_PUBLIC_DEFAULT_LOCALE` — `he`

### Firebase Admin Initialization

**Given** server-side code needs Firestore access
**When** `src/lib/firebaseAdmin.ts` is imported
**Then**:
- A singleton `adminApp` is created (idempotent — does not double-initialize on hot reload)
- Exports: `adminAuth`, `adminFirestore`, `adminStorage`
- Service account is loaded from env vars
- Throws a clear error if any required env var is missing

### Auth Gate

**Given** an unauthenticated user visits any page (other than `/login` and `/api/*` public routes)
**Then**:
- They are redirected to `/login`

**Given** the user is on `/login`
**When** they submit valid Firebase credentials (email + password) OR sign in with Google via Firebase Auth
**Then**:
- Client receives an ID token
- Client posts the ID token to `/api/auth/session`
- Server verifies the token via `adminAuth.verifyIdToken()`
- Server checks the email is in the `ADMIN_EMAILS` allowlist (case-insensitive)
- If email is in allowlist: server creates a signed session cookie (HTTP-only, Secure, SameSite=Lax, 7-day expiry) and returns 200
- If email is NOT in allowlist: server returns 403 with message "Access denied — this account is not authorized" and the client signs out from Firebase Auth

**Given** the user has a valid session cookie
**When** they visit `/`
**Then**:
- The home shell renders (top bar, sign-out button, placeholder content)
- Their email is displayed in the top bar

**Given** the user clicks "Sign out"
**Then**:
- Server clears the session cookie via `/api/auth/sign-out`
- Client signs out of Firebase Auth
- User is redirected to `/login`

### Middleware

**Given** any request hits the app
**When** Next.js middleware runs (`src/middleware.ts`)
**Then**:
- Public paths (`/login`, `/api/auth/*`, static assets, `/_next/*`) are allowed without a session cookie
- All other paths require a valid session cookie
- Invalid/expired session → redirect to `/login` (preserve original URL via `?from=` query param)

### i18n & RTL/LTR

**Given** the app is deployed
**When** a user visits `/`
**Then**:
- Default locale is Hebrew (`he`); `<html dir="rtl" lang="he">` is set
- A locale toggle pill in the top bar switches between `he` and `en`
- Switching to English: `<html dir="ltr" lang="en">` and all UI strings update
- Locale persists across page reloads via cookie `NEXT_LOCALE`
- All UI strings live in `messages/he.json` and `messages/en.json` — no hardcoded user-facing text in components

### Theme & Visual Identity

**Given** the app renders any page
**Then**:
- `tailwind.config.ts` defines `sage` color tokens identical to the mobile app's `src/theme/colors.ts` (copy from the mobile repo)
- The Heebo font is loaded via `next/font/google` and applied as the default font family
- Cards use the wallet shadow token: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Border radius scale: cards `rounded-xl` (12px); buttons `rounded-lg` (8px)
- Top bar uses the Sage-teal primary color
- All margin/padding utilities use logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) — never `ml-*`/`mr-*`/`pl-*`/`pr-*`
- A "Welcome, Moti" placeholder home screen renders inside the shell

### Layout Shell

**Given** the user is authenticated
**Then** the shell consists of:
- Top bar: Redeemy logo (text "Redeemy Admin") on the start side, locale toggle + user avatar dropdown (email + sign-out) on the end side
- Main content area: max-width container, padded
- A placeholder "Welcome, Moti" card on the home page

### Deployment

**Given** the project is pushed to GitHub
**When** the repository is connected to Vercel
**Then**:
- Vercel auto-builds and deploys on push to `main`
- All env vars are set in Vercel (production environment only)
- The deployed URL works end-to-end: login → dashboard shell → sign-out
- Domain is either `redeemy-admin.vercel.app` (default) OR `admin.redeemy.app` if DNS is configured

### Quality

**Given** the code is committed
**Then**:
- `npm run build` succeeds with zero errors
- `npx tsc --noEmit` passes with zero errors
- `npm run lint` passes
- No service-account secrets in the client bundle (verify via `next build` output inspection)

---

## Technical Notes

### Project Structure

```
redeemy-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: <html dir>, fonts, providers
│   │   ├── page.tsx                    # Home (placeholder for now)
│   │   ├── login/
│   │   │   └── page.tsx                # Firebase Auth login UI
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── session/route.ts    # POST: verify ID token, set session cookie
│   │   │       └── sign-out/route.ts   # POST: clear session cookie
│   │   └── globals.css                 # Tailwind directives
│   ├── components/
│   │   ├── shell/
│   │   │   ├── TopBar.tsx
│   │   │   ├── LocaleToggle.tsx
│   │   │   └── UserMenu.tsx
│   │   └── ui/                          # shadcn primitives (auto-generated)
│   ├── lib/
│   │   ├── firebaseAdmin.ts            # Server-only: adminApp, adminAuth, adminFirestore
│   │   ├── firebaseClient.ts           # Client-only: signIn, signOut, onAuthStateChanged
│   │   ├── session.ts                  # Server: createSession, verifySession, clearSession (signed JWT)
│   │   └── allowlist.ts                # Server: isEmailAllowed(email)
│   ├── middleware.ts                    # Auth gate
│   └── i18n/
│       ├── config.ts                    # next-intl config
│       └── request.ts                   # next-intl request helper
├── messages/
│   ├── he.json
│   └── en.json
├── public/
│   └── (logo placeholder)
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

### `firebaseAdmin.ts` (server only)

```typescript
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin env vars');
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminFirestore = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
```

### `allowlist.ts` (server only)

```typescript
export function isEmailAllowed(email: string): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
```

### `session.ts` (signed JWT in HTTP-only cookie)

Use `jose` library (Edge-compatible, recommended over `jsonwebtoken` for Next.js middleware):

```typescript
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const COOKIE_NAME = 'redeemy_admin_session';
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSession(payload: { uid: string; email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(SECRET);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { uid: string; email: string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_TTL = TTL_SECONDS;
```

### `middleware.ts`

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/session';

const PUBLIC_PATHS = ['/login', '/api/auth/session', '/api/auth/sign-out'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### `/api/auth/session/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';
import { isEmailAllowed } from '@/lib/allowlist';
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL } from '@/lib/session';

export async function POST(req: Request) {
  const { idToken } = await req.json();
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }
  const email = decoded.email?.toLowerCase();
  if (!email || !isEmailAllowed(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const token = await createSession({ uid: decoded.uid, email });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return NextResponse.json({ ok: true });
}
```

### `tailwind.config.ts` — Sage-teal palette

Copy these exact hex values from the mobile app's `src/theme/colors.ts` light-mode palette into the `sage` color scale below. The values shown here are placeholders; replace with the actual mobile-app values before merging:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // PASTE FROM mobile-app src/theme/colors.ts — these are placeholders
        sage: {
          50:  '#F2F7F5',
          100: '#E0EDE7',
          200: '#BFD8CD',
          300: '#9BC2B0',
          400: '#6FA68C',
          500: '#4A8A6E',  // primary
          600: '#3A6E58',
          700: '#2C5443',
          800: '#1F3D31',
          900: '#142822',
        },
      },
      boxShadow: {
        wallet: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### `app/layout.tsx`

```typescript
import { Heebo } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo' });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir} className={heebo.variable}>
      <body className="font-sans bg-sage-50 text-sage-900 min-h-screen">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Login page

Use Firebase Auth web SDK directly (no FirebaseUI dependency for V1):

```typescript
'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  // ... form handlers that call signInWithEmailAndPassword,
  //     then POST the resulting ID token to /api/auth/session
  //     handle 403 by signing out and showing "Access denied"
}
```

### i18n strings (initial set)

`messages/he.json`:
```json
{
  "common": {
    "appName": "Redeemy Admin",
    "signOut": "התנתק",
    "signIn": "התחברות",
    "email": "אימייל",
    "password": "סיסמה",
    "accessDenied": "אין לחשבון זה הרשאת גישה",
    "language": "שפה"
  },
  "home": { "welcome": "ברוך הבא, {name}" }
}
```

`messages/en.json`:
```json
{
  "common": {
    "appName": "Redeemy Admin",
    "signOut": "Sign out",
    "signIn": "Sign in",
    "email": "Email",
    "password": "Password",
    "accessDenied": "This account is not authorized",
    "language": "Language"
  },
  "home": { "welcome": "Welcome, {name}" }
}
```

### Logical-property reminder

Tailwind v3.3+ ships logical properties. Use:
- `ms-*` instead of `ml-*` (margin-inline-start)
- `me-*` instead of `mr-*` (margin-inline-end)
- `ps-*` instead of `pl-*`, `pe-*` instead of `pr-*`
- `start-*` / `end-*` instead of `left-*` / `right-*`

This is the equivalent of the mobile-app rule: prefer logical sides so a single class works in both RTL and LTR.

---

## Dependencies / Sequencing

- **Hard dependency:** Mobile-app's existing Firebase project (production) is operational. Service-account credentials must be generated via Firebase Console → Project Settings → Service Accounts.
- **Hard dependency:** Vercel account (free tier).
- **No mobile-app code changes in this story.** Mobile-app event-logging changes are in Story 18.2.

---

## Done Definition

- [ ] All Acceptance Criteria pass
- [ ] Deployed to Vercel production
- [ ] Login flow tested end-to-end with `a.moti96@gmail.com` (success) AND a non-allowlisted email (deny)
- [ ] Locale toggle tested (he ↔ en, RTL ↔ LTR direction switch verified visually)
- [ ] Theme matches mobile-app Sage-teal palette (visual side-by-side check)
- [ ] No service-account secret in client bundle (`grep` build output)
- [ ] README updated with run/deploy instructions
