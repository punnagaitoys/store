/**
 * scripts/seed-firestore.js
 * Automatically seeds initial products, categories, coupons, banners,
 * and sets up the admin account in the live Firestore database.
 */

const path = require('path');
const workspaceDir = path.resolve(__dirname, '..');

const firebaseCompat = require(path.join(workspaceDir, 'node_modules/firebase/compat/app'));
require(path.join(workspaceDir, 'node_modules/firebase/compat/firestore'));
require(path.join(workspaceDir, 'node_modules/firebase/compat/auth'));

const firebase = firebaseCompat.default || firebaseCompat;

// Load environment configuration
let firebaseConfig = {
  apiKey: 'AIzaSyDJsabqiKNFmBPgskZmgbAdAIOq__zI-os',
  authDomain: 'punnagai-toy-store.firebaseapp.com',
  projectId: 'punnagai-toy-store',
  storageBucket: 'punnagai-toy-store.firebasestorage.app',
  messagingSenderId: '748480682670',
  appId: '1:748480682670:web:ba4ded0c0c3ec92f4deb3f',
  measurementId: 'G-FNSVGV3KPK'
};

try {
  const envConfigPath = path.join(workspaceDir, 'js', 'env-config.js');
  if (require('fs').existsSync(envConfigPath)) {
    const content = require('fs').readFileSync(envConfigPath, 'utf8');
    const match = content.match(/window\.__FIREBASE_CONFIG__\s*=\s*(\{[\s\S]*?\});/);
    if (match && match[1]) {
      firebaseConfig = JSON.parse(match[1]);
    }
  }
} catch (e) {
  console.warn('[seed] Could not read env-config.js, using default config:', e.message);
}

const CATEGORIES_DATA = [
  {
    name: 'Educational & Learning',
    description: 'STEM kits, building blocks, and learning puzzles',
    displayOrder: 1,
    icon: '🎓'
  },
  {
    name: 'Action & Adventure',
    description: 'Superhero figures, action sets, and play weapons',
    displayOrder: 2,
    icon: '🦸'
  },
  {
    name: 'Board Games & Puzzles',
    description: 'Classic family board games, strategy and jigsaw puzzles',
    displayOrder: 3,
    icon: '🎲'
  },
  {
    name: 'Outdoor & Sports',
    description: 'Balls, scooters, skates, and backyard active toys',
    displayOrder: 4,
    icon: '⚽'
  },
  {
    name: 'Arts & Crafts',
    description: 'Drawing kits, clay modelling, and painting sets',
    displayOrder: 5,
    icon: '🎨'
  },
  {
    name: 'Dolls & Fashion',
    description: 'Fashion dolls, dollhouses, and pretend play accessories',
    displayOrder: 6,
    icon: '👗'
  },
  {
    name: 'Remote Control',
    description: 'RC cars, drones, boats, and helicopters',
    displayOrder: 7,
    icon: '🏎️'
  },
  {
    name: 'Building Blocks',
    description: 'LEGO, architectural blocks, and construction sets',
    displayOrder: 8,
    icon: '🧱'
  },
  {
    name: 'Musical Toys',
    description: 'Keyboards, drums, xylophones, and rhythm instruments',
    displayOrder: 9,
    icon: '🎵'
  },
  {
    name: 'Soft Toys & Plush',
    description: 'Stuffed animals, plushies, and cuddly teddy bears',
    displayOrder: 10,
    icon: '🧸'
  }
];

const COUPONS_DATA = [
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 499,
    usageLimit: 1000,
    usageCount: 0,
    active: true
  },
  {
    code: 'FLAT100',
    discountType: 'fixed',
    discountValue: 100,
    minOrderValue: 999,
    usageLimit: 500,
    usageCount: 0,
    active: true
  },
  {
    code: 'TOYS20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 1499,
    usageLimit: 200,
    usageCount: 0,
    active: true
  }
];

const BANNERS_DATA = [
  {
    title: 'Celebrate with Punnagai Toys',
    imageUrl:
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&auto=format&fit=crop&q=80',
    linkType: 'category',
    linkId: 'Educational & Learning',
    displayOrder: 1,
    active: true
  },
  {
    title: 'Explore STEM & Robotics Kits',
    imageUrl:
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=1200&auto=format&fit=crop&q=80',
    linkType: 'category',
    linkId: 'Building Blocks',
    displayOrder: 2,
    active: true
  }
];

