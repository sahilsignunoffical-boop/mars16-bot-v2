const { Strike, Reminder, GuildFest, ShieldTracker, floodTracker, abuseBlacklist, getGroupCache, SUPER_ADMIN } = require('./config.js');
const { translate } = require('google-translate-api-x');
const moment = require('moment-timezone');

async function handleStrikeAction(platform, groupId, userId, reason, replyContext, kickContext) {
    if (userId.includes('919310314801')) return; 
    let record = await Strike.findOne({ groupId, userId });
    if (!record) record = new Strike({ groupId, userId, strikes: 0 });
    record.strikes += 1;
    await record.save();
    
    const cleanUser = userId.split('@');
    if (record.strikes >= 3) {
        await replyContext(185);
        await kickContext(userId);
        await Strike.deleteOne({ groupId, userId }); 
    } else {
        await replyContext(`⚠️ *SECURITY WARNING (Strike ${record.strikes}/3)*\n\n@${cleanUser}, action blocked for: *${reason}*.`);
    }
}

async function handleIncomingCommand(context, waClient) {
    const { platform, groupId, senderId, senderName, rawBody, replyContext, kickContext, deleteContext, msgObj, chatObj, isGroupAdmin } = context;
    if (!rawBody) return;
    
    let textMessage = rawBody.trim();
    const cache = getGroupCache(groupId);
    const isSuperAdmin = senderId.includes('919310314801');

    const activeMute = cache.mutedUsers?.find(m => m.userId === senderId);
    if (activeMute && new Date(activeMute.mutedUntil) > new Date() && !isSuperAdmin) {
        await deleteContext();
        return;
    }

    if (!isSuperAdmin && !isGroupAdmin && cache.abuseDetect) {
        let normalizedText = textMessage.toLowerCase()
            .replace(/@/g, 'a').replace(/\$/g, 's').replace(/1/g, 'i')
            .replace(/3/g, 'e').replace(/0/g, 'o').replace(/7/g, 't');
        
        const containsAbuse = abuseBlacklist.some(word => normalizedText.includes(word));
        if (containsAbuse) {
            await deleteContext();
            return handleStrikeAction(platform, groupId, senderId, "Language Profanity Violation", replyContext, kickContext);
        }
    }

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
    // HELP MENU WITH CORE ENGINE COMMAND MAP
    if (command === 'help') {
        const { MessageMedia } = require('whatsapp-web.js');
        const { BOT_IMAGE_URL } = require('./config.js');
        const menuText = `🌟 *WELCOME TO Mars_16 ❤️❤️❤️❤️❤️* \n\n🤖 *Group Bot — Commands Map*\n\n*🛠️ Utility*\n├→ *.ping* — System speed diagnostics\n└→ *.trans [lang] <text>* — Advanced multilingual translation core\n\n*👥 Group Management*\n├→ *.tagall* — Mass tag hidden layout (Invisible Read More extension)\n├→ *.tags [caption]* — Tag all for bus run notifications 🎫\n├→ *.tagadmin* — Mention group admins 🛡️\n├→ *.rules* / *.setrules* — Regulations adjustments panel\n├→ *.mute @member [hours]* / *.unmute @member*\n├→ *.kick @member* — Dismiss participant safely\n└→ *.del* — Purge targeted timeline message row\n\n*⏰ IST Reminders & Schedules*\n├→ *.remind 10m Task* — Relative timing clock trigger\n├→ *.remind today 5pm Task* — Log absolute target space today\n├→ *.remind tomorrow 9am Task* — Log task for tomorrow morning\n├→ *.remind everyday 9am Alert* — Daily recurring reminder\n├→ *.schedule 5:50pm Text* — Direct group target broadcast\n└→ *.remindlist* / *.remindcancel <num>*\n\n*🛡️ Clan Defense Modules*\n├→ *.shield [duration]* — Activate shield drops countdown (e.g. \`.shield 8h\`)\n├→ *.datime [india/china]* — Global game clocks ⏰\n\n*🎮 Lords Mobile Engines*\n├→ *.hunt* — View complete list of 24 monster lineups\n└→ *.formation* — Tactical ratios guidelines (569, 947, 956 targets)`;
        if (platform === 'whatsapp') {
            try {
                const media = await MessageMedia.fromUrl(BOT_IMAGE_URL);
                await chatObj.sendMessage(media, { caption: menuText });
            } catch (err) { return replyContext(menuText); }
        } else { return replyContext(menuText); }
        return;
    }

    if (command === 'ping') {
        return replyContext('🚀 Pong! Mars_16 Multi-Platform Engine is fully operational.');
    }

    // MULTI-DIRECTIONAL LANGUAGE DICTIONARY TRANSLATOR
    if (command === 'trans') {
        try {
            let targetLang = 'en';
            let textToTranslate = args.join(' ');
            if (args.length >= 1) {
                const requested = args[0].toLowerCase();
                if (requested === 'chinese' || requested === 'zh') { targetLang = 'zh-CN'; args.shift(); }
                else if (requested === 'hindi' || requested === 'hi') { targetLang = 'hi'; args.shift(); }
                else if (requested === 'english' || requested === 'en') { targetLang = 'en'; args.shift(); }
                textToTranslate = args.join(' ');
            }
            if (!textToTranslate && msgObj?.hasQuotedMsg) {
                const quoted = await msgObj.getQuotedMessage();
                textToTranslate = quoted.body;
            }
            if (!textToTranslate) return replyContext("⚠️ Reply to a message or input text string to translate.");
            const res = await translate(textToTranslate, { to: targetLang });
            return replyContext(`🌍 *Translation (${targetLang.toUpperCase()}):*\n\n${res.text}`);
        } catch (err) { return replyContext("❌ Translation operation failed."); }
    }

    // HIDDEN TAGALL
    if (command === 'tagall' || command === 'tags') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        const caption = args.join(' ') || (command === 'tags' ? "Bus Run Starting! Get your tickets 🎫" : "Attention Everyone's");
        const participants = chatObj.participants || [];
        let mentionText = `🚨 *Important Message* 🚨\n\n◻ *Message:* ${caption}\n\n◻ *ETIQUETAS:*`;
        
        const readMoreSeparator = String.fromCharCode(8206).repeat(4000);
        mentionText += readMoreSeparator + `\n`;
        let mentions = [];
        for (let p of participants) {
            mentions.push(p.id._serialized);
            mentionText += `├→ @${p.id.user}\n`;
        }
        mentionText += `\n_Thanks for using Mars 16 Bot_\n_Group: ${chatObj.name || 'CxH Management'}_`;
        if (platform === 'whatsapp') await chatObj.sendMessage(mentionText, { mentions });
        else return replyContext(mentionText);
        return;
    }

    if (command === 'tagadmin') {
        let adminMentions = [];
        let txt = `🛡️ *Summoning Group Administration:* \n\n`;
        for (let p of (chatObj.participants || [])) {
            if (p.isAdmin || p.isSuperAdmin) {
                adminMentions.push(p.id._serialized);
                txt += `• @${p.id.user}\n`;
            }
        }
        if (platform === 'whatsapp') await chatObj.sendMessage(txt, { mentions: adminMentions });
        else return replyContext(txt);
        return;
    }
    // CRON REMINDER MATRIX (IST ALIGNED)
    if (command === 'remind' || command === 'schedule') {
        try {
            let fullInput = args.join(' ');
            let targetTime = null;
            let isRecurring = fullInput.toLowerCase().includes('everyday');
            let tagAllTrigger = fullInput.toLowerCase().includes('tagall') || fullInput.toLowerCase().includes('.tagall');
            let referenceIST = moment.tz("Asia/Kolkata");

            if (/^\d+m\s/i.test(fullInput)) {
                const mins = parseInt(fullInput.match(/^(\d+)m/i));
                targetTime = referenceIST.clone().add(mins, 'minutes').toDate();
                fullInput = fullInput.replace(/^\d+m\s+/i, '');
            } 
            else if (/^today\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^today\s+(\d+)(am|pm)/i);
                let hr = parseInt(match[1]);
                if (match[2].toLowerCase() === 'pm' && hr < 12) hr += 12;
                if (match[2].toLowerCase() === 'am' && hr === 12) hr = 0;
                targetTime = referenceIST.clone().hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^today\s+\d+(am|pm)\s+/i, '');
            }
            else if (/^tomorrow\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^tomorrow\s+(\d+)(am|pm)/i);
                let hr = parseInt(match[1]);
                if (match[2].toLowerCase() === 'pm' && hr < 12) hr += 12;
                if (match[2].toLowerCase() === 'am' && hr === 12) hr = 0;
                targetTime = referenceIST.clone().add(1, 'day').hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^tomorrow\s+\d+(am|pm)\s+/i, '');
            }

            if (!targetTime) return replyContext("⚠️ Syntax examples:\n• `.remind 10m wonder rally tagall`\n• `.remind today 11pm shield` ");

            const freshRemind = new Reminder({
                groupId, setterName: senderName, targetTime, text: fullInput, isRecurring, tagAllTrigger
            });
            await freshRemind.save();
            return replyContext(`✅ *Schedule Clock Registered (IST)!* \nTarget Date Time: ${moment(targetTime).tz("Asia/Kolkata").format('DD/MM/YYYY hh:mm A')}\n📝 Task: ${fullInput}`);
        } catch (e) { return replyContext("❌ Reminder scheduling parameter fault."); }
    }

    if (command === 'shield') {
        const inputDuration = args?.toLowerCase();
        if (!inputDuration) return replyContext("⚠️ Syntax: `.shield 8h` or `.shield 3d` ");
        let value = parseInt(inputDuration);
        let unit = 'hours';
        if (inputDuration.includes('d')) unit = 'days';
        let expiry = moment.tz("Asia/Kolkata").add(value, unit);

        await ShieldTracker.findOneAndUpdate({ groupId, userId: senderId }, { userName: senderName, expiryTime: expiry.toDate() }, { upsert: true });
        return replyContext(`🛡️ *Alliance Protection Shield Logged!* \nIST Expiration: ${expiry.format('DD/MM/YYYY hh:mm A')} (IST).`);
    }

    if (command === 'mute') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target) return replyContext("⚠️ Mention user or reply to mute them.");
        let until = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await GroupConfig.findOneAndUpdate({ groupId }, { $push: { mutedUsers: { userId: target, mutedUntil: until } } }, { upsert: true });
        return replyContext(`🔇 Muted participant messages inside target space.`);
    }

    if (command === 'unmute') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target) return replyContext("⚠️ Mention target.");
        await GroupConfig.findOneAndUpdate({ groupId }, { $pull: { mutedUsers: { userId: target } } });
        return replyContext(`🔊 Permissions restored.`);
    }

    if (command === 'kick') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.[0];
        if (!target || target.includes('919310314801')) return replyContext("🛡️ Invalid context block path.");
        await kickContext(target);
        return replyContext("✅ Process finalized.");
    }

    if (command === 'del') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        if (msgObj?.hasQuotedMsg) {
            const quoted = await msgObj.getQuotedMessage();
            await quoted.delete(true);
        }
        return;
    }
    if (command === 'formation') {
        return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE GUIDE* ⚔️\n\n• *Tactical Arrays (569 / 947 / 956 / 7 / 11 / 2)*:\n  ├→ Optimal target configuration fronts.\n  ├→ Deployment Ratio: *50% T4 & 50% T5* layers.\n  └→ Alternative Push Balance: *60% T4 down to 40% T5* elements.`);
    }

    // COMPLETE RECONSTRUCTED 24 LORDS MOBILE MONSTER HUNTS SELECTION MODULE
    if (command === 'hunt') {
        const indexList = `👾 *Mars_16 Universal Monster Hunting Directory* 👾\n\n1. Bon Appétit\n2. Arctic Flipper\n3. Blackwing\n4. Frostwing\n5. Gargantua\n6. Gawrilla\n7. Grim Reaper\n8. Gryphon\n9. Hardrox\n10. Hell Drider\n11. Jade Wyrm\n12. Hootclaw\n13. Mecha Trojan\n14. Mega Maggot\n15. Necrosis\n16. Noceros\n17. Queen Bee\n18. Saberfang\n19. Serpent Gladiator\n20. Snow Beast\n21. Terrorthorn\n22. Tidal Titan\n23. Voodoo Shaman\n24. Cottageroar\n\n👉 *Query Syntax:* Type \`.hunt <number>\` or \`.hunt <name>\` to read specific hero lineups.`;
        const query = args.join(' ').toLowerCase().trim();
        if (!query) return replyContext(indexList);

        const profiles = {
            '1': '🍖 *BON APPÉTIT HERO LINEUP*:\n• Physical: Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer',
            'bon appetit': '🍖 *BON APPÉTIT HERO LINEUP*:\n• Physical: Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer',
            '2': '🐬 *ARCTIC FLIPPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'arctic flipper': '🐬 *ARCTIC FLIPPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '3': '🦅 *BLACKWING HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'blackwing': '🦅 *BLACKWING HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '4': '❄️ *FROSTWING HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            'frostwing': '❄️ *FROSTWING HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            '5': '👹 *GARGANTUA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            'gargantua': '👹 *GARGANTUA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms',
            '6': '🦍 *GAWRILLA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire',
            'gawrilla': '🦍 *GAWRILLA HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire',
            '7': '💀 *GRIM REAPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'grim reaper': '💀 *GRIM REAPER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '8': '🦁 *GRYPHON HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'gryphon': '🦁 *GRYPHON HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '9': '💎 *HARDROX HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'hardrox': '💎 *HARDROX HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '10': '🔥 *HELL DRIDER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'hell drider': '🔥 *HELL DRIDER HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '11': '🐲 *JADE WYRM HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'jade wyrm': '🐲 *JADE WYRM HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '12': '🦉 *HOOTCLAW HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'hootclaw': '🦉 *HOOTCLAW HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '13': '🤖 *MECHA TROJAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'mecha trojan': '🤖 *MECHA TROJAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '14': '🐛 *MEGA MAGGOT HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'mega maggot': '🐛 *MEGA MAGGOT HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '15': '🧟 *NECROSIS HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'necrosis': '🧟 *NECROSIS HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '16': '🦏 *NOCEROS HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'noceros': '🦏 *NOCEROS HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '17': '🐝 *QUEEN BEE HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'queen bee': '🐝 *QUEEN BEE HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '18': '🐯 *SABERFANG HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'saberfang': '🐯 *SABERFANG HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '19': '⚔️ *SERPENT GLADIATOR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'serpent gladiator': '⚔️ *SERPENT GLADIATOR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '20': '⛄ *SNOW BEAST HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'snow beast': '⛄ *SNOW BEAST HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '21': '🌵 *TERRORTHORN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'terrorthorn': '🌵 *TERRORTHORN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '22': '🌊 *TIDAL TITAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'tidal titan': '🌊 *TIDAL TITAN HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            '23': '🔮 *VOODOO SHAMAN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            'voodoo shaman': '🔮 *VOODOO SHAMAN HERO LINEUP*:\n• Physical: Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster',
            '24': '🦁 *COTTAGEROAR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin',
            'cottageroar': '🦁 *COTTAGEROAR HERO LINEUP*:\n• Magical: Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin'
        };

        const targetData = profiles[query];
        return replyContext(targetData || `❌ Monster profile matching [${query}] not located in databases.`);
    }
}

module.exports = { handleIncomingCommand };
