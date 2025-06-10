const mongoose = require('mongoose');

const customLogEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  definition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomLogDefinition',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Index for efficient querying
customLogEntrySchema.index({ user: 1, definition: 1, date: 1 });

// Add methods for streak calculation
customLogEntrySchema.statics.calculateStreak = async function(userId, definitionId) {
  const entries = await this.find({
    user: userId,
    definition: definitionId,
  }).sort({ date: -1 });

  let currentStreak = 0;
  let longestStreak = 0;
  let lastDate = new Date();

  for (let entry of entries) {
    const entryDate = new Date(entry.date);
    const diffDays = Math.floor((lastDate - entryDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      currentStreak++;
      longestStreak = Math.max(currentStreak, longestStreak);
    } else {
      break;
    }
    
    lastDate = entryDate;
  }

  return {
    currentStreak,
    longestStreak
  };
};

// Method to get statistics
customLogEntrySchema.statics.getStatistics = async function(userId, definitionId, startDate, endDate) {
  const entries = await this.find({
    user: userId,
    definition: definitionId,
    date: { $gte: startDate, $lte: endDate }
  });

  const stats = {
    total: entries.length,
    averagePerWeek: 0,
    averagePerMonth: 0
  };

  // Calculate more specific stats based on field type
  if (entries.length > 0 && typeof entries[0].value === 'number') {
    stats.min = Math.min(...entries.map(e => e.value));
    stats.max = Math.max(...entries.map(e => e.value));
    stats.average = entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
  }

  return stats;
};

module.exports = mongoose.model('CustomLogEntry', customLogEntrySchema);
