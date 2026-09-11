// scripts/generate-env.js
// Generates js/env-config.js from environment variables or .env at build / dev time.
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const targetFile = path.join(rootDir, 'js', 'env-config.js');

// Parse basic .env file if present without requiring external dependency
const envVars = { ...process.env };
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed
          .slice(idx + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
        if (!envVars[k]) {
          envVars[k] = v;
        }
      }
    }
  } catch (err) {
    console.warn('[generate-env] Error reading .env file:', err.message);
  }
}

// Extract Firebase config keys with graceful fallbacks
const firebaseConfig = {
  apiKey: envVars.FIREBASE_API_KEY || 'AIzaSyDJsabqiKNFmBPgskZmgbAdAIOq__zI-os',
  authDomain: envVars.FIREBASE_AUTH_DOMAIN || 'punnagai-toy-store.firebaseapp.com',
  projectId: envVars.FIREBASE_PROJECT_ID || 'punnagai-toy-store',
  storageBucket: envVars.FIREBASE_STORAGE_BUCKET || 'punnagai-toy-store.firebasestorage.app',
  messagingSenderId: envVars.FIREBASE_MESSAGING_SENDER_ID || '748480682670',
  appId: envVars.FIREBASE_APP_ID || '1:748480682670:web:ba4ded0c0c3ec92f4deb3f',
  measurementId: envVars.FIREBASE_MEASUREMENT_ID || 'G-FNSVGV3KPK'
};

const outputContent = `/**
 * env-config.js — Auto-generated Environment Configuration
 * Generated at: ${new Date().toISOString()}
 * DO NOT COMMIT THIS FILE TO VERSION CONTROL
 */
(function () {
  'use strict';
  if (typeof window !== 'undefined') {
    window.__FIREBASE_CONFIG__ = ${JSON.stringify(firebaseConfig, null, 2)};
  }
})();
`;

fs.writeFileSync(targetFile, outputContent, 'utf8');
console.log(
  '[generate-env] Successfully generated js/env-config.js for project:',
  firebaseConfig.projectId
);
