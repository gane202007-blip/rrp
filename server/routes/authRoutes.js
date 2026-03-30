/**
 * Auth Routes
 * ===========
 * POST /api/auth/register  → Create new user account
 * POST /api/auth/login     → Login and get JWT token
 * GET  /api/auth/me         → Get current user profile (protected)
 * 
 * BEGINNER NOTE:
 *   - JWT token is created with user ID and role
 *   - Token expires in 7 days
 *   - Client must store the token and send it in headers for protected routes
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * Helper: Generate JWT Token
 * Takes user ID and role, returns a signed JWT string
 */
function generateToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Token valid for 7 days
  });
}

// ──────────────────────────────────────
// POST /api/auth/register
// Creates a new user account
// ──────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminSecretKey } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 3. If registering as admin, verify the secret key
    let userRole = 'user'; // Default role
    if (role === 'admin') {
      if (!adminSecretKey || adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({
          message: 'Invalid admin secret key. Contact your administrator.',
        });
      }
      userRole = 'admin';
    }

    // 4. Create user (password is hashed automatically by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
    });

    // 5. Generate token and send response
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ──────────────────────────────────────
// POST /api/auth/login
// Authenticates user and returns JWT
// ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // 2. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Check password using the model's matchPassword method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 4. Generate token and send response
    const token = generateToken(user._id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ──────────────────────────────────────
// GET /api/auth/me
// Returns current user's profile (token required)
// ──────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = router;
