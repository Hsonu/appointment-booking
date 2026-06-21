const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    // Serve the rendering HTML page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Icon Generator</title>
      </head>
      <body>
        <h1>Generating PWA Icons...</h1>
        <canvas id="canvas-192" width="192" height="192" style="border:1px solid #ccc;"></canvas>
        <canvas id="canvas-512" width="512" height="512" style="border:1px solid #ccc;"></canvas>
        <script>
          const svgUrl = '/icon.svg';
          const img = new Image();
          img.src = svgUrl;
          img.onload = () => {
            // Draw to 192x192
            const canvas192 = document.getElementById('canvas-192');
            const ctx192 = canvas192.getContext('2d');
            ctx192.drawImage(img, 0, 0, 192, 192);
            const data192 = canvas192.toDataURL('image/png');

            // Draw to 512x512
            const canvas512 = document.getElementById('canvas-512');
            const ctx512 = canvas512.getContext('2d');
            ctx512.drawImage(img, 0, 0, 512, 512);
            const data512 = canvas512.toDataURL('image/png');

            // Send to server
            Promise.all([
              fetch('/save-192', { method: 'POST', body: data192 }),
              fetch('/save-512', { method: 'POST', body: data512 })
            ])
            .then(() => fetch('/done', { method: 'POST' }))
            .catch(err => console.error(err));
          };
        </script>
      </body>
      </html>
    `);
  } else if (req.method === 'GET' && req.url === '/icon.svg') {
    // Serve the SVG icon
    const svgPath = path.join(FRONTEND_DIR, 'icon.svg');
    if (fs.existsSync(svgPath)) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(fs.readFileSync(svgPath));
    } else {
      res.writeHead(404);
      res.end('SVG not found');
    }
  } else if (req.method === 'POST' && (req.url === '/save-192' || req.url === '/save-512')) {
    // Save image
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const is512 = req.url === '/save-512';
      const filename = is512 ? 'icon-512.png' : 'icon-192.png';
      const base64Data = body.replace(/^data:image\/png;base64,/, "");
      const destPath = path.join(FRONTEND_DIR, filename);

      fs.writeFileSync(destPath, base64Data, 'base64');
      console.log('Successfully generated ' + filename + ' at ' + destPath);
      res.writeHead(200);
      res.end('Saved');
    });
  } else if (req.method === 'POST' && req.url === '/done') {
    res.writeHead(200);
    res.end('Done');
    console.log('Icon generation complete. Shutting down server...');
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('Temporary server running at http://localhost:' + PORT + '/');
});
