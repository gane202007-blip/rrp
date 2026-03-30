/**
 * Admin Routes (Protected — admin role only)
 * ==========================================
 * GET  /api/admin/uploads      → View ALL uploads (with filters)
 * GET  /api/admin/users        → View all registered users
 * GET  /api/admin/reports/csv  → Download CSV report of all data
 * GET  /api/admin/reports/pdf  → Download PDF report of all data
 * 
 * BEGINNER NOTE:
 *   - Both protect (JWT check) and requireRole('admin') middleware are used
 *   - Admins can filter uploads by: plasticType, dateFrom, dateTo, userId
 *   - PDF is generated server-side using jsPDF
 */

const express = require('express');
const Upload = require('../models/Upload');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// All routes in this file require: 1) valid JWT, 2) admin role
router.use(protect);
router.use(requireRole('admin'));

// ──────────────────────────────────────
// GET /api/admin/uploads
// Get ALL uploads with optional filters
// Query params: ?plasticType=PET&dateFrom=2024-01-01&dateTo=2024-12-31&userId=xxx
// ──────────────────────────────────────
router.get('/uploads', async (req, res) => {
  try {
    const { plasticType, dateFrom, dateTo, userId } = req.query;

    // Build filter object dynamically
    const filter = {};

    if (plasticType) {
      filter.plasticType = plasticType.toUpperCase();
    }

    if (userId) {
      filter.userId = userId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const uploads = await Upload.find(filter)
      .populate('userId', 'name email') // Include user name & email
      .sort({ createdAt: -1 });

    res.json({
      count: uploads.length,
      uploads,
    });
  } catch (error) {
    console.error('Admin get uploads error:', error.message);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
});

// ──────────────────────────────────────
// GET /api/admin/users
// Get all registered users (without passwords)
// ──────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')  // Never return passwords!
      .sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Admin get users error:', error.message);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// ──────────────────────────────────────
// GET /api/admin/reports/csv
// Generate and download a CSV report of all uploads
// ──────────────────────────────────────
router.get('/reports/csv', async (req, res) => {
  try {
    const { plasticType, dateFrom, dateTo, userId } = req.query;
    const filter = {};
    if (plasticType) filter.plasticType = plasticType.toUpperCase();
    if (userId) filter.userId = userId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const uploads = await Upload.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Build CSV string
    const headers = [
      'Date', 'User Name', 'User Email', 'File Name', 'Is Plastic',
      'Plastic Type', 'Confidence %', 'Primary Use', 'Mix Ratio',
      'Strength', 'CO2 Saved (kg)', 'Energy Saved (MJ)', 'Water Saved (L)',
    ];

    let csv = headers.join(',') + '\n';

    uploads.forEach((u) => {
      const row = [
        new Date(u.createdAt).toLocaleDateString(),
        u.userId?.name || 'N/A',
        u.userId?.email || 'N/A',
        `"${u.fileName}"`,
        u.isPlastic ? 'Yes' : 'No',
        u.plasticType,
        Math.round(u.confidence * 100),
        `"${u.primaryUse}"`,
        `"${u.mixRatio}"`,
        u.strength,
        u.co2Saved,
        u.energySaved,
        u.waterSaved,
      ];
      csv += row.join(',') + '\n';
    });

    // Send as downloadable CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=PlastiCore_Report_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('CSV report error:', error.message);
    res.status(500).json({ message: 'Failed to generate CSV report' });
  }
});

// ──────────────────────────────────────
// GET /api/admin/reports/pdf
// Generate and download a PDF report
// Uses jsPDF on the server side
// ──────────────────────────────────────
router.get('/reports/pdf', async (req, res) => {
  try {
    const { plasticType, dateFrom, dateTo, userId } = req.query;
    const filter = {};
    if (plasticType) filter.plasticType = plasticType.toUpperCase();
    if (userId) filter.userId = userId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const uploads = await Upload.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const marginL = 18;
    const marginR = 192;
    let y = 20;

    // Header
    doc.setFillColor(0, 229, 160);
    doc.rect(0, 0, 210, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('PlastiCore AI — Admin Report', marginL, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginR, 9, { align: 'right' });

    y = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text('All Uploads Summary', marginL, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total records: ${uploads.length}`, marginL, y);
    y += 5;
    const plasticCount = uploads.filter((u) => u.isPlastic).length;
    doc.text(`Plastic items: ${plasticCount}`, marginL, y);
    y += 10;

    // Table header
    const cols = { date: 18, user: 42, file: 80, type: 115, conf: 140, use: 155 };
    doc.setFillColor(245, 247, 250);
    doc.rect(marginL, y - 4, marginR - marginL, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Date', cols.date, y);
    doc.text('User', cols.user, y);
    doc.text('File', cols.file, y);
    doc.text('Type', cols.type, y);
    doc.text('Conf', cols.conf, y);
    doc.text('Use', cols.use, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);

    uploads.forEach((u, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(marginL, y - 4, marginR - marginL, 7, 'F');
      }
      const date = new Date(u.createdAt).toLocaleDateString();
      const userName = (u.userId?.name || 'N/A').slice(0, 14);
      const fileName = u.fileName.length > 14 ? u.fileName.slice(0, 11) + '...' : u.fileName;
      doc.text(date, cols.date, y);
      doc.text(userName, cols.user, y);
      doc.text(fileName, cols.file, y);
      doc.text(u.isPlastic ? u.plasticType : 'N/A', cols.type, y);
      doc.text(u.isPlastic ? `${Math.round(u.confidence * 100)}%` : '—', cols.conf, y);
      doc.text(u.isPlastic ? (u.primaryUse || '—').slice(0, 20) : 'Not Plastic', cols.use, y);
      y += 6;
    });

    // Footer
    y += 8;
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text('PlastiCore AI Admin Report — Generated for educational and research purposes.', marginL, y);

    // Send as downloadable PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PlastiCore_Admin_Report_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF report error:', error.message);
    res.status(500).json({ message: 'Failed to generate PDF report' });
  }
});

module.exports = router;
