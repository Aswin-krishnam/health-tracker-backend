const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Import User model
const User = require('./models/User');

// Middleware
app.use(cors());
app.use(express.json());

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