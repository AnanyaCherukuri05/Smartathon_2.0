const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_super_secret_key';

module.exports = async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const payload = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};
