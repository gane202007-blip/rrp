const express = require('express');
const Upload = require('../models/Upload');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getSuggestions } = require('../utils/reuseSuggestions');

const router = express.Router();
router.use(protect);

// POST /api/user/uploads — Save analysis results and award points
router.post('/uploads', async (req, res) => {
  try {
    const { results } = req.body;
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: 'No results to save' });
    }

    const uploadsToSave = results.map((r) => ({
      userId: req.user._id,
      fileName: r.fileName || 'unknown',
      isPlastic: r.isPlastic || false,
      plasticType: r.plasticType || 'UNKNOWN',
      confidence: r.confidence || 0,
      primaryUse: r.primaryUse || '—',
      mixRatio: r.mixRatio || '—',
      strength: r.strength || '—',
      co2Saved: r.co2Saved || 0,
      energySaved: r.energySaved || 0,
      waterSaved: r.waterSaved || 0,
      visualClues: r.visualClues || '',
      reuseSuggestions: r.isPlastic ? getSuggestions(r.plasticType) : [],
    }));

    const saved = await Upload.insertMany(uploadsToSave);

    // Award +10 points per uploaded item
    const pointsEarned = saved.length * 10;
    const user = await User.findById(req.user._id);
    user.points = (user.points || 0) + pointsEarned;
    await user.save();

    res.status(201).json({
      message: `${saved.length} result(s) saved successfully`,
      uploads: saved,
      pointsEarned,
      totalPoints: user.points,
      badge: user.badge,
    });
  } catch (error) {
    console.error('Save upload error:', error.message);
    res.status(500).json({ message: 'Failed to save results' });
  }
});

// GET /api/user/uploads — Get current user's upload history
router.get('/uploads', async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: uploads.length, uploads });
  } catch (error) {
    console.error('Get uploads error:', error.message);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
});

// GET /api/user/profile — Return current user points and badge
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// GET /api/user/leaderboard — Top 10 users by points
router.get('/leaderboard', async (req, res) => {
  try {
    const leaders = await User.find({ role: 'user' })
      .select('name points badge')
      .sort({ points: -1 })
      .limit(10);
    res.json({ leaderboard: leaders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
