/**
 * data.js — Product Data Layer
 * Handles Firestore CRUD operations and Local Storage Fallback
 */

// ============================================================
// CONSTANTS
// ============================================================

const COLLECTIONS = {
  PRODUCTS: 'products',
  USERS: 'users',
  ORDERS: 'orders',
  COUPONS: 'coupons',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  INVENTORY_LOGS: 'inventory_logs',
  SHIPPING_INTEGRATIONS: 'shipping_integrations',
  AUDIT_LOGS: 'audit_logs'
};

// Products keep their legacy key for backwards compatibility with existing data.
const LOCAL_STORAGE_KEY = 'punnagai_mock_products';

// LocalStorage keys for each Firestore collection (hybrid local mode).
const LOCAL_STORAGE_KEYS = {
  [COLLECTIONS.PRODUCTS]: LOCAL_STORAGE_KEY,
  [COLLECTIONS.USERS]: 'punnagai_mock_users',
  [COLLECTIONS.ORDERS]: 'punnagai_mock_orders',
  [COLLECTIONS.COUPONS]: 'punnagai_mock_coupons',
  [COLLECTIONS.CATEGORIES]: 'punnagai_mock_categories',
  [COLLECTIONS.BANNERS]: 'punnagai_mock_banners',
  [COLLECTIONS.INVENTORY_LOGS]: 'punnagai_mock_inventory_logs',
  [COLLECTIONS.SHIPPING_INTEGRATIONS]: 'punnagai_mock_shipping_integrations',
  [COLLECTIONS.AUDIT_LOGS]: 'punnagai_mock_audit_logs'
};

// ============================================================
// CACHE CONFIG (in-memory)
// ============================================================
// Requirement 1.9: cache product data for 1 hour to improve page load.
// Requirement 14.5 (pattern reuse): longer-lived caches measured in days.
const PRODUCT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CATEGORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

// Simple in-memory cache: { data, expiresAt }. Cleared on page reload.
const _memoryCache = {
  products: null,
  categories: null
};

const CATEGORIES = [
  'Educational & Learning',
  'Action & Adventure',
  'Board Games & Puzzles',
  'Outdoor & Sports',
  'Arts & Crafts',
  'Dolls & Fashion',
  'Remote Control',
  'Building Blocks',
  'Musical Toys',
  'Soft Toys & Plush'
];

const AGE_GROUPS = [
  { label: 'Baby (0–2)', value: '0-2', icon: '🍼' },
  { label: 'Toddler (3–5)', value: '3-5', icon: '🧸' },
  { label: 'Kids (6–8)', value: '6-8', icon: '🎮' },
  { label: 'Tween (9–12)', value: '9-12', icon: '🎯' },
  { label: 'Teen (12+)', value: '12+', icon: '🚀' }
];

// ============================================================
// SEED DATA
// ============================================================

