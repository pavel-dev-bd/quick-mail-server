const mongoose = require('mongoose');

const templateDesignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  category: {
    type: String,
    enum: ['professional', 'creative', 'minimal', 'modern', 'custom'],
    default: 'professional'
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  // HTML content for the template
  htmlContent: {
    type: String,
    required: true
  },
  // Plain text content (auto-generated from HTML)
  plainText: {
    type: String
  },
  builderContent: {
  type: String
 },
  // Template design configuration
  designConfig: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    textColor: {
      type: String,
      default: '#333333'
    },
    primaryColor: {
      type: String,
      default: '#6366f1'
    },
    fontFamily: {
      type: String,
      default: 'Arial, sans-serif'
    },
    fontSize: {
      type: String,
      default: '16px'
    },
    borderRadius: {
      type: String,
      default: '8px'
    },
    padding: {
      type: String,
      default: '20px'
    }
  },
  // Template preview image
  previewImage: String,
  // Variables used in template
  variables: [{
    name: String,
    description: String,
    defaultValue: String
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
templateDesignSchema.index({ userId: 1, category: 1 });
templateDesignSchema.index({ isPublic: 1, category: 1 });

// Method to increment usage count
templateDesignSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

// Static method to get popular templates
templateDesignSchema.statics.getPopularTemplates = function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('name category usageCount previewImage');
};

module.exports = mongoose.model('TemplateDesign', templateDesignSchema);