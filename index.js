const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const http = require('http');
const handler = require('./handler');

let latestQRData = '';

// Create a local portal that renders a graphic image element on page load
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    
    if (!latestQRData) {
        res.end(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>⏳ Waiting for WhatsApp Server Handshake...</h2>
                <p>Please refresh this tab in 10-15 seconds to view your scannable QR Code.</p>
            </div>
        `);
    } else {
        // Embed the base data directly inside a clean, high-resolution Google Charts generator wrapper
        const cleanQRImageURL = `https://googleapis.com{encodeURIComponent(latestQRData)}&choe=UTF-8`;
        res.end(`
            <div style="text-align:center; margin-top:40px; font-family:sans-serif;">
                <h1 style="color:#128C7E;">🌟 Mars_16 Authorization Portal</h1>
                <p style="font-size:16px; color:#555;">Scan this clean graphic using your phone's Linked Devices screen to go live!</p>
                <div style="margin:20px; background:#fff; display:inline-block; padding:15px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
                    <img src="${cleanQRImageURL}" alt="WhatsApp Sync QR" style="width:350px; height:350px;" />
                </div>
                <p style="color:#888; font-size:12px;">The image refreshes automatically when updated.</p>
            </div>
        `);
    }
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Local Web Portal securely established on port ${PORT}`);
});

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
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

// Cache the string internally to serve it onto the local web element route
client.on('qr', (qr) => {
    latestQRData = qr;
    console.log('📶 A fresh synchronization code data layer has loaded into your Web Portal URL.');
});

client.on('ready', () => {
    latestQRData = ''; // Clear out the portal token once authenticated successfully
    console.log('✅ Mars_16 Bot is successfully synchronized and ready!');
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        const participantId = notification.recipientIds;
        let welcomeText = `🌟 *WELCOME TO Mars_16* ❤️❤️❤️\n\n✨ Hello @${participantId.split('@')}, welcome to the family!\n\n🤖 Type \`.help\` to see our strategic custom gaming control panels.`;
        const mediaPath = path.join(__dirname, 'mars_welcome.jpg');
        const media = MessageMedia.fromFilePath(mediaPath);
        await client.sendMessage(chat.id._serialized, media, { caption: welcomeText, mentions: [participantId] });
    } catch (e) {
        console.log('Welcome delivery fallback triggered.');
    }
});

client.on('message', async (msg) => {
    try {
        await handler(client, msg);
    } catch (err) {
        console.error('Core routing breakdown error:', err);
    }
});

client.initialize();
