# DevOps Pipeline — Redeemy

End-to-end CI/CD for the Redeemy Expo app. All workflows live under `.github/workflows/`.

## Branching model

| Branch    | Purpose                     | Triggers                                         |
| --------- | --------------------------- | ------------------------------------------------ |
| `main`    | Production releases         | EAS Build (production), EAS Update (production)  |
| `develop` | Integration / staging       | EAS Build (preview), EAS Update (preview)        |
| feature/* | Feature branches            | CI only (lint/typecheck/test)                    |

Open PRs into `develop`; promote `develop` → `main` for releases.

## Workflows

### 1. `ci.yml` — Quality gate
Runs on every PR + push to `main`/`develop`.
- `npm ci`
- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (expo lint)
- `npm run test:ci` (jest with coverage)

### 2. `eas-build.yml` — Native builds via EAS
- `develop` → `preview` profile (internal distribution)
- `main` → `production` profile (stores)
- `workflow_dispatch` for ad-hoc builds (choose profile + platform)

### 3. `eas-update.yml` — OTA updates
JS-only changes ship instantly without a new build.
- `develop` → `preview` branch
- `main` → `production` branch
- Skips doc-only / firebase-only / CI-only commits

### 4. `eas-submit.yml` — Store submission
Manual trigger only. Submits the latest EAS build to TestFlight / Google Play Internal.

### 5. `firebase-deploy.yml` — Rules + indexes
Deploys when `firebase/**`, `firebase.json`, or `.firebaserc` change. Uses a service account (preferred) or `FIREBASE_TOKEN`.

## Required GitHub Secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret                        | Purpose                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `EXPO_TOKEN`                  | EAS CLI auth. Generate at https://expo.dev/settings/access-tokens |
| `FIREBASE_SERVICE_ACCOUNT`    | JSON contents of a Firebase Admin service account (preferred)    |
| `FIREBASE_TOKEN`              | Fallback: `firebase login:ci` token                              |
| `GOOGLE_SERVICES_JSON`        | base64 of `google-services.json` (Android)                       |
| `GOOGLE_SERVICE_INFO_PLIST`   | base64 of `GoogleService-Info.plist` (iOS)                       |

### Encoding native credential files

```bash
base64 -i google-services.json | pbcopy
base64 -i GoogleService-Info.plist | pbcopy
```

Paste each into its GitHub secret.

## GitHub Environments

Create two environments under **Settings → Environments**:

- `development` — used by Firebase deploy on `develop`
- `production` — used by Firebase deploy on `main` and by `eas-submit.yml`

Add required reviewers on `production` so submits/deploys need manual approval.

## Local setup

```bash
npm install           # installs husky via the `prepare` script
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
npm run test:ci       # jest --ci --coverage
npm run format        # prettier --write .
```

A `pre-commit` hook runs `lint-staged` (Prettier + `expo lint --fix`) on staged files.

## Release flow

1. Merge feature PR → `develop` (triggers CI, preview build, preview OTA).
2. QA the preview build (internal distribution / TestFlight internal).
3. Promote `develop` → `main` via PR.
4. Merge to `main` triggers production build + production OTA.
5. Once build finishes, run **Actions → EAS Submit** manually to push to stores.

## Rollback

- **JS bug after OTA:** revert the offending commit on `main` and push — `eas-update.yml` will publish the reverted JS to the `production` channel within minutes.
- **Native bug:** revert, bump `runtimeVersion` only if native code changed, rebuild via EAS Build.

## Observability (next steps)

Not configured yet — recommended follow-ups:
- Sentry (`sentry-expo`) for crash/error reporting.
- Firebase Analytics + Crashlytics.
- EAS Insights for update adoption metrics.