const SEED_PRODUCTS = [
  {
    name: 'Wooden Rainbow Stacker',
    description:
      'Beautiful handcrafted wooden rainbow stacking toy that develops motor skills, color recognition, and creativity in young children. Made from sustainable wood with non-toxic paint. Perfect gift for babies.',
    price: 899,
    originalPrice: 1199,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1560785496-3c9d27877182?w=500&q=80',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Best Seller',
    videoUrl: ''
  },
  {
    name: 'LEGO Classic Creative Bricks Set',
    description:
      'Classic LEGO set with 900+ pieces in vibrant colours. Perfect for building anything your imagination can dream up! Includes building ideas booklet. Develops spatial reasoning and creativity.',
    price: 2499,
    originalPrice: null,
    category: 'Building Blocks',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500&q=80',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Magnetic Drawing Board',
    description:
      'Mess-free creative fun! Draw, doodle and erase endlessly with this magnetic drawing board. Includes a magnetic pen and 4 shape stamps. Perfect travel toy — no ink, no mess!',
    price: 549,
    originalPrice: 699,
    category: 'Arts & Crafts',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=500&q=80',
    inStock: true,
    stock: 25,
    quantity: 25,
    featured: true,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Scrabble Junior Board Game',
    description:
      'The classic word game adapted for younger players! Features two sides — one for beginners with pictures and one for advanced play with full words. Develops vocabulary and spelling skills.',
    price: 799,
    originalPrice: null,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=500&q=80',
    inStock: true,
    stock: 3,
    quantity: 3,
    featured: false,
    newArrival: false,
    badge: 'Low Stock',
    videoUrl: ''
  },
  {
    name: 'Remote Control Racing Car 4WD',
    description:
      'High-speed RC car with 4WD, LED lights, and shock-absorbing tires. Works on all terrain including grass, dirt and tile. Top speed 25 km/h. 2.4 GHz anti-interference. Battery included.',
    price: 1299,
    originalPrice: 1799,
    category: 'Remote Control',
    ageGroup: '9-12',
    imageUrl: 'https://images.unsplash.com/photo-1546792557-bd04f6a3d5ce?w=500&q=80',
    inStock: true,
    stock: 2,
    quantity: 2,
    featured: true,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Premium Plush Teddy Bear',
    description:
      'Adorably soft and huggable teddy bear made from premium hypoallergenic materials. Perfect first toy for babies. Machine washable. Comes beautifully boxed — ideal as a gift.',
    price: 649,
    originalPrice: null,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: '',
    videoUrl: ''
  },
  {
    name: 'Mini Basketball Hoop Set',
    description:
      'Indoor/outdoor mini basketball hoop with adjustable height from 3 to 6 feet. Includes 2 mini basketballs. Develops hand-eye coordination while keeping kids active and healthy.',
    price: 999,
    originalPrice: 1299,
    category: 'Outdoor & Sports',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Fashion Doll Deluxe Set',
    description:
      'Beautiful fashion doll with 20+ outfit combinations, accessories, and furniture pieces. Encourages storytelling, creativity and imaginative play. Comes with a stylish carry case.',
    price: 1199,
    originalPrice: null,
    category: 'Dolls & Fashion',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1591729651662-185a7ef34999?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Kids Xylophone Musical Toy',
    description:
      'Bright and colourful 8-note xylophone with two mallets. Produces beautiful, clear musical tones. Introduces children to music and rhythm. Made from non-toxic, BPA-free materials.',
    price: 449,
    originalPrice: 599,
    category: 'Musical Toys',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1545239705-1564e58b9e4a?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Dinosaur Action Figure Set (12 Pcs)',
    description:
      'Realistic set of 12 hand-painted dinosaur figures. Includes T-Rex, Triceratops, Brachiosaurus and more. Made from durable non-toxic ABS plastic. Great for creative play and learning.',
    price: 699,
    originalPrice: null,
    category: 'Action & Adventure',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1612364527103-25e8083c7a8c?w=500&q=80',
    inStock: true,
    featured: true,
    newArrival: false,
    badge: 'Best Seller',
    videoUrl: ''
  },
  {
    name: 'Wooden Puzzle — Animals (25 Pcs)',
    description:
      'Chunky wooden puzzle with 25 hand-cut pieces featuring colourful farm animals. Each piece has a knob for easy grasping. Develops problem-solving skills and fine motor control.',
    price: 399,
    originalPrice: 549,
    category: 'Educational & Learning',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'STEM Robot Building Kit',
    description:
      'Build your own robot! This STEM kit includes 120+ parts to build a programmable walking robot. Teaches basic coding logic, engineering concepts and problem-solving. Batteries included.',
    price: 2999,
    originalPrice: 3499,
    category: 'Educational & Learning',
    ageGroup: '9-12',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80',
    inStock: true,
    featured: true,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Watercolour Art Set — 48 Colours',
    description:
      'Professional quality watercolour set with 48 vibrant colours, 3 brushes, a palette tray, and a drawing pad. Perfect for budding young artists. Non-toxic and washable paints.',
    price: 599,
    originalPrice: null,
    category: 'Arts & Crafts',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: '',
    videoUrl: ''
  },
  {
    name: 'RC Quadcopter Drone for Kids',
    description:
      'Easy-to-fly mini drone perfect for beginners. Features one-key take-off/landing, altitude hold, headless mode, and 360° flips. Includes spare blades and charging cable.',
    price: 1799,
    originalPrice: 2299,
    category: 'Remote Control',
    ageGroup: '12+',
    imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Carrom Board — Full Size',
    description:
      'Full-size 29×29 inch carrom board made from premium plywood with a smooth playing surface. Includes 24 carrom coins, 2 strikers, boric powder, and a rule book. Family fun guaranteed!',
    price: 1899,
    originalPrice: 2499,
    category: 'Board Games & Puzzles',
    ageGroup: '9-12',
    imageUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=500&q=80',
    inStock: true,
    featured: true,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Baby Soft Rattle Gift Set (6 Pcs)',
    description:
      'Colourful set of 6 soft rattles and sensory toys for newborns and infants. Made from BPA-free, washable fabric. Stimulates hearing, vision, and tactile senses. Perfect newborn gift.',
    price: 499,
    originalPrice: null,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: '',
    videoUrl: ''
  },
  {
    name: 'Cricket Set — Wooden (Junior)',
    description:
      'Junior cricket set with 2 lightweight wooden bats, 2 rubber balls, 3 stumps with bails, and a carry bag. Ideal for garden and backyard play. Perfect introduction to cricket for young fans.',
    price: 849,
    originalPrice: null,
    category: 'Outdoor & Sports',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: '',
    videoUrl: ''
  },
  {
    name: 'Pretend Play Kitchen Set',
    description:
      'Complete pretend kitchen playset with 35 accessories including pots, pans, utensils, food items, and a play stove with lights and sounds. Encourages role play and social skills.',
    price: 1599,
    originalPrice: 1999,
    category: 'Dolls & Fashion',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1558048878-cd0ea68db0f4?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Jenga Classic Block Stacking Game',
    description:
      'The original block-stacking, stack-crashing game! Pull out a block without toppling the tower. Includes 54 hardwood blocks and a stacking sleeve. For 2+ players, ages 6 and up.',
    price: 699,
    originalPrice: 899,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: 'Sale',
    videoUrl: ''
  },
  {
    name: 'Duplo Baby Blocks Starter Set',
    description:
      'Large, easy-to-grip DUPLO-style building blocks for toddlers. 40 colourful chunky blocks in 6 shapes and colours. Develops fine motor skills, colour recognition, and early construction skills.',
    price: 999,
    originalPrice: null,
    category: 'Building Blocks',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&q=80',
    inStock: true,
    featured: false,
    newArrival: false,
    badge: '',
    videoUrl: ''
  },
  {
    name: 'Montessori Wooden Shape Sorter Box',
    description:
      'Classic Montessori sensory sorting cube with 12 brightly colored geometric shapes. Handcrafted from smooth beechwood with water-based organic dyes. Encourages cognitive sorting and tactile exploration.',
    price: 749,
    originalPrice: 999,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&q=80',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: true,
    newArrival: true,
    badge: 'Best Seller',
    videoUrl: ''
  },
  {
    name: 'Magnetic 3D Building Tiles Deluxe (64 Pcs)',
    description:
      'Vibrant translucent magnetic geometric tiles that click together effortlessly in 3D. Kids can build castles, rocket ships, bridges and towers while mastering geometry and magnetics.',
    price: 1499,
    originalPrice: 1999,
    category: 'Building Blocks',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=500&q=80',
    inStock: true,
    stock: 12,
    quantity: 12,
    featured: true,
    newArrival: false,
    badge: 'Hot Offer',
    videoUrl: ''
  },
  {
    name: 'Solar Powered Mars Rover Robot STEM Kit',
    description:
      'Eco-friendly STEM engineering kit with solar panel, planetary gearbox, and adjustable mechanical suspension. Runs under real sunlight without batteries. Inspires young space explorers!',
    price: 1899,
    originalPrice: 2399,
    category: 'Educational & Learning',
    ageGroup: '9-12',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&q=80',
    inStock: true,
    stock: 8,
    quantity: 8,
    featured: true,
    newArrival: true,
    badge: 'Trending',
    videoUrl: ''
  },
  {
    name: 'Organic Cotton Musical Elephant Plush',
    description:
      'Ultra-soft organic cotton plush elephant with gentle lullaby chime pull-string. Hypoallergenic, zero loose beads, completely baby-safe and machine washable. An heirloom-quality nursery companion.',
    price: 699,
    originalPrice: 899,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&q=80',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: false,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Traditional Indian Heritage Wooden Board Game Set',
    description:
      'Artisan crafted reversible teakwood board featuring Pachisi on one side and Pallanguzhi on the other. Comes with cowrie shells and tamarind seeds in a hand-embroidered drawstring pouch. Pure nostalgia!',
    price: 1099,
    originalPrice: 1399,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500&q=80',
    inStock: true,
    stock: 6,
    quantity: 6,
    featured: true,
    newArrival: false,
    badge: 'Mylapore Special',
    videoUrl: ''
  },
  {
    name: 'Kids High-Speed Drone with Obstacle Avoidance',
    description:
      'User-friendly quadcopter with infrared 360° obstacle sensors, one-key takeoff/landing, and altitude hold. Safe enclosed propeller guards protect fingers. Includes 2 rechargeable battery packs.',
    price: 2799,
    originalPrice: 3499,
    category: 'Remote Control',
    ageGroup: '12+',
    imageUrl: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=500&q=80',
    inStock: true,
    stock: 5,
    quantity: 5,
    featured: true,
    newArrival: false,
    badge: 'Top Rated',
    videoUrl: ''
  }
];

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
function getLocalProducts() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const prods = raw ? JSON.parse(raw) : [];
    // If cache has at least 25 products, use it; otherwise reseed with full upgraded catalog
    if (Array.isArray(prods) && prods.length >= 25) {
      return prods;
    }
  } catch (e) {}

  // Automatically seed from SEED_PRODUCTS if empty or needing upgrade
  if (Array.isArray(SEED_PRODUCTS) && SEED_PRODUCTS.length > 0) {
    const seeded = SEED_PRODUCTS.map((p, i) => ({
      ...p,
      id: p.id || 'prod_seed_' + (i + 1),
      createdAt: p.createdAt || (Date.now() - i * 60000)
    }));
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
    } catch (e) {}
    return seeded;
  }
  return [];
}

