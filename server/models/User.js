const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    languagePreference: {
        type: String,
        default: 'en', // 'en' for English, 'hi' for Hindi, etc.
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
