/**
 * scripts/update-catalog.js
 * Updates js/data.js, scripts/seed-firestore.js, and js/admin-media-library.js
 * with the 41 clean-named branded products and local banner images.
 */
const fs = require('fs');
const path = require('path');

const workspaceDir = path.resolve(__dirname, '..');

const products = [
  {
    name: '3D Wooden Ludo Family Board Game',
    description: 'Handcrafted 3D wooden Ludo board game featuring multi-tiered pathways and solid wooden tokens. A fun, tactile spin on the timeless family classic that sparks spatial thinking.',
    price: 799,
    originalPrice: 999,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'images/products/wooden-3d-ludo-family-board-game-punnagai.jpg',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: false,
    badge: 'Family Choice',
    videoUrl: ''
  },
  {
    name: 'Automatic Bubble Gun Gatling Blaster',
    description: 'High-output multi-hole bubble blaster with LED illumination. Generates hundreds of magical bubbles per minute with the pull of a trigger. Includes bubble solution.',
    price: 499,
    originalPrice: 699,
    category: 'Outdoor & Sports',
    ageGroup: '3-5',
    imageUrl: 'images/products/automatic-bubble-gun-blaster-toy-punnagai.jpg',
    inStock: true,
    stock: 25,
    quantity: 25,
    featured: true,
    newArrival: true,
    badge: 'Trending',
    videoUrl: ''
  },
  {
    name: 'Catan: Trade, Build, Settle Board Game',
    description: 'The award-winning international strategy game where players trade resources, build settlements, and expand across the island of Catan. Perfect for game nights and family bonding.',
    price: 1899,
    originalPrice: 2499,
    category: 'Board Games & Puzzles',
    ageGroup: '12+',
    imageUrl: 'images/products/catan-trade-build-settle-board-game-punnagai.jpg',
    inStock: true,
    stock: 8,
    quantity: 8,
    featured: true,
    newArrival: false,
    badge: 'Best Seller',
    videoUrl: ''
  },
  {
    name: 'Crossword Word Building Board Game',
    description: 'Engaging educational crossword puzzle game that enriches vocabulary, spelling, and linguistic agility for growing minds. Includes tile grid and score racks.',
    price: 449,
    originalPrice: 599,
    category: 'Educational & Learning',
    ageGroup: '6-8',
    imageUrl: 'images/products/crossword-educational-word-game-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: false,
    newArrival: false,
    badge: 'Brain Teaser',
    videoUrl: ''
  },
  {
    name: 'Cute Reversible Strawberry Bunny Plush',
    description: 'Ultra-soft reversible plush that zips from a delicious strawberry into an adorable cuddly bunny. Hand-stitched with hypoallergenic velvet fabric.',
    price: 599,
    originalPrice: 799,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'images/products/cute-strawberry-bunny-soft-plush-toy-punnagai.jpg',
    inStock: true,
    stock: 30,
    quantity: 30,
    featured: true,
    newArrival: true,
    badge: 'Popular',
    videoUrl: ''
  },
  {
    name: 'Musical Dancing Angel Princess Doll',
    description: 'Enchanting battery-operated princess doll that spins 360°, projects colourful kaleidoscope LED patterns, and plays cheerful music. Automatic bump-and-go action.',
    price: 649,
    originalPrice: 899,
    category: 'Dolls & Fashion',
    ageGroup: '3-5',
    imageUrl: 'images/products/dancing-angel-doll-lights-music-punnagai.jpg',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: false,
    newArrival: false,
    badge: 'Hot',
    videoUrl: ''
  },
  {
    name: 'Dancing Bunny Musical Toy with LED Lights',
    description: 'Playful musical bunny with rhythmic ear wiggles, vibrant flashing ear lights, and interactive tunes that encourage infants to crawl and dance along.',
    price: 549,
    originalPrice: 749,
    category: 'Musical Toys',
    ageGroup: '0-2',
    imageUrl: 'images/products/dancing-bunny-musical-light-toy-punnagai.jpg',
    inStock: true,
    stock: 22,
    quantity: 22,
    featured: false,
    newArrival: false,
    badge: 'Kid Approved',
    videoUrl: ''
  },
  {
    name: 'Dancing Elephant with Floating Air Ball',
    description: 'As demonstrated on our official YouTube channel! Joyful musical elephant that levitates a lightweight ball on an air stream while dancing and playing music.',
    price: 699,
    originalPrice: 999,
    category: 'Musical Toys',
    ageGroup: '0-2',
    imageUrl: 'images/products/dancing-elephant-musical-toy-adventure-punnagai.jpg',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: true,
    badge: 'YouTube Hit',
    videoUrl: 'https://www.youtube.com/watch?v=F3I3MFQY8PU'
  },
  {
    name: 'Electric Swan with 3D Lights & Motion',
    description: 'Graceful gliding swan toy featuring 3D holographic crystal wing lighting, sweet melodies, and self-navigating omnidirectional wheels.',
    price: 599,
    originalPrice: 799,
    category: 'Musical Toys',
    ageGroup: '3-5',
    imageUrl: 'images/products/electric-swan-lights-music-motion-punnagai.jpg',
    inStock: true,
    stock: 16,
    quantity: 16,
    featured: false,
    newArrival: true,
    badge: 'New',
    videoUrl: ''
  },
  {
    name: 'Heavy Duty JCB Excavator Construction Truck',
    description: 'Sturdy construction excavator with multi-joint articulated digging arm, 360° rotating cabin, and rugged caterpillar tracks. Built for rough play in sand and floor.',
    price: 649,
    originalPrice: 849,
    category: 'Action & Adventure',
    ageGroup: '3-5',
    imageUrl: 'images/products/construction-jcb-excavator-truck-toy-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Best Seller',
    videoUrl: ''
  },
  {
    name: 'Formula 1 High-Speed Racing Car',
    description: 'Aerodynamic F1 racing car replica with authentic racing livery, spoiler aerodynamics, and high-traction rubber wheels for lightning fast floor sprints.',
    price: 899,
    originalPrice: 1199,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'images/products/formula-one-racing-car-toy-punnagai.jpg',
    inStock: true,
    stock: 14,
    quantity: 14,
    featured: true,
    newArrival: false,
    badge: 'Speed Edition',
    videoUrl: ''
  },
  {
    name: 'Hanging Windmill Sensory Activity Toy',
    description: 'Multi-sensory infant hanging toy with gentle rotating windmill paddles, high-contrast visual colours, and soothing chime sounds. Clips securely onto cribs and strollers.',
    price: 399,
    originalPrice: 549,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'images/products/hanging-windmill-infant-crib-toy-punnagai.jpg',
    inStock: true,
    stock: 25,
    quantity: 25,
    featured: false,
    newArrival: false,
    badge: 'Baby Choice',
    videoUrl: ''
  },
  {
    name: 'Air Power Hover Soccer Ball with LED',
    description: 'Glides effortlessly on cushions of air across hardwood, tiles, and low carpets. Soft foam bumper edges protect household furniture and walls during exciting indoor matches.',
    price: 599,
    originalPrice: 799,
    category: 'Outdoor & Sports',
    ageGroup: '6-8',
    imageUrl: 'images/products/hover-soccer-ball-indoor-sports-toy-punnagai.jpg',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: true,
    newArrival: false,
    badge: 'Indoor Hit',
    videoUrl: ''
  },
  {
    name: 'Sweet Treats Ice Cream Vandi Pretend Cart',
    description: 'Charming traditional street style Ice Cream Vandi cart packed with ice cream cones, lollies, coins, and toppings. Develops social roleplay and arithmetic skills.',
    price: 749,
    originalPrice: 999,
    category: 'Dolls & Fashion',
    ageGroup: '3-5',
    imageUrl: 'images/products/ice-cream-cart-vandi-pretend-play-punnagai.jpg',
    inStock: true,
    stock: 12,
    quantity: 12,
    featured: true,
    newArrival: true,
    badge: 'Pretend Play',
    videoUrl: ''
  },
  {
    name: 'Electric Crawling Musical Caterpillar Worm',
    description: 'Engaging wiggle-and-crawl caterpillar with sensory light-up body segments and happy music. Encourages babies during vital tummy-time and crawling development.',
    price: 499,
    originalPrice: 699,
    category: 'Musical Toys',
    ageGroup: '0-2',
    imageUrl: 'images/products/electric-crawling-worm-musical-toy-punnagai.jpg',
    inStock: true,
    stock: 24,
    quantity: 24,
    featured: false,
    newArrival: false,
    badge: 'Tummy Time',
    videoUrl: ''
  },
  {
    name: 'Little Doctor Medical Suitcase Play Set',
    description: 'Complete junior doctor kit in a portable carry case. Includes stethoscope with heartbeat sound, thermometer, syringe, reflex hammer, and glasses.',
    price: 599,
    originalPrice: 799,
    category: 'Educational & Learning',
    ageGroup: '3-5',
    imageUrl: 'images/products/little-doctor-medical-kit-pretend-play-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Pretend Play',
    videoUrl: ''
  },
  {
    name: 'Monopoly India Edition Board Game',
    description: 'The classic fast-dealing property trading game featuring iconic Indian cities and heritage landmarks. Buy, sell, and mortgage properties to build an empire!',
    price: 1299,
    originalPrice: 1699,
    category: 'Board Games & Puzzles',
    ageGroup: '9-12',
    imageUrl: 'images/products/monopoly-india-edition-board-game-punnagai.jpg',
    inStock: true,
    stock: 10,
    quantity: 10,
    featured: true,
    newArrival: false,
    badge: 'Classic Hit',
    videoUrl: ''
  },
  {
    name: 'Neon RC 360° Rotating Stunt Car',
    description: 'High-energy double-sided flip car equipped with neon wheel LEDs, 360-degree high-speed rotation, and rugged rubber knobby wheels for zero roll-over stalls.',
    price: 1199,
    originalPrice: 1599,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'images/products/neon-rc-stunt-car-adventure-punnagai.jpg',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: true,
    badge: '360 Spin',
    videoUrl: ''
  },
  {
    name: 'Pictureka! Fast-Paced Picture Hunt Game',
    description: 'Hilarious visual hunt board game where players race against the clock to spot quirky illustrations and complete mission cards before opponents.',
    price: 699,
    originalPrice: 899,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'images/products/pictureka-fast-paced-picture-hunt-game-punnagai.jpg',
    inStock: true,
    stock: 14,
    quantity: 14,
    featured: false,
    newArrival: false,
    badge: 'Party Game',
    videoUrl: ''
  },
  {
    name: 'Premium Handcrafted Wooden Chess Set',
    description: 'Artisan carved solid wooden chess set with folding magnetic board, velvet-lined storage slots, and weighted Staunton pieces. An heirloom quality intellectual classic.',
    price: 999,
    originalPrice: 1399,
    category: 'Board Games & Puzzles',
    ageGroup: '9-12',
    imageUrl: 'images/products/premium-wooden-chess-set-punnagai.jpg',
    inStock: true,
    stock: 12,
    quantity: 12,
    featured: true,
    newArrival: false,
    badge: 'Handcrafted',
    videoUrl: ''
  },
  {
    name: 'Rainbow Soft Teddy Bear (40 cm)',
    description: 'Cuddly and ultra-soft plush bear dyed in vibrant pastel rainbow tones with sparkling safety eyes and satin bow tie. 100% skin-safe and hypoallergenic.',
    price: 649,
    originalPrice: 899,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'images/products/rainbow-teddy-bear-soft-plush-toy-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: false,
    newArrival: true,
    badge: 'Super Soft',
    videoUrl: ''
  },
  {
    name: 'Remote Control Supersonic Fighter Jet',
    description: 'Ultra-lightweight EPP foam remote control fighter jet with 2.4GHz dual-motor thrust, auto balance gyro, and impact-resistant wings for thrilling park flights.',
    price: 1499,
    originalPrice: 1999,
    category: 'Remote Control',
    ageGroup: '9-12',
    imageUrl: 'images/products/rc-fighter-jet-airplane-toy-punnagai.jpg',
    inStock: true,
    stock: 8,
    quantity: 8,
    featured: true,
    newArrival: true,
    badge: 'High Altitude',
    videoUrl: ''
  },
  {
    name: 'RC Flying Helicopter with Altitude Hold',
    description: 'Precision coaxial helicopter featuring built-in gyroscope for rock-solid hovering, one-key launch, and USB fast charging. Safe for both indoor and outdoor flight.',
    price: 1299,
    originalPrice: 1699,
    category: 'Remote Control',
    ageGroup: '9-12',
    imageUrl: 'images/products/rc-helicopter-smooth-flight-toy-punnagai.jpg',
    inStock: true,
    stock: 10,
    quantity: 10,
    featured: true,
    newArrival: false,
    badge: 'Smooth Flight',
    videoUrl: ''
  },
  {
    name: 'Speed Demon RC Sports Racing Car',
    description: 'Sleek high-performance remote control sports car featuring working LED headlights, responsive steering control, and realistic engine sound effects.',
    price: 849,
    originalPrice: 1099,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'images/products/rc-sports-racing-car-toy-punnagai.jpg',
    inStock: true,
    stock: 16,
    quantity: 16,
    featured: false,
    newArrival: false,
    badge: 'High Speed',
    videoUrl: ''
  },
  {
    name: 'Interactive Smart Dancing Robot with Lights',
    description: 'Futuristic humanoid robot that walks, dances to cheerful beats, and illuminates dark rooms with colourful visor LEDs. Teaches basic robotics appreciation.',
    price: 899,
    originalPrice: 1199,
    category: 'Educational & Learning',
    ageGroup: '3-5',
    imageUrl: 'images/products/smart-robot-lights-sounds-fun-punnagai.jpg',
    inStock: true,
    stock: 14,
    quantity: 14,
    featured: true,
    newArrival: false,
    badge: 'Robotics',
    videoUrl: ''
  },
  {
    name: 'Classic Cuddle Soft Teddy Bear',
    description: 'Traditional golden-brown cuddle teddy bear with velvety soft plush fur, embroidered nose, and huggable soft filling. The timeless childhood favourite.',
    price: 549,
    originalPrice: 749,
    category: 'Soft Toys & Plush',
    ageGroup: '0-2',
    imageUrl: 'images/products/soft-classic-teddy-bear-plush-punnagai.jpg',
    inStock: true,
    stock: 25,
    quantity: 25,
    featured: true,
    newArrival: false,
    badge: 'Best Hugs',
    videoUrl: ''
  },
  {
    name: 'Space Gun G-Strike Cosmic Dart Blaster',
    description: 'Sci-fi blaster rifle equipped with futuristic laser sounds, tactical scope, and soft suction cup darts. Encourages active target practice and outdoor coordination.',
    price: 749,
    originalPrice: 999,
    category: 'Action & Adventure',
    ageGroup: '6-8',
    imageUrl: 'images/products/space-gun-g-strike-toy-blaster-punnagai.jpg',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: false,
    newArrival: false,
    badge: 'Action Pack',
    videoUrl: ''
  },
  {
    name: 'Splendor Strategy Gem Trading Game',
    description: 'Renowned Renaissance strategy game. Players collect gem tokens, purchase development cards, and gain prestige points to attract wealthy noble patrons.',
    price: 1799,
    originalPrice: 2299,
    category: 'Board Games & Puzzles',
    ageGroup: '12+',
    imageUrl: 'images/products/splendor-strategy-board-game-punnagai.jpg',
    inStock: true,
    stock: 7,
    quantity: 7,
    featured: true,
    newArrival: false,
    badge: 'Strategy Pick',
    videoUrl: ''
  },
  {
    name: 'Thomas & Friends Track Master Train Set',
    description: 'Battery-powered Thomas train engine with snap-together interlocking tracks, bridge ramps, and cargo carts. Compatible with other modular railway sets.',
    price: 1199,
    originalPrice: 1599,
    category: 'Building Blocks',
    ageGroup: '3-5',
    imageUrl: 'images/products/thomas-train-track-set-punnagai.jpg',
    inStock: true,
    stock: 12,
    quantity: 12,
    featured: true,
    newArrival: false,
    badge: 'Classic Train',
    videoUrl: 'https://www.youtube.com/watch?v=50W7p72rY1w'
  },
  {
    name: 'Thunder Foam Soft Dart Blaster',
    description: 'Compact single-fire dart blaster featuring ergonomic grip and high-velocity spring mechanism. Includes 10 safe soft foam darts with suction tips.',
    price: 699,
    originalPrice: 949,
    category: 'Action & Adventure',
    ageGroup: '6-8',
    imageUrl: 'images/products/thunder-foam-dart-blaster-gun-punnagai.jpg',
    inStock: true,
    stock: 22,
    quantity: 22,
    featured: false,
    newArrival: false,
    badge: 'Safe Play',
    videoUrl: ''
  },
  {
    name: 'Thunder Strike Rapid Fire Blaster',
    description: 'Heavy duty semi-automatic dart blaster with rotating barrel drum. Fires up to 30 feet with impressive rapid-fire action for backyard missions.',
    price: 849,
    originalPrice: 1149,
    category: 'Action & Adventure',
    ageGroup: '6-8',
    imageUrl: 'images/products/thunder-strike-toy-blaster-gun-punnagai.jpg',
    inStock: true,
    stock: 15,
    quantity: 15,
    featured: true,
    newArrival: true,
    badge: 'Rapid Fire',
    videoUrl: ''
  },
  {
    name: '1-Click Transforming RC Robot Car',
    description: 'Transforms from a slick sports car into an imposing standing warrior robot with just one button on the remote control! Features dynamic engine sounds.',
    price: 1099,
    originalPrice: 1499,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'images/products/transforming-robot-car-action-toy-punnagai.jpg',
    inStock: true,
    stock: 12,
    quantity: 12,
    featured: true,
    newArrival: false,
    badge: 'Transformer',
    videoUrl: ''
  },
  {
    name: 'Ultimate All-Terrain RC Stunt Crawler',
    description: 'Heavy duty 4WD stunt vehicle with oversized hollow rubber monster wheels that can climb over steps, rocks, and mud with extreme agility.',
    price: 1349,
    originalPrice: 1799,
    category: 'Remote Control',
    ageGroup: '6-8',
    imageUrl: 'images/products/ultimate-rc-stunt-car-adventure-punnagai.jpg',
    inStock: true,
    stock: 10,
    quantity: 10,
    featured: true,
    newArrival: false,
    badge: 'All Terrain',
    videoUrl: ''
  },
  {
    name: 'Magical Glowing Horn Unicorn Plush',
    description: 'Whimsical unicorn plush with metallic shimmer wings, rainbow mane, and an ultra-soft cuddly body that kids love taking to bedtime.',
    price: 699,
    originalPrice: 949,
    category: 'Soft Toys & Plush',
    ageGroup: '3-5',
    imageUrl: 'images/products/unicorn-soft-plush-toy-punnagai.jpg',
    inStock: true,
    stock: 18,
    quantity: 18,
    featured: true,
    newArrival: true,
    badge: 'Magical Pick',
    videoUrl: ''
  },
  {
    name: 'Long Range Kids Two-Way Walkie Talkie Set',
    description: 'Durable two-way radio set with up to 100 meters clear audio range, belt clips, and flashlight. Perfect for camping, playground hide-and-seek, and neighbourhood games.',
    price: 899,
    originalPrice: 1199,
    category: 'Action & Adventure',
    ageGroup: '6-8',
    imageUrl: 'images/products/walkie-talkie-kids-adventure-set-punnagai.jpg',
    inStock: true,
    stock: 14,
    quantity: 14,
    featured: true,
    newArrival: false,
    badge: 'Adventure Kit',
    videoUrl: ''
  },
  {
    name: 'Natural Pine Wooden Tumbling Tower (Jenga)',
    description: '54 smooth handcrafted pine wood blocks with dice and stacking sleeve. Promotes precision, patience, and fine-motor balance during high-stakes family game sessions.',
    price: 549,
    originalPrice: 749,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'images/products/wooden-jenga-tumbling-tower-game-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Party Favourite',
    videoUrl: ''
  },
  {
    name: 'Classic Wooden Ludo & Snakes Board Game',
    description: 'Double-sided solid wooden board featuring Ludo on one side and Snakes & Ladders on the reverse. Includes wooden dice and pawns in a traditional storage box.',
    price: 599,
    originalPrice: 799,
    category: 'Board Games & Puzzles',
    ageGroup: '6-8',
    imageUrl: 'images/products/wooden-ludo-classic-family-game-punnagai.jpg',
    inStock: true,
    stock: 16,
    quantity: 16,
    featured: true,
    newArrival: false,
    badge: 'Heritage',
    videoUrl: ''
  },
  {
    name: 'Montessori Wooden Memory Match Chess Game',
    description: 'Clever wooden memory game with 24 colour-tipped pegs and rolling dice. Strengthens working memory, colour recognition, and cognitive focus in toddlers and preschoolers.',
    price: 499,
    originalPrice: 699,
    category: 'Educational & Learning',
    ageGroup: '3-5',
    imageUrl: 'images/products/wooden-memory-chess-educational-game-punnagai.jpg',
    inStock: true,
    stock: 22,
    quantity: 22,
    featured: true,
    newArrival: true,
    badge: 'Memory Boost',
    videoUrl: ''
  },
  {
    name: 'Wooden Numbers & Shapes Counting Puzzle',
    description: 'Vibrant wooden board with 3D number blocks 0–9 and fundamental mathematical symbols (+, -, =). Helps young learners master foundational numeracy through hands-on play.',
    price: 449,
    originalPrice: 599,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'images/products/wooden-number-puzzle-math-toy-punnagai.jpg',
    inStock: true,
    stock: 24,
    quantity: 24,
    featured: true,
    newArrival: false,
    badge: 'Early Maths',
    videoUrl: ''
  },
  {
    name: 'Montessori Wooden Geometric Shape Sorter',
    description: 'Solid wooden sorting cube featuring precision-cut cutouts for triangles, squares, circles, and stars. Teaches shape discrimination, hand-eye coordination, and problem solving.',
    price: 649,
    originalPrice: 899,
    category: 'Educational & Learning',
    ageGroup: '0-2',
    imageUrl: 'images/products/wooden-shape-sorter-educational-toy-punnagai.jpg',
    inStock: true,
    stock: 20,
    quantity: 20,
    featured: true,
    newArrival: false,
    badge: 'Motor Skills',
    videoUrl: ''
  },
  {
    name: 'Handcrafted Wooden Tic Tac Toe Noughts & Crosses',
    description: 'Tactile coffee-table wooden grid with chunky X and O blocks. Great screen-free travel toy for quick brain exercises anywhere.',
    price: 349,
    originalPrice: 499,
    category: 'Board Games & Puzzles',
    ageGroup: '3-5',
    imageUrl: 'images/products/wooden-tic-tac-toe-puzzle-game-punnagai.jpg',
    inStock: true,
    stock: 30,
    quantity: 30,
    featured: false,
    newArrival: false,
    badge: 'Pocket Game',
    videoUrl: ''
  }
];

