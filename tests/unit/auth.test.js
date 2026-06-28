/**
 * Unit tests — js/auth.js (customer auth glue) in LOCAL MODE.
 *
 * Covers task 7.1: register/login/logout against the LocalStorage-backed mock
 * auth, duplicate-email detection (Req 5.3), auto-login on register (Req 5.4),
 * the "Invalid email or password" path (Req 5.6), session-token storage
 * (Req 5.7), and wishlist clearance on logout (Req 5.11 / 4.5).
 *
 * Firebase mode is browser/integration-only; here we shim window + storage,
 * force USE_LOCAL_MODE, wire in the real validation + wishlist modules, and
 * inject a tiny in-memory data layer for createUser/getUserByEmail/updateUser.
 */

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

global.window = { USE_LOCAL_MODE: true };
global.sessionStorage = makeStorage();
global.localStorage = makeStorage();

const validation = require('../../js/lib/validation');
const wishlist = require('../../js/lib/wishlist');

global.window.PunnagaiValidation = validation;
global.window.PunnagaiWishlist = wishlist;

const auth = require('../../js/auth');

// In-memory mock data layer (mirrors data.js createUser/getUserByEmail shape).
function makeMockDataLayer() {
  let users = [];
  let seq = 0;
  return {
    createUser: async (u) => {
      seq += 1;
      const rec = { id: 'user_' + seq, ...u };
      users.push(rec);
      return { success: true, id: rec.id };
    },
    getUserByEmail: async (email) =>
      users.find((u) => u.email === email) || null,
    updateUser: async (id, updates) => {
      const i = users.findIndex((u) => u.id === id);
      if (i !== -1) users[i] = { ...users[i], ...updates };
      return { success: true };
    },
    _reset: () => {
      users = [];
      seq = 0;
    }
  };
}

const mockData = makeMockDataLayer();
auth.setDataLayer(mockData);

beforeEach(() => {
  global.sessionStorage.clear();
  global.localStorage.clear();
  mockData._reset();
});

const VALID = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  password: 'abc123'
};

describe('register', () => {
  test('creates an account and auto-logs the customer in (Req 5.4)', async () => {
    const res = await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    expect(res.success).toBe(true);
    expect(res.user.email).toBe('john@example.com');

    // Auto-login: a session must exist with a token (Req 5.4 / 5.7).
    const session = auth.getSession();
    expect(session).not.toBeNull();
    expect(session.sessionToken).toBeTruthy();
    expect(auth.getCurrentUser().email).toBe('john@example.com');
  });

  test('rejects invalid email/phone via validation (Req 5.2)', async () => {
    const res = await auth.register('John', 'not-an-email', '123', 'abc123');
    expect(res.success).toBe(false);
    expect(res.errors).toBeDefined();
    expect(auth.getSession()).toBeNull();
  });

  test('detects duplicate email (Req 5.3)', async () => {
    await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    auth.clearSession();
    const dup = await auth.register('Jane', VALID.email, '9123456780', 'xyz789');
    expect(dup.success).toBe(false);
    expect(dup.error).toBe('Email already exists');
  });
});

describe('login', () => {
  test('logs in with correct credentials and stores a session token (Req 5.7)', async () => {
    await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    auth.clearSession();

    const res = await auth.login(VALID.email, VALID.password);
    expect(res.success).toBe(true);
    expect(res.user.email).toBe('john@example.com');

    const session = auth.getSession();
    expect(session.sessionToken).toBeTruthy();
  });

  test('returns "Invalid email or password" for wrong password (Req 5.6)', async () => {
    await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    auth.clearSession();

    const res = await auth.login(VALID.email, 'wrongpass1');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid email or password');
    expect(auth.getSession()).toBeNull();
  });

  test('returns "Invalid email or password" for unknown email (Req 5.6)', async () => {
    const res = await auth.login('nobody@example.com', 'abc123');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid email or password');
  });
});

describe('logout', () => {
  test('clears the session and the wishlist (Req 5.11 / 4.5)', async () => {
    await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);

    // Seed a non-empty wishlist for this session.
    wishlist.addToWishlist('prod_001');
    wishlist.addToWishlist('prod_002');
    expect(wishlist.getWishlistCount()).toBe(2);

    const res = await auth.logout();
    expect(res.success).toBe(true);
    expect(auth.getSession()).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
    // Property 13 / Req 4.5: wishlist empty after logout.
    expect(wishlist.getWishlistCount()).toBe(0);
  });

  test('is idempotent — logging out twice has the same effect (Req 5.11)', async () => {
    await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    await auth.logout();
    const second = await auth.logout();
    expect(second.success).toBe(true);
    expect(auth.getSession()).toBeNull();
  });
});

describe('round-trip (Requirement 5 correctness property)', () => {
  test('register → logout → login restores the same user', async () => {
    const reg = await auth.register(VALID.name, VALID.email, VALID.phone, VALID.password);
    const registeredId = reg.user.userId;

    await auth.logout();
    const login = await auth.login(VALID.email, VALID.password);

    expect(login.success).toBe(true);
    expect(login.user.userId).toBe(registeredId);
    expect(login.user.email).toBe('john@example.com');
  });
});
