const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['sell', 'donate'],
    default: 'sell',
  },
  plasticType: { type: String, default: 'Unknown' },
  quantity: { type: String, default: '' },
  price: { type: Number, default: 0 },
  contact: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);
