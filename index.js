const { Client: WAClient, RemoteAuth } = require('whatsapp-web.js');
const { Telegraf: TelegramBot } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const qrcode = require('qrcode-terminal');

const configModule = require('./config.js');
const handlerModule = require('./handler.js');

const MONGO_URI = configModule.MONGO_URI;
const TARGET_PHONE_NUMBER = configModule.TARGET_PHONE_NUMBER;
const TELEGRAM_TOKEN = configModule.TELEGRAM_TOKEN;
const Reminder = configModule.Reminder;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Mars_16 Multi-Platform Core Engine Active.'));

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
    }, 15000); // Check every 15 seconds for precision matching
}

function initializePlatforms() {
    const store = new MongoStore({ mongoose: mongoose });
    const waClient = new WAClient({
        authStrategy: new RemoteAuth({ store, backupSyncIntervalMs: 60000 }),
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            // Optimized flags to prevent page evaluation crashes
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--no-first-run',
                '--no-default-browser-check',
                '--unhandled-rejections=strict'
            ]
        }
    });

    waClient.on('qr', async (qr) => {
        console.log("⚠️ Initializing Phone Pairing String Request Stream...");
        try {
            // Delay request slightly to ensure internal engine pages evaluate completely first
            setTimeout(async () => {
                try {
                    const pairingCode = await waClient.requestPairingCode(TARGET_PHONE_NUMBER);
                    console.log("\n=======================================================");
                    console.log(`🔢 YOUR WHATSAPP PAIRING CODE IS:  ${pairingCode}  🔢`);
                    console.log("=======================================================\n");
                } catch (inner) { console.error("Internal pairing verification error:", inner); }
            }, 5000);
        } catch (err) { console.error("Pairing calculation crash handled:", err); }
    });

    waClient.on('ready', () => { 
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
