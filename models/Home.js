const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  homeId: { type: String, required: true, unique: true },
  members: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    uid: { type: String, ref: 'User' }
  }],
  createdBy: { type: String, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Home', homeSchema);