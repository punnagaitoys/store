/**
 * auth.js — Customer authentication glue (Punnagai / Punnagai Toy Store)
 *
 * BROWSER GLUE (not a pure module): wraps the Firebase Auth compat SDK
 * (`window.auth` from `firebase-config.js`) and manages the customer session.
 * Mirrors the hybrid pattern used by `js/data.js`: every operation checks
 * `window.USE_LOCAL_MODE` and, when `true`, falls back to a LocalStorage-backed
 * mock auth so the site works out-of-the-box with no real Firebase project.
 *
 * Responsibilities / Requirements:
 *  - 5.1: Registration form fields (name, email, phone, password) — validated
 *         here via `js/lib/validation.js` before any account is created.
 *  - 5.2: Email + phone format validation (delegated to PunnagaiValidation).
 *  - 5.3: Duplicate email → `{ success:false, error:'Email already exists' }`.
 *  - 5.4: Successful registration creates the account AND logs the customer in
 *         automatically (a session is written immediately).
 *  - 5.5/5.6: Login with email+password; bad credentials →
 *         `{ success:false, error:'Invalid email or password' }`.
 *  - 5.7: Successful login stores the session token + user session.
 *  - 5.11/4.5: Logout clears the `punnagai_user` session AND clears the
 *         wishlist (via `PunnagaiWishlist.clearOnLogout`). Redirect to the home
 *         page is UI concern handled by task 7.3 — this layer only returns the
 *         result of clearing the session.
 *  - 5.10: Customer addresses are intentionally NOT persisted here.
 *
 * Session schema (design.md → Session User), stored in `sessionStorage`:
 *   sessionStorage['punnagai_user'] = JSON.stringify({
 *     user: { userId, email, name, isAdmin },
 *     sessionToken: "<firebase id token | local mock token>"
 *   })
 *
 * Return convention (matches data.js): `{ success: true, ... }` on success,
 * `{ success: false, error: '<message>' }` on failure.
 *
 * Load order (browser): `js/lib/validation.js` and `js/lib/wishlist.js` must
 * load BEFORE this file; this file must load AFTER `firebase-config.js` and
 * `data.js` (it calls `createUser`/`getUserByEmail`).
 */
