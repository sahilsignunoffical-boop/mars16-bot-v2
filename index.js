const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const handler = require('./handler');

// ⚠️ CHANGE THIS: Put your bot's phone number with country code (no + or spaces)
const BOT_PHONE_NUMBER = '919310314801'; 

// Initialize client pointing directly to the stable Docker system path
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    pairWithPhoneNumber: {
        phoneNumber: BOT_PHONE_NUMBER,
        showNotification: true
    },
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

// Fallback QR code listener
client.on('qr', (qr) => {
    console.log('Fallback QR generated.');
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
