// server.js - High-Performance Zero-dependency static dev server for Punnagai Toy Store
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
let currentPort = DEFAULT_PORT;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=UTF-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const COMPRESSIBLE_EXTS = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'
]);

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(ROOT, reqPath);

  // If path doesn't have an extension, try .html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  // Security check: ensure path is inside ROOT
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(ROOT);
  const isInsideRoot = process.platform === 'win32'
    ? resolvedPath.toLowerCase().startsWith(resolvedRoot.toLowerCase())
    : resolvedPath.startsWith(resolvedRoot);

  if (!isInsideRoot) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 fallback
      const notFoundPage = path.join(ROOT, '404.html');
      if (fs.existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(notFoundPage).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h1>404 Not Found</h1><p><a href="/">Return to Home</a></p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // HTTP Caching & ETag
    const etag = `"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
    const clientEtag = req.headers['if-none-match'];

    if (clientEtag && clientEtag === etag) {
      res.writeHead(304, {
        'ETag': etag,
        'Cache-Control': ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      });
      res.end();
      return;
    }

    const headers = {
      'Content-Type': contentType,
      'ETag': etag,
      'Cache-Control': ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=86400, stale-while-revalidate=604800',
      'Access-Control-Allow-Origin': '*',
      'Vary': 'Accept-Encoding'
    };

    // Compression support (gzip / deflate) for compressible text assets
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldCompress = COMPRESSIBLE_EXTS.has(ext) && stats.size > 256;

    if (shouldCompress && /\bgzip\b/.test(acceptEncoding)) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else if (shouldCompress && /\bdeflate\b/.test(acceptEncoding)) {
      headers['Content-Encoding'] = 'deflate';
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(zlib.createDeflate()).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

function startServer(port) {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Punnagai High-Performance Dev Server running at http://0.0.0.0:${port}`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${currentPort} in use, trying port ${currentPort + 1}...`);
    currentPort++;
    startServer(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

startServer(currentPort);
