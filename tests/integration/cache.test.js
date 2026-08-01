/**
 * Integration tests — product/category cache on top of emulator reads (task 1.3).
 *
 * Validates: Requirement 1.9 ("THE System SHALL cache product data for 1 hour
 * to improve page load performance"), plus the design's 1-day category cache.
 *
 * These run the REAL js/data.js cache wrappers (getAllProductsCached /
 * getProductsCached / getCategories / invalidateCache) backed by live reads
 * from the Firestore emulator, and verify:
 *   - cache HIT: a second read is served from cache (a direct emulator write
 *     made without going through the data layer does NOT appear)
 *   - cache EXPIRY: once the TTL elapses, the next read refetches from the
 *     emulator and the new data appears
 *
 * TTL expiry is simulated by advancing `Date.now` (the clock the in-memory
 * cache uses for `expiresAt`) rather than waiting an hour/day in real time.
 */

const { loadDataLayerAgainstEmulator, clearFirestore } = require('./helpers/emulator-harness');

const { data, db, firebase } = loadDataLayerAgainstEmulator();

jest.setTimeout(30000);

// Controllable clock: real time + an adjustable offset, so the Firestore SDK
// keeps seeing sane wall-clock values while we fast-forward the cache TTL.
let nowOffset = 0;
const realNow = Date.now.bind(Date);

beforeEach(async () => {
  await clearFirestore();
  data.invalidateCache();
  nowOffset = 0;
  jest.spyOn(Date, 'now').mockImplementation(() => realNow() + nowOffset);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function advanceClock(ms) {
  nowOffset += ms;
}

// Direct emulator write that bypasses the data layer (and thus its cache
// invalidation) — used to prove a cached read is being served.
async function directAddProduct(name) {
  await db.collection('products').add({
    name,
    description: '',
    price: 100,
    category: 'Building Blocks',
    ageGroup: '3-5',
    imageUrl: '',
    inStock: true,
    featured: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function directAddCategory(name, displayOrder) {
  await db.collection('categories').add({
    name,
    description: '',
    icon: '',
    imageUrl: '',
    productCount: 0,
    displayOrder,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

describe('Product cache (1 hour) over emulator reads', () => {
  test('second read is served from cache (direct write not visible until refresh)', async () => {
    await data.addProduct({
      name: 'Cached A',
      description: '',
      price: 100,
      category: 'Building Blocks',
      ageGroup: '3-5',
      imageUrl: '',
      inStock: true,
      featured: false
    });

    const first = await data.getAllProductsCached();
    expect(first).toHaveLength(1);

    // Write directly to the emulator, bypassing data-layer cache invalidation.
    await directAddProduct('Sneaky B');

    // Still served from the cached snapshot.
    const cached = await data.getProductsCached({});
    expect(cached).toHaveLength(1);

    // Forcing a refresh hits the emulator again and sees the new doc.
    const refreshed = await data.getProductsCached({}, true);
    expect(refreshed).toHaveLength(2);
  });

  test('cache expires after the 1-hour TTL and refetches from the emulator', async () => {
    await data.addProduct({
      name: 'TTL A',
      description: '',
      price: 100,
      category: 'Building Blocks',
      ageGroup: '3-5',
      imageUrl: '',
      inStock: true,
      featured: false
    });

    expect(await data.getAllProductsCached()).toHaveLength(1);

    await directAddProduct('TTL B');

    // Within the TTL: still the cached snapshot.
    advanceClock(data.PRODUCT_CACHE_TTL_MS - 1000);
    expect(await data.getAllProductsCached()).toHaveLength(1);

    // Past the 1-hour TTL: cache miss → refetch sees both products.
    advanceClock(2000);
    expect(await data.getAllProductsCached()).toHaveLength(2);
  });

  test('mutating through the data layer invalidates the cache immediately', async () => {
    await data.addProduct({
      name: 'One',
      description: '',
      price: 10,
      category: 'c',
      ageGroup: '0-2',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    expect(await data.getAllProductsCached()).toHaveLength(1);

    // addProduct calls invalidateCache('products'), so this is visible at once.
    await data.addProduct({
      name: 'Two',
      description: '',
      price: 20,
      category: 'c',
      ageGroup: '0-2',
      imageUrl: '',
      inStock: true,
      featured: false
    });
    expect(await data.getAllProductsCached()).toHaveLength(2);
  });
});

describe('Category cache (1 day) over emulator reads', () => {
  test('second read is served from cache; 1-hour product TTL does NOT expire it', async () => {
    await data.addCategory({ name: 'Puzzles', icon: '🧩', displayOrder: 1 });

    const first = await data.getCategories();
    expect(first.map((c) => c.name)).toEqual(['Puzzles']);

    await directAddCategory('Outdoor', 2);

    // Still cached after a direct write.
    expect(await data.getCategories()).toHaveLength(1);

    // Advancing past the *product* TTL (1h) must not expire the *category*
    // cache (1 day) — they have independent TTLs.
    advanceClock(data.PRODUCT_CACHE_TTL_MS + 1000);
    expect(await data.getCategories()).toHaveLength(1);
  });

  test('category cache expires after the 1-day TTL and refetches', async () => {
    await data.addCategory({ name: 'Puzzles', icon: '🧩', displayOrder: 1 });
    expect(await data.getCategories()).toHaveLength(1);

    await directAddCategory('Outdoor', 2);

    advanceClock(data.CATEGORY_CACHE_TTL_MS + 1000);
    const refreshed = await data.getCategories();
    expect(refreshed).toHaveLength(2);
    expect(refreshed.map((c) => c.name)).toEqual(['Puzzles', 'Outdoor']);
  });
});
