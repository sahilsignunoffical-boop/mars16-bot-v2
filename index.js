const { Client: WAClient, RemoteAuth } = require('whatsapp-web.js');
const { Telegraf: TelegramBot } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const qrcode = require('qrcode-terminal');

const configModule = require('./config.js');
const handlerModule = require('./handler.js');

const MONGO_URI = configModule.MONGO_URI;
const TELEGRAM_TOKEN = configModule.TELEGRAM_TOKEN;
const Reminder = configModule.Reminder;

const app = express();
const PORT = process.env.PORT || 3000;

// Shared global baseline tracking token memory state
let currentQrToken = "";

app.get('/', (req, res) => res.send('Mars_16 Multi-Platform Core Engine Active 24/7. Check /scan for your QR code token.'));

// Clean visual web dashboard route for scanning link authentication
app.get('/scan', (req, res) => {
    if (!currentQrToken) {
        return res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2 style="color:#d9534f;">No QR code available yet.</h2>
                <p>The bot engine is initializing or already successfully authenticated. Refresh this page in 10-15 seconds.</p>
            </div>
        `);
    }
    res.send(`
        <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
            <h2 style="color:#075e54; font-size:28px;">Scan with WhatsApp Linked Devices:</h2>
            <p style="color:#555; font-size:16px;">Open WhatsApp -> Linked Devices -> Link a Device, then point your camera below:</p>
            <div style="margin:30px auto; padding:20px; display:inline-block; border:2px solid #075e54; border-radius:12px; background:#fff; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
                <img src="https://qrserver.com{encodeURIComponent(currentQrToken)}" alt="WhatsApp Authentication QR Code" />
            </div>
            <p style="color:#888; font-size:13px; margin-top:15px;">Mars_16 Universal Multi-Platform Engine Layer Sync Pipeline</p>
        </div>
    `);
});

function startReminderDaemon(waClient) {
    setInterval(async () => {
        try {
            const now = new Date();
            const dueReminders = await Reminder.find({ targetTime: { $lte: now } });
            
            for (let r of dueReminders) {
                try {
                    const chat = await waClient.getChatById(r.groupId);
                    if (r.tagAllTrigger) {
                        const readMore = String.fromCharCode(8206).repeat(4000);
                        let msg = `🚨 *MARS_16 CRITICAL RUN TIME ALERT!* 🚨\n\n📝 *Task Detail:* ${r.text}\n${readMore}\n`;
                        let mentions = chat.participants.map(p => p.id._serialized);
                        await chat.sendMessage(msg, { mentions });
                    } else {
                        await chat.sendMessage(`⏰ *REMINDER BROADCAST (IST)* ⏰\n\n👤 *Logged By:* ${r.setterName}\n📝 *Context:* ${r.text}`);
                    }
                    await Reminder.deleteOne({ _id: r._id });
                } catch (err) { await Reminder.deleteOne({ _id: r._id }); }
            }
        } catch (e) { console.error("Daemon cron process failure:", e); }
    }, 15000);
}

function initializePlatforms() {
    const store = new MongoStore({ mongoose: mongoose });
    const waClient = new WAClient({
        authStrategy: new RemoteAuth({ store, backupSyncIntervalMs: 60000 }),
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions'
            ]
        }
    });

    waClient.on('qr', (qr) => {
        currentQrToken = qr; // Send token to our visual dashboard route link
        console.log("📝 NEW QR CODE TOKEN LOADED. Visit your App URL path at /scan to view and link your device.");
        qrcode.generate(qr, { small: true });
    });

    waClient.on('ready', () => { 
        currentQrToken = ""; // Wipe tracking token state once authenticated safely
        console.log('🚀 WhatsApp Engine actively authenticated and connected.');
        startReminderDaemon(waClient);
    });

    waClient.on('message', async (msg) => {
        const chat = await msg.getChat();
        let isAdmin = false;
        if (chat.isGroup) {
            const userObj = chat.participants.find(p => p.id._serialized === (msg.author || msg.from));
            isAdmin = userObj ? (userObj.isAdmin || userObj.isSuperAdmin) : false;
        }
        
        const context = {
            platform: 'whatsapp', groupId: chat.id._serialized, senderId: msg.author || msg.from,
            senderName: msg._data?.notifyName || 'User', rawBody: msg.body,
            replyContext: async (t) => await msg.reply(t),
            kickContext: async (u) => { if (chat.isGroup) await chat.removeParticipants([u]); },
            deleteContext: async () => { if (msg.delete) await msg.delete(true); },
            msgObj: msg, chatObj: chat, isGroupAdmin: isAdmin
        };
        await handlerModule.handleIncomingCommand(context, waClient);
    });

    waClient.initialize();

    const tgTokenActual = process.env.TELEGRAM_TOKEN || TELEGRAM_TOKEN;
    if (tgTokenActual) {
        const tgBot = new TelegramBot(tgTokenActual);
        tgBot.on('message', async (ctx) => {
            if (!ctx.message || !ctx.message.text) return;
            const context = {
                platform: 'telegram', groupId: ctx.chat.id.toString(), senderId: ctx.from.id.toString(),
                senderName: ctx.from.first_name || 'User', rawBody: ctx.message.text,
                replyContext: async (t) => await ctx.reply(t),
                kickContext: async (u) => { await ctx.banChatMember(Number(u)).catch(() => {}); },
                deleteContext: async () => { await ctx.deleteMessage().catch(() => {}); },
                msgObj: ctx.message, chatObj: ctx.chat, isGroupAdmin: true
            };
            await handlerModule.handleIncomingCommand(context, waClient);
        });
        tgBot.launch().then(() => console.log('🚀 Telegram Framework connected and polling.'));
    }
}

mongoose.connection.once('open', initializePlatforms);
app.listen(PORT);