const PRODUCTS_DATA = [
  {
    name: 'Wooden Rainbow Stacker',
    description:
      'Beautiful handcrafted wooden rainbow stacking toy that develops motor skills, color recognition, and creativity in young children. Made from sustainable wood with non-toxic paint. Perfect gift for babies and toddlers.',
    price: 899,
    originalPrice: 1199,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=500&q=80',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Best Seller',
    variants: [
      {
        variantId: 'var_rain_01',
        skuId: 'SKU-RAIN-STD',
        size: 'Standard',
        color: 'Rainbow',
        price: 899,
        stock: 20
      }
    ]
  },
  {
    name: 'LEGO Classic Creative Bricks Set',
    description:
      'Classic LEGO set with 900+ pieces in vibrant colours. Perfect for building anything your imagination can dream up! Includes building ideas booklet. Develops spatial reasoning and creativity.',
    price: 2499,
    originalPrice: 2999,
    category: 'Building Blocks',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500&q=80',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: true,
    badge: 'New',
    variants: [
      {
        variantId: 'var_lego_01',
        skuId: 'SKU-LEGO-900',
        size: '900 Pieces',
        color: 'Multicolor',
        price: 2499,
        stock: 15
      }
    ]
  },
  {
    name: 'Magnetic Drawing Board',
    description:
      'Mess-free creative fun! Draw, doodle and erase endlessly with this magnetic drawing board. Includes a magnetic pen and 4 shape stamps. Perfect travel toy — no ink, no mess!',
    price: 549,
    originalPrice: 699,
    category: 'Arts & Crafts',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=500&q=80',
    inStock: true,
    stock: 25,
    quantity: 25,
    featured: true,
    newArrival: false,
    badge: 'Sale',
    variants: [
      {
        variantId: 'var_mag_01',
        skuId: 'SKU-MAG-BLUE',
        size: 'Medium',
        color: 'Blue',
        price: 549,
        stock: 15
      },
      {
        variantId: 'var_mag_02',
        skuId: 'SKU-MAG-PINK',
        size: 'Medium',
        color: 'Pink',
        price: 549,
        stock: 10
      }
    ]
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
    stock: 12,
    quantity: 12,
    featured: false,
    newArrival: false,
    badge: 'Popular',
    variants: [
      {
        variantId: 'var_scrab_01',
        skuId: 'SKU-SCRAB-JR',
        size: 'Standard',
        color: 'Classic',
        price: 799,
        stock: 12
      }
    ]
  },
  {
    name: 'Remote Control Racing Car 4WD',
    description:
      'High-speed RC car with 4WD, LED lights, and shock-absorbing tires. Works on all terrain including grass, dirt and tile. Top speed 25 km/h. 2.4 GHz anti-interference. Battery included.',
    price: 1299,
    originalPrice: 1799,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=500&q=80',
    inStock: true,
    stock: 8,
    quantity: 8,
    featured: true,
    newArrival: false,
    badge: 'Sale',
    variants: [
      {
        variantId: 'var_rc_01',
        skuId: 'SKU-RC-RED',
        size: '1:16 Scale',
        color: 'Red',
        price: 1299,
        stock: 4
      },
      {
        variantId: 'var_rc_02',
        skuId: 'SKU-RC-BLUE',
        size: '1:16 Scale',
        color: 'Blue',
        price: 1299,
        stock: 4
      }
    ]
  },
  {
    name: 'Super Hero Action Figure 12"',
    description:
      'Posable 12-inch superhero figure with realistic details and 10 points of articulation. High-durability build designed for hours of action-packed pretend play.',
    price: 649,
    originalPrice: 799,
    category: 'Action & Adventure',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=500&q=80',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: false,
    newArrival: true,
    badge: 'New',
    variants: [
      {
        variantId: 'var_hero_01',
        skuId: 'SKU-HERO-12',
        size: '12 Inch',
        color: 'Classic Suit',
        price: 649,
        stock: 18
      }
    ]
  },
  {
    name: 'Musical Toy Keyboard 37-Key',
    description:
      'Electronic keyboard with 37 keys, 8 tones, 8 rhythms, and recorded demo songs. Includes mini microphone for singing along! Inspires musical interest and auditory coordination.',
    price: 1099,
    originalPrice: 1399,
    category: 'Musical Toys',
    ageGroup: '3-5',
    imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&q=80',
    inStock: true,
    stock: 10,
    quantity: 10,
    featured: true,
    newArrival: false,
    badge: 'Top Rated',
    variants: [
      {
        variantId: 'var_mus_01',
        skuId: 'SKU-MUSIC-37',
        size: '37 Keys',
        color: 'Black',
        price: 1099,
        stock: 10
      }
    ]
  },
  {
    name: 'Jumbo Teddy Bear Plush 60cm',
    description:
      'Super soft, huggable 60cm plush teddy bear made from premium non-allergenic cotton. The ultimate companion for nap time, bedtime stories, and comfort.',
    price: 849,
    originalPrice: 1199,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'https://images.unsplash.com/photo-1559715745-e1b33a271c8f?w=500&q=80',
    inStock: true,
    stock: 14,
    quantity: 14,
    featured: true,
    newArrival: false,
    badge: 'Best Gift',
    variants: [
      {
        variantId: 'var_ted_01',
        skuId: 'SKU-TED-BROWN',
        size: '60 cm',
        color: 'Brown',
        price: 849,
        stock: 8
      },
      {
        variantId: 'var_ted_02',
        skuId: 'SKU-TED-WHITE',
        size: '60 cm',
        color: 'Cream White',
        price: 849,
        stock: 6
      }
    ]
  },
  {
    name: 'Solar System Planetary Model Kit',
    description:
      'Hands-on astronomy kit that allows children to assemble, paint, and explore the planets of our solar system. Includes rotation gears and informative STEM facts guidebook.',
    price: 749,
    originalPrice: 999,
    category: 'Educational & Learning',
    ageGroup: '9-12',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=500&q=80',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: false,
    newArrival: true,
    badge: 'STEM Choice',
    variants: [
      {
        variantId: 'var_solar_01',
        skuId: 'SKU-SOLAR-KIT',
        size: 'Standard',
        color: 'Full Color',
        price: 749,
        stock: 15
      }
    ]
  },
  {
    name: 'Kids Outdoor Football Size 3',
    description:
      'High-grip durable synthetic leather football tailored for younger children. Soft foam layer prevents stinging upon kick. Great for park play, coaching, and fitness.',
    price: 499,
    originalPrice: 649,
    category: 'Outdoor & Sports',
    ageGroup: '6-8',
    imageUrl: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=500&q=80',
    inStock: true,
    stock: 22,
    quantity: 22,
    featured: false,
    newArrival: false,
    badge: 'Sale',
    variants: [
      {
        variantId: 'var_fb_01',
        skuId: 'SKU-FB-SZ3',
        size: 'Size 3',
        color: 'White / Black',
        price: 499,
        stock: 22
      }
    ]
  }
];

