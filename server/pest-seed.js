const mongoose = require('mongoose');
const Pest = require('./models/Pest');
const Treatment = require('./models/Treatment');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartfarm';

const pestData = [
    {
        name: 'Powdery Mildew',
        scientificName: 'Erysiphe cichoracearum',
        severity: 'High',
        symptoms: ['White powdery coating on leaves', 'Leaf curling and yellowing', 'Reduced plant growth', 'Flower distortion'],
        affectedCrops: ['Wheat', 'Barley', 'Rice', 'Cotton', 'Vegetables'],
        seasonOfOccurrence: ['Spring', 'Autumn'],
        description: 'A fungal disease characterized by white powdery growth on leaves, stems, and flowers. Very common in warm, dry conditions.'
    },
    {
        name: 'Early Blight',
        scientificName: 'Alternaria solani',
        severity: 'High',
        symptoms: ['Brown circular spots with concentric rings', 'Yellow halo around spots', 'Lower leaf yellowing', 'Leaf drop'],
        affectedCrops: ['Tomato', 'Potato', 'Eggplant'],
        seasonOfOccurrence: ['Summer', 'Monsoon'],
        description: 'A fungal disease affecting solanaceae crops. Causes severe defoliation and reduces yield significantly.'
    },
    {
        name: 'Fall Armyworm',
        scientificName: 'Spodoptera frugiperda',
        severity: 'High',
        symptoms: ['Irregular holes on leaves', 'Leaf shredding', 'Plant wilting', 'Frass (insect droppings) visible'],
        affectedCrops: ['Maize', 'Sorghum', 'Rice', 'Sugarcane', 'Cotton'],
        seasonOfOccurrence: ['Summer', 'Monsoon', 'Autumn'],
        description: 'A highly destructive caterpillar pest that feeds voraciously on leaves and plant tissues.'
    },
    {
        name: 'Leaf Spot',
        scientificName: 'Septoria species',
        severity: 'Medium',
        symptoms: ['Small circular spots with dark borders', 'Gray center with concentric rings', 'Spots merge to form larger areas', 'Premature leaf drop'],
        affectedCrops: ['Wheat', 'Barley', 'Rice', 'Vegetables'],
        seasonOfOccurrence: ['Monsoon', 'Winter'],
        description: 'A fungal leaf disease causing severe defoliation. Common in humid conditions.'
    },
    {
        name: 'Rust Disease',
        scientificName: 'Puccinia species',
        severity: 'High',
        symptoms: ['Rust-colored pustules on leaf underside', 'Yellow spots on upper leaf surface', 'Leaf premature drop', 'Reduced photosynthesis'],
        affectedCrops: ['Wheat', 'Barley', 'Rice', 'Corn'],
        seasonOfOccurrence: ['Winter', 'Spring'],
        description: 'A fungal disease causing rust-colored pustules, highly damaging in cool, moist weather.'
    },
    {
        name: 'Jassid (Leafhopper)',
        scientificName: 'Empoasca kerri',
        severity: 'High',
        symptoms: ['Leaf margins becoming brown/scorched', 'Leaf curling upward', 'Yellow patches between veins', 'Stunted plant growth', 'Wilting despite adequate water'],
        affectedCrops: ['Cotton', 'Groundnut', 'Vegetables', 'Tobacco'],
        seasonOfOccurrence: ['Summer', 'Autumn'],
        description: 'A sap-sucking insect that feeds on leaf undersides, causing severe damage to cotton and other crops.'
    },
    {
        name: 'Aphids',
        scientificName: 'Aphis gossypii',
        severity: 'Medium',
        symptoms: ['Sticky honeydew on leaves', 'Sooty mold development', 'Leaf curling', 'Plant stunting', 'Yellow spots'],
        affectedCrops: ['Cotton', 'Vegetables', 'Pulses', 'Oilseeds'],
        seasonOfOccurrence: ['All seasons', 'Peak in Spring and Autumn'],
        description: 'Small soft-bodied insects that suck plant sap and transmit viral diseases.'
    },
    {
        name: 'Nitrogen Deficiency',
        scientificName: 'Nutritional Disorder',
        severity: 'Medium',
        symptoms: ['Yellowing of older leaves first', 'Poor root development', 'Pale green leaves', 'Stunted growth', 'Light-colored stem'],
        affectedCrops: ['All crops'],
        seasonOfOccurrence: ['All seasons'],
        description: 'A nutritional deficiency causing overall plant stunting and reduced productivity.'
    }
];

