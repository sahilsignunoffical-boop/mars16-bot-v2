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

// Shared memory layer state to safely store active barcode streams
let currentQrToken = "";

app.get('/', (req, res) => res.send('🚀 Mars_16 Universal Multi-Platform Engine Layer is Online. To sync your WhatsApp profile instantly, visit: /scan'));

// Clean high-definition web page dashboard view route to prevent token time-outs
app.get('/scan', (req, res) => {
    if (!currentQrToken) {
        return res.send(`
            <div style="text-align:center; margin-top:80px; font-family:sans-serif;">
                <h2 style="color:#d9534f; font-size:24px;">🔄 Fetching QR Code Matrix...</h2>
                <p style="color:#666; font-size:16px;">The bot is connecting to WhatsApp web services. This page will automatically refresh.</p>
                <script>setTimeout(() => { location.reload(); }, 5000);</script>
            </div>
        `);
    }
    res.send(`
        <div style="text-align:center; margin-top:40px; font-family:sans-serif; background:#f4f7f6; padding:20px;">
            <h2 style="color:#075e54; font-size:32px; margin-bottom:5px;">🤖 Mars_16 Universal WhatsApp Gateway</h2>
            <p style="color:#555; font-size:16px; margin-bottom:25px;">Open WhatsApp ➔ Linked Devices ➔ Link a Device, then point your phone camera below:</p>
            <div style="margin:10px auto; padding:25px; display:inline-block; border:3px solid #075e54; border-radius:16px; background:#fff; box-shadow: 0px 10px 25px rgba(0,0,0,0.15);">
                <img src="https://qrserver.com{encodeURIComponent(currentQrToken)}" alt="WhatsApp Auth QR" style="display:block;" />
            </div>
            <p style="color:#888; font-size:13px; margin-top:20px;">✨ Tip: If the code expires or doesn't scan, simply refresh this webpage to pull a fresh token grid.</p>
            <script>
                // Auto-refresh the grid token every 45 seconds to keep it perfectly aligned with the engine page
                setTimeout(() => { location.reload(); }, 45000);
            </script>
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
                        await chat.sendMessage(`⏰ *REMINDER EXECUTED (IST)* ⏰\n\n👤 *Logged By:* ${r.setterName}\n📝 *Context:* ${r.text}`);
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
                '--disable-extensions',
                '--no-first-run'
            ]
        }
    });

    waClient.on('qr', (qr) => {
        currentQrToken = qr; // Instantly serves the token block out to our visual link view
        console.log("📝 A NEW HIGH-RES QR CODE IS READY. Open your webpage to scan it.");
        qrcode.generate(qr, { small: true });
    });

    waClient.on('ready', () => { 
        currentQrToken = ""; // Destroys the tracking state once paired to prevent duplicate renders
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
