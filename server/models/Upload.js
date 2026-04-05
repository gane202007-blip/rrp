const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileName: { type: String, default: 'unknown' },
  isPlastic: { type: Boolean, default: false },
  plasticType: { type: String, default: 'UNKNOWN' },
  confidence: { type: Number, default: 0 },
  primaryUse: { type: String, default: '—' },
  mixRatio: { type: String, default: '—' },
  strength: { type: String, default: '—' },
  co2Saved: { type: Number, default: 0 },
  energySaved: { type: Number, default: 0 },
  waterSaved: { type: Number, default: 0 },
  visualClues: { type: String, default: '' },
  // Reuse suggestions
  reuseSuggestions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Upload', uploadSchema);
