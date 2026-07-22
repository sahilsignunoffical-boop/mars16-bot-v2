const { Client: WAClient, RemoteAuth } = require('whatsapp-web.js');
const { Telegraf: TelegramBot } = require('telegraf');
const express = require('express');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');

// ==========================================
// 1. CONFIGURATION & DATABASE DEFINITIONS
// ==========================================
const SUPER_ADMIN = '919310314801@c.us'; 
const TARGET_PHONE_NUMBER = '918800952400'; 
const BOT_IMAGE_URL = 'https://githubusercontent.com';

const MONGO_URI = 'mongodb+srv://sahilsignunoffical_db_user:ibmAj5hxtrz6vNmQ@cluster0.ohhvv7y.mongodb.net/whatsapp_bot?retryWrites=true&w=majority';
const TELEGRAM_TOKEN = '8770167093:AAGoBPUTJRD4cFMFnxf4dIFj-3I4a157eBw';

mongoose.connect(MONGO_URI)
    .then(() => console.log('📦 Connected to MongoDB Shared Cluster.'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const GuildFest = mongoose.model('GuildFest', new mongoose.Schema({
    groupId: { type: String, unique: true, index: true },
    targetScore: { type: Number, default: 0 } 
}));

const ShieldTracker = mongoose.model('ShieldTracker', new mongoose.Schema({
    groupId: { type: String, index: true },
    userId: { type: String, index: true },
    userName: String,
    expiryTime: Date
}));

const GroupConfig = mongoose.model('GroupConfig', new mongoose.Schema({
    groupId: { type: String, unique: true, index: true },
    rules: { type: String, default: "No rules set yet. Use .setrules to define them." },
    antiPromo: { type: Boolean, default: false },
    antiSticker: { type: Boolean, default: false },
    abuseDetect: { type: Boolean, default: false },
    mutedUsers: [{ userId: String, mutedUntil: Date }]
}));

const Strike = mongoose.model('Strike', new mongoose.Schema({
    groupId: { type: String, index: true },
    userId: { type: String, index: true },
    strikes: { type: Number, default: 0 }
}));

const Reminder = mongoose.model('Reminder', new mongoose.Schema({
    groupId: { type: String, index: true },
    setterName: String,
    targetTime: Date,
    text: String,
    isRecurring: { type: Boolean, default: false },
    tagAllTrigger: { type: Boolean, default: false }
}));

let configCache = new Map();
const abuseBlacklist = ['chutiya', 'bhenchod', 'gandu', 'madarchod', 'laundu', 'harami', 'bsdk', 'saala'];

function getGroupCache(groupId) {
    if (!configCache.has(groupId)) {
        const fresh = { rules: "No rules set yet.", antiPromo: false, antiSticker: false, abuseDetect: false, mutedUsers: [] };
        configCache.set(groupId, fresh);
        GroupConfig.create({ groupId }).catch(() => {});
        return fresh;
    }
    return configCache.get(groupId);
}

// ==========================================
// 2. UNIVERSAL COMMAND HANDLER ENGINE
// ==========================================
async function handleIncomingCommand(context, waClient) {
    const { platform, groupId, senderId, senderName, rawBody, replyContext, kickContext, deleteContext, msgObj, chatObj, isGroupAdmin } = context;
    if (!rawBody) return;
    
    let textMessage = rawBody.trim();
    const cache = getGroupCache(groupId);
    const isSuperAdmin = senderId.includes('919310314801');

    if (command === 'help') {
        const menuText = `🌟 *WELCOME TO Mars_16 ❤️❤️❤️❤️❤️* \n\n🤖 *Group Bot — Commands Map*\n\n*🛠️ Utility*\n├→ *.ping* — Check online status\n├→ *.trans [lang] <text>* — Translate text\n\n*👥 Group Commands*\n├→ *.tagall* — Mass tag all members\n├→ *.tags* — Bus run notification 🎫\n├→ *.tagadmin* — Mention group admins 🛡️\n├→ *.rules* / *.setrules* — Adjust guidelines\n├→ *.mute @member* / *.unmute* (Admins)\n├→ *.kick @member* / *.del* (Admins)\n\n*🛡️ Defense Modules*\n├→ *.shield [duration]* — Activate shield drops countdown (e.g. \`.shield 8h\`)\n\n*🎮 Lords Mobile Features*\n├→ *.hunt [name/number]* — Pull list of 24 monster lineups\n└→ *.formation* — Tactical ratios guide (569, 947, 956)`;
        return replyContext(menuText);
    }

    if (command === 'ping') {
        return replyContext('🚀 Pong! Mars_16 Multi-Platform Engine is fully operational.');
    }

    if (command === 'formation') {
        return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE GUIDE* ⚔️\n\n• *Tactical Lineups (569 / 947 / 956)*:\n  ├→ Optimal configurations to break fronts.\n  ├→ Deployment Ratio: *50% T4 & 50% T5* layers.\n  └→ Alternative Balance: *60% T4 down to 40% T5* elements.`);
    }

    if (command === 'hunt') {
        const query = args.join(' ').toLowerCase().trim();
        if (!query) return replyContext(`👾 *Monster Hunting Index* \nType \`.hunt 1\` or \`.hunt frostwing\` to view counter layouts.`);

        const profiles = {
            '1': '🍖 *BON APPÉTIT*:\n• Physical: Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer',
            'bon appetit': '🍖 *BON APPÉTIT*:\n• Physical: Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer',
            '2': '🐬 *ARCTIC FLIPPER*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'arctic flipper': '🐬 *ARCTIC FLIPPER*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '3': '🦅 *BLACKWING*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'blackwing': '🦅 *BLACKWING*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '4': '❄️ *FROSTWING*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            'frostwing': '❄️ *FROSTWING*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            '5': '👹 *GARGANTUA*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            'gargantua': '👹 *GARGANTUA*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms'
        };
        return replyContext(profiles[query] || "❌ Monster index name not found.");
    }
}

// ==========================================
// 3. SERVER & PLATFORM BOOTSTRAP INITIALIZER
// ==========================================
const app = express();
app.get('/', (req, res) => res.send('Mars_16 Engine Layer Active.'));

function initializePlatforms() {
    const store = new MongoStore({ mongoose: mongoose });
    const waClient = new WAClient({
        authStrategy: new RemoteAuth({ store, backupSyncIntervalMs: 60000 }),
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    waClient.on('qr', async (qr) => {
        console.log("⚠️ Requesting phone pairing setup string...");
        setTimeout(async () => {
            try {
                const pairingCode = await waClient.requestPairingCode(TARGET_PHONE_NUMBER);
                console.log("\n=======================================================");
                console.log(`🔢 YOUR WHATSAPP PAIRING CODE IS:  ${pairingCode}  🔢`);
                console.log("=======================================================\n");
            } catch (err) { console.error(err); }
        }, 6000);
    });

    waClient.on('ready', () => console.log('🚀 WhatsApp Connected successfully.'));

    waClient.on('message', async (msg) => {
        const chat = await msg.getChat();
        const context = {
            platform: 'whatsapp', groupId: chat.id._serialized, senderId: msg.author || msg.from,
            senderName: msg._data?.notifyName || 'User', rawBody: msg.body,
            replyContext: async (t) => await msg.reply(t),
            kickContext: async (u) => { if (chat.isGroup) await chat.removeParticipants([u]); },
            deleteContext: async () => { if (msg.delete) await msg.delete(true); },
            msgObj: msg, chatObj: chat, isGroupAdmin: true
        };
        await handleIncomingCommand(context, waClient);
    });

    waClient.initialize();

    if (TELEGRAM_TOKEN) {
        const tgBot = new TelegramBot(TELEGRAM_TOKEN);
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
            await handleIncomingCommand(context, waClient);
        });
        tgBot.launch().then(() => console.log('🚀 Telegram Framework connected and polling.'));
    }
}

mongoose.connection.once('open', initializePlatforms);
app.listen(process.env.PORT || 3000);
