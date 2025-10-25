const mongoose = require('mongoose');
const validator = require('validator');

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot be more than 100 characters']
  },
  industry: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  phone: String,
  website: String,
  address: String,
  size: String,
  description: String,
  values: String,
  
  // Job details
  jobType: String,
  location: String,
  remotePolicy: String,
  salaryRange: String,
  experienceLevel: String,
  deadline: Date,
  startDate: Date,
  jobDescription: String,
  responsibilities: String,
  requiredSkills: String,
  preferredSkills: String,
  teamName: String,
  
  // Contact information
  contactTitle: String,
  contactDepartment: String,
  hiringManager: String,
  recruiterName: String,
  hrManager: String,
  
  // Application tracking
  applicationId: String,
  jobReference: String,
  source: String,
  referredBy: String,
  
  // Company culture
  culture: String,
  mission: String,
  benefits: String,
  workEnvironment: String,
  learningOpportunities: String,
  
  // Project information
  projectName: String,
  projectDescription: String,
  projectDuration: String,
  projectRole: String,
  projectTechnologies: String,
  projectOutcome: String,
  
  // Personalization
  personalConnection: String,
  sharedConnection: String,
  recentNews: String,
  productUsed: String,
  serviceAppreciated: String,
  
  // Custom sections
  customSection1: String,
  customSection2: String,
  customSection3: String
}, {
  timestamps: true
});

// Compound index to prevent duplicate companies for same user
companySchema.index({ userId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);