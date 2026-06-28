/**
 * emulator-harness.js — load the browser data-access layer under Node/Jest.
 *
 * Task 1.3 requires exercising the *real* Firestore branch of js/data.js
 * (and js/firebase-config.js) against the Firebase Emulator Suite — not a
 * re-implementation. Both files are written for the browser: they expect a
 * global `firebase` (the v9 compat SDK), a global `window`, and a free
 * `db`/`auth`/`storage` handle created by firebase-config.js.
 *
 * APPROACH (documented for the spec):
 *   1. Load the firebase **compat** SDK in Node and expose it as `global.firebase`,
 *      exactly like the CDN `<script>` tags do in the browser.
 *   2. Inject a runtime config + emulator flags via `window.__FIREBASE_CONFIG__`
 *      / `window.USE_FIREBASE_EMULATOR` BEFORE loading firebase-config.js — the
 *      hooks the config file already exposes for integration tests.
 *   3. Require js/firebase-config.js so it runs initializeApp + useEmulator and
 *      publishes window.db/auth/storage, then mirror those onto `global.*` so the
 *      free `db` references inside data.js resolve to the emulator-backed handle.
 *   4. Require js/data.js and hand the module back to the test.
 *
 * The emulator endpoints come from `firebase emulators:exec` (npm run
 * test:integration). A `demo-*` project id keeps everything offline — no real
 * Firebase credentials are ever needed.
 */

const path = require('path');

const PROJECT_ID = 'demo-punnagai';

// Allow the emulator host/port to be overridden by the env that
// `firebase emulators:exec` sets, falling back to firebase.json defaults.
function firestoreHostPort() {
  const fromEnv = process.env.FIRESTORE_EMULATOR_HOST; // e.g. "127.0.0.1:8080"
  if (fromEnv) {
    const [host, port] = fromEnv.split(':');
    return { host, port: Number(port) };
  }
  return { host: '127.0.0.1', port: 8080 };
}

function makeLocalStorageShim() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

/**
 * Initialise the firebase compat SDK + the project's data layer against the
 * running Firestore emulator. Returns the loaded `data` module plus handles.
 */
function loadDataLayerAgainstEmulator() {
  const { host, port } = firestoreHostPort();

  // (1) Expose the compat SDK as the browser's global `firebase`.
  //
  // We load only app + firestore compat. The data-access layer (data.js) only
  // ever touches Firestore (`db.collection(...)` and
  // `firebase.firestore.FieldValue`); it never uses Auth or Storage. The
  // `firebase/compat/auth` Node build has a known incompatibility (it tries to
  // instantiate a browser-only popup/redirect resolver and throws
  // "Expected a class definition"), so we deliberately do NOT import it and
  // instead provide a minimal Auth stub that satisfies firebase-config.js's
  // `firebase.auth().useEmulator(...)` wiring. Storage is left undefined so
  // firebase-config.js's `firebase.storage ? ... : null` guard sets it to null.
  // The Auth/Storage emulators are still launched by `emulators:exec`, they just
  // aren't exercised by these data-access-layer tests.
  const firebaseCompat = require('firebase/compat/app');
  require('firebase/compat/firestore');
  const firebase = firebaseCompat.default || firebaseCompat;

  if (typeof firebase.auth !== 'function' || firebase.auth.__stubbed) {
    const authStub = () => ({ useEmulator() {} });
    authStub.__stubbed = true;
    firebase.auth = authStub;
  }

  global.firebase = firebase;

  // (2) Browser-style globals + injected runtime config / emulator flags.
  global.window = global.window || {};
  global.window.__FIREBASE_CONFIG__ = {
    apiKey: 'demo-api-key', // NOT the placeholder, so USE_LOCAL_MODE stays false
    authDomain: `${PROJECT_ID}.firebaseapp.com`,
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
    messagingSenderId: 'demo-sender',
    appId: 'demo-app'
  };
  global.window.USE_FIREBASE_EMULATOR = true;
  global.window.FIREBASE_EMULATOR_HOSTS = {
    firestore: { host, port },
    auth: { url: 'http://127.0.0.1:9099' },
    storage: { host: '127.0.0.1', port: 9199 }
  };
  global.localStorage = makeLocalStorageShim();

  // (3) Run the real firebase-config.js (initializeApp + useEmulator wiring).
  const configPath = path.resolve(__dirname, '../../../js/firebase-config.js');
  require(configPath);

  // Mirror the handles firebase-config published on window onto the Node global
  // scope so the free `db`/`auth`/`storage` references inside data.js resolve.
  global.db = global.window.db;
  global.auth = global.window.auth;
  global.storage = global.window.storage;

  // (4) Load the real data-access layer (Firestore branch active).
  const dataPath = path.resolve(__dirname, '../../../js/data.js');
  const data = require(dataPath);

  return { data, db: global.db, firebase };
}

/**
 * Wipe all documents from the Firestore emulator between tests so each test
 * starts from a clean, deterministic state. Uses the emulator's REST endpoint.
 */
async function clearFirestore() {
  const { host, port } = firestoreHostPort();
  const url = `http://${host}:${port}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 200) {
    throw new Error(`Failed to clear Firestore emulator: ${res.status} ${res.statusText}`);
  }
}

module.exports = {
  PROJECT_ID,
  loadDataLayerAgainstEmulator,
  clearFirestore,
  firestoreHostPort
};