const STORE_SETTINGS_DATA = {
  phonePrimary: '+91 75501 32101',
  phoneSecondary: '+91 72994 61657',
  whatsappNumber: '917550132101',
  storeEmail: 'contact@punnagaitoysfancy.in',
  upiId: 'punnagai@upi',
  storeAddress: '4/7 Luz Bazar Complex, R.K. Mutt Road, Mylapore, Chennai – 600 004',
  youtubeChannel: 'https://www.youtube.com/@PunnagaiRahim',
  instagramUrl: 'https://www.instagram.com/punnagaitoys.fancy/',
  facebookUrl: 'https://www.facebook.com/punnagaitoys/'
};

async function runSeed() {
  console.log('🚀 Initializing connection to Firebase project:', firebaseConfig.projectId);
  const app = firebase.initializeApp(firebaseConfig);
  const auth = app.auth();
  const db = app.firestore();

  const adminEmail = 'admin@punnagaitoystore.com';
  const adminPass = 'Punnagai@admin321';

  // Step 1: Authenticate or create the admin account
  console.log('🔑 Authenticating as admin user:', adminEmail);
  let userCred = null;
  try {
    userCred = await auth.signInWithEmailAndPassword(adminEmail, adminPass);
    console.log('✅ Admin login succeeded. UID:', userCred.user.uid);
  } catch (authErr) {
    if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
      console.log('ℹ️ Admin user not found. Creating admin account...');
      try {
        userCred = await auth.createUserWithEmailAndPassword(adminEmail, adminPass);
        console.log('✅ Admin user created successfully. UID:', userCred.user.uid);
      } catch (createErr) {
        console.error('❌ Failed to create admin user:', createErr.message);
        throw createErr;
      }
    } else {
      console.error('❌ Admin auth error:', authErr.message);
      throw authErr;
    }
  }

  // Ensure users/{uid} document has isAdmin: true
  const uid = userCred.user.uid;
  try {
    await db.collection('users').doc(uid).set(
      {
        name: 'Punnagai Admin',
        email: adminEmail,
        phone: '+917550132101',
        isAdmin: true,
        status: 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    console.log('✅ Admin user document verified in users/' + uid);
  } catch (userDocErr) {
    console.warn(
      '⚠️ Current live Firestore Rules rejected isAdmin: true. Initializing user doc with isAdmin: false...'
    );
    try {
      await db.collection('users').doc(uid).set(
        {
          name: 'Punnagai Admin',
          email: adminEmail,
          phone: '+917550132101',
          isAdmin: false,
          status: 'active',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      console.log('✅ Document created: users/' + uid);
      console.log('\n=============================================================');
      console.log('🔔 ACTION REQUIRED:');
      console.log('1. Deploy updated firestore.rules to Firebase (see FIREBASE_CONSOLE_GUIDE.md)');
      console.log('   OR in Firebase Console -> Firestore Database -> users/' + uid);
      console.log('   change field "isAdmin" to true (boolean).');
      console.log('2. Re-run: npm run seed:firestore');
      console.log('=============================================================\n');
    } catch (fallbackErr) {
      console.error('❌ Could not initialize user doc:', fallbackErr.message);
    }
    throw userDocErr;
  }

  // Step 2: Seed Store Settings
  console.log('⚙️ Seeding Store Settings (settings/store_info)...');
  await db.collection('settings').doc('store_info').set(STORE_SETTINGS_DATA, { merge: true });
  console.log('✅ Store Settings seeded.');

  // Step 3: Seed Categories
  console.log('📂 Seeding Categories (' + CATEGORIES_DATA.length + ' categories)...');
  for (const cat of CATEGORIES_DATA) {
    const existing = await db.collection('categories').where('name', '==', cat.name).get();
    if (existing.empty) {
      await db.collection('categories').add({
        ...cat,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  + Category added: ${cat.name}`);
    } else {
      console.log(`  = Category already exists: ${cat.name}`);
    }
  }

  // Step 4: Seed Coupons
  console.log('🎟️ Seeding Coupons (' + COUPONS_DATA.length + ' coupons)...');
  for (const coup of COUPONS_DATA) {
    const existing = await db.collection('coupons').where('code', '==', coup.code).get();
    if (existing.empty) {
      await db.collection('coupons').add({
        ...coup,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  + Coupon added: ${coup.code}`);
    } else {
      console.log(`  = Coupon already exists: ${coup.code}`);
    }
  }

  // Step 5: Seed Banners
  console.log('🖼️ Seeding Banners (' + BANNERS_DATA.length + ' banners)...');
  for (const banner of BANNERS_DATA) {
    const existing = await db.collection('banners').where('title', '==', banner.title).get();
    if (existing.empty) {
      await db.collection('banners').add({
        ...banner,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  + Banner added: ${banner.title}`);
    } else {
      console.log(`  = Banner already exists: ${banner.title}`);
    }
  }

  // Step 6: Seed Products
  console.log('🧸 Seeding Products (' + PRODUCTS_DATA.length + ' products)...');
  for (const prod of PRODUCTS_DATA) {
    const existing = await db.collection('products').where('name', '==', prod.name).get();
    if (existing.empty) {
      await db.collection('products').add({
        ...prod,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  + Product added: ${prod.name} (₹${prod.price})`);
    } else {
      console.log(`  = Product already exists: ${prod.name}`);
    }
  }

  console.log('\n🎉 ALL LIVE DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('\n❌ Fatal Seed Error:', err.message || err);
  process.exit(1);
});
