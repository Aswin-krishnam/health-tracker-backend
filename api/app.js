const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Import models
const User = require('../models/User');
const DailyLog = require('../models/DailyLog');
const CustomLogDefinition = require('../models/CustomLogDefinition');
const CustomLogEntry = require('../models/CustomLogEntry');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new Error();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

// Middleware
app.use(cors());
app.use(express.json());


app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});
// Register Route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY);
        res.status(201).json({ token });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Email already registered' });
        } else {
            res.status(400).json({ message: error.message });
        }
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
          // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY);
        res.json({ token, name: user.name });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Exercise Routes
app.post('/api/exercise', authenticateToken, async (req, res) => {
    try {
        const { type, duration, intensity, caloriesBurned, notes } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today
            });
        }

        // Add exercise to the log
        dailyLog.exercise = dailyLog.exercise || [];
        dailyLog.exercise.push({
            type,
            duration: Number(duration),
            intensity,
            caloriesBurned: Number(caloriesBurned),
            notes
        });

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/exercise/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ exercises: dailyLog?.exercise || [] });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/exercise/stats', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekAgo }
        });

        const stats = {
            totalWorkouts: 0,
            totalMinutes: 0,
            totalCalories: 0,
            workoutsByType: {}
        };

        logs.forEach(log => {
            if (log.exercise) {
                stats.totalWorkouts += log.exercise.length;
                log.exercise.forEach(exercise => {
                    stats.totalMinutes += exercise.duration || 0;
                    stats.totalCalories += exercise.caloriesBurned || 0;
                    stats.workoutsByType[exercise.type] = (stats.workoutsByType[exercise.type] || 0) + 1;
                });
            }
        });

        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Sleep Routes
app.post('/api/sleep', authenticateToken, async (req, res) => {
    try {
        const { duration, quality, sleepTime, wakeTime, notes } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today
            });
        }

        dailyLog.sleep = {
            duration: Number(duration),
            quality,
            sleepTime: new Date(sleepTime),
            wakeTime: new Date(wakeTime),
            notes
        };

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/sleep/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ sleep: dailyLog?.sleep || null });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/sleep/stats', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekAgo }
        });

        const stats = {
            averageDuration: 0,
            qualityDistribution: {
                Excellent: 0,
                Good: 0,
                Fair: 0,
                Poor: 0
            },
            totalSleepHours: 0,
            daysLogged: 0
        };

        logs.forEach(log => {
            if (log.sleep && log.sleep.duration) {
                stats.totalSleepHours += log.sleep.duration;
                stats.daysLogged++;
                if (log.sleep.quality) {
                    stats.qualityDistribution[log.sleep.quality]++;
                }
            }
        });

        stats.averageDuration = stats.daysLogged ? stats.totalSleepHours / stats.daysLogged : 0;

        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Dashboard Routes
app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's log
        const todayLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        // Get week's statistics
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const weekLogs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekStart, $lte: today }
        });

        res.json({
            todayLog,
            weekSummary: {
                totalWorkouts: weekLogs.reduce((acc, log) => acc + (log.exercise?.length || 0), 0),
                avgWaterIntake: weekLogs.reduce((acc, log) => acc + (log.hydration?.waterIntake || 0), 0) / weekLogs.length || 0,
                avgSleepHours: weekLogs.reduce((acc, log) => acc + (log.sleep?.duration || 0), 0) / weekLogs.length || 0,
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

// Hydration Routes
app.post('/api/hydration', authenticateToken, async (req, res) => {
    try {
        const { waterIntake, target } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today
            });
        }

        dailyLog.hydration = {
            waterIntake: Number(waterIntake),
            target: Number(target)
        };

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/hydration/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ hydration: dailyLog?.hydration || { waterIntake: 0, target: 2000 } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/hydration/stats', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekAgo }
        });

        const stats = {
            averageIntake: 0,
            totalIntake: 0,
            daysLogged: 0,
            targetAchievedDays: 0
        };

        logs.forEach(log => {
            if (log.hydration && log.hydration.waterIntake) {
                stats.totalIntake += log.hydration.waterIntake;
                stats.daysLogged++;
                if (log.hydration.waterIntake >= log.hydration.target) {
                    stats.targetAchievedDays++;
                }
            }
        });

        stats.averageIntake = stats.daysLogged ? stats.totalIntake / stats.daysLogged : 0;

        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Daily Overview Routes
app.get('/api/daily/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json(dailyLog || {});
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.post('/api/daily/mood', authenticateToken, async (req, res) => {
    try {
        const { mood } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today,
                mood
            });
        } else {
            dailyLog.mood = mood;
        }

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Nutrition Routes
app.post('/api/nutrition', authenticateToken, async (req, res) => {
    try {
        const { meal } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today,
                nutrition: {
                    meals: []
                }
            });
        }

        // Initialize nutrition if it doesn't exist
        if (!dailyLog.nutrition) {
            dailyLog.nutrition = {
                meals: []
            };
        }

        // Add new meal
        dailyLog.nutrition.meals.push(meal);

        // Calculate total calories
        dailyLog.nutrition.totalCalories = dailyLog.nutrition.meals.reduce((total, meal) => {
            return total + meal.foods.reduce((mealTotal, food) => mealTotal + Number(food.calories), 0);
        }, 0);

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/nutrition/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ nutrition: dailyLog?.nutrition || { meals: [], totalCalories: 0 } });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/nutrition/stats', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekAgo }
        });

        const stats = {
            averageCalories: 0,
            totalMeals: 0,
            mealTypeDistribution: {},
            macroAverages: {
                protein: 0,
                carbs: 0,
                fats: 0
            }
        };

        let daysWithLogs = 0;

        logs.forEach(log => {
            if (log.nutrition && log.nutrition.meals.length > 0) {
                daysWithLogs++;
                stats.totalMeals += log.nutrition.meals.length;
                
                // Track meal types
                log.nutrition.meals.forEach(meal => {
                    stats.mealTypeDistribution[meal.type] = 
                        (stats.mealTypeDistribution[meal.type] || 0) + 1;
                    
                    // Sum up macros
                    meal.foods.forEach(food => {
                        stats.macroAverages.protein += Number(food.protein) || 0;
                        stats.macroAverages.carbs += Number(food.carbs) || 0;
                        stats.macroAverages.fats += Number(food.fats) || 0;
                    });
                });

                stats.averageCalories += log.nutrition.totalCalories || 0;
            }
        });

        if (daysWithLogs > 0) {
            stats.averageCalories = stats.averageCalories / daysWithLogs;
            stats.macroAverages.protein = stats.macroAverages.protein / daysWithLogs;
            stats.macroAverages.carbs = stats.macroAverages.carbs / daysWithLogs;
            stats.macroAverages.fats = stats.macroAverages.fats / daysWithLogs;
        }

        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Vitals Routes
