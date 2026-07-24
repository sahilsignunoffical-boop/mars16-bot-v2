const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const http = require('http');
const handler = require('./handler');

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

// 📱 FIX: Bypasses the broken terminal blocks and generates an instant clickable link
client.on('qr', (qr) => {
    const encodedQR = encodeURIComponent(qr);
    const cleanQRLink = `https://qrserver.com{encodedQR}`;
    
    console.log('\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
    console.log('🚀 CLICK THE LINK BELOW TO OPEN A CLEAN, SCANNABLE QR CODE:');
    console.log(cleanQRLink);
    console.log('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n');
});

client.on('ready', () => {
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
