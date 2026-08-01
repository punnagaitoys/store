# Integration tests

Firebase Emulator Suite + Jest integration tests for the **data access layer**
(`js/data.js` + `js/firebase-config.js`) Firestore branch. Run via:

```bash
npm run test:integration
```

This launches the Firestore/Auth/Storage emulators
(`firebase emulators:exec --project demo-punnagai --only firestore,auth,storage`)
and runs `jest tests/integration`. The emulator config lives in `firebase.json`
(+ `firestore.rules`, `storage.rules`, `.firebaserc`) at the repo root.

## Prerequisites

- **Java (JDK 11+)** — the Firebase emulators run on the JVM. Without a JRE/JDK
  on `PATH`, `firebase emulators:exec` cannot start and the integration tests
  will not run.
- `npm install` (the `firebase` compat SDK is a dev dependency used to drive the
  browser data layer from Node).

## How it works

`js/data.js` and `js/firebase-config.js` are written for the browser: they use
the global `firebase` v9 **compat** SDK, a global `window`, and a free
`db`/`auth`/`storage` handle. To exercise the _real_ Firestore branch under
Node/Jest, `helpers/emulator-harness.js`:

1. Loads the firebase **compat** SDK and exposes it as `global.firebase`
   (mirroring the CDN `<script>` tags).
2. Injects a runtime config + emulator flags via `window.__FIREBASE_CONFIG__`,
   `window.USE_FIREBASE_EMULATOR`, and `window.FIREBASE_EMULATOR_HOSTS` — the
   hooks `firebase-config.js` already exposes for integration tests.
3. Requires `js/firebase-config.js` (runs `initializeApp` + `useEmulator`) and
   mirrors the published `window.db/auth/storage` onto `global.*`.
4. Requires `js/data.js` and runs CRUD/cache calls against the emulator.

A `demo-*` project id (`demo-punnagai`) keeps the emulator fully offline, so no
real Firebase credentials are ever required. Between tests the harness wipes the
Firestore emulator via its REST endpoint for deterministic state.

## Test files

- `data-access.test.js` — CRUD on products, orders, users, and coupons.
- `cache.test.js` — 1-hour product cache & 1-day category cache hit/expiry
  behavior on top of emulator-backed reads (Requirement 1.9).
