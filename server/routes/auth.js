const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_super_secret_key';

// Register User
router.post('/register', async (req, res) => {
    try {
        const { phone, name, languagePreference } = req.body;

        if (!phone || !name) {
            return res.status(400).json({ error: 'Phone and Name are required' });
        }

        let user = await User.findOne({ phone });
        if (user) {
            return res.status(400).json({ error: 'User already exists' });
        }

        user = new User({ phone, name, languagePreference: languagePreference || 'en' });
        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { phone, name } = req.body; // Using name as a simple 'password' or just phone for hackathon

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register.' });
        }

        // Extremely simple auth logic for hackathon (name acting as pin if provided, or just phone)
        if (name && user.name.toLowerCase() !== name.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid name/phone combination' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
