const mongoose = require('mongoose');

const choreSchema = new mongoose.Schema({
  homeId: { type: String, required: true },
  choreType: { 
    type: String, 
    required: true,
    enum: ['Brooming', 'Mopping', 'Kitchen', 'Trash']
  },
  doneBy: { type: String, required: true },
  date: { type: Date, default: Date.now },
  photoUrl: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Chore', choreSchema);