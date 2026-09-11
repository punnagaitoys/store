/**
 * Unit & Integration verification tests for Media Library feature
 * Tests end-to-end media operations, storage locations, references,
 * orphan file behaviors, and validation gaps.
 */

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store
  };
}

global.window = { USE_LOCAL_MODE: true };
global.localStorage = makeLocalStorage();

const {
  MediaLibraryManager,
  DEFAULT_MEDIA_ITEMS,
  CUSTOM_MEDIA_KEY
} = require('../../js/admin-media-library');
const data = require('../../js/data');

describe('Media Library — End-to-End & Integrity Tests', () => {
  let manager;

  beforeEach(() => {
    global.localStorage = makeLocalStorage();
    data.invalidateCache();

    global.showToast = jest.fn();
    global.document = {
      getElementById: jest.fn(() => null)
    };

    manager = new MediaLibraryManager();
    manager.init([]);
  });

  afterEach(() => {
    delete global.showToast;
    delete global.document;
  });

  test('TC1: Upload media via direct URL saves correctly to localStorage', () => {
    const newItem = manager.addMediaItem({
      title: 'Toy Train Set',
      url: 'https://images.example.com/train.jpg',
      category: 'toys'
    });

    expect(newItem).toBeDefined();
    expect(newItem.id).toMatch(/^med_cust_/);
    expect(newItem.title).toBe('Toy Train Set');
    expect(newItem.url).toBe('https://images.example.com/train.jpg');

    // Verify persisted in localStorage
    const savedCustom = JSON.parse(global.localStorage.getItem(CUSTOM_MEDIA_KEY));
    expect(savedCustom).toHaveLength(1);
    expect(savedCustom[0].id).toBe(newItem.id);
  });

  test('TC2: Upload media via file reader (base64) saves data URL to localStorage', () => {
    const fakeDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const newItem = manager.addMediaItem({
      title: 'Uploaded Badge',
      url: fakeDataUrl,
      category: 'custom'
    });

    expect(newItem.url).toBe(fakeDataUrl);
    expect(newItem.isCustom).toBe(true);

    const retrieved = manager.getCustomItems();
    expect(retrieved[0].url).toBe(fakeDataUrl);
  });

  test('TC3: Media displays in media library grid search/filter', () => {
    const uniqueTitle = 'Unique RC Jet Model X';
    manager.addMediaItem({
      title: uniqueTitle,
      url: 'https://images.example.com/jet.jpg',
      category: 'toys'
    });

    manager.searchTerm = 'Unique RC Jet';
    manager.selectedFilter = 'toys';
    const filtered = manager.getFilteredItems();

    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.some((i) => i.title === uniqueTitle)).toBe(true);
  });

  test('TC4: Use media for product connects image URL to product form input', () => {
    const mockInput = { value: '', focus: jest.fn() };
    global.document.getElementById = jest.fn((id) => {
      if (id === 'f-image-url') return mockInput;
      return null;
    });
    global.showSection = jest.fn();

    manager.useForProduct('https://images.example.com/drone.jpg');

    expect(global.showSection).toHaveBeenCalledWith('add-product');
    expect(mockInput.value).toBe('https://images.example.com/drone.jpg');
    expect(global.showToast).toHaveBeenCalledWith('Image connected to Product Form!', 'success');
  });

  test('TC5: Product with connected media URL saves and displays in catalog', async () => {
    const productPayload = {
      name: 'Connected Toy',
      category: 'Educational & Learning',
      description: 'Test description',
      price: 499,
      ageGroup: '3-5',
      imageUrl: 'https://images.example.com/drone.jpg',
      inStock: true
    };

    const res = await data.addProduct(productPayload);
    expect(res.success).toBe(true);

    const saved = await data.getProductById(res.id);
    expect(saved.imageUrl).toBe('https://images.example.com/drone.jpg');
  });

  test('TC6: Deleting media removes it from localStorage list', () => {
    const item = manager.addMediaItem({
      title: 'Item To Delete',
      url: 'https://images.example.com/delete.jpg',
      category: 'custom'
    });

    expect(manager.getCustomItems()).toHaveLength(1);

    manager.deleteMediaItem(item.id);

    expect(manager.getCustomItems()).toHaveLength(0);
    expect(manager.items.find((i) => i.id === item.id)).toBeUndefined();
  });

  test('TC7 [ORPHAN IN STORAGE]: Deleting media item does NOT delete file from physical storage', () => {
    const item = manager.addMediaItem({
      title: 'Storage Image',
      url: 'https://firebasestorage.googleapis.com/v0/b/app.appspot.com/o/products%2Fmain_123.jpg',
      category: 'custom'
    });

    // deleteMediaItem has no integration with Firebase Storage or cloud storage APIs
    const storageDeleteSpy = jest.fn();
    global.window.storage = { ref: () => ({ delete: storageDeleteSpy }) };

    manager.deleteMediaItem(item.id);

    // Physical storage delete is NEVER called — file remains orphaned in cloud bucket
    expect(storageDeleteSpy).not.toHaveBeenCalled();
  });

  test('TC8 [DANGLING REFERENCE]: Deleting media item does NOT update or check products referencing it', async () => {
    const mediaUrl = 'https://images.example.com/shared-photo.jpg';
    const item = manager.addMediaItem({
      title: 'Shared Photo',
      url: mediaUrl,
      category: 'custom'
    });

    // Product references this media URL
    const pRes = await data.addProduct({
      name: 'Product Using Media',
      category: 'Educational & Learning',
      description: 'Desc',
      price: 299,
      ageGroup: '0-2',
      imageUrl: mediaUrl,
      inStock: true
    });
    expect(pRes.success).toBe(true);

    // Delete media item from media library
    manager.deleteMediaItem(item.id);

    // Product still holds the reference to the deleted media item
    const productAfter = await data.getProductById(pRes.id);
    expect(productAfter.imageUrl).toBe(mediaUrl); // INCONSISTENCY: product references media that was removed from library
  });

  test('TC9 [ORPHAN IN STORAGE ON PRODUCT DELETE]: Deleting product does NOT remove image from Firebase Storage', async () => {
    const storageUrl =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fp123%2Fmain_999.jpg';
    const pRes = await data.addProduct({
      name: 'Toy with Cloud Storage Image',
      category: 'Educational & Learning',
      description: 'Desc',
      price: 199,
      ageGroup: '3-5',
      imageUrl: storageUrl,
      thumbnails: [
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/products%2Fp123%2Fthumb_999.jpg'
      ],
      inStock: true
    });
    expect(pRes.success).toBe(true);

    const storageDeleteSpy = jest.fn();
    global.window.storage = { ref: () => ({ delete: storageDeleteSpy }) };

    await data.deleteProduct(pRes.id);

    // data.deleteProduct only deletes the Firestore doc or local product array
    // It never calls storage.ref().delete()
    expect(storageDeleteSpy).not.toHaveBeenCalled(); // INCONSISTENCY: orphaned image files left in Firebase Storage bucket
  });

  test('TC10 [MISSING VALIDATION]: Missing file size limits allows oversized payloads into localStorage until failure', () => {
    const large10MBString = 'A'.repeat(10 * 1024 * 1024);

    // In actual browser, localStorage.setItem with 10MB throws QuotaExceededError
    global.localStorage.setItem = jest.fn(() => {
      const err = new Error('QuotaExceededError: The quota has been exceeded.');
      err.name = 'QuotaExceededError';
      throw err;
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      manager.addMediaItem({
        title: 'Huge File',
        url: large10MBString,
        category: 'custom'
      });
    }).not.toThrow(); // Catch block suppresses error, but item fails to persist in localStorage without user alert

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save custom media item:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('TC11 [MISSING VALIDATION]: Missing file type validation allows arbitrary non-image MIME types', () => {
    // If a non-image file is read as DataURL, addMediaItem accepts it without MIME check
    const executableDataUrl =
      'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA';
    const item = manager.addMediaItem({
      title: 'setup.exe',
      url: executableDataUrl,
      category: 'custom'
    });

    expect(item).toBeDefined();
    expect(item.url).toBe(executableDataUrl); // VULNERABILITY/DEFECT: Non-image file stored in media library
  });

  test('TC12 [MISSING VALIDATION]: Missing duplicate upload check allows identical URLs repeatedly', async () => {
    const url = 'https://images.example.com/duplicate.jpg';
    const item1 = manager.addMediaItem({ title: 'Copy 1', url });
    await new Promise((r) => setTimeout(r, 5));
    const item2 = manager.addMediaItem({ title: 'Copy 2', url });

    expect(item1.id).not.toBe(item2.id);
    expect(manager.getCustomItems()).toHaveLength(2); // DEFECT: Identical image URLs duplicated with no collision check
  });

  test('TC13 [MISSING METADATA]: Missing uploader/attribution metadata (no uploadedBy / userId)', () => {
    const item = manager.addMediaItem({
      title: 'Anonymous Upload',
      url: 'https://images.example.com/anon.jpg'
    });

    expect(item.uploadedBy).toBeUndefined(); // DEFECT: No audit trail of which admin uploaded the image
    expect(item.userId).toBeUndefined();
  });
});
