const fs = require('fs');
const path = require('path');

console.log('🌐 System running on localized failsafe storage layout.');

// In-Memory structural maps that back up data on your local workspace filesystem
const BACKUP_FILE = path.join(__dirname, 'local_storage.json');
let localDatabase = { GuildFest: {}, ShieldTracker: {}, Reminder: {} };

if (fs.existsSync(BACKUP_FILE)) {
    try { localDatabase = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')); } catch (e) {}
}

const saveLocalData = () => {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(localDatabase, null, 2));
};

// Emulated Database Schema Classes mapping exactly to your handler parameters
class LocalModel {
    constructor(data) { Object.assign(this, data); }
    async save() {
        const type = this.constructor.name;
        const id = Date.now().toString();
        if (!localDatabase[type]) localDatabase[type] = {};
        localDatabase[type][id] = this;
        saveLocalData();
        return true;
    }
    static async findOneAndUpdate(query, update, options) {
        const type = this.name;
        if (!localDatabase[type]) localDatabase[type] = {};
        const key = query.groupId || 'global';
        localDatabase[type][key] = { ...localDatabase[type][key], ...update };
        saveLocalData();
        return true;
    }
}

class GuildFest extends LocalModel {}
class ShieldTracker extends LocalModel {}
class Reminder extends LocalModel {}

module.exports = { mongoose: { connection: { readiness: true } }, GuildFest, ShieldTracker, Reminder };
