const mongoose = require('mongoose');

// Standard driver configuration path pointing directly to your active Mongo Cluster Profile
const MONGO_URI = 'mongodb+srv://sahilsignunoffical_db_user:ibwAj5hxtrz6VNwQ@cluster0.ohwvu7y.mongodb.net/mars16?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Shared Cluster.'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Database Operational Schemas Definitions
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

const Reminder = mongoose.model('Reminder', new mongoose.Schema({
    groupId: { type: String, index: true },
    setterId: String,
    targetTime: Date,
    text: String
}));

// Export the operational configuration schemas
module.exports = { mongoose, GuildFest, ShieldTracker, Reminder };
