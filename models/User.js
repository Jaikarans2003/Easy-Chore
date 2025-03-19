const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  upiId: { type: String, default: '' },
  homes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Home' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);