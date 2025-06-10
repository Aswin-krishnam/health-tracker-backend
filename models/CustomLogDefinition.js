const mongoose = require('mongoose');

const customLogDefinitionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  fieldType: {
    type: String,
    enum: ['number', 'boolean', 'text', 'multipleChoice', 'rating'],
    required: true
  },
  options: {
    // For multipleChoice type
    choices: [String],
    // For number type
    unit: String,
    min: Number,
    max: Number,
    // For rating type
    maxRating: Number
  },
  icon: String,
  color: String,
  trackStreak: {
    type: Boolean,
    default: true
  },
  reminderEnabled: {
    type: Boolean,
    default: false
  },
  reminderTime: String,
  category: {
    type: String,
    enum: ['health', 'fitness', 'nutrition', 'lifestyle', 'finance', 'productivity', 'other'],
    default: 'other'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CustomLogDefinition', customLogDefinitionSchema);
