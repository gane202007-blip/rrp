/**
 * User Routes (Protected — logged-in users only)
 * ===============================================
 * POST /api/user/uploads  → Save analysis results to database
 * GET  /api/user/uploads  → Get ONLY the current user's uploads
 * 
 * BEGINNER NOTE:
 *   - All routes here require a valid JWT token
 *   - Users can only see their OWN data (filtered by userId)
 *   - The protect middleware adds req.user with the logged-in user's info
 */

const express = require('express');
const Upload = require('../models/Upload');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(protect);

// ──────────────────────────────────────
// POST /api/user/uploads
// Save one or more analysis results
// Body: { results: [ { fileName, plasticType, confidence, ... }, ... ] }
// ──────────────────────────────────────
router.post('/uploads', async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: 'No results to save' });
    }

    // Add userId to each result before saving
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
    }));

    // Insert all records at once
    const saved = await Upload.insertMany(uploadsToSave);

    res.status(201).json({
      message: `${saved.length} result(s) saved successfully`,
      uploads: saved,
    });
  } catch (error) {
    console.error('Save upload error:', error.message);
    res.status(500).json({ message: 'Failed to save results' });
  }
});

// ──────────────────────────────────────
// GET /api/user/uploads
// Get current user's upload history
// Only returns records where userId matches the logged-in user
// ──────────────────────────────────────
router.get('/uploads', async (req, res) => {
  try {
    // Filter by current user's ID — users can never see other users' data
    const uploads = await Upload.find({ userId: req.user._id })
      .sort({ createdAt: -1 }); // Newest first

    res.json({
      count: uploads.length,
      uploads,
    });
  } catch (error) {
    console.error('Get uploads error:', error.message);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
});

module.exports = router;
