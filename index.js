const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const http = require('http');
const QRCode = require('qrcode');
const { mongoose } = require('./config'); // 🌐 FIX: Forces bot to stabilize database paths before processing incoming messages
const handler = require('./handler');

let latestQRImageBase64 = '';

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (!latestQRImageBase64) {
        res.end(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>🛰️ Mars_16 Status: Bot Online & Synced!</h2>
                <p>The core message tracking listeners are fully listening to commands inside your groups.</p>
            </div>
        `);
    } else {
        res.end(`
            <div style="text-align:center; margin-top:40px; font-family:sans-serif;">
                <h1 style="color:#128C7E;">🌟 Mars_16 Authorization Portal</h1>
                <p style="font-size:16px; color:#555;">Scan this clean graphic using your phone's Linked Devices screen to go live!</p>
                <div style="margin:20px; background:#fff; display:inline-block; padding:15px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
                    <img src="${latestQRImageBase64}" alt="WhatsApp Sync QR" style="width:350px; height:350px;" />
                </div>
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

client.on('qr', async (qr) => {
    try {
        latestQRImageBase64 = await QRCode.toDataURL(qr, { width: 350, margin: 2 });
    } catch (err) {
        console.error('QR error:', err);
    }
});

client.on('ready', () => {
    latestQRImageBase64 = ''; 
    console.log('✅ Mars_16 Bot is successfully synchronized and ready!');
});

client.on('message', async (msg) => {
    try {
        await handler(client, msg);
    } catch (err) {
        console.error('Core routing breakdown error:', err);
    }
});

client.initialize();