const treatmentDataMap = {
    'Powdery Mildew': {
        pesticides: [
            {
                name: 'Sulfur Powder',
                activeIngredient: 'Molecular Sulfur',
                type: 'Organic',
                dosage: { quantity: 2.5, unit: 'kg/hectare' },
                applicationMethod: 'Dust or spray on affected leaves and plant parts',
                timingDaysSinceInfestation: 'Within 3-5 days of first appearance',
                sprayInterval: 'Repeat every 10-12 days',
                maxApplications: 4,
                efficiency: 85,
                cost: 150,
                marketBrand: ['Sulfex', 'Sulfur Dust']
            },
            {
                name: 'Carbendazim',
                activeIngredient: 'Carbendazim 50% WP',
                type: 'Chemical',
                dosage: { quantity: 500, unit: 'gm/liter' },
                applicationMethod: 'Spray on leaves, covering both upper and lower surfaces',
                timingDaysSinceInfestation: 'Within 2-3 days of spotting',
                sprayInterval: 'Repeat every 7-10 days',
                maxApplications: 3,
                efficiency: 90,
                cost: 120,
                marketBrand: ['Bavistin', 'Carbendazim 50%']
            },
            {
                name: 'Hexaconazole',
                activeIngredient: 'Hexaconazole 5% EC',
                type: 'Chemical',
                dosage: { quantity: 250, unit: 'ml/liter' },
                applicationMethod: 'Spray throughout the crop canopy',
                timingDaysSinceInfestation: 'Early morning or late evening',
                sprayInterval: 'Repeat every 10 days',
                maxApplications: 2,
                efficiency: 92,
                cost: 180,
                marketBrand: ['Contaf', 'Hexaconazole']
            }
        ],
        fertilizers: [
            {
                name: 'Potassium Nitrate',
                type: 'NPK',
                dosage: { quantity: 500, unit: 'gm/liter' },
                applicationMethod: 'Foliar spray',
                timing: 'After spotting disease, boost plant immunity',
                benefits: ['Increases disease resistance', 'Strengthens plant cell walls', 'Improves overall vigor']
            },
            {
                name: 'Zinc Sulfate',
                type: 'Micronutrient',
                dosage: { quantity: 0.5, unit: 'kg/hectare' },
                applicationMethod: 'Soil application or foliar spray',
                timing: 'At disease onset',
                benefits: ['Enhances immunity', 'Improves disease resistance', 'Promotes healthy leaves']
            }
        ],
        precautions: {
            personalProtectiveEquipment: ['Gloves', 'Face mask', 'Eye protection', 'Full sleeve shirt', 'Trousers'],
            storageInstructions: 'Keep in cool, dry place away from sunlight. Store separately from food items.',
            toxicityLevel: 'Low',
            waitingPeriodDays: 7,
            environmentalCautions: ['Avoid spraying on windy days', 'Do not spray on flowers if crop has flowers'],
            poisoningSymptoms: ['Respiratory irritation', 'Skin irritation if unwashed'],
            firstAidMeasures: 'Rinse skin with water. Seek medical help if ingested.',
            notToMixWith: ['Alkaline products', 'Neem oil']
        },
        diseaseStage: 'Early to Mid',
        effectiveness: 88,
        costPerHectare: 450,
        duration: '7-10 days for visible improvement'
    },
    'Early Blight': {
        pesticides: [
            {
                name: 'Mancozeb',
                activeIngredient: 'Mancozeb 75% WP',
                type: 'Chemical',
                dosage: { quantity: 2, unit: 'kg/hectare' },
                applicationMethod: 'Spray on all plant parts, focusing on lower leaves',
                timingDaysSinceInfestation: 'As soon as spots appear',
                sprayInterval: 'Repeat every 7-10 days',
                maxApplications: 5,
                efficiency: 88,
                cost: 100,
                marketBrand: ['Mancozeb 75%', 'Indofil']
            },
            {
                name: 'Chlorothalonil',
                activeIngredient: 'Chlorothalonil 75% WP',
                type: 'Chemical',
                dosage: { quantity: 2.5, unit: 'kg/hectare' },
                applicationMethod: 'Thorough spray coverage of entire plant',
                timingDaysSinceInfestation: 'Preventive or early curative stage',
                sprayInterval: 'Every 10-14 days',
                maxApplications: 4,
                efficiency: 85,
                cost: 150,
                marketBrand: ['Chlorothalonil 75%']
            },
            {
                name: 'Copper Fungicide',
                activeIngredient: 'Copper Oxychloride 50% WP',
                type: 'Chemical',
                dosage: { quantity: 3, unit: 'kg/hectare' },
                applicationMethod: 'Spray coverage including leaf undersides',
                timingDaysSinceInfestation: 'Within 5 days of spotting',
                sprayInterval: 'Every 7-10 days',
                maxApplications: 6,
                efficiency: 80,
                cost: 80,
                marketBrand: ['Copper Oxychloride', 'Blue Bordeaux']
            }
        ],
        fertilizers: [
            {
                name: 'Calcium Chloride',
                type: 'Micronutrient',
                dosage: { quantity: 0.5, unit: 'kg/hectare' },
                applicationMethod: 'Foliar spray',
                timing: 'After spraying fungicide',
                benefits: ['Strengthens plant tissue', 'Reduces leaf damage', 'Speeds recovery']
            },
            {
                name: 'Boron Solution',
                type: 'Micronutrient',
                dosage: { quantity: 0.25, unit: 'kg/hectare' },
                applicationMethod: 'Foliar spray',
                timing: 'Once disease is controlled',
                benefits: ['Improves plant vigor', 'Enhances recovery', 'Prevents recurrence']
            }
        ],
        precautions: {
            personalProtectiveEquipment: ['Heavy-duty gloves', 'Face mask/respirator', 'Eye protection', 'Apron', 'Closed shoes'],
            storageInstructions: 'Keep in original containers in cool, dark, well-ventilated area. Away from food and feed.',
            toxicityLevel: 'Medium',
            waitingPeriodDays: 14,
            environmentalCautions: ['Toxic to aquatic organisms', 'Do not spray near water sources', 'Avoid drift to nearby fields'],
            poisoningSymptoms: ['Dizziness', 'Headache', 'Nausea', 'Eye irritation'],
            firstAidMeasures: 'Move to fresh air. Rinse eyes with water for 15 minutes. Seek medical attention immediately.',
            notToMixWith: ['Lime', 'Alkaline pesticides', 'Oils']
        },
        diseaseStage: 'Early to Advanced',
        effectiveness: 84,
        costPerHectare: 550,
        duration: '10-14 days for disease control'
    },
    'Fall Armyworm': {
        pesticides: [
            {
                name: 'Spinosad',
                activeIngredient: 'Spinosad 2.5% SC',
                type: 'Biological',
                dosage: { quantity: 750, unit: 'ml/hectare' },
                applicationMethod: 'Spray with high pressure, covering all leaf surfaces',
                timingDaysSinceInfestation: 'Within 2-3 days of spotting larvae',
                sprayInterval: 'Repeat after 7-8 days if needed',
                maxApplications: 3,
                efficiency: 90,
                cost: 200,
                marketBrand: ['Success', 'Spinosad 2.5%']
            },
            {
                name: 'Flubendiamide',
                activeIngredient: 'Flubendiamide 20% WG',
                type: 'Chemical',
                dosage: { quantity: 100, unit: 'gm/hectare' },
                applicationMethod: 'Thorough spray of entire plant',
                timingDaysSinceInfestation: 'At first sign of larvae',
                sprayInterval: 'Single application usually effective',
                maxApplications: 2,
                efficiency: 95,
                cost: 250,
                marketBrand: ['Belt', 'Flubendiamide']
            },
            {
                name: 'Bt Spray (Bacillus thuringiensis)',
                activeIngredient: 'Bt kurstaki 32000 IU/mg',
                type: 'Organic',
                dosage: { quantity: 1, unit: 'kg/hectare' },
                applicationMethod: 'Spray on all parts of plant, especially young leaves',
                timingDaysSinceInfestation: 'Early instar larvae (within 1-3 days)',
                sprayInterval: 'Every 3-4 days until control achieved',
                maxApplications: 5,
                efficiency: 80,
                cost: 120,
                marketBrand: ['Thuricide', 'Halt', 'Bacillus thuringiensis']
            }
        ],
        fertilizers: [
            {
                name: 'Nitrogen Fertilizer (Urea)',
                type: 'NPK',
                dosage: { quantity: 50, unit: 'kg/hectare' },
                applicationMethod: 'Top dressing (soil application)',
                timing: 'After pest control, for plant recovery',
                benefits: ['Restores nitrogen loss', 'Promotes new leaf growth', 'Helps plant overcome stress']
            }
        ],
        precautions: {
            personalProtectiveEquipment: ['Gloves', 'Mask', 'Eye protection', 'Apron', 'Closed-toe shoes'],
            storageInstructions: 'Store in cool place (below 25°C). Biological products keep away from direct sunlight.',
            toxicityLevel: 'Low',
            waitingPeriodDays: 7,
            environmentalCautions: ['Safe for beneficial insects', 'Can be used 1-2 days before harvest'],
            poisoningSymptoms: ['Minimal toxicity', 'Possible allergic reactions in sensitive individuals'],
            firstAidMeasures: 'Wash with soap and water. If ingested, drink water and seek medical help.',
            notToMixWith: ['Alkaline fungicides', 'Strong oxidizers']
        },
        diseaseStage: 'All stages (More effective on young larvae)',
        effectiveness: 88,
        costPerHectare: 570,
        duration: '3-7 days for visible control'
    }
};

