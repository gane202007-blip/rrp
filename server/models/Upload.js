/**
 * Upload Model
 * ============
 * Stores analysis metadata for each plastic image upload.
 * Links to the User who uploaded it via userId.
 * 
 * BEGINNER NOTE:
 *   - We store only the analysis results, NOT the actual image file
 *   - userId is a reference to the User collection (for filtering)
 *   - The .populate('userId') method can be used to get user details
 */

const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',          // References the User model
    required: true,
  },
  fileName: {
    type: String,
    default: 'unknown',
  },
  isPlastic: {
    type: Boolean,
    default: false,
  },
  plasticType: {
    type: String,
    default: 'UNKNOWN',
  },
  confidence: {
    type: Number,
    default: 0,
  },
  primaryUse: {
    type: String,
    default: '—',
  },
  mixRatio: {
    type: String,
    default: '—',
  },
  strength: {
    type: String,
    default: '—',
  },
  co2Saved: {
    type: Number,
    default: 0,
  },
  energySaved: {
    type: Number,
    default: 0,
  },
  waterSaved: {
    type: Number,
    default: 0,
  },
  visualClues: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Upload', uploadSchema);
