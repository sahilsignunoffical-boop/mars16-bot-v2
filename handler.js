const { Strike, Reminder, GuildFest, ShieldTracker, floodTracker, abuseBlacklist, getGroupCache, SUPER_ADMIN } = require('./config');
const { translate } = require('google-translate-api-x');
const moment = require('moment-timezone');

async function handleIncomingCommand(context, waClient) {
    const { platform, groupId, senderId, senderName, rawBody, replyContext, kickContext, deleteContext, msgObj, chatObj, isGroupAdmin } = context;
    if (!rawBody) return;
    
    let textMessage = rawBody.trim();
    const cache = getGroupCache(groupId);

    const activeMute = cache.mutedUsers?.find(m => m.userId === senderId);
    if (activeMute && new Date(activeMute.mutedUntil) > new Date() && senderId !== SUPER_ADMIN) {
        await deleteContext();
        return;
    }

    let isTriggered = false;
    let commandString = "";

    if (textMessage.startsWith('.')) {
        commandString = textMessage.slice(1);
        isTriggered = true;
    } else if (platform === 'whatsapp' && msgObj.mentionedIds && waClient.info?.wid?._serialized) {
        const botId = waClient.info.wid._serialized;
        if (msgObj.mentionedIds.includes(botId)) {
            commandString = textMessage.replace(new RegExp(`@${waClient.info.wid.user}`, 'gi'), '').trim();
            isTriggered = true;
        }
    }

    if (!isTriggered || !commandString) return;
    const args = commandString.split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'gf') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authorization required to set Guild Fest parameters.");
        const scoreTarget = parseInt(args[0]);
        if (isNaN(scoreTarget)) return replyContext("⚠️ Syntax: Use `.gf [minimum_score]` (e.g., `.gf 1500`)");

        await GuildFest.findOneAndUpdate({ groupId }, { targetScore: scoreTarget }, { upsert: true });
        return replyContext(`🏆 *Guild Fest Notice Updates!* \nAdministration configured group expectations. Minimum score target: *${scoreTarget} pts*.`);
    }

    if (command === 'shield') {
        const inputDuration = args[0]?.toLowerCase();
        if (!inputDuration) return replyContext("⚠️ Syntax: Use `.shield [duration]` (e.g., `.shield 8h`, `.shield 3d`)");

        let durationValue = parseInt(inputDuration);
        let timeUnit = 'hours';

        if (inputDuration.includes('d')) timeUnit = 'days';
        else if (!inputDuration.includes('h')) return replyContext("⚠️ Append 'h' for hours or 'd' for days.");

        if (isNaN(durationValue) || durationValue <= 0) return replyContext("⚠️ Provide a valid duration parameter window.");

        let calculatedExpiry = moment.tz("Asia/Kolkata").add(durationValue, timeUnit);

        await ShieldTracker.findOneAndUpdate(
            { groupId, userId: senderId },
            { userName: senderName, expiryTime: calculatedExpiry.toDate() },
            { upsert: true }
        );

        const warningBufferTime = calculatedExpiry.clone().subtract(15, 'minutes').toDate();
        const freshAlert = new Reminder({
            groupId,
            setterName: senderName,
            targetTime: warningBufferTime,
            text: `⚠️ *CRITICAL PROFILE NOTIFICATION* \n@${senderId.split('@')[0]} Shield drops down in 15 minutes! Refresh protection defenses immediately.`,
            isRecurring: false,
            tagAllTrigger: false
        });
        await freshAlert.save();

        return replyContext(`🛡️ *Shield Registration Confirmed!* \n\n👤 *User:* ${senderName}\n⏳ *Duration:* ${durationValue} ${timeUnit}\n📅 *IST Expiration:* ${calculatedExpiry.format('DD/MM/YYYY hh:mm A')}`);
    }

    if (command === 'help') {
        return replyContext(`🌟 *WELCOME TO Mars_16 ❤️* \n\n🤖 *Commands List*\n• \`.ping\` — Online validation check\n• \`.gf [score]\` — Config targets (Admins Only)\n• \`.shield [time]\` — Log bubble duration (e.g. \`.shield 8h\`)\n• \`.tagall\` — Mention all group members hidden`);
    }

    if (command === 'ping') {
        return replyContext('🚀 Pong! Mars_16 Engine is fully operational.');
    }

    if (command === 'tagall' || command === 'tags') {
        if (!isGroupAdmin && senderId !== SUPER_ADMIN) return replyContext("❌ Admin authentication required.");
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
        await chatObj.sendMessage(mentionText, { mentions });
        return;
    }
}

module.exports = { handleIncomingCommand };
