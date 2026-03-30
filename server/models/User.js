/**
 * User Model
 * ==========
 * Schema: name, email, password (hashed), role (admin/user)
 * 
 * BEGINNER NOTE:
 *   - Passwords are automatically hashed before saving (pre-save hook)
 *   - Use user.matchPassword('plaintext') to verify during login
 *   - role defaults to 'user' if not specified
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ── Pre-save hook: Hash password before saving ──
// This runs automatically every time a user is created or password is changed
userSchema.pre('save', async function (next) {
  // Only hash if password field was modified (not on every save)
  if (!this.isModified('password')) {
    return next();
  }
  // Generate salt (10 rounds) and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: Compare entered password with hashed password ──
// Usage: const isMatch = await user.matchPassword('plaintext123');
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
