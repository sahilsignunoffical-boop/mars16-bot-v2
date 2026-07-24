const mongoose = require('mongoose');

console.log('🛡️ Database operations safely bypassed for pairing verification setup.');

// Standard function tracking constructors to prevent runtime schema crash states
function MockModel() {
    this.save = async function() { return true; };
}
MockModel.findOneAndUpdate = async function() { return true; };

const GuildFest = MockModel;
const ShieldTracker = MockModel;
const Reminder = MockModel;

module.exports = { mongoose, GuildFest, ShieldTracker, Reminder };
