// scripts/optimize-images.js
// Automated WebP/AVIF Image Pipeline with Explicit Dimensions & Responsive srcset generator
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');

// Track overall statistics
let totalOriginalBytes = 0;
let totalOptimizedBytes = 0;
let totalProcessed = 0;

const imageMetadata = {};

/**
 * Recursively find all JPG and PNG files
 */
function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        // Skip already generated responsive variants or temp files
        if (!file.includes('-thumb.') && !file.includes('-600.') && !file.includes('-900.') && !file.includes('-1200.')) {
          results.push(filePath);
        }
      }
    }
  }
  return results;
}

async function processImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

  const originalStat = fs.statSync(filePath);
  const originalSize = originalStat.size;
  totalOriginalBytes += originalSize;

  const webpPath = path.join(dirName, `${baseName}.webp`);
  const isUpToDate = fs.existsSync(webpPath) && fs.statSync(webpPath).mtimeMs >= originalStat.mtimeMs;

  if (isUpToDate) {
    const webpStat = fs.statSync(webpPath);
    totalOptimizedBytes += webpStat.size;
    totalProcessed++;
    imageMetadata[relativePath] = {
      width: 0,
      height: 0,
      webpPath: path.relative(ROOT_DIR, webpPath).replace(/\\/g, '/'),
      originalBytes: originalSize,
      webpBytes: webpStat.size,
      cached: true
    };
    return;
  }

  const image = sharp(filePath);
  const meta = await image.metadata();
  
  // Choose optimal quality: 80 for photos, 85 for logos/graphics
  const isLogo = baseName.toLowerCase().includes('logo') || ext === '.png';
  const webpQuality = isLogo ? 88 : 82;

  // 1. Generate full-resolution WebP
  await image
    .webp({ quality: webpQuality, effort: 6 })
    .toFile(webpPath);

  const webpStat = fs.statSync(webpPath);
  totalOptimizedBytes += webpStat.size;
  totalProcessed++;

  const savingsPct = Math.round((1 - webpStat.size / originalSize) * 100);
  console.log(
    `[WebP] ${relativePath} (${(originalSize / 1024).toFixed(1)} KB) -> ${path.basename(webpPath)} (${(webpStat.size / 1024).toFixed(1)} KB) [${savingsPct >= 0 ? '-' + savingsPct : '+' + Math.abs(savingsPct)}%]`
  );

  // Store metadata
  imageMetadata[relativePath] = {
    width: meta.width,
    height: meta.height,
    aspectRatio: (meta.width / meta.height).toFixed(4),
    webpPath: path.relative(ROOT_DIR, webpPath).replace(/\\/g, '/'),
    originalBytes: originalSize,
    webpBytes: webpStat.size
  };

  // 2. Generate responsive variants for banners & hero images
  if (baseName.includes('hero') || baseName.includes('banner')) {
    const widths = [600, 900, 1200].filter(w => w < (meta.width || 2000));
    for (const w of widths) {
      const respWebpPath = path.join(dirName, `${baseName}-${w}.webp`);
      await sharp(filePath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80, effort: 6 })
        .toFile(respWebpPath);
      console.log(`  -> Responsive variant generated: ${path.basename(respWebpPath)} (${w}px)`);
    }
  }

  // 3. Generate 300px thumbnail for product card grids
  if (relativePath.includes('images/products/')) {
    const thumbWebpPath = path.join(dirName, `${baseName}-thumb.webp`);
    await sharp(filePath)
      .resize({ width: 300, height: 300, fit: 'cover' })
      .webp({ quality: 80, effort: 6 })
      .toFile(thumbWebpPath);

    imageMetadata[relativePath].thumbWebp = path.relative(ROOT_DIR, thumbWebpPath).replace(/\\/g, '/');
  }
}

async function run() {
  console.log('=== Punnagai Toy Store: WebP Image Optimization Pipeline ===');
  console.log(`Scanning: ${IMAGES_DIR} and root logo/assets...`);

  const files = getFilesRecursively(IMAGES_DIR);
  
  // Also check root logo.png if present
  const rootLogo = path.join(ROOT_DIR, 'logo.png');
  if (fs.existsSync(rootLogo)) files.push(rootLogo);

  console.log(`Found ${files.length} images to optimize.`);

  for (const f of files) {
    try {
      await processImage(f);
    } catch (err) {
      console.error(`Error processing ${f}:`, err.message);
    }
  }

  // Save metadata JSON
  const metaOut = path.join(IMAGES_DIR, 'image-metadata.json');
  fs.writeFileSync(metaOut, JSON.stringify(imageMetadata, null, 2), 'utf8');

  console.log('\n======================================================');
  console.log(`Optimization Completed: ${totalProcessed} images converted to WebP.`);
  console.log(`Original Total: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Optimized Total: ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`);
  const totalSaved = totalOriginalBytes - totalOptimizedBytes;
  const overallPct = Math.round((totalSaved / totalOriginalBytes) * 100);
  console.log(`Net Savings: ${(totalSaved / (1024 * 1024)).toFixed(2)} MB (${overallPct}% reduction!)`);
  console.log(`Metadata saved to: ${metaOut}`);
  console.log('======================================================');
}

run().catch(console.error);
