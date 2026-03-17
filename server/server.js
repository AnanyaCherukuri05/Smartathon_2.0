const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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
app.use('/api/auth', authRoutes);

/*
========================================
Database Connection
========================================
*/

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
    });

/*
========================================
Start Server
========================================
*/

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});