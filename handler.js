const { Strike, Reminder, GuildFest, ShieldTracker, floodTracker, abuseBlacklist, getGroupCache, SUPER_ADMIN } = require('./config');
const { translate } = require('google-translate-api-x');
const moment = require('moment-timezone');

async function handleStrikeAction(platform, groupId, userId, reason, replyContext, kickContext) {
    if (userId.includes('919310314801')) return; 
    
    let record = await Strike.findOne({ groupId, userId });
    if (!record) record = new Strike({ groupId, userId, strikes: 0 });
    record.strikes += 1;
    await record.save();
    
    const cleanUser = userId.split('@')[0];
    if (record.strikes >= 3) {
        await replyContext(`🚫 *AUTOMATED BAN EXECUTION*\n\nUser @${cleanUser} has reached *3/3 STRIKES*. Evicting...`);
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
    if (command === 'help') {
        const { MessageMedia } = require('whatsapp-web.js');
        const { BOT_IMAGE_URL } = require('./config');
        
        const menuText = `🌟 *WELCOME TO Mars_16 ❤️❤️❤️❤️❤️* \n\n🤖 *Group Bot — Commands*\n\n*🛠️ Utility*\n├→ *.ping* — Check if the bot is online\n└→ *.trans [language] <text>* — Translate text (defaults to English)\n\n*👥 Group Commands*\n├→ *.tagall* — Tag all members (Admins only)\n├→ *.tags* — Tag all for a bus run 🎫\n├→ *.tagadmin* — Mention group admins 🛡️\n├→ *.rules* — Show group rules\n├→ *.setrules <text>* — Set group rules (Admins only)\n├→ *.antipromo on/off* — Auto-delete links & stickers (Admins only)\n├→ *.mute @member* — Auto-delete their messages (Admins only)\n├→ *.unmute @member* — Stop auto-delete (Admins only)\n├→ *.kick @member* — Kick member from group (Admins only)\n└→ *.del* — Delete a message (reply to it, Admins only)\n\n*⏰ Reminders & Schedules*\n├→ *.remind 10m Task* — Alert for 10 mins\n├→ *.remind today 5pm Task* — Reminder later today\n├→ *.remind tomorrow 9am Task* — Reminder tomorrow\n├→ *.remind everyday 9am Alert* — Daily recurring reminder\n├→ *.remind 23/7/26 Task* — Target calendar date tracker\n├→ *.schedule 5:50pm Message* — Daily group schedule\n├→ *.schedulelist* — View all active schedules\n├→ *.remindlist* — View your active tasks\n└→ *.remindcancel <num>* — Cancel task by number\n\n*🛡️ Clan Defense Modules*\n├→ *.shield [duration]* — Activate shield drops countdown (e.g. \`.shield 8h\`)\n├→ *.shieldlist* — Review current structural shield profiles\n├→ *.datime [india/china]* — Global game clocks ⏰\n\n*🎮 Lords Mobile Features*\n├→ *.hunt* — Pull Alphabetical Monster Counter Index Menu\n└→ *.formation* — Tactical ratios guide`;

        if (platform === 'whatsapp') {
            try {
                const media = await MessageMedia.fromUrl(BOT_IMAGE_URL);
                await chatObj.sendMessage(media, { caption: menuText });
            } catch (err) { return replyContext(menuText); }
        } else { return replyContext(menuText); }
        return;
    }

    if (command === 'ping') {
        return replyContext('🚀 Pong! Mars_16 Engine is fully operational.');
    }

    if (command === 'trans') {
        try {
            let targetLang = 'en';
            let textToTranslate = args.join(' ');
            if (args.length >= 2) {
                targetLang = args.shift().toLowerCase();
                textToTranslate = args.join(' ');
            }
            if (!textToTranslate && msgObj?.hasQuotedMsg) {
                const quoted = await msgObj.getQuotedMessage();
                textToTranslate = quoted.body;
            }
            if (!textToTranslate) return replyContext("⚠️ Provide text or reply to a message to translate.");
            const res = await translate(textToTranslate, { to: targetLang });
            return replyContext(`🌍 *Translation (${targetLang.toUpperCase()}):*\n\n${res.text}`);
        } catch (err) { return replyContext("❌ Translation processing failed."); }
    }

    if (command === 'tagall' || command === 'tags') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        const inputCaption = args.join(' ') || "Attention Everyone's";
        const participants = chatObj.participants || [];
        let mentionText = `🚨 *Important Message* 🚨\n\n◻ *Message:* ${inputCaption}\n\n◻ *ETIQUETAS:*`;
        
        const readMoreSeparator = String.fromCharCode(8206).repeat(4000);
        mentionText += readMoreSeparator + `\n`;

        let mentions = [];
        for (let p of participants) {
            mentions.push(p.id._serialized);
            mentionText += `├→ @${p.id.user}\n`;
        }
        mentionText += `\n_Thanks for using Mars 16 Bot_\n_Group: ${chatObj.name || 'CxH Admins'}_`;
        
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
    if (command === 'gf') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authorization required.");
        const scoreTarget = parseInt(args);
        if (isNaN(scoreTarget)) return replyContext("⚠️ Syntax: Use `.gf [score]` (e.g., `.gf 4000`)");
        await GuildFest.findOneAndUpdate({ groupId }, { targetScore: scoreTarget }, { upsert: true });
        return replyContext(`🏆 *Guild Fest Baseline Configured!* All members must hit a minimum of *${scoreTarget} points*.`);
    }

    if (command === 'shield') {
        const inputDuration = args?.toLowerCase();
        if (!inputDuration) return replyContext("⚠️ Syntax: Use `.shield [duration]` (e.g., `.shield 8h`)");
        let durationValue = parseInt(inputDuration);
        let timeUnit = 'hours';
        if (inputDuration.includes('d')) timeUnit = 'days';
        if (isNaN(durationValue) || durationValue <= 0) return replyContext("⚠️ Provide a valid duration parameter.");

        let calculatedExpiry = moment.tz("Asia/Kolkata").add(durationValue, timeUnit);
        await ShieldTracker.findOneAndUpdate({ groupId, userId: senderId }, { userName: senderName, expiryTime: calculatedExpiry.toDate() }, { upsert: true });

        const warningBufferTime = calculatedExpiry.clone().subtract(15, 'minutes').toDate();
        const freshAlert = new Reminder({
            groupId, setterName: senderName, targetTime: warningBufferTime,
            text: `⚠️ *CRITICAL PROFILE NOTIFICATION* \n@${senderId.split('@')} Shield drops in 15 minutes! Refresh protection defenses!`,
            isRecurring: false, tagAllTrigger: true
        });
        await freshAlert.save();
        return replyContext(`🛡️ *Shield Registration Confirmed!* \n\n⏳ *Duration:* ${durationValue} ${timeUnit}\n📅 *IST Expiration Target:* ${calculatedExpiry.format('DD/MM/YYYY hh:mm A')}`);
    }

    if (command === 'mute') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin privileges required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
        if (!target) return replyContext("⚠️ Mention a member or reply to mute them.");
        let hours = parseFloat(args) || 24;
        let until = new Date(Date.now() + hours * 60 * 60 * 1000);
        await GroupConfig.findOneAndUpdate({ groupId }, { $push: { mutedUsers: { userId: target, mutedUntil: until } } }, { upsert: true });
        return replyContext(`🔇 Muted user cleanly for *${hours} hours*.`);
    }

    if (command === 'unmute') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin privileges required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
        if (!target) return replyContext("⚠️ Mention a member.");
        await GroupConfig.findOneAndUpdate({ groupId }, { $pull: { mutedUsers: { userId: target } } });
        return replyContext(`🔊 Unmuted member successfully.`);
    }

    if (command === 'kick') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authorization required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
        if (!target) return replyContext("⚠️ Target a user via mention or reply.");
        if (target.includes('919310314801')) return replyContext("🛡️ That user is immune.");
        await kickContext(target);
        return replyContext("✅ Target dismissed from group profile.");
    }

    if (command === 'del') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authorization required.");
        if (msgObj?.hasQuotedMsg) {
            const quoted = await msgObj.getQuotedMessage();
            await quoted.delete(true);
        } else { return replyContext("⚠️ Reply to the target message you want to delete."); }
        return;
    }

    if (command === 'datime') {
        const zone = args?.toLowerCase();
        const baseShowdownGMT = moment.tz("12:00", "HH:mm", "GMT");
        const baseArenaGMT = moment.tz("21:00", "HH:mm", "GMT");
        if (zone === 'china' || zone === 'cst') {
            return replyContext(`🇨🇳 *Lords Mobile China (CST) Timings:*\n\n⚔️ *Dragon Showdown:* ${baseShowdownGMT.clone().tz("Asia/Shanghai").format("hh:mm A")}\n🏟️ *Arena Reset:* ${baseArenaGMT.clone().tz("Asia/Shanghai").format("hh:mm A")}`);
        }
        if (zone === 'india' || zone === 'ist') {
            return replyContext(`🇮🇳 *Lords Mobile India (IST) Timings:*\n\n⚔️ *Dragon Showdown:* ${baseShowdownGMT.clone().tz("Asia/Kolkata").format("hh:mm A")}\n🏟️ *Arena Reset:* ${baseArenaGMT.clone().tz("Asia/Kolkata").format("hh:mm A")}`);
        }
        return replyContext("⚠️ Use `.datime india` or `.datime china` ");
    }

    if (command === 'formation') {
        return replyContext(`🛡️ *LORDS MOBILE STRATEGIC FORMATIONS GUIDE* \n\n• *Tactical Lineups (569 / 947 / 956 / 7 / 11 / 2)*:\n  ├→ Optimal for breaking frontlines.\n  └→ Ratio Balance: *50% T4 & 50% T5* or *60% to 40%* setups.\n\n• *Rally Formations*:\n  ├→ *Standard Push*: 60% T4 / 40% T5 balanced ratio.\n  ├→ *Heavy Frontline Wall*: 80% T4 and 20% T5 to absorb massive shocks.\n  └→ Keep layers optimized to prevent getting zeroed.`);
    }

    if (command === 'hunt') {
        const submenu = args?.[0]?.toLowerCase();
        if (!submenu) {
            return replyContext(`👾 *Mars_16 Lords Mobile Hunt Lineups Index* \nUse \`.hunt a\`, \`.hunt f\`, \`.hunt h\`, or \`.hunt n\` to view target sets:\n\n✨ *[a]*: Bon Appétit, Arctic Flipper, Blackwing, Cottageroar\n✨ *[f]*: Frostwing, Gargantua, Gawrilla, Grim Reaper, Gryphon\n✨ *[h]*: Hardrox, Hell Drider, Jade Wyrm, Hootclaw, Mecha Trojan, Mega Maggot\n✨ *[n]*: Necrosis, Noceros, Queen Bee, Saberfang, Serpent Gladiator, Snow Beast, Terrorthorn, Tidal Titan, Voodoo Shaman`);
        }
        if (submenu === 'a') {
            return replyContext(`🍖 *BON APPÉTIT*:\n• Black Crow, Tracker, Scarlet Bolt, Trickster, Demon Slayer\n\n🐬 *Arctic Flipper*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🦅 *Blackwing*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🦁 *Cottageroar*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin`);
        }
        if (submenu === 'f') {
            return replyContext(`❄️ *Frostwing*:\n• Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms\n\n👹 *Gargantua*:\n• Incinerator, Elementalist, Prima Donna, Bombin Goblin, Sage of Storms\n\n🦍 *Gawrilla*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Sea Squire\n\n💀 *Grim Reaper*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🦁 *Gryphon*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster`);
        }
        if (submenu === 'h') {
            return replyContext(`💎 *Hardrox*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n🔥 *Hell Drider*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🐲 *Jade Wyrm*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🦉 *Hootclaw*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🤖 *Mecha Trojan*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n🐛 *Mega Maggot*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin`);
        }
        if (submenu === 'n') {
            return replyContext(`🧟 *Necrosis*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🦏 *Noceros*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n🐝 *Queen Bee*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🐯 *Saberfang*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n⚔️ *Serpent Gladiator*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n⛄ *Snow Beast*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🌵 *Terrorthorn*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster\n\n🌊 *Tidal Titan*:\n• Incinerator, Elementalist, Prima Donna, Sage of Storms, Bombin Goblin\n\n🔮 *Voodoo Shaman*:\n• Demon Slayer, Scarlet Bolt, Tracker, Black Crow, Trickster`);
        }
    }
}

module.exports = { handleIncomingCommand };