function saveLocalProducts(products) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  } catch (e) {}
}

// ============================================================
// PRODUCT CRUD OPERATIONS (HYBRID)
// ============================================================

function generateId() {
  return 'local_' + Math.random().toString(36).substr(2, 9);
}

function getServerTimestamp() {
  return window.USE_LOCAL_MODE ? Date.now() : (firebase && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : Date.now());
}

/**
 * Fetch all products with optional filters
 */
async function getProducts(filters = {}) {
  try {
    let products = [];

    if (window.USE_LOCAL_MODE || !window.db) {
      products = getLocalProducts();
    } else {
      try {
        let query = db.collection(COLLECTIONS.PRODUCTS);

        if (filters.category && filters.category !== 'all') {
          query = query.where('category', '==', filters.category);
        }
        if (filters.ageGroup && filters.ageGroup !== 'all') {
          query = query.where('ageGroup', '==', filters.ageGroup);
        }
        if (filters.inStock === true) {
          query = query.where('inStock', '==', true);
        }
        if (filters.featured === true) {
          query = query.where('featured', '==', true);
        }

        if (!filters.category && !filters.ageGroup && !filters.sortBy) {
          query = query.orderBy('createdAt', 'desc');
        }

        const snapshot = await query.get();
        products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (fsErr) {
        console.warn('Firestore fetch failed, falling back to local products:', fsErr);
        products = [];
      }

      // Resilience Fallback: If Firestore returned 0 products, fall back to local seed products
      if (!products || products.length === 0) {
        products = getLocalProducts();
      }
    }

    // Apply local filters (for local mode or local fallback)
    if (filters.category && filters.category !== 'all') {
      products = products.filter((p) => p.category === filters.category);
    }
    if (filters.ageGroup && filters.ageGroup !== 'all') {
      products = products.filter((p) => p.ageGroup === filters.ageGroup);
    }
    if (filters.inStock === true) {
      products = products.filter((p) => p.inStock === true);
    }
    if (filters.featured === true) {
      products = products.filter((p) => p.featured === true);
    }

    // Client-side search filter
    if (filters.search) {
      const term = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term)
      );
    }

    // Client-side sort
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'name-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }
    }

    return products;
  } catch (err) {
    console.error('Error fetching products:', err);
    return [];
  }
}

