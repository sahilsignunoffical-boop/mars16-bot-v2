const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const handler = require('./handler');

// Dynamically locate the downloaded Chrome browser inside Render's cache folder
let puppeteerPath = '';
const baseCachePath = '/opt/render/.cache/puppeteer/chrome';
if (fs.existsSync(baseCachePath)) {
    const versions = fs.readdirSync(baseCachePath);
    if (versions.length > 0) {
        puppeteerPath = `${baseCachePath}/${versions[0]}/chrome-linux64/chrome`;
    }
}

// Initialize client pointing directly to Render's local puppeteer Chrome binary path
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

// Logs the connection QR code inside Render dashboards
client.on('qr', (qr) => {
    console.log('👇 SCAN THIS QR CODE WITH YOUR WHATSAPP LINKED DEVICES 👇');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Mars_16 Bot is successfully synchronized and ready!');
});

// Automated Welcome Profile Notification Logic using your custom anime banner image
client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        const participantId = notification.recipientIds;
        
        let welcomeText = `🌟 *WELCOME TO Mars_16* ❤️❤️❤️\n\n✨ Hello @${participantId.split('@')[0]}, welcome to the family!\n\n🤖 Type \`.help\` to see our strategic custom gaming control panels.`;

        const mediaPath = path.join(__dirname, 'mars_welcome.jpg');
        const media = MessageMedia.fromFilePath(mediaPath);

        await client.sendMessage(chat.id._serialized, media, { 
            caption: welcomeText, 
            mentions: [participantId] 
        });
    } catch (e) {
        console.log('Welcome delivery fallback triggered.');
    }
});

// Route messaging events to handler processing pipeline
client.on('message', async (msg) => {
    try {
        await handler(client, msg);
    } catch (err) {
        console.error('Core routing breakdown error:', err);
    }
});

client.initialize();
