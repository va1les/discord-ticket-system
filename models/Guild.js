const mongoose = require('mongoose');

const guildSchema = mongoose.Schema({
	guildID: String,
	roleID: String
});

module.exports = mongoose.model('Guild', guildSchema);