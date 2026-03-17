# 🌾 AI Pest Detection System - Setup & Usage Guide

## Overview
This comprehensive pest detection system uses AI to identify crop diseases and pests, then provides detailed treatment recommendations including pesticides, fertilizers, dosages, application methods, and safety precautions.

## Features

### 🎯 What's Included:
1. **AI-Powered Detection**: Uses Gemini Vision to analyze crop images
2. **Disease Identification**: Identifies pests and diseases with severity levels
3. **Pesticide Recommendations**: Multiple options (Chemical, Organic, Biological)
4. **Fertilizer Suggestions**: With dosages and application methods
5. **Safety Instructions**: Personal protective equipment, toxicity levels, first aid
6. **Cost Estimates**: Per hectare treatment costs
7. **Effectiveness Ratings**: Treatment effectiveness percentages
8. **Waiting Periods**: Safe harvest intervals after treatment

---

## Installation & Setup

### Step 1: Seed the Database
Run the pest and treatment data seeding script:

```bash
cd server
node pest-seed.js
```

This will populate your MongoDB with:
- 8 common crop pests/diseases
- Complete treatment recommendations for each
- Pesticide and fertilizer details
- Safety information and precautions

### Step 2: Ensure Environment Variables
Make sure your `.env` file in the server directory has:

```env
GEMINI_API_KEY=your_gemini_api_key_here
WEATHER_API_KEY=your_openweather_api_key_here
MONGO_URI=mongodb://127.0.0.1:27017/smartfarm
PORT=5000
```

### Step 3: Start the Server
```bash
npm start
```

### Step 4: Run the Client
```bash
cd client
npm run dev
```

---

## Database Models

### Pest Model
```javascript
{
  name: String,                      // e.g., "Powdery Mildew"
  scientificName: String,
  severity: 'Low' | 'Medium' | 'High',
  symptoms: [String],                // Array of visible symptoms
  affectedCrops: [String],
  seasonOfOccurrence: [String],
  description: String
}
```

### Treatment Model
```javascript
{
  pestId: ObjectId,                  // Reference to Pest
  pestName: String,
  
  // Pesticide Details
  pesticides: [{
    name, activeIngredient, type,
    dosage: { quantity, unit },
    applicationMethod, timingDaysSinceInfestation,
    sprayInterval, maxApplications,
    efficiency (%), cost, marketBrand
  }],
  
  // Fertilizer Details
  fertilizers: [{
    name, type,
    dosage: { quantity, unit },
    applicationMethod, timing, benefits
  }],
  
  // Safety Information
  precautions: {
    personalProtectiveEquipment: [String],
    storageInstructions: String,
    toxicityLevel: 'Low' | 'Medium' | 'High',
    waitingPeriodDays: Number,
    environmentalCautions: [String],
    poisoningSymptoms: [String],
    firstAidMeasures: String,
    notToMixWith: [String]
  },
  
  diseaseStage: String,
  effectiveness: Number,
  costPerHectare: Number,
  duration: String
}
```

---

## API Endpoint

### POST `/api/pests/detect`
**Description**: Analyzes a crop image and returns pest identification with treatments

**Request**:
- Content-Type: multipart/form-data
- File field: `image` (JPG, PNG, WebP)

**Response**:
```json
{
  "diagnosis": "AI analysis text with symptoms...",
  "identifiedPest": "Powdery Mildew",
  "pestDetails": {
    "scientificName": "Erysiphe cichoracearum",
    "severity": "High",
    "symptoms": [...],
    "description": "...",
    "affectedCrops": [...]
  },
  "treatment": {
    "pesticides": [...],
    "fertilizers": [...],
    "precautions": {...},
    "diseaseStage": "Early to Mid",
    "effectiveness": 88,
    "costPerHectare": 450,
    "duration": "7-10 days"
  }
}
```

---

## Available Pests in Database

1. **Powdery Mildew** - Fungal disease, white powdery coating
2. **Early Blight** - Affects tomato/potato, brown circular spots
3. **Fall Armyworm** - Caterpillar pest, leaf shredding
4. **Leaf Spot** - Fungal disease, small circular spots
5. **Rust Disease** - Rust-colored pustules, defoliation
6. **Jassid (Leafhopper)** - Sap-sucking insect, leaf scorching
7. **Aphids** - Soft-bodied insects, stunted growth
8. **Nitrogen Deficiency** - Nutritional disorder, leaf yellowing

---

## Frontend Component

### PestResultCard Component
Located at: `client/src/components/PestResultCard.jsx`

**Features**:
- Expandable sections for each treatment category
- Color-coded severity indicators
- Dosage and cost information
- Brand availability
- Safety precautions with emojis
- First aid measures
- Environmental warnings

### Pests Page
Located at: `client/src/pages/Pests.jsx`

**Features**:
- Image upload (camera or file)
- Loading animation
- Error handling
- Integration with PestResultCard

---

## How to Use

1. Navigate to the Pests page in the app
2. Upload a photo of the affected crop
3. AI will analyze the image and identify the pest/disease
4. View comprehensive treatment recommendations:
   - See the diagnosis and severity
   - Browse recommended pesticides with dosages
   - Check fertilizer suggestions
   - Read important safety precautions
5. Apply treatments following the guidelines

---

## Adding New Pests

To add more pests to the database:

1. Update `pest-seed.js` with new pest data
2. Add treatment information to `treatmentDataMap`
3. Run `node pest-seed.js` to update the database

**Example**:
```javascript
{
  name: 'Your Pest Name',
  scientificName: 'Scientific name here',
  severity: 'High', // High, Medium, or Low
  symptoms: ['Symptom 1', 'Symptom 2'],
  affectedCrops: ['Crop1', 'Crop2'],
  seasonOfOccurrence: ['Spring', 'Summer'],
  description: 'Brief description of the pest/disease'
}
```

---

## Safety Considerations

✅ **Always**:
- Wear proper PPE as recommended
- Follow dosage instructions carefully
- Check waiting periods before harvest
- Store pesticides in cool, dry places
- Mix only with compatible products

❌ **Never**:
- Mix pesticides without checking compatibility
- Apply on windy days (if specified)
- Skip the waiting period before harvest
- Store pesticides near food items
- Apply without proper safety equipment

---

## Cost-Saving Tips

1. Compare pesticide brands listed in recommendations
2. Use Organic/Biological options when possible (often cheaper)
3. Buy in bulk during off-season
4. Use foliar fertilizer sprays (more effective at lower costs)
5. Combine pesticide + fertilizer in one spray when possible

---

## Troubleshooting

**Issue**: Pest not identified
- **Solution**: Ensure good lighting in crop photo, try another angle

**Issue**: No treatment data found
- **Solution**: Run `node pest-seed.js` to populate database

**Issue**: Gemini API errors
- **Solution**: Check your GEMINI_API_KEY in .env file

**Issue**: Database connection fails
- **Solution**: Ensure MongoDB is running on localhost:27017

---

## Future Enhancements

- [ ] Add more pests and diseases
- [ ] Integrate with local pesticide market pricing
- [ ] Add weather-based treatment scheduling
- [ ] Farmer feedback system for treatment effectiveness
- [ ] Offline mode with cached data
- [ ] Multi-language support for safety precautions
- [ ] Video tutorials for application methods
- [ ] Nearby dealer finder for products
- [ ] Treatment history tracking

---

## Support

For issues or suggestions, please check the main README.md in the project root.
