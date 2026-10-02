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
    imageUrl: 'images/hero-banner.png',
    linkType: 'category',
    linkId: 'Educational & Learning',
    displayOrder: 1,
    active: true
  },
  {
    title: 'Storefront Summer Sale',
    imageUrl: 'images/banners/banner-summer-sale.jpg',
    linkType: 'category',
    linkId: 'Educational & Learning',
    displayOrder: 2,
    active: true
  },
  {
    title: 'Explore High-Speed RC & Action Stunts',
    imageUrl: 'images/banners/hero-banner-2.png',
    linkType: 'category',
    linkId: 'Remote Control',
    displayOrder: 3,
    active: true
  },
  {
    title: 'Special Storefront Offers & Deals',
    imageUrl: 'images/banners/storefront-promo-banner.png',
    linkType: 'category',
    linkId: 'Action & Adventure',
    displayOrder: 4,
    active: true
  }
];

const PRODUCTS_DATA = [
  {
    "name": "3D Wooden Ludo Family Board Game",
    "description": "Handcrafted 3D wooden Ludo board game featuring multi-tiered pathways and solid wooden tokens. A fun, tactile spin on the timeless family classic that sparks spatial thinking.",
    "price": 799,
    "originalPrice": 999,
    "category": "Board Games & Puzzles",
    "ageGroup": "6-8",
    "imageUrl": "images/products/wooden-3d-ludo-family-board-game-punnagai.jpg",
    "inStock": true,
    "stock": 15,
    "quantity": 15,
    "featured": true,
    "newArrival": false,
    "badge": "Family Choice",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_0",
        "skuId": "SKU-3DWOODEN-0",
        "size": "Standard",
        "color": "Standard",
        "price": 799,
        "stock": 15
      }
    ]
  },
  {
    "name": "Automatic Bubble Gun Gatling Blaster",
    "description": "High-output multi-hole bubble blaster with LED illumination. Generates hundreds of magical bubbles per minute with the pull of a trigger. Includes bubble solution.",
    "price": 499,
    "originalPrice": 699,
    "category": "Outdoor & Sports",
    "ageGroup": "3-5",
    "imageUrl": "images/products/automatic-bubble-gun-blaster-toy-punnagai.jpg",
    "inStock": true,
    "stock": 25,
    "quantity": 25,
    "featured": true,
    "newArrival": true,
    "badge": "Trending",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_1",
        "skuId": "SKU-AUTOMATI-1",
        "size": "Standard",
        "color": "Standard",
        "price": 499,
        "stock": 25
      }
    ]
  },
  {
    "name": "Catan: Trade, Build, Settle Board Game",
    "description": "The award-winning international strategy game where players trade resources, build settlements, and expand across the island of Catan. Perfect for game nights and family bonding.",
    "price": 1899,
    "originalPrice": 2499,
    "category": "Board Games & Puzzles",
    "ageGroup": "12+",
    "imageUrl": "images/products/catan-trade-build-settle-board-game-punnagai.jpg",
    "inStock": true,
    "stock": 8,
    "quantity": 8,
    "featured": true,
    "newArrival": false,
    "badge": "Best Seller",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_2",
        "skuId": "SKU-CATANTRA-2",
        "size": "Standard",
        "color": "Standard",
        "price": 1899,
        "stock": 8
      }
    ]
  },
  {
    "name": "Crossword Word Building Board Game",
    "description": "Engaging educational crossword puzzle game that enriches vocabulary, spelling, and linguistic agility for growing minds. Includes tile grid and score racks.",
    "price": 449,
    "originalPrice": 599,
    "category": "Educational & Learning",
    "ageGroup": "6-8",
    "imageUrl": "images/products/crossword-educational-word-game-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": false,
    "newArrival": false,
    "badge": "Brain Teaser",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_3",
        "skuId": "SKU-CROSSWOR-3",
        "size": "Standard",
        "color": "Standard",
        "price": 449,
        "stock": 20
      }
    ]
  },
  {
    "name": "Cute Reversible Strawberry Bunny Plush",
    "description": "Ultra-soft reversible plush that zips from a delicious strawberry into an adorable cuddly bunny. Hand-stitched with hypoallergenic velvet fabric.",
    "price": 599,
    "originalPrice": 799,
    "category": "Soft Toys & Plush",
    "ageGroup": "0-2",
    "imageUrl": "images/products/cute-strawberry-bunny-soft-plush-toy-punnagai.jpg",
    "inStock": true,
    "stock": 30,
    "quantity": 30,
    "featured": true,
    "newArrival": true,
    "badge": "Popular",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_4",
        "skuId": "SKU-CUTEREVE-4",
        "size": "Standard",
        "color": "Standard",
        "price": 599,
        "stock": 30
      }
    ]
  },
  {
    "name": "Musical Dancing Angel Princess Doll",
    "description": "Enchanting battery-operated princess doll that spins 360°, projects colourful kaleidoscope LED patterns, and plays cheerful music. Automatic bump-and-go action.",
    "price": 649,
    "originalPrice": 899,
    "category": "Dolls & Fashion",
    "ageGroup": "3-5",
    "imageUrl": "images/products/dancing-angel-doll-lights-music-punnagai.jpg",
    "inStock": true,
    "stock": 18,
    "quantity": 18,
    "featured": false,
    "newArrival": false,
    "badge": "Hot",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_5",
        "skuId": "SKU-MUSICALD-5",
        "size": "Standard",
        "color": "Standard",
        "price": 649,
        "stock": 18
      }
    ]
  },
  {
    "name": "Dancing Bunny Musical Toy with LED Lights",
    "description": "Playful musical bunny with rhythmic ear wiggles, vibrant flashing ear lights, and interactive tunes that encourage infants to crawl and dance along.",
    "price": 549,
    "originalPrice": 749,
    "category": "Musical Toys",
    "ageGroup": "0-2",
    "imageUrl": "images/products/dancing-bunny-musical-light-toy-punnagai.jpg",
    "inStock": true,
    "stock": 22,
    "quantity": 22,
    "featured": false,
    "newArrival": false,
    "badge": "Kid Approved",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_6",
        "skuId": "SKU-DANCINGB-6",
        "size": "Standard",
        "color": "Standard",
        "price": 549,
        "stock": 22
      }
    ]
  },
  {
    "name": "Dancing Elephant with Floating Air Ball",
    "description": "As demonstrated on our official YouTube channel! Joyful musical elephant that levitates a lightweight ball on an air stream while dancing and playing music.",
    "price": 699,
    "originalPrice": 999,
    "category": "Musical Toys",
    "ageGroup": "0-2",
    "imageUrl": "images/products/dancing-elephant-musical-toy-adventure-punnagai.jpg",
    "inStock": true,
    "stock": 15,
    "quantity": 15,
    "featured": true,
    "newArrival": true,
    "badge": "YouTube Hit",
    "videoUrl": "https://www.youtube.com/watch?v=F3I3MFQY8PU",
    "variants": [
      {
        "variantId": "var_7",
        "skuId": "SKU-DANCINGE-7",
        "size": "Standard",
        "color": "Standard",
        "price": 699,
        "stock": 15
      }
    ]
  },
  {
    "name": "Electric Swan with 3D Lights & Motion",
    "description": "Graceful gliding swan toy featuring 3D holographic crystal wing lighting, sweet melodies, and self-navigating omnidirectional wheels.",
    "price": 599,
    "originalPrice": 799,
    "category": "Musical Toys",
    "ageGroup": "3-5",
    "imageUrl": "images/products/electric-swan-lights-music-motion-punnagai.jpg",
    "inStock": true,
    "stock": 16,
    "quantity": 16,
    "featured": false,
    "newArrival": true,
    "badge": "New",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_8",
        "skuId": "SKU-ELECTRIC-8",
        "size": "Standard",
        "color": "Standard",
        "price": 599,
        "stock": 16
      }
    ]
  },
  {
    "name": "Heavy Duty JCB Excavator Construction Truck",
    "description": "Sturdy construction excavator with multi-joint articulated digging arm, 360° rotating cabin, and rugged caterpillar tracks. Built for rough play in sand and floor.",
    "price": 649,
    "originalPrice": 849,
    "category": "Action & Adventure",
    "ageGroup": "3-5",
    "imageUrl": "images/products/construction-jcb-excavator-truck-toy-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": true,
    "newArrival": false,
    "badge": "Best Seller",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_9",
        "skuId": "SKU-HEAVYDUT-9",
        "size": "Standard",
        "color": "Standard",
        "price": 649,
        "stock": 20
      }
    ]
  },
  {
    "name": "Formula 1 High-Speed Racing Car",
    "description": "Aerodynamic F1 racing car replica with authentic racing livery, spoiler aerodynamics, and high-traction rubber wheels for lightning fast floor sprints.",
    "price": 899,
    "originalPrice": 1199,
    "category": "Remote Control",
    "ageGroup": "6-8",
    "imageUrl": "images/products/formula-one-racing-car-toy-punnagai.jpg",
    "inStock": true,
    "stock": 14,
    "quantity": 14,
    "featured": true,
    "newArrival": false,
    "badge": "Speed Edition",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_10",
        "skuId": "SKU-FORMULA1-10",
        "size": "Standard",
        "color": "Standard",
        "price": 899,
        "stock": 14
      }
    ]
  },
  {
    "name": "Hanging Windmill Sensory Activity Toy",
    "description": "Multi-sensory infant hanging toy with gentle rotating windmill paddles, high-contrast visual colours, and soothing chime sounds. Clips securely onto cribs and strollers.",
    "price": 399,
    "originalPrice": 549,
    "category": "Educational & Learning",
    "ageGroup": "0-2",
    "imageUrl": "images/products/hanging-windmill-infant-crib-toy-punnagai.jpg",
    "inStock": true,
    "stock": 25,
    "quantity": 25,
    "featured": false,
    "newArrival": false,
    "badge": "Baby Choice",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_11",
        "skuId": "SKU-HANGINGW-11",
        "size": "Standard",
        "color": "Standard",
        "price": 399,
        "stock": 25
      }
    ]
  },
  {
    "name": "Air Power Hover Soccer Ball with LED",
    "description": "Glides effortlessly on cushions of air across hardwood, tiles, and low carpets. Soft foam bumper edges protect household furniture and walls during exciting indoor matches.",
    "price": 599,
    "originalPrice": 799,
    "category": "Outdoor & Sports",
    "ageGroup": "6-8",
    "imageUrl": "images/products/hover-soccer-ball-indoor-sports-toy-punnagai.jpg",
    "inStock": true,
    "stock": 18,
    "quantity": 18,
    "featured": true,
    "newArrival": false,
    "badge": "Indoor Hit",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_12",
        "skuId": "SKU-AIRPOWER-12",
        "size": "Standard",
        "color": "Standard",
        "price": 599,
        "stock": 18
      }
    ]
  },
  {
    "name": "Sweet Treats Ice Cream Vandi Pretend Cart",
    "description": "Charming traditional street style Ice Cream Vandi cart packed with ice cream cones, lollies, coins, and toppings. Develops social roleplay and arithmetic skills.",
    "price": 749,
    "originalPrice": 999,
    "category": "Dolls & Fashion",
    "ageGroup": "3-5",
    "imageUrl": "images/products/ice-cream-cart-vandi-pretend-play-punnagai.jpg",
    "inStock": true,
    "stock": 12,
    "quantity": 12,
    "featured": true,
    "newArrival": true,
    "badge": "Pretend Play",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_13",
        "skuId": "SKU-SWEETTRE-13",
        "size": "Standard",
        "color": "Standard",
        "price": 749,
        "stock": 12
      }
    ]
  },
  {
    "name": "Electric Crawling Musical Caterpillar Worm",
    "description": "Engaging wiggle-and-crawl caterpillar with sensory light-up body segments and happy music. Encourages babies during vital tummy-time and crawling development.",
    "price": 499,
    "originalPrice": 699,
    "category": "Musical Toys",
    "ageGroup": "0-2",
    "imageUrl": "images/products/electric-crawling-worm-musical-toy-punnagai.jpg",
    "inStock": true,
    "stock": 24,
    "quantity": 24,
    "featured": false,
    "newArrival": false,
    "badge": "Tummy Time",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_14",
        "skuId": "SKU-ELECTRIC-14",
        "size": "Standard",
        "color": "Standard",
        "price": 499,
        "stock": 24
      }
    ]
  },
  {
    "name": "Little Doctor Medical Suitcase Play Set",
    "description": "Complete junior doctor kit in a portable carry case. Includes stethoscope with heartbeat sound, thermometer, syringe, reflex hammer, and glasses.",
    "price": 599,
    "originalPrice": 799,
    "category": "Educational & Learning",
    "ageGroup": "3-5",
    "imageUrl": "images/products/little-doctor-medical-kit-pretend-play-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": true,
    "newArrival": false,
    "badge": "Pretend Play",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_15",
        "skuId": "SKU-LITTLEDO-15",
        "size": "Standard",
        "color": "Standard",
        "price": 599,
        "stock": 20
      }
    ]
  },
  {
    "name": "Monopoly India Edition Board Game",
    "description": "The classic fast-dealing property trading game featuring iconic Indian cities and heritage landmarks. Buy, sell, and mortgage properties to build an empire!",
    "price": 1299,
    "originalPrice": 1699,
    "category": "Board Games & Puzzles",
    "ageGroup": "9-12",
    "imageUrl": "images/products/monopoly-india-edition-board-game-punnagai.jpg",
    "inStock": true,
    "stock": 10,
    "quantity": 10,
    "featured": true,
    "newArrival": false,
    "badge": "Classic Hit",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_16",
        "skuId": "SKU-MONOPOLY-16",
        "size": "Standard",
        "color": "Standard",
        "price": 1299,
        "stock": 10
      }
    ]
  },
  {
    "name": "Neon RC 360° Rotating Stunt Car",
    "description": "High-energy double-sided flip car equipped with neon wheel LEDs, 360-degree high-speed rotation, and rugged rubber knobby wheels for zero roll-over stalls.",
    "price": 1199,
    "originalPrice": 1599,
    "category": "Remote Control",
    "ageGroup": "6-8",
    "imageUrl": "images/products/neon-rc-stunt-car-adventure-punnagai.jpg",
    "inStock": true,
    "stock": 15,
    "quantity": 15,
    "featured": true,
    "newArrival": true,
    "badge": "360 Spin",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_17",
        "skuId": "SKU-NEONRC36-17",
        "size": "Standard",
        "color": "Standard",
        "price": 1199,
        "stock": 15
      }
    ]
  },
  {
    "name": "Pictureka! Fast-Paced Picture Hunt Game",
    "description": "Hilarious visual hunt board game where players race against the clock to spot quirky illustrations and complete mission cards before opponents.",
    "price": 699,
    "originalPrice": 899,
    "category": "Board Games & Puzzles",
    "ageGroup": "6-8",
    "imageUrl": "images/products/pictureka-fast-paced-picture-hunt-game-punnagai.jpg",
    "inStock": true,
    "stock": 14,
    "quantity": 14,
    "featured": false,
    "newArrival": false,
    "badge": "Party Game",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_18",
        "skuId": "SKU-PICTUREK-18",
        "size": "Standard",
        "color": "Standard",
        "price": 699,
        "stock": 14
      }
    ]
  },
  {
    "name": "Premium Handcrafted Wooden Chess Set",
    "description": "Artisan carved solid wooden chess set with folding magnetic board, velvet-lined storage slots, and weighted Staunton pieces. An heirloom quality intellectual classic.",
    "price": 999,
    "originalPrice": 1399,
    "category": "Board Games & Puzzles",
    "ageGroup": "9-12",
    "imageUrl": "images/products/premium-wooden-chess-set-punnagai.jpg",
    "inStock": true,
    "stock": 12,
    "quantity": 12,
    "featured": true,
    "newArrival": false,
    "badge": "Handcrafted",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_19",
        "skuId": "SKU-PREMIUMH-19",
        "size": "Standard",
        "color": "Standard",
        "price": 999,
        "stock": 12
      }
    ]
  },
  {
    "name": "Rainbow Soft Teddy Bear (40 cm)",
    "description": "Cuddly and ultra-soft plush bear dyed in vibrant pastel rainbow tones with sparkling safety eyes and satin bow tie. 100% skin-safe and hypoallergenic.",
    "price": 649,
    "originalPrice": 899,
    "category": "Soft Toys & Plush",
    "ageGroup": "0-2",
    "imageUrl": "images/products/rainbow-teddy-bear-soft-plush-toy-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": false,
    "newArrival": true,
    "badge": "Super Soft",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_20",
        "skuId": "SKU-RAINBOWS-20",
        "size": "Standard",
        "color": "Standard",
        "price": 649,
        "stock": 20
      }
    ]
  },
  {
    "name": "Remote Control Supersonic Fighter Jet",
    "description": "Ultra-lightweight EPP foam remote control fighter jet with 2.4GHz dual-motor thrust, auto balance gyro, and impact-resistant wings for thrilling park flights.",
    "price": 1499,
    "originalPrice": 1999,
    "category": "Remote Control",
    "ageGroup": "9-12",
    "imageUrl": "images/products/rc-fighter-jet-airplane-toy-punnagai.jpg",
    "inStock": true,
    "stock": 8,
    "quantity": 8,
    "featured": true,
    "newArrival": true,
    "badge": "High Altitude",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_21",
        "skuId": "SKU-REMOTECO-21",
        "size": "Standard",
        "color": "Standard",
        "price": 1499,
        "stock": 8
      }
    ]
  },
  {
    "name": "RC Flying Helicopter with Altitude Hold",
    "description": "Precision coaxial helicopter featuring built-in gyroscope for rock-solid hovering, one-key launch, and USB fast charging. Safe for both indoor and outdoor flight.",
    "price": 1299,
    "originalPrice": 1699,
    "category": "Remote Control",
    "ageGroup": "9-12",
    "imageUrl": "images/products/rc-helicopter-smooth-flight-toy-punnagai.jpg",
    "inStock": true,
    "stock": 10,
    "quantity": 10,
    "featured": true,
    "newArrival": false,
    "badge": "Smooth Flight",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_22",
        "skuId": "SKU-RCFLYING-22",
        "size": "Standard",
        "color": "Standard",
        "price": 1299,
        "stock": 10
      }
    ]
  },
  {
    "name": "Speed Demon RC Sports Racing Car",
    "description": "Sleek high-performance remote control sports car featuring working LED headlights, responsive steering control, and realistic engine sound effects.",
    "price": 849,
    "originalPrice": 1099,
    "category": "Remote Control",
    "ageGroup": "6-8",
    "imageUrl": "images/products/rc-sports-racing-car-toy-punnagai.jpg",
    "inStock": true,
    "stock": 16,
    "quantity": 16,
    "featured": false,
    "newArrival": false,
    "badge": "High Speed",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_23",
        "skuId": "SKU-SPEEDDEM-23",
        "size": "Standard",
        "color": "Standard",
        "price": 849,
        "stock": 16
      }
    ]
  },
  {
    "name": "Interactive Smart Dancing Robot with Lights",
    "description": "Futuristic humanoid robot that walks, dances to cheerful beats, and illuminates dark rooms with colourful visor LEDs. Teaches basic robotics appreciation.",
    "price": 899,
    "originalPrice": 1199,
    "category": "Educational & Learning",
    "ageGroup": "3-5",
    "imageUrl": "images/products/smart-robot-lights-sounds-fun-punnagai.jpg",
    "inStock": true,
    "stock": 14,
    "quantity": 14,
    "featured": true,
    "newArrival": false,
    "badge": "Robotics",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_24",
        "skuId": "SKU-INTERACT-24",
        "size": "Standard",
        "color": "Standard",
        "price": 899,
        "stock": 14
      }
    ]
  },
  {
    "name": "Classic Cuddle Soft Teddy Bear",
    "description": "Traditional golden-brown cuddle teddy bear with velvety soft plush fur, embroidered nose, and huggable soft filling. The timeless childhood favourite.",
    "price": 549,
    "originalPrice": 749,
    "category": "Soft Toys & Plush",
    "ageGroup": "0-2",
    "imageUrl": "images/products/soft-classic-teddy-bear-plush-punnagai.jpg",
    "inStock": true,
    "stock": 25,
    "quantity": 25,
    "featured": true,
    "newArrival": false,
    "badge": "Best Hugs",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_25",
        "skuId": "SKU-CLASSICC-25",
        "size": "Standard",
        "color": "Standard",
        "price": 549,
        "stock": 25
      }
    ]
  },
  {
    "name": "Space Gun G-Strike Cosmic Dart Blaster",
    "description": "Sci-fi blaster rifle equipped with futuristic laser sounds, tactical scope, and soft suction cup darts. Encourages active target practice and outdoor coordination.",
    "price": 749,
    "originalPrice": 999,
    "category": "Action & Adventure",
    "ageGroup": "6-8",
    "imageUrl": "images/products/space-gun-g-strike-toy-blaster-punnagai.jpg",
    "inStock": true,
    "stock": 18,
    "quantity": 18,
    "featured": false,
    "newArrival": false,
    "badge": "Action Pack",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_26",
        "skuId": "SKU-SPACEGUN-26",
        "size": "Standard",
        "color": "Standard",
        "price": 749,
        "stock": 18
      }
    ]
  },
  {
    "name": "Splendor Strategy Gem Trading Game",
    "description": "Renowned Renaissance strategy game. Players collect gem tokens, purchase development cards, and gain prestige points to attract wealthy noble patrons.",
    "price": 1799,
    "originalPrice": 2299,
    "category": "Board Games & Puzzles",
    "ageGroup": "12+",
    "imageUrl": "images/products/splendor-strategy-board-game-punnagai.jpg",
    "inStock": true,
    "stock": 7,
    "quantity": 7,
    "featured": true,
    "newArrival": false,
    "badge": "Strategy Pick",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_27",
        "skuId": "SKU-SPLENDOR-27",
        "size": "Standard",
        "color": "Standard",
        "price": 1799,
        "stock": 7
      }
    ]
  },
  {
    "name": "Thomas & Friends Track Master Train Set",
    "description": "Battery-powered Thomas train engine with snap-together interlocking tracks, bridge ramps, and cargo carts. Compatible with other modular railway sets.",
    "price": 1199,
    "originalPrice": 1599,
    "category": "Building Blocks",
    "ageGroup": "3-5",
    "imageUrl": "images/products/thomas-train-track-set-punnagai.jpg",
    "inStock": true,
    "stock": 12,
    "quantity": 12,
    "featured": true,
    "newArrival": false,
    "badge": "Classic Train",
    "videoUrl": "https://www.youtube.com/watch?v=50W7p72rY1w",
    "variants": [
      {
        "variantId": "var_28",
        "skuId": "SKU-THOMASFR-28",
        "size": "Standard",
        "color": "Standard",
        "price": 1199,
        "stock": 12
      }
    ]
  },
  {
    "name": "Thunder Foam Soft Dart Blaster",
    "description": "Compact single-fire dart blaster featuring ergonomic grip and high-velocity spring mechanism. Includes 10 safe soft foam darts with suction tips.",
    "price": 699,
    "originalPrice": 949,
    "category": "Action & Adventure",
    "ageGroup": "6-8",
    "imageUrl": "images/products/thunder-foam-dart-blaster-gun-punnagai.jpg",
    "inStock": true,
    "stock": 22,
    "quantity": 22,
    "featured": false,
    "newArrival": false,
    "badge": "Safe Play",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_29",
        "skuId": "SKU-THUNDERF-29",
        "size": "Standard",
        "color": "Standard",
        "price": 699,
        "stock": 22
      }
    ]
  },
  {
    "name": "Thunder Strike Rapid Fire Blaster",
    "description": "Heavy duty semi-automatic dart blaster with rotating barrel drum. Fires up to 30 feet with impressive rapid-fire action for backyard missions.",
    "price": 849,
    "originalPrice": 1149,
    "category": "Action & Adventure",
    "ageGroup": "6-8",
    "imageUrl": "images/products/thunder-strike-toy-blaster-gun-punnagai.jpg",
    "inStock": true,
    "stock": 15,
    "quantity": 15,
    "featured": true,
    "newArrival": true,
    "badge": "Rapid Fire",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_30",
        "skuId": "SKU-THUNDERS-30",
        "size": "Standard",
        "color": "Standard",
        "price": 849,
        "stock": 15
      }
    ]
  },
  {
    "name": "1-Click Transforming RC Robot Car",
    "description": "Transforms from a slick sports car into an imposing standing warrior robot with just one button on the remote control! Features dynamic engine sounds.",
    "price": 1099,
    "originalPrice": 1499,
    "category": "Remote Control",
    "ageGroup": "6-8",
    "imageUrl": "images/products/transforming-robot-car-action-toy-punnagai.jpg",
    "inStock": true,
    "stock": 12,
    "quantity": 12,
    "featured": true,
    "newArrival": false,
    "badge": "Transformer",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_31",
        "skuId": "SKU-1CLICKTR-31",
        "size": "Standard",
        "color": "Standard",
        "price": 1099,
        "stock": 12
      }
    ]
  },
  {
    "name": "Ultimate All-Terrain RC Stunt Crawler",
    "description": "Heavy duty 4WD stunt vehicle with oversized hollow rubber monster wheels that can climb over steps, rocks, and mud with extreme agility.",
    "price": 1349,
    "originalPrice": 1799,
    "category": "Remote Control",
    "ageGroup": "6-8",
    "imageUrl": "images/products/ultimate-rc-stunt-car-adventure-punnagai.jpg",
    "inStock": true,
    "stock": 10,
    "quantity": 10,
    "featured": true,
    "newArrival": false,
    "badge": "All Terrain",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_32",
        "skuId": "SKU-ULTIMATE-32",
        "size": "Standard",
        "color": "Standard",
        "price": 1349,
        "stock": 10
      }
    ]
  },
  {
    "name": "Magical Glowing Horn Unicorn Plush",
    "description": "Whimsical unicorn plush with metallic shimmer wings, rainbow mane, and an ultra-soft cuddly body that kids love taking to bedtime.",
    "price": 699,
    "originalPrice": 949,
    "category": "Soft Toys & Plush",
    "ageGroup": "3-5",
    "imageUrl": "images/products/unicorn-soft-plush-toy-punnagai.jpg",
    "inStock": true,
    "stock": 18,
    "quantity": 18,
    "featured": true,
    "newArrival": true,
    "badge": "Magical Pick",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_33",
        "skuId": "SKU-MAGICALG-33",
        "size": "Standard",
        "color": "Standard",
        "price": 699,
        "stock": 18
      }
    ]
  },
  {
    "name": "Long Range Kids Two-Way Walkie Talkie Set",
    "description": "Durable two-way radio set with up to 100 meters clear audio range, belt clips, and flashlight. Perfect for camping, playground hide-and-seek, and neighbourhood games.",
    "price": 899,
    "originalPrice": 1199,
    "category": "Action & Adventure",
    "ageGroup": "6-8",
    "imageUrl": "images/products/walkie-talkie-kids-adventure-set-punnagai.jpg",
    "inStock": true,
    "stock": 14,
    "quantity": 14,
    "featured": true,
    "newArrival": false,
    "badge": "Adventure Kit",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_34",
        "skuId": "SKU-LONGRANG-34",
        "size": "Standard",
        "color": "Standard",
        "price": 899,
        "stock": 14
      }
    ]
  },
  {
    "name": "Natural Pine Wooden Tumbling Tower (Jenga)",
    "description": "54 smooth handcrafted pine wood blocks with dice and stacking sleeve. Promotes precision, patience, and fine-motor balance during high-stakes family game sessions.",
    "price": 549,
    "originalPrice": 749,
    "category": "Board Games & Puzzles",
    "ageGroup": "6-8",
    "imageUrl": "images/products/wooden-jenga-tumbling-tower-game-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": true,
    "newArrival": false,
    "badge": "Party Favourite",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_35",
        "skuId": "SKU-NATURALP-35",
        "size": "Standard",
        "color": "Standard",
        "price": 549,
        "stock": 20
      }
    ]
  },
  {
    "name": "Classic Wooden Ludo & Snakes Board Game",
    "description": "Double-sided solid wooden board featuring Ludo on one side and Snakes & Ladders on the reverse. Includes wooden dice and pawns in a traditional storage box.",
    "price": 599,
    "originalPrice": 799,
    "category": "Board Games & Puzzles",
    "ageGroup": "6-8",
    "imageUrl": "images/products/wooden-ludo-classic-family-game-punnagai.jpg",
    "inStock": true,
    "stock": 16,
    "quantity": 16,
    "featured": true,
    "newArrival": false,
    "badge": "Heritage",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_36",
        "skuId": "SKU-CLASSICW-36",
        "size": "Standard",
        "color": "Standard",
        "price": 599,
        "stock": 16
      }
    ]
  },
  {
    "name": "Montessori Wooden Memory Match Chess Game",
    "description": "Clever wooden memory game with 24 colour-tipped pegs and rolling dice. Strengthens working memory, colour recognition, and cognitive focus in toddlers and preschoolers.",
    "price": 499,
    "originalPrice": 699,
    "category": "Educational & Learning",
    "ageGroup": "3-5",
    "imageUrl": "images/products/wooden-memory-chess-educational-game-punnagai.jpg",
    "inStock": true,
    "stock": 22,
    "quantity": 22,
    "featured": true,
    "newArrival": true,
    "badge": "Memory Boost",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_37",
        "skuId": "SKU-MONTESSO-37",
        "size": "Standard",
        "color": "Standard",
        "price": 499,
        "stock": 22
      }
    ]
  },
  {
    "name": "Wooden Numbers & Shapes Counting Puzzle",
    "description": "Vibrant wooden board with 3D number blocks 0–9 and fundamental mathematical symbols (+, -, =). Helps young learners master foundational numeracy through hands-on play.",
    "price": 449,
    "originalPrice": 599,
    "category": "Educational & Learning",
    "ageGroup": "0-2",
    "imageUrl": "images/products/wooden-number-puzzle-math-toy-punnagai.jpg",
    "inStock": true,
    "stock": 24,
    "quantity": 24,
    "featured": true,
    "newArrival": false,
    "badge": "Early Maths",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_38",
        "skuId": "SKU-WOODENNU-38",
        "size": "Standard",
        "color": "Standard",
        "price": 449,
        "stock": 24
      }
    ]
  },
  {
    "name": "Montessori Wooden Geometric Shape Sorter",
    "description": "Solid wooden sorting cube featuring precision-cut cutouts for triangles, squares, circles, and stars. Teaches shape discrimination, hand-eye coordination, and problem solving.",
    "price": 649,
    "originalPrice": 899,
    "category": "Educational & Learning",
    "ageGroup": "0-2",
    "imageUrl": "images/products/wooden-shape-sorter-educational-toy-punnagai.jpg",
    "inStock": true,
    "stock": 20,
    "quantity": 20,
    "featured": true,
    "newArrival": false,
    "badge": "Motor Skills",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_39",
        "skuId": "SKU-MONTESSO-39",
        "size": "Standard",
        "color": "Standard",
        "price": 649,
        "stock": 20
      }
    ]
  },
  {
    "name": "Handcrafted Wooden Tic Tac Toe Noughts & Crosses",
    "description": "Tactile coffee-table wooden grid with chunky X and O blocks. Great screen-free travel toy for quick brain exercises anywhere.",
    "price": 349,
    "originalPrice": 499,
    "category": "Board Games & Puzzles",
    "ageGroup": "3-5",
    "imageUrl": "images/products/wooden-tic-tac-toe-puzzle-game-punnagai.jpg",
    "inStock": true,
    "stock": 30,
    "quantity": 30,
    "featured": false,
    "newArrival": false,
    "badge": "Pocket Game",
    "videoUrl": "",
    "variants": [
      {
        "variantId": "var_40",
        "skuId": "SKU-HANDCRAF-40",
        "size": "Standard",
        "color": "Standard",
        "price": 349,
        "stock": 30
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
