const { Client: WAClient, RemoteAuth } = require('whatsapp-web.js');
const { Telegraf: TelegramBot } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');

const { MONGO_URI, TARGET_PHONE_NUMBER } = require('./config');
const { handleIncomingCommand } = require('./handler');
const { Reminder } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Mars_16 Universal Multi-Platform Engine is Online.'));

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
                        let msg = `⏰ *ALERT: TIME TO ENGAGE!* \n📝 *Context:* ${r.text}\n${readMore}\n`;
                        let mentions = [];
                        for(let p of chat.participants) {
                            mentions.push(p.id._serialized);
                            msg += `@${p.id.user} `;
                        }
                        await chat.sendMessage(msg, { mentions });
                    } else {
                        await chat.sendMessage(`⏰ *REMINDER EXECUTED* \n\n${r.text}`);
                    }
                    await Reminder.deleteOne({ _id: r._id });
                } catch (err) {
                    await Reminder.deleteOne({ _id: r._id });
                }
            }
        } catch (e) {
            console.error("Daemon cron process failure:", e);
        }
    }, 30000);
}

function initializePlatforms() {
    const store = new MongoStore({ mongoose: mongoose });
    
    // ----------------------------------------------------
    // WHATSAPP PAIRING CONFIGURATION
    // ----------------------------------------------------
    const waClient = new WAClient({
        authStrategy: new RemoteAuth({ store, backupSyncIntervalMs: 60000 }),
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    waClient.on('qr', async (qr) => {
        console.log("⚠️ Fetching connection pairing code...");
        try {
            const pairingCode = await waClient.requestPairingCode(TARGET_PHONE_NUMBER);
            console.log("\n=======================================================");
            console.log(`🔢 YOUR WHATSAPP PAIRING CODE IS:  ${pairingCode}  🔢`);
            console.log("=======================================================\n");
            console.log("👉 Link it via WhatsApp -> Linked Devices -> Link with Phone Number.");
        } catch (err) {
            console.error("❌ Failed to retrieve pairing code:", err);
        }
    });

    waClient.on('ready', () => { 
        console.log('🚀 WhatsApp Connected successfully via device pairing.');
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
            platform: 'whatsapp',
            groupId: chat.id._serialized,
            senderId: msg.author || msg.from,
            senderName: msg._data?.notifyName || 'User',
            rawBody: msg.body,
            replyContext: async (t) => await msg.reply(t),
            kickContext: async (u) => { if (chat.isGroup) await chat.removeParticipants([u]); },
            deleteContext: async () => { if (msg.delete) await msg.delete(true); },
            msgObj: msg,
            chatObj: chat,
            isGroupAdmin: isAdmin
        };
        await handleIncomingCommand(context, waClient);
    });

    waClient.initialize();

    // ----------------------------------------------------
    // TELEGRAM INFRASTRUCTURE INITIALIZATION
    // ----------------------------------------------------
    const tgTokenActual = process.env.TELEGRAM_TOKEN;
    if (tgTokenActual) {
        const tgBot = new TelegramBot(tgTokenActual);

        tgBot.on('message', async (ctx) => {
            if (!ctx.message || !ctx.message.text) return;
            
            const context = {
                platform: 'telegram',
                groupId: ctx.chat.id.toString(),
                senderId: ctx.from.id.toString(),
                senderName: ctx.from.first_name || 'User',
                rawBody: ctx.message.text,
                replyContext: async (t) => await ctx.reply(t),
                kickContext: async (u) => { await ctx.banChatMember(Number(u)).catch(() => {}); },
                deleteContext: async () => { await ctx.deleteMessage().catch(() => {}); },
                msgObj: ctx.message,
                chatObj: ctx.chat,
                isGroupAdmin: true
            };
            await handleIncomingCommand(context, waClient);
        });

        tgBot.launch()
            .then(() => console.log('🚀 Telegram Framework connected and polling.'))
            .catch(err => console.error('❌ Telegram start failure:', err));
    } else {
        console.log("⚠️ TELEGRAM_TOKEN environment variable not found on Render. Running WhatsApp only.");
    }
}

mongoose.connection.once('open', initializePlatforms);
app.listen(PORT);
