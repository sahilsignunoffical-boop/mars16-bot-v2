const mongoose = require('mongoose');

const SUPER_ADMIN = '919310314801@c.us'; 
const TARGET_PHONE_NUMBER = '918800952400'; 
const BOT_IMAGE_URL = 'https://githubusercontent.com';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sahilsignunoffical_db_user:ibmAj5hxtrz6vNmQ@cluster0.ohhvv7y.mongodb.net/whatsapp_bot?retryWrites=true&w=majority';

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
let floodTracker = new Map(); 

const abuseBlacklist = [
    'chutiya', 'bhenchod', 'gandu', 'madarchod', 'laundu', 'harami', 'bsdk', 'saala',
    'abuse1', 'abuse2', 'badword', 'bastard', 'scam', 'puta', 'caonima', 'shabi'
];

function getGroupCache(groupId) {
    if (!configCache.has(groupId)) {
        const fresh = { rules: "No rules set yet.", antiPromo: false, antiSticker: false, abuseDetect: false, mutedUsers: [] };
        configCache.set(groupId, fresh);
        GroupConfig.create({ groupId }).catch(() => {});
        return fresh;
    }
    return configCache.get(groupId);
}

module.exports = {
    SUPER_ADMIN,
    TARGET_PHONE_NUMBER,
    BOT_IMAGE_URL,
    GroupConfig,
    Strike,
    Reminder,
    GuildFest,
    ShieldTracker,
    floodTracker,
    abuseBlacklist,
    getGroupCache
};
