/**
 * Firebase Configuration — Punnagai Toy Store
 *
 * ⚠️  SETUP REQUIRED BEFORE THE WEBSITE WORKS
 * =============================================
 * Follow these steps to get your Firebase config:
 *
 * STEP 1 — Create a Firebase Project
 *   a. Go to https://console.firebase.google.com/
 *   b. Click "Add project" → name it "punnagai-toy-store" → Continue → Create project
 *
 * STEP 2 — Add a Web App
 *   a. In your project, click the </> (Web) icon
 *   b. App nickname: "Punnagai Toy Store Web" → Register app
 *   c. Copy the firebaseConfig object and paste it below (replacing the placeholders)
 *
 * STEP 3 — Enable Firestore Database
 *   a. Left sidebar → Build → Firestore Database → Create database
 *   b. Choose "Start in test mode" → Select a region (asia-south1 for India) → Enable
 *
 * STEP 4 — Enable Authentication
 *   a. Left sidebar → Build → Authentication → Get started
 *   b. Sign-in method → Email/Password → Enable → Save
 *
 * STEP 5 — Create the Admin User
 *   a. Authentication → Users → Add user
 *   b. Email:    admin@punnaagitoystore.com
 *      Password: Punnagai@admin321
 *   c. Click "Add user"
 *
 * STEP 6 — Set Firestore Security Rules
 *   a. Firestore Database → Rules tab → Replace with:
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /products/{productId} {
 *         allow read: if true;
 *         allow write: if request.auth != null;
 *       }
 *     }
 *   }
 *
 *   b. Click "Publish"
 *
 * =============================================
 * Once done, paste YOUR config below:
 */

// ⚠️ REPLACE THESE VALUES WITH YOUR ACTUAL FIREBASE CONFIG:
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

/**
 * Environment-based config resolution.
 *
 * For environments that can inject configuration at runtime (e.g. integration
 * tests, staging, or a server-rendered shell), set `window.__FIREBASE_CONFIG__`
 * BEFORE this script loads to override the placeholders above. Falls back to the
 * default placeholder config so the site keeps working out-of-the-box in local mode.
 */
const firebaseConfig = Object.assign(
  {},
  DEFAULT_FIREBASE_CONFIG,
  (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) || {}
);

// Check for mock mode — local mode whenever the API key is still the placeholder.
window.USE_LOCAL_MODE = firebaseConfig.apiKey === 'YOUR_API_KEY_HERE';

/**
 * Emulator toggle.
 *
 * Set `window.USE_FIREBASE_EMULATOR = true` (and provide a real config via
 * `window.__FIREBASE_CONFIG__`) before this script loads to route Firestore,
 * Auth, and Storage to the local Firebase Emulator Suite. This is what the
 * integration tests (task 1.3) use. Host/ports can be overridden via
 * `window.FIREBASE_EMULATOR_HOSTS`.
 */
const EMULATOR_DEFAULTS = {
  firestore: { host: 'localhost', port: 8080 },
  auth: { url: 'http://localhost:9099' },
  storage: { host: 'localhost', port: 9199 }
};

let db = null;
let auth = null;
let storage = null;
let functions = null;

if (!window.USE_LOCAL_MODE) {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
  storage = firebase.storage ? firebase.storage() : null;
  functions = firebase.functions ? firebase.functions() : null;

  if (window.USE_FIREBASE_EMULATOR) {
    const hosts = Object.assign({}, EMULATOR_DEFAULTS, window.FIREBASE_EMULATOR_HOSTS || {});
    try {
      db.useEmulator(hosts.firestore.host, hosts.firestore.port);
      auth.useEmulator(hosts.auth.url, { disableWarnings: true });
      if (storage) storage.useEmulator(hosts.storage.host, hosts.storage.port);
      console.log('🧪 Firebase Emulator Suite connected — Punnagai Toy Store');
    } catch (err) {
      console.error('Failed to connect to Firebase Emulator Suite:', err);
    }
  } else {
    console.log('🔥 Firebase initialized — Punnagai Toy Store');
  }
} else {
  console.log('⚡ Local Mode Activated — Using LocalStorage instead of Firebase');
  // Dummy objects so scripts don't crash when looking up db/auth/storage properties
  db = {};
  auth = {};
  storage = {};
}

// Expose globally so other scripts (data.js, admin.js) can reach the handles.
if (typeof window !== 'undefined') {
  window.db = db;
  window.auth = auth;
  window.storage = storage;
  window.functions = functions;
}
