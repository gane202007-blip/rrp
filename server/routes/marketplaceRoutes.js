const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/marketplace — Public: list all items
router.get('/', async (req, res) => {
  try {
    const { category, plasticType } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (plasticType) filter.plasticType = plasticType;

    const items = await MarketplaceItem.find(filter)
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.json({ count: items.length, items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch marketplace items' });
  }
});

// POST /api/marketplace — Protected: create listing
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, plasticType, quantity, price, contact } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const item = await MarketplaceItem.create({
      userId: req.user._id,
      title,
      description: description || '',
      category: category || 'sell',
      plasticType: plasticType || 'Unknown',
      quantity: quantity || '',
      price: price || 0,
      contact: contact || '',
    });

    res.status(201).json({ message: 'Listing created', item });
  } catch (error) {
    console.error('Marketplace create error:', error.message);
    res.status(500).json({ message: 'Failed to create listing' });
  }
});

// DELETE /api/marketplace/:id — Protected: delete own listing
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await item.deleteOne();
    res.json({ message: 'Listing removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete listing' });
  }
});

module.exports = router;
