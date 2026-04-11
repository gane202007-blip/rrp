const path = require('path');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

requireEnv('JWT_SECRET');
requireEnv('ADMIN_SECRET_KEY');

async function startServer() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI === 'USE_MEMORY_SERVER') {
    console.log('⚡ Starting in-memory MongoDB (development mode)...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    console.log(`📦 In-memory MongoDB URI: ${process.env.MONGO_URI}`);
  }

  const app = express();
  app.set('trust proxy', true);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ── API Routes ──
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Environmental stats — public
  app.get('/api/stats', async (req, res) => {
    try {
      const Upload = require('./models/Upload');
      const User = require('./models/User');
      const totalUploads = await Upload.countDocuments();
      const plasticUploads = await Upload.countDocuments({ isPlastic: true });
      const users = await User.countDocuments();
      const agg = await Upload.aggregate([
        { $match: { isPlastic: true } },
        {
          $group: {
            _id: null,
            totalCo2: { $sum: '$co2Saved' },
            totalEnergy: { $sum: '$energySaved' },
            totalWater: { $sum: '$waterSaved' },
          },
        },
      ]);
      
      
      const totals = agg[0] || { totalCo2: 0, totalEnergy: 0, totalWater: 0 };
      res.json({
        totalUploads,
        plasticUploads,
        users,
        totalCo2: Math.round(totals.totalCo2 * 10) / 10,
        totalEnergy: Math.round(totals.totalEnergy * 10) / 10,
        totalWater: Math.round(totals.totalWater * 10) / 10,
      });
    } catch (e) {
      res.status(500).json({ message: 'Stats error' });
    }
  });
  const path = require('path');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    console.error(`❌ Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

requireEnv('JWT_SECRET');
requireEnv('ADMIN_SECRET_KEY');

async function startServer() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI === 'USE_MEMORY_SERVER') {
    console.log('⚡ Starting in-memory MongoDB (development mode)...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    console.log(`📦 In-memory MongoDB URI: ${process.env.MONGO_URI}`);
  }

  const app = express();
  app.set('trust proxy', true);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false }));

  // ── API Routes ──
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Environmental stats — public
  app.get('/api/stats', async (req, res) => {
    try {
      const Upload = require('./models/Upload');
      const User = require('./models/User');
      const totalUploads = await Upload.countDocuments();
      const plasticUploads = await Upload.countDocuments({ isPlastic: true });
      const users = await User.countDocuments();
      const agg = await Upload.aggregate([
        { $match: { isPlastic: true } },
        {
          $group: {
            _id: null,
            totalCo2: { $sum: '$co2Saved' },
            totalEnergy: { $sum: '$energySaved' },
            totalWater: { $sum: '$waterSaved' },
          },
        },
      ]);
      // ── AI ANALYSIS ROUTE (FIX FOR CORS) ──
app.post('/api/analyze', async (req, res) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("❌ AI Route Error:", err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});
      
      const totals = agg[0] || { totalCo2: 0, totalEnergy: 0, totalWater: 0 };
      res.json({
        totalUploads,
        plasticUploads,
        users,
        totalCo2: Math.round(totals.totalCo2 * 10) / 10,
        totalEnergy: Math.round(totals.totalEnergy * 10) / 10,
        totalWater: Math.round(totals.totalWater * 10) / 10,
      });
    } catch (e) {
      res.status(500).json({ message: 'Stats error' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/marketplace', marketplaceRoutes);

  // ── Serve Frontend ──
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  const PORT = process.env.PORT || 5000;

  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 PlastiCore AI Server running on port ${PORT}`);
    console.log(`   🔌 API: /api  (health: GET /api/health)`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});


  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/marketplace', marketplaceRoutes);

  // ── Serve Frontend ──
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  const PORT = process.env.PORT || 5000;

  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🟢 PlastiCore AI Server running on port ${PORT}`);
    console.log(`   🔌 API: /api  (health: GET /api/health)`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