const buildDefaultTreatmentForPest = (pest) => {
    const severityConfig = {
        High: {
            pesticideDose: 3,
            waitDays: 10,
            effectiveness: 76,
            toxicity: 'Medium',
            costPerHectare: 620,
            duration: '7-12 days'
        },
        Medium: {
            pesticideDose: 2.5,
            waitDays: 7,
            effectiveness: 72,
            toxicity: 'Low',
            costPerHectare: 500,
            duration: '5-10 days'
        },
        Low: {
            pesticideDose: 2,
            waitDays: 5,
            effectiveness: 68,
            toxicity: 'Low',
            costPerHectare: 420,
            duration: '5-7 days'
        }
    };

    const config = severityConfig[pest.severity] || severityConfig.Medium;

    return {
        pesticides: [
            {
                name: 'Neem Oil + Sticker Spray',
                activeIngredient: 'Azadirachtin 1500 ppm',
                type: 'Organic',
                dosage: { quantity: config.pesticideDose, unit: 'ml/liter' },
                applicationMethod: 'Spray on both upper and lower leaf surfaces until wet but not dripping',
                timingDaysSinceInfestation: 'Start at first visible symptom',
                sprayInterval: 'Repeat every 5-7 days for 2 to 3 rounds',
                maxApplications: 3,
                efficiency: config.effectiveness,
                cost: 140,
                marketBrand: ['Nimbecidine', 'Neem Gold', 'Achook']
            },
            {
                name: 'Soap Water Contact Spray',
                activeIngredient: 'Potassium salts of fatty acids',
                type: 'Biological',
                dosage: { quantity: 5, unit: 'ml/liter' },
                applicationMethod: 'Spot spray affected leaves in morning/evening',
                timingDaysSinceInfestation: 'Within 24 hours of detection',
                sprayInterval: 'Repeat every 3-4 days if symptoms continue',
                maxApplications: 4,
                efficiency: 64,
                cost: 80,
                marketBrand: ['Insecticidal Soap']
            }
        ],
        fertilizers: [
            {
                name: 'NPK 19:19:19 Water Soluble',
                type: 'NPK',
                dosage: { quantity: 1, unit: 'kg/acre' },
                applicationMethod: 'Foliar spray',
                timing: '2-3 days after control spray',
                benefits: ['Supports recovery from stress', 'Improves leaf health', 'Promotes balanced growth']
            },
            {
                name: 'Zinc + Boron Micronutrient Mix',
                type: 'Micronutrient',
                dosage: { quantity: 0.5, unit: 'kg/hectare' },
                applicationMethod: 'Foliar spray',
                timing: 'One application after visible recovery starts',
                benefits: ['Improves immunity', 'Helps new healthy growth', 'Reduces repeat stress symptoms']
            }
        ],
        precautions: {
            personalProtectiveEquipment: ['Gloves', 'Mask', 'Eye protection', 'Full sleeve shirt', 'Closed footwear'],
            storageInstructions: 'Store in cool, dry and locked place away from food and children.',
            toxicityLevel: config.toxicity,
            waitingPeriodDays: config.waitDays,
            environmentalCautions: ['Avoid spraying during strong wind', 'Avoid nearby water bodies during spray'],
            poisoningSymptoms: ['Skin irritation', 'Eye irritation', 'Nausea if inhaled in excess'],
            firstAidMeasures: 'Wash affected area with clean water. Move to fresh air and seek medical help if symptoms continue.',
            notToMixWith: ['Strong alkaline chemicals', 'Unknown tank-mix chemicals']
        },
        diseaseStage: pest.severity === 'High' ? 'Mid to Advanced' : 'Early to Mid',
        effectiveness: config.effectiveness,
        costPerHectare: config.costPerHectare,
        duration: config.duration
    };
};

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await Pest.deleteMany({});
        await Treatment.deleteMany({});
        console.log('Cleared existing pest and treatment data...');

        // Insert pest data
        const insertedPests = await Pest.insertMany(pestData);
        console.log(`Inserted ${insertedPests.length} pests`);

        // Insert treatment data
        const treatmentDataToInsert = [];
        for (const pest of insertedPests) {
            const treatmentInfo = treatmentDataMap[pest.name] || buildDefaultTreatmentForPest(pest);
            treatmentDataToInsert.push({
                pestId: pest._id,
                pestName: pest.name,
                ...treatmentInfo
            });
        }

        const insertedTreatments = await Treatment.insertMany(treatmentDataToInsert);
        console.log(`Inserted ${insertedTreatments.length} treatments`);

        console.log('✅ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seedDatabase();
