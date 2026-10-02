const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

let updatedCount = 0;
for (const file of files) {
  const filePath = path.join(rootDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace favicon & apple-touch-icon
  content = content.replace(
    '<link rel="icon" href="logo.png" type="image/png" />',
    '<link rel="icon" href="favicon.png" type="image/png" />\n    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />'
  );
  content = content.replace(
    '<link rel="apple-touch-icon" href="logo.png" />',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png" />'
  );

  // Replace default og:image & twitter:image
  content = content.replace(
    /content="https:\/\/punnagaitoysfancy\.in\/images\/store-hero\.jpg"/g,
    'content="https://punnagaitoysfancy.in/images/social-share.jpg"'
  );

  if (file === 'index.html') {
    content = content.replace('src="images/hero-banner.jpg?v=3"', 'src="images/hero-banner.png"');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log('✓ Updated:', file);
  }
}

console.log('Total HTML files updated:', updatedCount);