/**
 * Fetch a single product by ID
 */
async function getProductById(id) {
  try {
    if (!window.USE_LOCAL_MODE && window.db) {
      try {
        const doc = await db.collection(COLLECTIONS.PRODUCTS).doc(id).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('Firestore getProductById failed, checking local:', e);
      }
    }
    const products = getLocalProducts();
    return products.find((p) => p.id === id || p.name === id) || null;
  } catch (err) {
    console.error('Error fetching product:', err);
    return null;
  }
}

/**
 * Add a new product
 */
async function addProduct(productData) {
  try {
    const data = {
      ...productData,
      price: Number(productData.price),
      originalPrice: productData.originalPrice ? Number(productData.originalPrice) : null,
      inStock: Boolean(productData.inStock),
      featured: Boolean(productData.featured),
      createdAt: getServerTimestamp()
    };

    if (productData.inStock !== undefined) {
      data.inStock = Boolean(productData.inStock);
    } else if (productData.variants !== undefined && Array.isArray(productData.variants)) {
      data.inStock = productData.variants.some(function (v) {
        return (typeof v.stock === 'number' ? v.stock : Number(v.stock) || 0) > 0;
      });
    }
    if (data.inStock && Array.isArray(data.variants) && data.variants.length > 0) {
      const hasStock = data.variants.some((v) => (Number(v.stock) || 0) > 0);
      if (!hasStock && data.variants[0]) {
        data.variants[0].stock = 10;
      }
    }

    if (window.USE_LOCAL_MODE) {
      const newProduct = { id: generateId(), ...data };
      const products = getLocalProducts();
      products.push(newProduct);
      saveLocalProducts(products);
      invalidateCache('products');
      return { success: true, id: newProduct.id };
    } else {
      const doc = await db.collection(COLLECTIONS.PRODUCTS).add(data);
      invalidateCache('products');
      return { success: true, id: doc.id };
    }
  } catch (err) {
    console.error('Error adding product:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing product
 */
async function updateProduct(id, updates) {
  try {
    const updateData = {
      ...updates,
      updatedAt: getServerTimestamp()
    };
    if (updates.price !== undefined) updateData.price = Number(updates.price);
    if (updates.originalPrice !== undefined)
      updateData.originalPrice = updates.originalPrice ? Number(updates.originalPrice) : null;

    if (updates.inStock !== undefined) {
      updateData.inStock = Boolean(updates.inStock);
    } else if (updates.variants !== undefined && Array.isArray(updates.variants)) {
      updateData.inStock = updates.variants.some(function (v) {
        return (typeof v.stock === 'number' ? v.stock : Number(v.stock) || 0) > 0;
      });
    }
    if (
      updateData.inStock &&
      Array.isArray(updateData.variants) &&
      updateData.variants.length > 0
    ) {
      const hasStock = updateData.variants.some((v) => (Number(v.stock) || 0) > 0);
      if (!hasStock && updateData.variants[0]) {
        updateData.variants[0].stock = 10;
      }
    }

    if (window.USE_LOCAL_MODE) {
      const products = getLocalProducts();
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Product not found in local storage');
      products[index] = { ...products[index], ...updateData };
      saveLocalProducts(products);
      invalidateCache('products');
      return { success: true };
    } else {
      await db.collection(COLLECTIONS.PRODUCTS).doc(id).update(updateData);
      invalidateCache('products');
      return { success: true };
    }
  } catch (err) {
    console.error('Error updating product:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a product by ID
 */
async function deleteProduct(id) {
  try {
    if (window.USE_LOCAL_MODE) {
      let products = getLocalProducts();
      products = products.filter((p) => p.id !== id);
      saveLocalProducts(products);
      invalidateCache('products');
      return { success: true };
    } else {
      await db.collection(COLLECTIONS.PRODUCTS).doc(id).delete();
      invalidateCache('products');
      return { success: true };
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get product count
 */
async function getProductCount() {
  try {
    if (window.USE_LOCAL_MODE) {
      return getLocalProducts().length;
    } else {
      const snap = await db.collection(COLLECTIONS.PRODUCTS).get();
      return snap.size;
    }
  } catch {
    return 0;
  }
}

/**
 * Seed initial products if collection is empty
 * Run this once from admin panel or app init
 */
async function seedProductsIfEmpty() {
  try {
    if (window.USE_LOCAL_MODE) {
      const products = getLocalProducts();
      if (products.length === 0) {
        console.log('Seeding initial products to LocalStorage...');
        const seeded = SEED_PRODUCTS.map((p, i) => ({
          ...p,
          id: 'local_seed_' + i,
          createdAt: Date.now() - i * 1000 // slightly offset times
        }));
        saveLocalProducts(seeded);
        console.log('Seed complete!');
        return true;
      }
      return false;
    } else {
      const snap = await db.collection(COLLECTIONS.PRODUCTS).limit(1).get();
      if (snap.empty) {
        console.log('Seeding initial products to Firebase...');
        const batch = db.batch();
        SEED_PRODUCTS.forEach((product) => {
          const data = { ...product, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
          const ref = db.collection(COLLECTIONS.PRODUCTS).doc();
          batch.set(ref, data);
        });
        await batch.commit();
        console.log('Seed complete!');
        return true;
      }
      return false;
    }
  } catch (err) {
    console.error('Seed error:', err);
    return false;
  }
}

async function seedCouponsIfEmpty() {
  try {
    if (window.USE_LOCAL_MODE) {
      const coupons = getLocalCollection(COLLECTIONS.COUPONS);
      if (coupons.length === 0) {
        console.log('Seeding initial coupons to LocalStorage...');
        const seeded = [
          {
            id: 'coupon_seed_0',
            code: 'PUNNAGAI10',
            discountType: 'percentage',
            discountValue: 10,
            expiryDate: null,
            usageLimit: 0,
            usageCount: 0,
            minOrderValue: 0,
            applicableCategories: [],
            active: true,
            createdAt: Date.now()
          },
          {
            id: 'coupon_seed_1',
            code: 'WELCOME50',
            discountType: 'fixed',
            discountValue: 50,
            expiryDate: null,
            usageLimit: 0,
            usageCount: 0,
            minOrderValue: 200,
            applicableCategories: [],
            active: true,
            createdAt: Date.now()
          }
        ];
        const key = LOCAL_STORAGE_KEYS[COLLECTIONS.COUPONS] || 'punnagai_mock_coupons';
        localStorage.setItem(key, JSON.stringify(seeded));
        console.log('Coupons seed complete!');
        return true;
      }
      return false;
    }
  } catch (err) {
    console.error('Coupons seed error:', err);
    return false;
  }
}

// Auto-seed in local mode when file loads so home page has data instantly
if (typeof window !== 'undefined' && window.USE_LOCAL_MODE) {
  seedProductsIfEmpty();
  seedCouponsIfEmpty();
}

// ============================================================
// GENERIC LOCALSTORAGE COLLECTION HELPERS (HYBRID local branch)
// ============================================================

function getLocalCollection(collectionName) {
  const key = LOCAL_STORAGE_KEYS[collectionName] || 'punnagai_mock_' + collectionName;
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveLocalCollection(collectionName, records) {
  const key = LOCAL_STORAGE_KEYS[collectionName] || 'punnagai_mock_' + collectionName;
  localStorage.setItem(key, JSON.stringify(records));
}

// ============================================================
// PRODUCT & CATEGORY CACHE WRAPPERS
// ============================================================

function _cacheGet(slot) {
  const entry = _memoryCache[slot];
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  return null;
}

function _cacheSet(slot, data, ttlMs) {
  _memoryCache[slot] = { data, expiresAt: Date.now() + ttlMs };
}

/**
 * Invalidate cached data. Call after any product/category mutation.
 * @param {('products'|'categories')} [slot] - omit to clear all caches.
 */
function invalidateCache(slot, skipNotify = false) {
  if (slot) {
    _memoryCache[slot] = null;
  } else {
    _memoryCache.products = null;
    _memoryCache.categories = null;
  }
  if (!skipNotify) {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('punnagai_store_channel');
        bc.postMessage({ type: 'CACHE_INVALIDATE', slot: slot, timestamp: Date.now() });
        bc.close();
      }
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('punnagai:cache_invalidated', { detail: { slot: slot } })
        );
      }
    } catch (e) {
      /* ignore */
    }
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', function (e) {
    if (e.key === LOCAL_STORAGE_KEY || e.key === 'punnagai_mock_categories') {
      invalidateCache(null, true);
    }
  });
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('punnagai_store_channel');
      bc.onmessage = function (event) {
        if (event.data && event.data.type === 'CACHE_INVALIDATE') {
          invalidateCache(event.data.slot, true);
        }
      };
    }
  } catch (e) {
    /* ignore */
  }
}

/**
 * Pure client-side filter/search/sort, mirroring getProducts() post-processing.
 * Used by the cached product reader so a single cached fetch can serve many
 * different filter combinations without re-hitting the data source.
 */
function applyProductFilters(products, filters = {}) {
  let result = products.slice();

  if (filters.category && filters.category !== 'all') {
    result = result.filter((p) => p.category === filters.category);
  }
  if (filters.ageGroup && filters.ageGroup !== 'all') {
    result = result.filter((p) => p.ageGroup === filters.ageGroup);
  }
  if (filters.inStock === true) {
    result = result.filter((p) => p.inStock === true);
  }
  if (filters.featured === true) {
    result = result.filter((p) => p.featured === true);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term)
    );
  }

  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  return result;
}

/**
 * Fetch the full product list with a 1-hour in-memory cache (Requirement 1.9).
 * Pass `forceRefresh = true` to bypass and refresh the cache.
 */
async function getAllProductsCached(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = _cacheGet('products');
    if (cached) return cached;
  }
  const products = await getProducts({});
  _cacheSet('products', products, PRODUCT_CACHE_TTL_MS);
  return products;
}

/**
 * Cached variant of getProducts(): reads from the 1-hour product cache and
 * applies filters/search/sort in memory. Falls back to a live fetch on cache miss.
 */
async function getProductsCached(filters = {}, forceRefresh = false) {
  try {
    const all = await getAllProductsCached(forceRefresh);
    return applyProductFilters(all, filters);
  } catch (err) {
    console.error('Error fetching cached products:', err);
    return [];
  }
}

// ============================================================
// CATEGORIES (HYBRID + 1-day cache)
// ============================================================

/**
 * Fetch categories with a 1-day in-memory cache.
 */
async function getCategories(forceRefresh = false) {
  try {
    if (!forceRefresh) {
      const cached = _cacheGet('categories');
      if (cached) return cached;
    }

    let categories;
    if (window.USE_LOCAL_MODE) {
      categories = getLocalCollection(COLLECTIONS.CATEGORIES);
    } else {
      const snap = await db.collection(COLLECTIONS.CATEGORIES).orderBy('displayOrder', 'asc').get();
      categories = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    _cacheSet('categories', categories, CATEGORY_CACHE_TTL_MS);
    return categories;
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
}

async function addCategory(categoryData) {
  const result = await createDoc(COLLECTIONS.CATEGORIES, {
    name: categoryData.name,
    description: categoryData.description || '',
    icon: categoryData.icon || '',
    imageUrl: categoryData.imageUrl || '',
    productCount: Number(categoryData.productCount) || 0,
    displayOrder: Number(categoryData.displayOrder) || 0
  });
  if (result.success) invalidateCache('categories');
  return result;
}

async function updateCategory(id, updates) {
  const result = await updateDoc(COLLECTIONS.CATEGORIES, id, updates);
  if (result.success) invalidateCache('categories');
  return result;
}

async function deleteCategory(id) {
  const result = await deleteDoc(COLLECTIONS.CATEGORIES, id);
  if (result.success) invalidateCache('categories');
  return result;
}

// ============================================================
// GENERIC HYBRID CRUD (used by the collections below)
// ============================================================

async function createDoc(collectionName, data) {
  try {
    const record = { ...data, createdAt: getServerTimestamp() };
    if (window.USE_LOCAL_MODE) {
      const newRecord = { id: generateId(), ...record, createdAt: Date.now() };
      const records = getLocalCollection(collectionName);
      records.push(newRecord);
      saveLocalCollection(collectionName, records);
      return { success: true, id: newRecord.id };
    } else {
      const doc = await db.collection(collectionName).add(record);
      return { success: true, id: doc.id };
    }
  } catch (err) {
    console.error(`Error creating ${collectionName} doc:`, err);
    return { success: false, error: err.message };
  }
}

async function getDocById(collectionName, id) {
  try {
    if (window.USE_LOCAL_MODE) {
      return getLocalCollection(collectionName).find((r) => r.id === id) || null;
    } else {
      const doc = await db.collection(collectionName).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }
  } catch (err) {
    console.error(`Error fetching ${collectionName} doc:`, err);
    return null;
  }
}

async function getDocs(collectionName, filters = {}) {
  try {
    if (window.USE_LOCAL_MODE) {
      let records = getLocalCollection(collectionName);
      Object.keys(filters).forEach((field) => {
        records = records.filter((r) => r[field] === filters[field]);
      });
      return records;
    } else {
      let query = db.collection(collectionName);
      Object.keys(filters).forEach((field) => {
        query = query.where(field, '==', filters[field]);
      });
      const snap = await query.get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.error(`Error fetching ${collectionName} docs:`, err);
    return [];
  }
}

async function updateDoc(collectionName, id, updates) {
  try {
    const updateData = { ...updates, updatedAt: getServerTimestamp() };
    if (window.USE_LOCAL_MODE) {
      const records = getLocalCollection(collectionName);
      const index = records.findIndex((r) => r.id === id);
      if (index === -1) throw new Error(`${collectionName} doc not found in local storage`);
      records[index] = { ...records[index], ...updateData, updatedAt: Date.now() };
      saveLocalCollection(collectionName, records);
      return { success: true };
    } else {
      await db.collection(collectionName).doc(id).update(updateData);
      return { success: true };
    }
  } catch (err) {
    console.error(`Error updating ${collectionName} doc:`, err);
    return { success: false, error: err.message };
  }
}

async function deleteDoc(collectionName, id) {
  try {
    if (window.USE_LOCAL_MODE) {
      const records = getLocalCollection(collectionName).filter((r) => r.id !== id);
      saveLocalCollection(collectionName, records);
      return { success: true };
    } else {
      await db.collection(collectionName).doc(id).delete();
      return { success: true };
    }
  } catch (err) {
    console.error(`Error deleting ${collectionName} doc:`, err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// USERS
// ============================================================

async function createUser(userData, uid) {
  const targetUid = uid || (userData && (userData.uid || userData.userId));
  const record = {
    email: userData.email,
    phone: userData.phone || '',
    name: userData.name || '',
    isAdmin: Boolean(userData.isAdmin),
    status: userData.status || 'active',
    lastLogin: userData.lastLogin || null
  };

  if (!window.USE_LOCAL_MODE && targetUid) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(targetUid).set({
        ...record,
        createdAt: getServerTimestamp()
      });
      return { success: true, id: targetUid };
    } catch (err) {
      console.error('Error creating user doc:', err);
      return { success: false, error: err.message };
    }
  }

  return createDoc(COLLECTIONS.USERS, record);
}

async function getUserById(id) {
  return getDocById(COLLECTIONS.USERS, id);
}

async function getUserByEmail(email) {
  const users = await getDocs(COLLECTIONS.USERS, { email });
  return users[0] || null;
}

async function updateUser(id, updates) {
  return updateDoc(COLLECTIONS.USERS, id, updates);
}

// ============================================================
// ORDERS
// ============================================================

async function createOrder(orderData) {
  // Use secure Cloud Function if in Firebase mode
  if (!window.USE_LOCAL_MODE && window.functions) {
    try {
      const createSecureOrder = window.functions.httpsCallable('createSecureOrder');
      const res = await createSecureOrder(orderData);
      if (res.data && res.data.success) {
        return { success: true, id: res.data.id };
      }
      return { success: false, error: 'Server rejected the order.' };
    } catch (err) {
      console.error('Secure order creation failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Fallback for Local Storage Demo mode
  return createDoc(COLLECTIONS.ORDERS, {
    userId: orderData.userId || null,
    items: orderData.items || [],
    subtotal: Number(orderData.subtotal) || 0,
    shippingFee: Number(orderData.shippingFee) || 0,
    taxAmount: Number(orderData.taxAmount) || 0,
    discount: Number(orderData.discount) || 0,
    total: Number(orderData.total) || 0,
    shippingAddress: orderData.shippingAddress || null,
    shippingMethod: orderData.shippingMethod || 'local',
    trackingNumber: orderData.trackingNumber || null,
    couponCode: orderData.couponCode || null,
    paymentMethod: orderData.paymentMethod || 'upi',
    paymentStatus: orderData.paymentStatus || 'pending',
    upiTransactionId: orderData.upiTransactionId || null,
    orderStatus: orderData.orderStatus || 'pending',
    notes: orderData.notes || ''
  });
}

async function getOrderById(id) {
  return getDocById(COLLECTIONS.ORDERS, id);
}

async function getOrders(filters = {}) {
  return getDocs(COLLECTIONS.ORDERS, filters);
}

async function getOrdersByUser(userId) {
  return getDocs(COLLECTIONS.ORDERS, { userId });
}

async function updateOrder(id, updates) {
  return updateDoc(COLLECTIONS.ORDERS, id, updates);
}

// ============================================================
// COUPONS
// ============================================================

async function createCoupon(couponData) {
  return createDoc(COLLECTIONS.COUPONS, {
    code: (couponData.code || '').toUpperCase(),
    discountType: couponData.discountType || 'percentage',
    discountValue: Number(couponData.discountValue) || 0,
    expiryDate: couponData.expiryDate || null,
    usageLimit: Number(couponData.usageLimit) || 0,
    usageCount: Number(couponData.usageCount) || 0,
    minOrderValue: Number(couponData.minOrderValue) || 0,
    applicableCategories: couponData.applicableCategories || [],
    active: couponData.active !== undefined ? Boolean(couponData.active) : true
  });
}

async function getCouponByCode(code) {
  const coupons = await getDocs(COLLECTIONS.COUPONS, { code: (code || '').toUpperCase() });
  return coupons[0] || null;
}

async function getCoupons(filters = {}) {
  return getDocs(COLLECTIONS.COUPONS, filters);
}

async function updateCoupon(id, updates) {
  return updateDoc(COLLECTIONS.COUPONS, id, updates);
}

async function deleteCoupon(id) {
  return deleteDoc(COLLECTIONS.COUPONS, id);
}

// ============================================================
// BANNERS
// ============================================================

async function createBanner(bannerData) {
  return createDoc(COLLECTIONS.BANNERS, {
    title: bannerData.title || '',
    imageUrl: bannerData.imageUrl || '',
    linkType: bannerData.linkType || 'product',
    linkId: bannerData.linkId || null,
    displayOrder: Number(bannerData.displayOrder) || 0,
    active: bannerData.active !== undefined ? Boolean(bannerData.active) : true
  });
}

async function getBanners(filters = {}) {
  return getDocs(COLLECTIONS.BANNERS, filters);
}

async function updateBanner(id, updates) {
  return updateDoc(COLLECTIONS.BANNERS, id, updates);
}

async function deleteBanner(id) {
  return deleteDoc(COLLECTIONS.BANNERS, id);
}

// ============================================================
// INVENTORY LOGS (audit trail — create & read only)
// ============================================================

async function createInventoryLog(logData) {
  return createDoc(COLLECTIONS.INVENTORY_LOGS, {
    skuId: logData.skuId || null,
    previousStock: Number(logData.previousStock) || 0,
    newStock: Number(logData.newStock) || 0,
    changeReason: logData.changeReason || 'manual_adjustment',
    orderId: logData.orderId || null,
    quantityChanged: Number(logData.quantityChanged) || 0,
    uploadFileId: logData.uploadFileId || null,
    uploadedBy: logData.uploadedBy || null
  });
}

async function getInventoryLogs(filters = {}) {
  return getDocs(COLLECTIONS.INVENTORY_LOGS, filters);
}

// ============================================================
// AUDIT LOGS (admin operation trail — create & read only)
// ============================================================
// Requirement 17.8 / Property 23: every admin operation (create/update/delete
// product, inventory upload, mark shipped, refund) records who did what & when.
// The well-formed entry shape is produced by the pure builder in
// js/lib/audit.js (PunnagaiAudit.buildAuditEntry); this writer persists it.

async function createAuditLog(entry) {
  const e = entry && typeof entry === 'object' ? entry : {};
  return createDoc(COLLECTIONS.AUDIT_LOGS, {
    timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
    adminUserId: e.adminUserId || null,
    operationType: e.operationType || null,
    entity: e.entity || { type: null, id: null },
    details: e.details || {}
  });
}

async function getAuditLogs(filters = {}) {
  return getDocs(COLLECTIONS.AUDIT_LOGS, filters);
}

// ============================================================
// SHIPPING INTEGRATIONS
// ============================================================

async function createShippingIntegration(integrationData) {
  return createDoc(COLLECTIONS.SHIPPING_INTEGRATIONS, {
    provider: integrationData.provider || '',
    region: integrationData.region || 'local',
    baseCost: Number(integrationData.baseCost) || 0,
    estimatedDays: Number(integrationData.estimatedDays) || 0,
    apiKey: integrationData.apiKey || '',
    active: integrationData.active !== undefined ? Boolean(integrationData.active) : true,
    lastSyncedAt: integrationData.lastSyncedAt || null
  });
}

async function getShippingIntegrations(filters = {}) {
  return getDocs(COLLECTIONS.SHIPPING_INTEGRATIONS, filters);
}

async function getShippingIntegrationByRegion(region) {
  const integrations = await getDocs(COLLECTIONS.SHIPPING_INTEGRATIONS, { region });
  return integrations[0] || null;
}

async function updateShippingIntegration(id, updates) {
  return updateDoc(COLLECTIONS.SHIPPING_INTEGRATIONS, id, updates);
}

// ============================================================
// EXPORTS (Node/Jest only — browser uses globals)
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COLLECTIONS,
    LOCAL_STORAGE_KEYS,
    CATEGORIES,
    AGE_GROUPS,
    SEED_PRODUCTS,
    PRODUCT_CACHE_TTL_MS,
    CATEGORY_CACHE_TTL_MS,
    // products
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductCount,
    seedProductsIfEmpty,
    // cache
    getAllProductsCached,
    getProductsCached,
    applyProductFilters,
    invalidateCache,
    // generic
    createDoc,
    getDocById,
    getDocs,
    updateDoc,
    deleteDoc,
    // categories
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    // users
    createUser,
    getUserById,
    getUserByEmail,
    updateUser,
    // orders
    createOrder,
    getOrderById,
    getOrders,
    getOrdersByUser,
    updateOrder,
    // coupons
    createCoupon,
    getCouponByCode,
    getCoupons,
    updateCoupon,
    deleteCoupon,
    // banners
    createBanner,
    getBanners,
    updateBanner,
    deleteBanner,
    // inventory logs
    createInventoryLog,
    getInventoryLogs,
    // audit logs
    createAuditLog,
    getAuditLogs,
    // shipping
    createShippingIntegration,
    getShippingIntegrations,
    getShippingIntegrationByRegion,
    updateShippingIntegration
  };
}
