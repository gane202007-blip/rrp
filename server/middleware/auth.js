/**
 * Authentication Middleware
 * ========================
 * Protects routes by verifying the JWT token.
 * 
 * HOW IT WORKS:
 *   1. Client sends: Authorization: Bearer <token>
 *   2. This middleware extracts and verifies the token
 *   3. If valid → attaches user info to req.user and calls next()
 *   4. If invalid → returns 401 Unauthorized
 * 
 * USAGE:
 *   router.get('/protected', protect, (req, res) => {
 *     // req.user is available here with { id, role }
 *   });
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token using the same secret used to create it
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID from token (exclude password from result)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next(); // Token is valid → proceed to the route handler
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token invalid' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
