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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": "https://www.youtube.com/watch?v=F3I3MFQY8PU"
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": "https://www.youtube.com/watch?v=50W7p72rY1w"
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
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
    "videoUrl": ""
  }
];

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
const LOCAL_STORAGE_CATALOG_VERSION = 'punnagai_catalog_v2026_41_branded_official';

// Immediate purge of obsolete dummy products on file evaluation
(function purgeLegacyProducts() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const ver = localStorage.getItem('punnagai_catalog_version');
      if (
        raw &&
        (ver !== LOCAL_STORAGE_CATALOG_VERSION ||
          raw.includes('Wooden Rainbow Stacker') ||
          raw.includes('Magnetic Drawing Board') ||
          raw.includes('LEGO Classic Creative Bricks Set'))
      ) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.setItem('punnagai_catalog_version', LOCAL_STORAGE_CATALOG_VERSION);
      }
    }
  } catch (e) {}
})();

function getLocalProducts() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const currentVer = localStorage.getItem('punnagai_catalog_version');
    if (raw !== null && currentVer === LOCAL_STORAGE_CATALOG_VERSION) {
      const prods = JSON.parse(raw);
      const isOutdated =
        Array.isArray(prods) &&
        prods.some(
          (p) =>
            p.name === 'Wooden Rainbow Stacker' ||
            p.name === 'LEGO Classic Creative Bricks Set' ||
            p.name === 'Magnetic Drawing Board' ||
            p.name === 'Remote Control Racing Car 4WD' ||
            p.name === 'Scrabble Junior Board Game'
        );
      if (Array.isArray(prods) && prods.length > 0 && !isOutdated) {
        return prods;
      }
    }
  } catch (e) {}

  // Auto-seed from SEED_PRODUCTS if empty, version updated, or contains old dummy template products
  const seeded = SEED_PRODUCTS.map((p, i) => ({
    ...p,
    id: 'local_seed_' + i,
    createdAt: Date.now() - i * 1000
  }));
  saveLocalProducts(seeded);
  return seeded;
}

function saveLocalProducts(products) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
    localStorage.setItem('punnagai_catalog_version', LOCAL_STORAGE_CATALOG_VERSION);
  } catch (e) {}
}

// ============================================================
// PRODUCT CRUD OPERATIONS (HYBRID)
// ============================================================

function generateId() {
  return 'local_' + Math.random().toString(36).substr(2, 9);
}

function getServerTimestamp() {
  return window.USE_LOCAL_MODE
    ? Date.now()
    : firebase && firebase.firestore
      ? firebase.firestore.FieldValue.serverTimestamp()
      : Date.now();
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

      // Resilience Fallback: If Firestore returned 0 products or old template products, fall back to local seed products
      const hasOutdatedFirestoreProducts =
        Array.isArray(products) &&
        products.some(
          (p) =>
            p.name === 'Wooden Rainbow Stacker' ||
            p.name === 'LEGO Classic Creative Bricks Set' ||
            p.name === 'Magnetic Drawing Board' ||
            p.name === 'Remote Control Racing Car 4WD' ||
            p.name === 'Scrabble Junior Board Game'
        );

      if (!products || products.length === 0 || hasOutdatedFirestoreProducts) {
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
    const strId = String(id);
    return (
      products.find(
        (p) =>
          p.id === strId ||
          p.name === strId ||
          p.id === 'local_seed_' + strId ||
          (p.variants && p.variants.some((v) => v.skuId === strId || v.variantId === strId))
      ) || null
    );
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
      const currentVer = localStorage.getItem('punnagai_catalog_version');
      const products = getLocalProducts();
      if (products.length === 0 || currentVer !== LOCAL_STORAGE_CATALOG_VERSION) {
        console.log('Seeding initial products to LocalStorage...');
        const seeded = SEED_PRODUCTS.map((p, i) => ({
          ...p,
          id: 'local_seed_' + i,
          createdAt: Date.now() - i * 1000 // slightly offset times
        }));
        saveLocalProducts(seeded);
        localStorage.setItem('punnagai_catalog_version', LOCAL_STORAGE_CATALOG_VERSION);
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

async function seedBannersIfEmpty() {
  try {
    if (window.USE_LOCAL_MODE) {
      const banners = getLocalCollection(COLLECTIONS.BANNERS);
      const currentVer = localStorage.getItem('punnagai_banners_version');
      if (banners.length === 0 || currentVer !== 'punnagai_banners_v2') {
        console.log('Seeding initial banners to LocalStorage...');
        const seeded = [
          {
            id: 'banner_seed_1',
            title: 'Celebrate with Punnagai Toys',
            imageUrl: 'images/hero-banner.png',
            linkType: 'category',
            linkId: 'Educational & Learning',
            displayOrder: 1,
            active: true
          },
          {
            id: 'banner_seed_2',
            title: 'Storefront Summer Sale',
            imageUrl: 'images/banners/banner-summer-sale.jpg',
            linkType: 'category',
            linkId: 'Educational & Learning',
            displayOrder: 2,
            active: true
          },
          {
            id: 'banner_seed_3',
            title: 'Explore High-Speed RC & Action Stunts',
            imageUrl: 'images/banners/hero-banner-2.png',
            linkType: 'category',
            linkId: 'Remote Control',
            displayOrder: 3,
            active: true
          },
          {
            id: 'banner_seed_4',
            title: 'Special Storefront Offers & Deals',
            imageUrl: 'images/banners/storefront-promo-banner.png',
            linkType: 'category',
            linkId: 'Action & Adventure',
            displayOrder: 4,
            active: true
          }
        ];
        const key = LOCAL_STORAGE_KEYS[COLLECTIONS.BANNERS] || 'punnagai_mock_banners';
        localStorage.setItem(key, JSON.stringify(seeded));
        localStorage.setItem('punnagai_banners_version', 'punnagai_banners_v2');
        console.log('Banners seed complete!');
        return true;
      }
      return false;
    }
  } catch (err) {
    console.error('Banners seed error:', err);
    return false;
  }
}

// Auto-seed in local mode when file loads so home page has data instantly
if (typeof window !== 'undefined' && window.USE_LOCAL_MODE) {
  seedProductsIfEmpty();
  seedCouponsIfEmpty();
  seedBannersIfEmpty();
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
      await db
        .collection(COLLECTIONS.USERS)
        .doc(targetUid)
        .set({
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

  // Fallback for Local Storage Demo mode / Direct Client write
  const safeUserId =
    orderData.userId && orderData.userId !== 'guest' ? String(orderData.userId) : null;

  return createDoc(COLLECTIONS.ORDERS, {
    userId: safeUserId,
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
