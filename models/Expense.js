const mongoose = require('mongoose');

const debtorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  userId: { type: String },
  paymentReference: { type: String },
  paymentDate: { type: Date }
});

const expenseSchema = new mongoose.Schema({
  homeId: { type: String, required: true },
  payer: { type: String, required: true },
  payerId: { type: String },
  amount: { type: Number, required: true },
  reason: { type: String },
  splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
  debtors: [debtorSchema],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);