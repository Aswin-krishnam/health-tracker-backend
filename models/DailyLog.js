const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    mood: {
        type: String,
        enum: ['Great', 'Good', 'Okay', 'Poor', 'Terrible'],
        required: true
    },
    notes: String,
    hydration: {
        waterIntake: {
            type: Number, // in milliliters
            default: 0
        },
        target: {
            type: Number,
            default: 2000 // default target 2L
        }
    },
    sleep: {
        duration: Number, // in hours
        quality: {
            type: String,
            enum: ['Excellent', 'Good', 'Fair', 'Poor'],
        },
        sleepTime: Date,
        wakeTime: Date
    },
    exercise: [{
        type: {
            type: String,
            required: true
        },
        duration: Number, // in minutes
        intensity: {
            type: String,
            enum: ['Low', 'Medium', 'High']
        },
        caloriesBurned: Number
    }],
    nutrition: {
        meals: [{
            type: {
                type: String,
                enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack']
            },
            foods: [{
                name: String,
                calories: Number,
                protein: Number,
                carbs: Number,
                fats: Number
            }]
        }],
        totalCalories: Number,
        healthyMealsFollowed: Boolean,
        junkFoodConsumed: Boolean
    },
    vitals: {
        weight: Number,
        bloodPressure: {
            systolic: Number,
            diastolic: Number
        },
        heartRate: Number,
        medications: [{
            name: String,
            dosage: String,
            taken: Boolean,
            time: Date
        }]
    }
}, {
    timestamps: true
});

// Index for efficient queries
dailyLogSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
module.exports = DailyLog;
