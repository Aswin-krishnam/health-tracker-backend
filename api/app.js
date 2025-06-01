const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Import User model
const User = require('../models/User');

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