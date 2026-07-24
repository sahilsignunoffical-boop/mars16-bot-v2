const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const handler = require('./handler');

// Initialize client with custom headless flags to bypass sandbox blocks on Render
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
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

// Logs the connection QR code inside Render dashboards
client.on('qr', (qr) => {
    console.log('👇 SCAN THIS QR CODE WITH YOUR WHATSAPP LINKED DEVICES 👇');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Mars_16 Bot is successfully synchronized and ready!');
});

// Automated Welcome Profile Notification Logic using your custom anime banner image
client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        const participantId = notification.recipientIds[0];
        
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
const moment = require('moment-timezone');
const { translate } = require('@vitalets/google-translate-api');
const { MessageMedia } = require('whatsapp-web.js');
const Filter = require('bad-words');
const path = require('path');
const fs = require('fs');

const filter = new Filter();
filter.addWords('abuse1', 'abuse2', 'madarchod', 'bhenchod', 'chutiya'); // Add custom targets here

let groupConfigs = {}; 

module.exports = async (client, msgObj) => {
    const body = msgObj.body || '';
    const groupId = msgObj.from;
    const senderId = msgObj.author || msgObj.from;
    const isGroup = groupId.endsWith('@g.us');

    const replyContext = async (text) => await msgObj.reply(text);

    // --- ADMIN SYSTEM & PRIVILEGE CHECKS ---
    const SUPER_ADMIN = '919310314801@c.us';
    let isGroupAdmin = false;
    let isSuperAdmin = (senderId === SUPER_ADMIN || senderId.includes('919310314801'));

    if (isGroup) {
        const chat = await msgObj.getChat();
        const participant = chat.participants.find(p => p.id._serialized === senderId);
        if (participant && (participant.isAdmin || participant.isSuperAdmin)) {
            isGroupAdmin = true;
        }
    }

    if (!groupConfigs[groupId]) {
        groupConfigs[groupId] = { antiPromo: false };
    }

    // --- SECURITY FILTER PIPELINES ---
    if (isGroup && !isSuperAdmin) {
        // Anti-Promo Link Filter
        const containsLink = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi.test(body);
        if (containsLink && groupConfigs[groupId].antiPromo && !isGroupAdmin) {
            await msgObj.delete(true);
            return;
        }
        // Profanity Automute/Delete Filter
        const isAbusive = filter.isProfane(body) || (/[\u0900-\u097F]/.test(body) && (body.includes('गाली') || body.includes('चूतिया')));
        if (isAbusive) {
            await msgObj.delete(true);
            return;
        }
    }

    if (!body.startsWith('.')) return;
    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- FUNCTIONAL COMMAND CORE ---

    if (command === 'ping') {
        return replyContext('🤖 Mars_16 Bot is online and operational!');
    }

    if (command === 'help' || command === 'menu') {
        const helpMenuText = `🌟 *WELCOME TO Mars_16* ❤️❤️❤️❤️❤️\n\n🤖 *Group Bot — Commands*\n\n*🛠️ Utility*\n├→ *.ping* — Check if the bot is online\n└→ *.trans [lang] <text>* — Translate text (e.g. .trans hindi)\n\n*👥 Group Commands*\n├→ *.tagall <msg>* — Tag members under Read More (Admins Only)\n├→ *.add <number>* — Add member (Admins Only)\n├→ *.kick @member* — Kick member (Admins Only)\n├→ *.antipromo on/off* — Toggles link removal (Admins Only)\n├→ *.del* — Delete target message (reply to target)\n\n*⚔️ Game Configurations*\n├→ *.camp [569/947/956]* — Troop distribution balance arrays\n└→ *.hunt <number/name>* — Graphic monster hero layouts\n\n*⏰ Schedule Reminders*\n├→ *.remind 10m Task* — Set task in minutes\n└→ *.remind tomorrow 9am Task* — Set future targets`;
        
        try {
            const media = MessageMedia.fromFilePath(path.join(__dirname, 'mars_welcome.jpg'));
            return await client.sendMessage(groupId, media, { caption: helpMenuText });
        } catch (e) {
            return replyContext(helpMenuText);
        }
    }

    if (command === 'trans') {
        if (!msgObj.hasQuotedMsg) return replyContext('⚠️ Reply to a target text message using `.trans [language]`');
        const quotedMsg = await msgObj.getQuotedMessage();
        let lang = args[0] ? args[0].toLowerCase() : 'en';
        if (lang === 'hindi') lang = 'hi';
        
        try {
            const res = await translate(quotedMsg.body, { to: lang });
            return replyContext(`🌍 *Translation (${lang.toUpperCase()}):*\n\n${res.text}`);
        } catch (err) {
            return replyContext('❌ Translation engine configuration fault.');
        }
    }

    if (command === 'tagall') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext('❌ Admin authentication required.');
        const chat = await msgObj.getChat();
        const readMore = String.fromCharCode(8206).repeat(4000);
        let txt = `📢 *Important Update!* \n\n💬 Message: ${args.join(' ') || 'Attention Team!'}${readMore}\n\n`;
        
        const mentions = [];
        for (let p of chat.participants) {
            mentions.push(p.id._serialized);
            txt += `• @${p.id.user}\n`;
        }
        return await client.sendMessage(groupId, txt, { mentions });
    }

    if (command === 'antipromo') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext('❌ Admin authentication required.');
        const status = args[0]?.toLowerCase();
        if (status === 'on') {
            groupConfigs[groupId].antiPromo = true;
            return replyContext('✅ *Anti-Promo Engine Activated!* External links will be cleared.');
        } else if (status === 'off') {
            groupConfigs[groupId].antiPromo = false;
            return replyContext('❌ *Anti-Promo Engine Deactivated!*');
        }
        return replyContext('⚠️ Syntax: `.antipromo on` or `.antipromo off`');
    }

    if (command === 'kick') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext('❌ Admin authentication required.');
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds[0];
        if (!target || target.includes('919310314801')) return replyContext('🛡️ User context block path immune.');
        
        const chat = await msgObj.getChat();
        await chat.removeParticipants([target]);
        return replyContext('✅ Target removed.');
    }

    if (command === 'add') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext('❌ Admin authentication required.');
        const targetNumber = args[0];
        if (!targetNumber) return replyContext('⚠️ Syntax: `.add 91XXXXXXXXXX`');
        
        const formattedId = `${targetNumber.replace(/[^0-9]/g, '')}@c.us`;
        const chat = await msgObj.getChat();
        await chat.addParticipants([formattedId]);
        return replyContext('✅ Target added.');
    }

    if (command === 'del') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext('❌ Admin authentication required.');
        if (msgObj.hasQuotedMsg) {
            const quoted = await msgObj.getQuotedMessage();
            await quoted.delete(true);
        }
        return;
    }

    if (command === 'camp') {
        const type = args[0];
        if (type === '569') {
            return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE (569)* ⚔️\n\n• *Deployment Ratios:* 50% T4 & 50% T5 Setup.\n\n• *Exact Troop Counts:*\n  ├→ Infantry: T5: *25,000* | T4: *30,000*\n  ├→ Ranged: T5: *45,000* | T4: *45,000*\n  └→ Cavalry: T5: *25,000* | T4: *30,000*`);
        }
        if (type === '947') {
            return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE (947)* ⚔️\n\n• *Deployment Ratios:* 60% T4 & 40% T5 Setup.\n\n• *Exact Troop Counts:*\n  ├→ Infantry: T5: *35,000* | T4: *40,000*\n  ├→ Ranged: T5: *20,000* | T4: *30,000*\n  └→ Cavalry: T5: *45,000* | T4: *50,000*`);
        }
        if (type === '956') {
            return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE (956)* ⚔️\n\n• *Deployment Ratios:* Heavy Frontline Wall Setup.\n\n• *Exact Troop Counts:*\n  ├→ Infantry: T5: *50,000* | T4: *80,000*\n  ├→ Ranged: T5: *20,000* | T4: *20,000*\n  └→ Cavalry: T5: *30,000* | T4: *30,000*`);
        }
        return replyContext('⚠️ Syntax: `.camp 569`, `.camp 947`, or `.camp 956`');
    }

    // --- 🎮 MULTIMEDIA MONSTER HUNT COUNTERS SYSTEM ---
    if (command === 'hunt') {
        const indexList = `👾 *Mars_16 Universal Monster Hunting Directory* 👾\n\n1. Bon Appétit\n2. Arctic Flipper\n3. Blackwing\n4. Frostwing\n5. Gargantua\n6. Gawrilla\n7. Grim Reaper\n8. Gryphon\n9. Hardrox\n10. Hell Drider\n11. Jade Wyrm\n12. Hootclaw\n13. Mecha Trojan\n14. Mega Maggot\n15. Necrosis\n16. Noceros\n17. Queen Bee\n18. Saberfang\n19. Serpent Gladiator\n20. Snow Beast\n21. Terrorthorn\n22. Tidal Titan\n23. Voodoo Shaman\n24. Cottageroar\n\n👉 *Query Syntax:* Type \`.hunt <number>\` or \`.hunt <name>\``;
        
        const query = args.join(' ').toLowerCase().trim();
        if (!query) return replyContext(indexList);

        const nameMap = {
            'bon appetit': '1', 'bon appétit': '1', 'arctic flipper': '2', 'flipper': '2', 'blackwing': '3',
            'frostwing': '4', 'gargantua': '5', 'gawrilla': '6', 'grim reaper': '7', 'reaper': '7', 'gryphon': '8',
            'hardrox': '9', 'hell drider': '10', 'drider': '10', 'jade wyrm': '11', 'wyrm': '11', 'hootclaw': '12',
            'mecha trojan': '13', 'trojan': '13', 'mega maggot': '14', 'maggot': '14', 'necrosis': '15',
            'noceros': '16', 'queen bee': '17', 'bee': '17', 'saberfang': '18', 'serpent gladiator': '19',
            'serpent': '19', 'snow beast': '20', 'terrorthorn': '21', 'tidal titan': '22', 'titan': '22',
            'voodoo shaman': '23', 'shaman': '23', 'cottageroar': '24'
        };

        const targetIndex = nameMap[query] || query;

        const profiles = {
            '1': '🍖 *BON APPÉTIT HERO LINEUP*:\n• Physical: Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer',
            '2': '🐬 *ARCTIC FLIPPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '3': '🦅 *BLACKWING HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '4': '❄️ *FROSTWING HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            '5': '👹 *GARGANTUA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            '6': '🦍 *GAWRILLA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire',
            '7': '💀 *GRIM REAPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '8': '🦁 *GRYPHON HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '9': '💎 *HARDROX HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '10': '🔥 *HELL DRIDER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '11': '🐉 *JADE WYRM HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '12': '🦉 *HOOTCLAW HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '13': '🐴 *MECHA TROJAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '14': '🐛 *MEGA MAGGOT HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '15': '💀 *NECROSIS HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '16': '🦏 *NOCEROS HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '17': '🐝 *QUEEN BEE HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '18': '🐯 *SABERFANG HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '19': '⚔️ *SERPENT GLADIATOR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire',
            '20': '⛄ *SNOW BEAST HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '21': '🌵 *TERRORTHORN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '22': '🌊 *TIDAL TITAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '23': '👺 *VOODOO SHAMAN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '24': '🏡 *COTTAGEROAR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin'
        };

        const targetText = profiles[targetIndex];

        if (targetText) {
            const photoPath = path.join(__dirname, 'monsters', `${targetIndex}.jpg`);
            if (fs.existsSync(photoPath)) {
                try {
                    const media = MessageMedia.fromFilePath(photoPath);
                    return await client.sendMessage(groupId, media, { caption: targetText });
                } catch (e) {
                    return replyContext(`${targetText}\n⚠️ (Image execution failed)`);
                }
            } else {
                return replyContext(`${targetText}\n\n💡 _Tip: Place ${targetIndex}.jpg in your "monsters" repository folder to view this layout with graphics._`);
            }
        }
        return replyContext("❌ Monster layout profile entry not found within directory range.");
    }

    // --- TIMELINE REMINDER CONTEXT EXTRACTOR (IST) ---
    if (command === 'remind' || command === 'schedule') {
        try {
            let fullInput = args.join(' ');
            let targetTime = null;
            let referenceIST = moment.tz("Asia/Kolkata");

            // Format A: ".remind 10m Task"
            if (/^\d+m\s/i.test(fullInput)) {
                const match = fullInput.match(/^(\d+)m/i);
                const mins = parseInt(match[1]);
                targetTime = referenceIST.clone().add(mins, 'minutes').toDate();
                fullInput = fullInput.replace(/^\d+m\s+/i, '');
            } 
            // Format B: ".remind today 5pm Task" or ".remind 11pm Task"
            else if (/^(today\s+)?(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^(today\s+)?(\d+)(am|pm)/i);
                let hr = parseInt(match[2]);
                const ampm = match[3].toLowerCase();
                if (ampm === 'pm' && hr < 12) hr += 12;
                if (ampm === 'am' && hr === 12) hr = 0;
                targetTime = referenceIST.clone().hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^(today\s+)?\d+(am|pm)\s+/i, '');
            }
            // Format C: ".remind tomorrow 9am Task"
            else if (/^tomorrow\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^tomorrow\s+(\d+)(am|pm)/i);
                let hr = parseInt(match[1]);
                const ampm = match[2].toLowerCase();
                if (ampm === 'pm' && hr < 12) hr += 12;
                if (ampm === 'am' && hr === 12) hr = 0;
                targetTime = referenceIST.clone().add(1, 'day').hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^tomorrow\s+\d+(am|pm)\s+/i, '');
            }
            // Format D: ".remind monday 3pm Task"
            else if (/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d+)(am|pm)/i);
                const dayName = match[1].toLowerCase();
                let hr = parseInt(match[2]);
                const ampm = match[3].toLowerCase();
                if (ampm === 'pm' && hr < 12) hr += 12;
                if (ampm === 'am' && hr === 12) hr = 0;
                
                targetTime = referenceIST.clone().day(dayName);
                if (targetTime.isBefore(referenceIST)) targetTime.add(7, 'days');
                targetTime = targetTime.hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+\d+(am|pm)\s+/i, '');
            }
            // Format E: ".remind 28/07/2026 4pm Task"
            else if (/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)(am|pm)/i);
                const dateStr = match[1];
                let hr = parseInt(match[2]);
                const ampm = match[3].toLowerCase();
                if (ampm === 'pm' && hr < 12) hr += 12;
                if (ampm === 'am' && hr === 12) hr = 0;

                targetTime = moment.tz(dateStr, "DD/MM/YYYY", "Asia/Kolkata").hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^\d{2}\/\d{2}\/\d{4}\s+\d+(am|pm)\s+/i, '');
            }

            if (!targetTime) return replyContext("⚠️ Syntax examples:\n• `.remind 10m Wonder`\n• `.remind tomorrow 9am Rally` ");

            return replyContext(`✅ *Mars_16 Schedule Lock Registered!* \n⏰ Target (IST): ${moment(targetTime).tz("Asia/Kolkata").format('DD/MM/YYYY hh:mm A')}\n📝 Task: ${fullInput}`);
        } catch (e) {
            return replyContext("❌ Parsing scheduling metrics fault.");
        }
    }
};
