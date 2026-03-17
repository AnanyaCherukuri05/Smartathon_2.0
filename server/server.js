const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const apiRoutes = require('./routes/api');
const i18nRoutes = require('./routes/i18n');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/*
========================================
Middleware
========================================
*/

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

/*
========================================
Routes
========================================
*/

app.use('/api', apiRoutes);
app.use('/api', i18nRoutes);
app.use('/api/auth', authRoutes);

/*
========================================
Database Connection
========================================
*/

// Database Connection (best-effort; server still runs without DB for local dev)
if (!MONGO_URI) {
    console.warn('MongoDB not configured (MONGO_URI missing). Running with in-memory fallback data.');
} else {
    const isSrvUri = /^mongodb\+srv:\/\//i.test(MONGO_URI);

    mongoose
        .connect(MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000,
        })
        .then(() => {
            console.log('Connected to MongoDB successfully');
        })
        .catch((err) => {
            const msg = String(err?.message || err);
            const srvDnsBlocked = isSrvUri && /querySrv\s+ECONNREFUSED/i.test(msg);
            const hint = srvDnsBlocked
                ? 'Your network/DNS is likely blocking MongoDB SRV lookups. Try a different network, set DNS to 1.1.1.1/8.8.8.8, or use a non-SRV mongodb:// connection string.'
                : 'Check your MongoDB URI, Atlas Network Access allowlist, and internet connectivity.';

            console.warn('MongoDB connection failed (server still running):', msg);
            console.warn('MongoDB hint:', hint);
        });
}
