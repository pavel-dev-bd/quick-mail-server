const mongoose = require('mongoose');

const emailHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  errorMessage: String,
  email: String,
  companyName: String,
  position: String
});

module.exports = mongoose.model('EmailHistory', emailHistorySchema);