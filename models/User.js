const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
   bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: String,
  location: String,
  website: String,
  linkedin: String,
  github: String,
  title: String,
  experience: String,
  education: String,
  skills: [String],
  achievements: String,
  
  // Professional metrics
  metricImprovement: String,
  achievementPercentage: String,
  projectBudget: String,
  teamSize: String,
  revenueImpact: String,
  costSavings: String,
  efficiencyGain: String,
  
  // Technical information
  certifications: [String],
  toolsUsed: [String],
  methodologies: [String],
  complianceStandards: [String],
  
  // Custom fields
  customAchievement: String,
  customSkill: String,
  
  // Application tracking
  lastApplicationDate: Date,

  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  passwordChangedAt: Date,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};
userSchema.methods.hasSMTPConfig = async function() {
  const SMTPConfig = require('./SMTPConfig');
  const config = await SMTPConfig.findOne({ 
    userId: this._id, 
    isActive: true 
  });
  return !!config;
};

module.exports = mongoose.model('User', userSchema);