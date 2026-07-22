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
                let hr = parseInt(match);
                if (match.toLowerCase() === 'pm' && hr < 12) hr += 12;
                if (match.toLowerCase() === 'am' && hr === 12) hr = 0;
                targetTime = referenceIST.clone().hour(hr).minute(0).second(0).toDate();
                fullInput = fullInput.replace(/^today\s+\d+(am|pm)\s+/i, '');
            }
            else if (/^tomorrow\s+(\d+)(am|pm)/i.test(fullInput)) {
                const match = fullInput.match(/^tomorrow\s+(\d+)(am|pm)/i);
                let hr = parseInt(match);
                if (match.toLowerCase() === 'pm' && hr < 12) hr += 12;
                if (match.toLowerCase() === 'am' && hr === 12) hr = 0;
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
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
        if (!target) return replyContext("⚠️ Mention user or reply to mute them.");
        let until = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await GroupConfig.findOneAndUpdate({ groupId }, { $push: { mutedUsers: { userId: target, mutedUntil: until } } }, { upsert: true });
        return replyContext(`🔇 Muted participant messages inside target space.`);
    }

    if (command === 'unmute') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
        if (!target) return replyContext("⚠️ Mention target.");
        await GroupConfig.findOneAndUpdate({ groupId }, { $pull: { mutedUsers: { userId: target } } });
        return replyContext(`🔊 Permissions restored.`);
    }

    if (command === 'kick') {
        if (!isGroupAdmin && !isSuperAdmin) return replyContext("❌ Admin authentication required.");
        let target = msgObj.hasQuotedMsg ? (await msgObj.getQuotedMessage()).author : msgObj.mentionedIds?.;
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
        return replyContext(`⚔️ *MARS_16 FORMATION DIRECTIVE GUIDE* ⚔️\n\n• *Tactical Arrays (569 / 947 / 956 / 7 / 11 / 2)*:\n  ├→ Optimal target configuration fronts.\n  ├→ Deployment Ratio: *50% T4 & 50% T5* layers or *60% to 40%* setups.\n  └→ Heavy Frontline Wall: *80% T4 and 20% T5* to absorb massive shocks.`);
    }

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
