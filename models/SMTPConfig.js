const mongoose = require('mongoose');
const validator = require('validator');

const smtpConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Configuration name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  host: {
    type: String,
    required: [true, 'SMTP host is required'],
    trim: true
  },
  port: {
    type: Number,
    required: [true, 'SMTP port is required'],
    min: [1, 'Port must be between 1 and 65535'],
    max: [65535, 'Port must be between 1 and 65535']
  },
  secure: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    required: [true, 'SMTP username is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'SMTP password is required']
  },
  fromEmail: {
    type: String,
    required: [true, 'From email is required'],
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  fromName: {
    type: String,
    required: [true, 'From name is required'],
    trim: true,
    maxlength: [100, 'From name cannot be more than 100 characters']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  lastTested: Date,
  testStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  testErrorMessage: String
}, {
  timestamps: true
});

// Compound index to ensure only one active SMTP config per user
smtpConfigSchema.index({ userId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Compound index to ensure only one default SMTP config per user
smtpConfigSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

module.exports = mongoose.model('SMTPConfig', smtpConfigSchema);