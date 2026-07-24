const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const http = require('http'); // Built-in Node module
const handler = require('./handler');

const BOT_PHONE_NUMBER = '919310314801'; 

// 🌐 FIX: Create a simple Web Server to satisfy Render's port validation check
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mars_16 WhatsApp Bot is Active and Running Online!\n');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web Server port-binding successfully established on port ${PORT}`);
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

// Capture and display the clean 8-character pairing code in Render logs
client.on('pairing_code', (code) => {
    console.log('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
    console.log(`🚀 WHATSAPP PAIRING CODE GENERATED: ${code}`);
    console.log('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
});

client.on('qr', (qr) => {
    console.log('Fallback QR generated.');
});

client.on('ready', () => {
    console.log('✅ Mars_16 Bot is successfully synchronized and ready!');
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        const participantId = notification.recipientIds;
        let welcomeText = `🌟 *WELCOME TO Mars_16* ❤️❤️❤️\n\n✨ Hello @${participantId.split('@')[0]}, welcome to the family!\n\n🤖 Type \`.help\` to see our strategic custom gaming control panels.`;
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

// Delay initialization slightly to let the Web Server and Puppeteer stabilize completely
setTimeout(async () => {
    try {
        console.log('📡 Requesting secure numeric verification token from WhatsApp...');
        const pairingCode = await client.requestPairingCode(BOT_PHONE_NUMBER);
        console.log('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
        console.log(`🚀 SUCCESS! YOUR CODES FOR LINKING ARE: ${pairingCode}`);
        console.log('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
    } catch (err) {
        console.log('⚠️ Pairing code request failed. Retrying fallback handler layer...');
    }
}, 5000);

client.initialize();