(function () {
  'use strict';

  /** sessionStorage key holding the serialized customer session. */
  const SESSION_KEY = 'punnagai_user';

  /** localStorage key holding mock-auth credentials (LOCAL MODE only). */
  const MOCK_AUTH_KEY = 'punnagai_mock_auth';

  // ──────────────────────────────────────────────────────────────────────
  // Dependency resolution (defensive — works even if load order slips).
  // ──────────────────────────────────────────────────────────────────────

  /** @returns {boolean} Whether the app is running in LocalStorage mock mode. */
  function isLocalMode() {
    return typeof window !== 'undefined' && window.USE_LOCAL_MODE === true;
  }

  /** @returns {object} The validation API (throws-safe accessor). */
  function getValidation() {
    if (typeof window !== 'undefined' && window.PunnagaiValidation) {
      return window.PunnagaiValidation;
    }
    if (typeof PunnagaiValidation !== 'undefined') {
      return PunnagaiValidation;
    }
    return null;
  }

  /**
   * Injectable data-layer functions (createUser/getUserByEmail/updateUser).
   * In the browser these come from `js/data.js` (classic-script globals exposed
   * on `window`). Under Node/Jest, a test can inject them via `setDataLayer()`.
   * @type {{createUser?:Function, getUserByEmail?:Function, updateUser?:Function}}
   */
  let injectedDataLayer = {};

  /**
   * Inject data-layer functions for environments where data.js globals are not
   * present (e.g. Jest). Primarily a testing/seam convenience.
   * @param {{createUser?:Function, getUserByEmail?:Function, updateUser?:Function}} deps
   */
  function setDataLayer(deps) {
    injectedDataLayer = deps || {};
  }

  /**
   * Resolve a data-layer function by name: injected override → global on
   * `window` → bare global (classic script) → null.
   * @param {string} name
   * @returns {?Function}
   */
  function getDataFn(name) {
    if (injectedDataLayer && typeof injectedDataLayer[name] === 'function') {
      return injectedDataLayer[name];
    }
    if (typeof window !== 'undefined' && typeof window[name] === 'function') {
      return window[name];
    }
    return null;
  }

  /** Call a resolved data-layer fn; throws a clear error if unavailable. */
  function callDataFn(name, args) {
    const fn = getDataFn(name);
    if (!fn) {
      throw new Error('Data layer function "' + name + '" is not available');
    }
    return fn.apply(null, args || []);
  }

  /** @returns {?Storage} sessionStorage if available, else null. */
  function getSessionStore() {
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage) {
        return sessionStorage;
      }
    } catch (e) {
      /* sandboxed / unavailable */
    }
    return null;
  }

  /** @returns {?Storage} localStorage if available, else null. */
  function getLocalStore() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage;
      }
    } catch (e) {
      /* sandboxed / unavailable */
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Session helpers (`punnagai_user`).
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Persist the customer session (user + token) to sessionStorage.
   * @param {{userId:string,email:string,name:string,isAdmin:boolean}} user
   * @param {string} sessionToken
   * @returns {boolean} True when the write succeeded.
   */
  function storeSession(user, sessionToken) {
    const store = getSessionStore();
    if (!store) {
      return false;
    }
    try {
      store.setItem(
        SESSION_KEY,
        JSON.stringify({ user: user, sessionToken: sessionToken })
      );
      return true;
    } catch (e) {
      console.error('Failed to store session:', e);
      return false;
    }
  }

  /**
   * Read the full raw session object `{ user, sessionToken }` or null.
   * @returns {?{user:object, sessionToken:string}}
   */
  function getSession() {
    const store = getSessionStore();
    if (!store) {
      return null;
    }
    let raw;
    try {
      raw = store.getItem(SESSION_KEY);
    } catch (e) {
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.user) {
        return parsed;
      }
    } catch (e) {
      /* malformed — treat as no session */
    }
    return null;
  }

  /**
   * Get the currently logged-in user object, or null when signed out.
   * @returns {?{userId:string,email:string,name:string,isAdmin:boolean}}
   */
  function getCurrentUser() {
    const session = getSession();
    return session ? session.user : null;
  }

  /** @returns {boolean} Whether a customer session is currently active. */
  function isLoggedIn() {
    return getSession() !== null;
  }

  /**
   * Remove the `punnagai_user` session from storage.
   * @returns {void}
   */
  function clearSession() {
    const store = getSessionStore();
    if (!store) {
      return;
    }
    try {
      store.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Mock-auth credential store (LOCAL MODE only).
  // ──────────────────────────────────────────────────────────────────────

  /** @returns {Array<{userId,name,email,phone,password}>} mock credentials. */
  function getMockAuthUsers() {
    const store = getLocalStore();
    if (!store) {
      return [];
    }
    try {
      return JSON.parse(store.getItem(MOCK_AUTH_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  /** Persist the mock credential list. @param {Array} users */
  function saveMockAuthUsers(users) {
    const store = getLocalStore();
    if (!store) {
      return;
    }
    try {
      store.setItem(MOCK_AUTH_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to persist mock auth users:', e);
    }
  }

  /** Generate a non-secret mock session token for local mode. */
  function generateLocalToken() {
    return 'local_token_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Public API: register / login / logout.
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a new customer (Requirements 5.1–5.4).
   *
   * Flow: validate email+phone (and name/password) → detect duplicate email →
   * create the auth account + a `users` doc (via data.js `createUser`) → store
   * the session immediately (auto-login).
   *
   * @param {string} name
   * @param {string} email
   * @param {string} phone
   * @param {string} password
   * @returns {Promise<{success:boolean, user?:object, error?:string, errors?:object}>}
   */
  async function register(name, email, phone, password) {
    const validation = getValidation();
    if (!validation) {
      return { success: false, error: 'Validation module not loaded' };
    }

    // Requirement 5.2: validate email + phone (plus name + password strength).
    const check = validation.validateRegistration({ name, email, phone, password });
    if (!check.valid) {
      // Surface the first error as `error` (for simple UIs) plus the full map.
      const firstKey = Object.keys(check.errors)[0];
      return { success: false, error: check.errors[firstKey], errors: check.errors };
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = validation.normalizeIndianPhone(phone) || String(phone).trim();

    try {
      // Requirement 5.3: duplicate-email detection (users collection is the
      // shared source of truth across both modes).
      const existing = await callDataFn('getUserByEmail', [normalizedEmail]);
      if (existing) {
        return { success: false, error: 'Email already exists' };
      }

      let userId;
      let sessionToken;

      if (isLocalMode()) {
        // Also guard the mock credential store against duplicates.
        const mockUsers = getMockAuthUsers();
        if (mockUsers.some((u) => u.email === normalizedEmail)) {
          return { success: false, error: 'Email already exists' };
        }

        // Create the users doc (data.js) — its id becomes the userId.
        const created = await callDataFn('createUser', [{
          name: name,
          email: normalizedEmail,
          phone: normalizedPhone,
          isAdmin: false,
          status: 'active',
          lastLogin: Date.now()
        }]);
        if (!created.success) {
          return { success: false, error: created.error || 'Failed to create account' };
        }
        userId = created.id;

        // Persist mock credentials so the customer can log in later.
        mockUsers.push({
          userId: userId,
          name: name,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: password
        });
        saveMockAuthUsers(mockUsers);

        sessionToken = generateLocalToken();
      } else {
        // Firebase mode: create the Auth account.
        let credential;
        try {
          credential = await window.auth.createUserWithEmailAndPassword(
            normalizedEmail,
            password
          );
        } catch (err) {
          if (err && err.code === 'auth/email-already-in-use') {
            return { success: false, error: 'Email already exists' };
          }
          console.error('Registration error:', err);
          return { success: false, error: (err && err.message) || 'Failed to create account' };
        }

        // Create the matching users doc (data.js).
        const created = await callDataFn('createUser', [{
          name: name,
          email: normalizedEmail,
          phone: normalizedPhone,
          isAdmin: false,
          status: 'active',
          lastLogin: Date.now()
        }]);
        userId = created && created.success ? created.id : (credential.user && credential.user.uid);

        try {
          sessionToken = await credential.user.getIdToken();
        } catch (e) {
          sessionToken = (credential.user && credential.user.uid) || '';
        }
      }

      const user = {
        userId: userId,
        email: normalizedEmail,
        name: name,
        isAdmin: false
      };

      // Requirement 5.4: auto-login — store the session immediately.
      storeSession(user, sessionToken);

      return { success: true, user: user };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: (err && err.message) || 'Failed to create account' };
    }
  }

  /**
   * Log a customer in (Requirements 5.5–5.7).
   *
   * On bad credentials returns `{ success:false, error:'Invalid email or
   * password' }`. On success stores the session token + user session.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success:boolean, user?:object, error?:string}>}
   */
  async function login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const invalidResult = { success: false, error: 'Invalid email or password' };

    if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
      return invalidResult;
    }

    try {
      let user;
      let sessionToken;

      if (isLocalMode()) {
        const mockUsers = getMockAuthUsers();
        const match = mockUsers.find(
          (u) => u.email === normalizedEmail && u.password === password
        );
        if (!match) {
          return invalidResult;
        }

        // Pull the canonical user doc for name/isAdmin if present.
        const userDoc = await callDataFn('getUserByEmail', [normalizedEmail]);
        user = {
          userId: match.userId,
          email: normalizedEmail,
          name: (userDoc && userDoc.name) || match.name || '',
          isAdmin: Boolean(userDoc && userDoc.isAdmin)
        };
        sessionToken = generateLocalToken();

        if (userDoc && userDoc.id) {
          // Best-effort lastLogin update; ignore failures.
          try { await callDataFn('updateUser', [userDoc.id, { lastLogin: Date.now() }]); } catch (e) {}
        }
      } else {
        let credential;
        try {
          credential = await window.auth.signInWithEmailAndPassword(
            normalizedEmail,
            password
          );
        } catch (err) {
          // Map any Firebase auth failure to a single generic message (5.6).
          return invalidResult;
        }

        const userDoc = await callDataFn('getUserByEmail', [normalizedEmail]);
        user = {
          userId: (userDoc && userDoc.id) || (credential.user && credential.user.uid),
          email: normalizedEmail,
          name: (userDoc && userDoc.name) || (credential.user && credential.user.displayName) || '',
          isAdmin: Boolean(userDoc && userDoc.isAdmin)
        };
        try {
          sessionToken = await credential.user.getIdToken();
        } catch (e) {
          sessionToken = (credential.user && credential.user.uid) || '';
        }

        if (userDoc && userDoc.id) {
          try { await callDataFn('updateUser', [userDoc.id, { lastLogin: Date.now() }]); } catch (e) {}
        }
      }

      // Requirement 5.7: store the session token + user session.
      storeSession(user, sessionToken);
      return { success: true, user: user };
    } catch (err) {
      console.error('Login error:', err);
      return invalidResult;
    }
  }

  /**
   * Log the customer out (Requirements 5.11 / 4.5).
   *
   * Clears the `punnagai_user` session AND the wishlist. Signs out of Firebase
   * Auth when not in local mode. Redirecting to the home page is a UI concern
   * handled by task 7.3 — this returns the result so the caller can redirect.
   *
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  async function logout() {
    try {
      if (!isLocalMode() && window.auth && typeof window.auth.signOut === 'function') {
        try { await window.auth.signOut(); } catch (e) { /* continue clearing */ }
      }

      // Clear the customer session.
      clearSession();

      // Requirement 4.5 / 5.11: clear the wishlist on logout. Called defensively
      // so auth.js does not hard-depend on wishlist load timing.
      if (
        typeof window !== 'undefined' &&
        window.PunnagaiWishlist &&
        typeof window.PunnagaiWishlist.clearOnLogout === 'function'
      ) {
        window.PunnagaiWishlist.clearOnLogout();
      }

      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false, error: (err && err.message) || 'Failed to log out' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Expose the API.
  // ──────────────────────────────────────────────────────────────────────

  const api = {
    SESSION_KEY: SESSION_KEY,
    register: register,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    // exposed for UI/session reuse
    storeSession: storeSession,
    clearSession: clearSession,
    // testing/injection seam (data.js globals fallback)
    setDataLayer: setDataLayer
  };

  if (typeof window !== 'undefined') {
    window.PunnagaiAuth = api;
  }

  // Node / Jest: expose via CommonJS so the logic is testable in local mode.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
