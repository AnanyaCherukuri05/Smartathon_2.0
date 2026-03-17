const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Crop = require('./models/Crop');
const MarketPrice = require('./models/MarketPrice');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartfarm';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        await Crop.deleteMany();
        await MarketPrice.deleteMany();

        const crops = [
            { name: 'Wheat', season: 'winter', soilType: 'dry', iconName: 'Wheat', colorClass: 'bg-amber-100 text-amber-700' },
            { name: 'Rice', season: 'monsoon', soilType: 'wet', iconName: 'Leaf', colorClass: 'bg-brand-green-100 text-brand-green-700' },
            { name: 'Maize', season: 'summer', soilType: 'dry', iconName: 'Sprout', colorClass: 'bg-yellow-100 text-yellow-700' },
            { name: 'Cotton', season: 'summer', soilType: 'clay', iconName: 'Cloud', colorClass: 'bg-slate-100 text-slate-700' }
        ];

        const marketPrices = [
            { cropName: 'Wheat', currentPrice: 2200, trend: 'up', priceDiff: 50, iconName: 'Wheat', colorClass: 'text-amber-600 bg-amber-100' },
            { cropName: 'Rice (Paddy)', currentPrice: 1950, trend: 'up', priceDiff: 30, iconName: 'Leaf', colorClass: 'text-brand-green-600 bg-brand-green-100' },
            { cropName: 'Maize', currentPrice: 1800, trend: 'down', priceDiff: 20, iconName: 'Sprout', colorClass: 'text-yellow-600 bg-yellow-100' },
            { cropName: 'Cotton', currentPrice: 6500, trend: 'up', priceDiff: 150, iconName: 'Cloud', colorClass: 'text-slate-600 bg-slate-100' }
        ];

        await Crop.insertMany(crops);
        await MarketPrice.insertMany(marketPrices);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