app.post('/api/vitals', authenticateToken, async (req, res) => {
    try {
        const { weight, bloodPressure, heartRate, medications } = req.body;
        
        // Find or create today's log
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        if (!dailyLog) {
            dailyLog = new DailyLog({
                user: req.user._id,
                date: today
            });
        }

        // Update vitals data
        dailyLog.vitals = {
            weight: weight || undefined,
            bloodPressure: bloodPressure || undefined,
            heartRate: heartRate || undefined,
            medications: medications || []
        };

        await dailyLog.save();
        res.status(201).json(dailyLog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/vitals/today', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        res.json({ vitals: dailyLog?.vitals || null });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/vitals/stats', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const logs = await DailyLog.find({
            user: req.user._id,
            date: { $gte: weekAgo }
        });

        const stats = {
            averageWeight: 0,
            averageHeartRate: 0,
            averageSystolic: 0,
            averageDiastolic: 0,
            medicationsTracked: 0,
            daysLogged: 0
        };

        logs.forEach(log => {
            if (log.vitals) {
                stats.daysLogged++;
                if (log.vitals.weight) {
                    stats.averageWeight += Number(log.vitals.weight);
                }
                if (log.vitals.heartRate) {
                    stats.averageHeartRate += Number(log.vitals.heartRate);
                }
                if (log.vitals.bloodPressure?.systolic) {
                    stats.averageSystolic += Number(log.vitals.bloodPressure.systolic);
                }
                if (log.vitals.bloodPressure?.diastolic) {
                    stats.averageDiastolic += Number(log.vitals.bloodPressure.diastolic);
                }
                if (log.vitals.medications) {
                    stats.medicationsTracked += log.vitals.medications.length;
                }
            }
        });

        if (stats.daysLogged > 0) {
            stats.averageWeight = stats.averageWeight / stats.daysLogged;
            stats.averageHeartRate = stats.averageHeartRate / stats.daysLogged;
            stats.averageSystolic = stats.averageSystolic / stats.daysLogged;
            stats.averageDiastolic = stats.averageDiastolic / stats.daysLogged;
        }

        res.json(stats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Email Notification Routes
app.post('/api/email/weekly-report', authenticateToken, async (req, res) => {
    try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        // Fetch all stats
        const [exerciseStats, sleepStats, hydrationStats, nutritionStats] = await Promise.all([
            DailyLog.aggregate([
                { $match: { user: req.user._id, date: { $gte: weekAgo } } },
                { 
                    $group: {
                        _id: null,
                        totalWorkouts: { $sum: { $size: { $ifNull: ["$exercise", []] } } },
                        totalMinutes: { $sum: { $sum: "$exercise.duration" } },
                        totalCalories: { $sum: { $sum: "$exercise.caloriesBurned" } }
                    }
                }
            ]),
            DailyLog.aggregate([
                { $match: { user: req.user._id, date: { $gte: weekAgo } } },
                {
                    $group: {
                        _id: null,
                        averageDuration: { $avg: "$sleep.duration" },
                        daysLogged: { $sum: { $cond: [{ $ifNull: ["$sleep", false] }, 1, 0] } }
                    }
                }
            ]),
            DailyLog.aggregate([
                { $match: { user: req.user._id, date: { $gte: weekAgo } } },
                {
                    $group: {
                        _id: null,
                        averageIntake: { $avg: "$hydration.waterIntake" },
                        targetAchievedDays: {
                            $sum: {
                                $cond: [
                                    { $gte: ["$hydration.waterIntake", "$hydration.target"] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            DailyLog.aggregate([
                { $match: { user: req.user._id, date: { $gte: weekAgo } } },
                {
                    $group: {
                        _id: null,
                        averageCalories: { $avg: "$nutrition.totalCalories" },
                        totalMeals: { $sum: { $size: { $ifNull: ["$nutrition.meals", []] } } }
                    }
                }
            ])
        ]);

        const reportData = {
            exercise: exerciseStats[0] || { totalWorkouts: 0, totalMinutes: 0, totalCalories: 0 },
            sleep: sleepStats[0] || { averageDuration: 0, daysLogged: 0 },
            hydration: hydrationStats[0] || { averageIntake: 0, targetAchievedDays: 0 },
            nutrition: nutritionStats[0] || { averageCalories: 0, totalMeals: 0 }
        };

        await emailService.sendWeeklyReport(req.user.email, reportData);
        res.json({ message: 'Weekly report sent successfully' });
    } catch (error) {
        console.error('Error sending weekly report:', error);
        res.status(500).json({ message: 'Failed to send weekly report' });
    }
});

app.post('/api/email/tracking-reminder', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyLog = await DailyLog.findOne({
            user: req.user._id,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });

        const untracked = [];
        if (!dailyLog?.exercise?.length) untracked.push('Exercise');
        if (!dailyLog?.hydration) untracked.push('Hydration');
        if (!dailyLog?.nutrition?.meals?.length) untracked.push('Nutrition');
        if (!dailyLog?.sleep) untracked.push('Sleep');
        if (!dailyLog?.vitals) untracked.push('Vitals');

        if (untracked.length > 0) {
            await emailService.sendTrackingReminder(req.user.email, untracked);
        }

        res.json({ message: 'Reminder sent successfully' });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({ message: 'Failed to send reminder' });
    }
});

app.post('/api/email/milestone', authenticateToken, async (req, res) => {
    try {
        const { milestone } = req.body;
        await emailService.sendMilestoneNotification(req.user.email, milestone);
        res.json({ message: 'Milestone notification sent successfully' });
    } catch (error) {
        console.error('Error sending milestone notification:', error);
        res.status(500).json({ message: 'Failed to send milestone notification' });
    }
});

// Email Settings Routes
app.get('/api/user/email-settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ settings: user.emailSettings });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching email settings' });
    }
});

app.put('/api/user/email-settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.emailSettings = {
            ...user.emailSettings,
            ...req.body
        };
        await user.save();
        res.json({ message: 'Email settings updated successfully', settings: user.emailSettings });
    } catch (error) {
        res.status(500).json({ message: 'Error updating email settings' });
    }
});

app.post('/api/email/test', authenticateToken, async (req, res) => {
    try {
        console.log('Sending test email to:', req.user.email);
        const testEmail = {
            title: 'Test Notification',
            description: 'This is a test email to confirm your notification settings are working correctly.'
        };
        const result = await emailService.sendMilestoneNotification(req.user.email, testEmail);
  
        res.json({ message: 'Test email sent successfully', info: result });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ 
            message: 'Failed to send test email', 
            error: error.message || 'Unknown error'
        });
    }
});

// Custom Log Definition Routes
app.post('/api/custom-logs/definitions', authenticateToken, async (req, res) => {
  try {
    const definition = new CustomLogDefinition({
      ...req.body,
      user: req.user._id
    });
    await definition.save();
    res.status(201).json(definition);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/custom-logs/definitions', authenticateToken, async (req, res) => {
  try {
    const definitions = await CustomLogDefinition.find({
      user: req.user._id,
      active: true
    });
    res.json(definitions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Custom Log Entry Routes
app.post('/api/custom-logs/entries', authenticateToken, async (req, res) => {
  try {
    const { definitionId, date, value, notes, tags } = req.body;
    const entry = new CustomLogEntry({
      user: req.user._id,
      definition: definitionId,
      date,
      value,
      notes,
      tags
    });
    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/custom-logs/entries', authenticateToken, async (req, res) => {
  try {
    const { definitionId, startDate, endDate } = req.query;
    const query = {
      user: req.user._id
    };

    if (definitionId) query.definition = definitionId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const entries = await CustomLogEntry.find(query)
      .populate('definition')
      .sort({ date: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/custom-logs/stats', authenticateToken, async (req, res) => {
  try {
    const { definitionId } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const [streak, stats] = await Promise.all([
      CustomLogEntry.calculateStreak(req.user._id, definitionId),
      CustomLogEntry.getStatistics(req.user._id, definitionId, startDate, endDate)
    ]);

    res.json({ streak, stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.DATABASE_URL)
.then(() => {
    console.log('Connected to MongoDB Atlas');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});