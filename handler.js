const { Strike, Reminder, GuildFest, ShieldTracker, floodTracker, abuseBlacklist, getGroupCache, SUPER_ADMIN } = require('./config');
const { translate } = require('google-translate-api-x');
const moment = require('moment-timezone');

async function handleStrikeAction(platform, groupId, userId, reason, replyContext, kickContext) {
    if (userId === SUPER_ADMIN) return; 
    
    let record = await Strike.findOne({ groupId, userId });
    if (!record) record = new Strike({ groupId, userId, strikes: 0 });
    record.strikes += 1;
    await record.save();
    
    const cleanUser = userId.split('@')[0];
    if (record.strikes >= 3) {
        await replyContext(`🚫 *AUTOMATED BAN EXECUTION*\n\nUser @${cleanUser} has reached *3/3 STRIKES*. Evicting from group...`);
        await kickContext(userId);
        await Strike.deleteOne({ groupId, userId }); 
    } else {
        await replyContext(`⚠️ *SECURITY WARNING (Strike ${record.strikes}/3)*\n\n@${cleanUser}, message deleted for: *${reason}*.`);
    }
}

async function handleIncomingCommand(context, waClient) {
    const { platform, groupId, senderId, senderName, rawBody, replyContext, kickContext, deleteContext, msgObj, chatObj, isGroupAdmin } = context;
    if (!rawBody) return;
    
    let textMessage = rawBody.trim();
    const cache = getGroupCache(groupId);

    // 1. Mute Verification Interceptor
    const activeMute = cache.mutedUsers?.find(m => m.userId === senderId);
    if (activeMute && new Date(activeMute.mutedUntil) > new Date() && senderId !== SUPER_ADMIN) {
        await deleteContext();
        return;
    }

    // 2. Multilingual Abuse Control
    if (senderId !== SUPER_ADMIN && !isGroupAdmin && cache.abuseDetect) {
        let normalizedText = textMessage.toLowerCase()
            .replace(/@/g, 'a').replace(/\$/g, 's').replace(/1/g, 'i')
            .replace(/3/g, 'e').replace(/0/g, 'o').replace(/7/g, 't');
        
        const containsAbuse = abuseBlacklist.some(word => normalizedText.includes(word));
        if (containsAbuse) {
            await deleteContext();
            return handleStrikeAction(platform, groupId, senderId, "Language Profanity Policy Violation", replyContext, kickContext);
        }
    }

    // 3. Prefix & Mention Command Extractor
    let isTriggered = false;
    let commandString = "";

    if (textMessage.startsWith('.')) {
        commandString = textMessage.slice(1);
        isTriggered = true;
    } else if (platform === 'whatsapp' && msgObj.mentionedIds && waClient?.info?.wid?._serialized) {
        if (msgObj.mentionedIds.includes(waClient.info.wid._serialized)) {
            commandString = textMessage.replace(new RegExp(`@${waClient.info.wid.user}`, 'gi'), '').trim();
            isTriggered = true;
        }
    }

    if (!isTriggered || !commandString) return;
    const args = commandString.split(/ +/);
    const command = args.shift().toLowerCase();

    // ====================================================
    // ⚙️ SYSTEM COMMAND CORE REGISTER
    // ====================================================

    // HELP MENU
    if (command === 'help') {
        const menu = `🌟 *WELCOME TO Mars_16 ❤️* \n\n🤖 *Group Bot — Commands*\n\n*🛠️ Utility*\n├→ *.ping* — Check online status\n├→ *.trans [lang]* — Translation layer\n└→ *.datime [india/china]* — Game event clocks ⏰\n\n*🏆 Guild Operations*\n├→ *.gf [score]* — Setup Guild Fest goals (Admins Only)\n├→ *.tagall [caption]* — Mass notification (Hidden layout)\n├→ *.tags* — Bus run announcement 🎫\n└→ *.tagadmin* — Summon administrative layers 🛡️\n\n*🛡️ Clan Defense Modules*\n├→ *.shield [duration]* — Activate shield drops countdown warning (e.g. \`.shield 8h\`)\n├→ *.shieldlist* — Review current structural shield profiles\n├→ *.mute @member [hours]* / *.unmute @member*\n├→ *.kick @member* / *.del* (Reply validation loops)\n└→ *.setrules <text>* / *.rules*\n\n*🎮 Lords Mobile Feature Engines*\n├→ *.hunt [monster_name]* — Monster counters\n└→ *.formation* — Tactical ratios guide`;
        return replyContext(menu);
    }

    // PING
    if (command === 'ping') {
        return replyContext('🚀 Pong! Mars_16 Engine is fully operational.');
    }

    // DYNAMIC TRANSLATION ENGINE
    if (command === 'trans') {
        try {
            let targetLang = 'en';
            let textToTranslate = args.join(' ');

            if (args && args.length === 2) {
                targetLang = args.shift().toLowerCase();
                textToTranslate = args.join(' ');
            }

            if (!textToTranslate && msgObj?.hasQuotedMsg) {
                const quoted = await msgObj.getQuotedMessage();
                textToTranslate = quoted.body;
            }

            if (!textToTranslate) return replyContext("⚠️ Provide a text string or reply directly to translate.");

            const res = await translate(textToTranslate, { to: targetLang });
            return replyContext(`🌍 *Translation (${targetLang.toUpperCase()}):*\n\n${res.text}`);
        } catch (err) {
            return replyContext("❌ Translation framework processing failure.");
        }
    }

    // READ MORE HIDDEN TAGALL
    if (command === 'tagall' || command === 'tags') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authentication required.");
        if (platform !== 'whatsapp') return replyContext("Feature restricted to WhatsApp groups.");

        const inputCaption = args.join(' ') || "Attention Everyone's";
        const participants = chatObj.participants;
        let mentionText = `🚨 *Important Message* 🚨\n\n◻ *Message:* ${inputCaption}\n\n◻ *ETIQUETAS:*`;
        
        const readMoreSeparator = String.fromCharCode(8206).repeat(4000);
        mentionText += readMoreSeparator + `\n`;

        let mentions = [];
        for (let p of participants) {
            mentions.push(p.id._serialized);
            mentionText += `├→ @${p.id.user}\n`;
        }
        mentionText += `\n_Thanks for using Mars 16 Bot_\n_Group: ${chatObj.name}_`;
        await chatObj.sendMessage(mentionText, { mentions });
        return;
    }
    // TAG ADMINS
    if (command === 'tagadmin') {
        if (platform !== 'whatsapp') return;
        let adminMentions = [];
        let txt = `🛡️ *Summoning Group Administration:* \n\n`;
        for (let p of chatObj.participants) {
            if (p.isAdmin || p.isSuperAdmin) {
                adminMentions.push(p.id._serialized);
                txt += `• @${p.id.user}\n`;
            }
        }
        await chatObj.sendMessage(txt, { mentions: adminMentions });
        return;
    }

    // ADMINISTRATIVE CONTROLS
    if (command === 'gf') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authorization required.");
        const scoreTarget = parseInt(args[0]);
        if (isNaN(scoreTarget)) return replyContext("⚠️ Syntax: `.gf 1500` ");
        await GuildFest.findOneAndUpdate({ groupId }, { targetScore: scoreTarget }, { upsert: true });
        return replyContext(`🏆 *Guild Fest Baseline Update!* Minimum score requirement configured to: *${scoreTarget} pts*.`);
    }

    if (command === 'shield') {
        const inputDuration = args[0]?.toLowerCase();
        if (!inputDuration) return replyContext("⚠️ Syntax: `.shield 8h` or `.shield 3d` ");
        let value = parseInt(inputDuration);
        let unit = 'hours';
        if (inputDuration.includes('d')) unit = 'days';
        let expiry = moment.tz("Asia/Kolkata").add(value, unit);

        await ShieldTracker.findOneAndUpdate({ groupId, userId: senderId }, { userName: senderName, expiryTime: expiry.toDate() }, { upsert: true });
        return replyContext(`🛡️ *Shield Tracker Engaged!* Expiration: ${expiry.format('DD/MM/YYYY hh:mm A')} (IST).`);
    }

    if (command === 'mute') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin privileges required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target) return replyContext("⚠️ Mention a player or reply to their message.");
        let hours = parseFloat(args[1]) || 24;
        let until = new Date(Date.now() + hours * 60 * 60 * 1000);

        await GroupConfig.findOneAndUpdate({ groupId }, { $push: { mutedUsers: { userId: target, mutedUntil: until } } }, { upsert: true });
        return replyContext(`🔇 Muted user cleanly for *${hours} hours*.`);
    }

    if (command === 'unmute') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin privileges required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target) return replyContext("⚠️ Mention a player.");
        await GroupConfig.findOneAndUpdate({ groupId }, { $pull: { mutedUsers: { userId: target } } });
        return replyContext(`🔊 Unmuted member successfully.`);
    }

    if (command === 'kick') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authorization required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target) return replyContext("⚠️ Target a user via mention or reply.");
        if (target === SUPER_ADMIN) return replyContext("🛡️ That user is immune.");
        await kickContext(target);
        return replyContext("✅ Target user dismissed from server profile.");
    }

    if (command === 'del') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authorization required.");
        if (msgObj?.hasQuotedMsg) {
            const quoted = await msgObj.getQuotedMessage();
            await quoted.delete(true);
        } else {
            return replyContext("⚠️ Reply to a target message while typing `.del`.");
        }
        return;
    }

    // GAME CLOCKS CONVERTER
    if (command === 'datime') {
        const zone = args[0]?.toLowerCase();
        const baseShowdownGMT = moment.tz("12:00", "HH:mm", "GMT");
        const baseArenaGMT = moment.tz("21:00", "HH:mm", "GMT");

        if (zone === 'china' || zone === 'cst') {
            return replyContext(`🇨🇳 *Lords Mobile CST Timings:*\n\n⚔️ *Dragon Showdown:* ${baseShowdownGMT.clone().tz("Asia/Shanghai").format("hh:mm A")}\n🏟️ *Arena Reset:* ${baseArenaGMT.clone().tz("Asia/Shanghai").format("hh:mm A")}`);
        }
        if (zone === 'india' || zone === 'ist') {
            return replyContext(`🇮🇳 *Lords Mobile IST Timings:*\n\n⚔️ *Dragon Showdown:* ${baseShowdownGMT.clone().tz("Asia/Kolkata").format("hh:mm A")}\n🏟️ *Arena Reset:* ${baseArenaGMT.clone().tz("Asia/Kolkata").format("hh:mm A")}`);
        }
        return replyContext("⚠️ Use `.datime india` or `.datime china` ");
    }

    // FORMATIONS
    if (command === 'formation') {
        return replyContext(`🛡️ *LORDS MOBILE FORMATIONS MATRIX* \n\n• *569 / 947 / 956 Sets*:\n  ├→ Counter extreme setups easily.\n  └→ Ratio profile: 60% T4 / 40% T5 optimization models.\n\n• *Standard Reinforcements*:\n  ├→ Balance Core: 50% T5 and 50% T4.\n  └→ Hard Frontline Push: 80% T4 Layered Defense / 20% T5 Shock Absorbers.`);
    }

    // 24 LORDS MOBILE MONSTER HUNTS REGISTER
    if (command === 'hunt') {
        const query = args.join(' ').toLowerCase();
        if (!query) {
            return replyContext(`👾 *Lords Mobile Hunt Registry* \nType \`.hunt <name>\` to query counters.\n\nExamples: \`.hunt frostwing\`, \`.hunt grim reaper\`, \`.hunt blackwing\``);
        }

        const monsters = {
            'frostwing': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'blackwing': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'bon appetite': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'arctic flipper': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'gargantua': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'gawrilla': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire.',
            'grim reaper': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'gryphon': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'hardrox': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'hell drider': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'jade wyrm': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'hootclaw': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'mecha trojan': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'mega maggot': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'necrosis': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'noceros': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'queen bee': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'saberfang': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'serpent gladiator': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'snow beast': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'terrorthorn': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'tidal titan': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.',
            'voodoo shaman': '⚔️ Physical Counter: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster.',
            'cottageroar': '⚔️ Magic Counter: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin.'
        };

        const result = monsters[query];
        if (result) {
            return replyContext(`👾 *Monster Details (${query.toUpperCase()}):*\n\n${result}`);
        } else {
            return replyContext("❌ Target monster name not found in database registry.");
        }
    }
}

module.exports = { handleIncomingCommand };
