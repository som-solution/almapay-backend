const http = require('http');

const check = (path) => {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[${path}] Status: ${res.statusCode}`);
                console.log(`[${path}] Body: ${data.substring(0, 100)}...`);
                resolve();
            });
        });
        req.on('error', (e) => {
            console.error(`[${path}] Error: ${e.message}`);
            resolve(); // Resolve anyway to continue
        });
        req.end();
    });
};

async function run() {
    await check('/');
    await check('/api/v1/health'); // Assuming health endpoint exists or we check 404
}

run();
