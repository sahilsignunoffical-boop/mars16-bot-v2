const fs = require('fs');

// Dynamically locate the downloaded Chrome browser inside Render's cache folder
let puppeteerPath = '';
const baseCachePath = '/opt/render/.cache/puppeteer/chrome';
if (fs.existsSync(baseCachePath)) {
    const versions = fs.readdirSync(baseCachePath);
    if (versions.length > 0) {
        puppeteerPath = `${baseCachePath}/${versions[0]}/chrome-linux64/chrome`;
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        executablePath: puppeteerPath || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});