// --- 1. Update js/data.js ---
const dataJsPath = path.join(workspaceDir, 'js', 'data.js');
let dataContent = fs.readFileSync(dataJsPath, 'utf8');

const productsStr = 'const SEED_PRODUCTS = ' + JSON.stringify(products, null, 2) + ';';
dataContent = dataContent.replace(/const SEED_PRODUCTS = \[[\s\S]*?\n\];/, productsStr);

// Update catalog version to force local storage migration
dataContent = dataContent.replace(
  /const LOCAL_STORAGE_CATALOG_VERSION = 'punnagai_catalog_v2026';/,
  "const LOCAL_STORAGE_CATALOG_VERSION = 'punnagai_catalog_v2026_branded';"
);

// Update getLocalProducts to auto-refresh when version changes
dataContent = dataContent.replace(
  /function getLocalProducts\(\) \{\s*try \{\s*const raw = localStorage\.getItem\(LOCAL_STORAGE_KEY\);[\s\S]*?return \[\];\s*\}/,
  `function getLocalProducts() {
  try {
    const currentVer = localStorage.getItem('punnagai_catalog_version');
    if (currentVer !== LOCAL_STORAGE_CATALOG_VERSION) {
      const seeded = SEED_PRODUCTS.map((p, i) => ({
        ...p,
        id: 'local_seed_' + i,
        createdAt: Date.now() - i * 1000
      }));
      saveLocalProducts(seeded);
      return seeded;
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw !== null) {
      const prods = JSON.parse(raw);
      if (Array.isArray(prods) && prods.length > 0) {
        return prods;
      }
    }
  } catch (e) {}
  return [];
}`
);

fs.writeFileSync(dataJsPath, dataContent, 'utf8');
console.log('✓ Successfully updated js/data.js with 41 branded products.');

// --- 2. Update scripts/seed-firestore.js ---
const seedScriptPath = path.join(workspaceDir, 'scripts', 'seed-firestore.js');
let seedContent = fs.readFileSync(seedScriptPath, 'utf8');

const firestoreProducts = products.map((p, i) => ({
  ...p,
  variants: [
    {
      variantId: 'var_' + i,
      skuId: 'SKU-' + p.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + '-' + i,
      size: 'Standard',
      color: 'Standard',
      price: p.price,
      stock: p.stock
    }
  ]
}));

const firestoreProductsStr = 'const PRODUCTS_DATA = ' + JSON.stringify(firestoreProducts, null, 2) + ';';
seedContent = seedContent.replace(/const PRODUCTS_DATA = \[[\s\S]*?\n\];/, firestoreProductsStr);

seedContent = seedContent.replace(
  /const BANNERS_DATA = \[[\s\S]*?\n\];/,
  `const BANNERS_DATA = [
  {
    title: 'Celebrate with Punnagai Toys',
    imageUrl: 'images/banners/banner-summer-sale.jpg',
    linkType: 'category',
    linkId: 'Educational & Learning',
    displayOrder: 1,
    active: true
  },
  {
    title: 'Explore STEM & Robotics Kits',
    imageUrl: 'images/hero-banner.jpg',
    linkType: 'category',
    linkId: 'Building Blocks',
    displayOrder: 2,
    active: true
  }
];`
);

fs.writeFileSync(seedScriptPath, seedContent, 'utf8');
console.log('✓ Successfully updated scripts/seed-firestore.js with 41 branded products & banners.');

// --- 3. Update js/admin-media-library.js ---
const mediaLibPath = path.join(workspaceDir, 'js', 'admin-media-library.js');
let mediaContent = fs.readFileSync(mediaLibPath, 'utf8');

const defaultMedia = [
  {
    id: 'med_banner_1',
    title: 'Storefront Hero Banner (Panoramic)',
    category: 'banners',
    url: 'images/hero-banner.jpg',
    date: '2026-07-01',
    dimensions: '1600x720'
  },
  {
    id: 'med_banner_2',
    title: 'Storefront Summer Sale Banner',
    category: 'banners',
    url: 'images/banners/banner-summer-sale.jpg',
    date: '2026-07-02',
    dimensions: '1497x643'
  },
  {
    id: 'med_banner_3',
    title: 'Store Interior & Exterior Hero',
    category: 'banners',
    url: 'images/store-hero.jpg',
    date: '2026-07-03',
    dimensions: '1376x768'
  },
  ...products.map((p, idx) => ({
    id: 'med_toy_' + (idx + 1),
    title: p.name,
    category: 'toys',
    url: p.imageUrl,
    date: '2026-07-10',
    dimensions: '1254x1254'
  }))
];

const mediaStr = 'const DEFAULT_MEDIA_ITEMS = ' + JSON.stringify(defaultMedia, null, 2) + ';';
mediaContent = mediaContent.replace(/const DEFAULT_MEDIA_ITEMS = \[[\s\S]*?\n  \];/, mediaStr);

fs.writeFileSync(mediaLibPath, mediaContent, 'utf8');
console.log('✓ Successfully updated js/admin-media-library.js with ' + defaultMedia.length + ' media items.');
