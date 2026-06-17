const https = require('https');

function pingUrl() {
    https.get('https://sjjewellery.online/', (res) => {
        console.log(`[Ping] Request sent to https://sjjewellery.online/. Status Code: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error(`[Ping] Error sending request to https://sjjewellery.online/:`, err.message);
    });
}

// Ping immediately on start
pingUrl();

// Ping every 5 minutes (5 * 60 * 1000 = 300000 milliseconds)
setInterval(pingUrl, 300000);
