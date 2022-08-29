const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    guildID: String,
    userID: String,
    block: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);