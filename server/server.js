/**
 * PlastiCore AI — Express Server
 * ===============================
 * Entry point for the backend.
 * 
 * This file:
 *   1. Loads environment variables from server/.env
 *   2. Connects to MongoDB
 *   3. Sets up Express with middleware (CORS, JSON parsing)
 *   4. Mounts API routes: /api/auth, /api/user, /api/admin
 *   5. Serves the frontend from the public/ folder
 *   6. Starts listening on PORT (default 5000)
 * 
 * BEGINNER NOTE:
 *   Run with: node server/server.js (from the project root)
 *   Or use: npm start
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

// Load .env variables (from server/.env for local dev)
// In production (Render), env vars are set via the dashboard
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');

// Import route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Create Express app
const app = express();

// ── Middleware ──
app.use(cors());                    // Allow cross-origin requests
app.use(express.json());            // Parse JSON request bodies
app.use(express.urlencoded({ extended: false })); // Parse form data

// ── API Routes ──
app.use('/api/auth', authRoutes);    // /api/auth/register, /api/auth/login, /api/auth/me
app.use('/api/user', userRoutes);    // /api/user/uploads (own data)
app.use('/api/admin', adminRoutes);  // /api/admin/uploads, /api/admin/users, /api/admin/reports/*

// ── Serve Frontend (static files from public/ folder) ──
app.use(express.static(path.join(__dirname, '..', 'public')));

// For any route that doesn't match an API endpoint, serve index.html
// This allows client-side routing to work
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start Server ──
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🟢 PlastiCore AI Server running on http://localhost:${PORT}`);
    console.log(`   📁 Frontend: http://localhost:${PORT}`);
    console.log(`   🔌 API Base: http://localhost:${PORT}/api`);
    console.log(`   📊 Admin Secret Key: ${process.env.ADMIN_SECRET_KEY}\n`);
  });
});
