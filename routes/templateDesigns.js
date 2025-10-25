const express = require('express');
const TemplateDesign = require('../models/TemplateDesign');
const { protect } = require('../middleware/auth');
const htmlToText = require('html-to-text');
const he = require('he');
const router = express.Router();

router.use(protect);

// Get all template designs for user
router.get('/', async (req, res, next) => {
  try {
    const { category, isPublic, page = 1, limit = 20 } = req.query;
    
    let query = { userId: req.user.id };
    
    if (category) {
      query.category = category;
    }
    
    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    const templates = await TemplateDesign.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 });

    const total = await TemplateDesign.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: templates.length,
      data: {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTemplates: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get public templates
router.get('/public', async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    
    let query = { isPublic: true };
    
    if (category) {
      query.category = category;
    }

    const templates = await TemplateDesign.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ usageCount: -1, createdAt: -1 });

    const total = await TemplateDesign.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: templates.length,
      data: {
        templates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTemplates: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single template design
router.get('/:id', async (req, res, next) => {
  try {
    const template = await TemplateDesign.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new template design
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      category,
      subject,
      htmlContent,
      designConfig,
      variables,
      isPublic
    } = req.body;
    const decodedHtml = he.decode(htmlContent);

    const plainText = htmlToText.convert(htmlContent, {
      wordwrap: 130,
    });

    const template = await TemplateDesign.create({
      userId: req.user.id,
      name,
      category,
      subject,
      htmlContent: decodedHtml,
      plainText,
      designConfig,
      variables,
      isPublic: isPublic || false
    });

    res.status(201).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update template design
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name, 
      category,
      subject,
      htmlContent, 
      designConfig,
      variables,
      isPublic
    } = req.body;

    const template = await TemplateDesign.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    const updateData = {
      name,
      category,
      subject,
      designConfig,
      variables,
      isPublic
    };

    // Only update HTML content if provided and regenerate plain text
    if (htmlContent) {
      const decodedHtml = he.decode(htmlContent);
      updateData.htmlContent = decodedHtml;
      updateData.plainText = htmlToText.convert(htmlContent, {
        wordwrap: 130, 
      });
    }

    const updatedTemplate = await TemplateDesign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        template: updatedTemplate
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete template design
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await TemplateDesign.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
});

// Duplicate template
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const template = await TemplateDesign.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    const duplicatedTemplate = await TemplateDesign.create({
      userId: req.user.id,
      name: `${template.name} (Copy)`,
      category: template.category,
      subject: template.subject,
      htmlContent: template.htmlContent,
      plainText: template.plainText,
      designConfig: template.designConfig,
      variables: template.variables,
      isPublic: false
    });

    res.status(201).json({
      status: 'success',
      data: {
        template: duplicatedTemplate
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set template as public/private
router.patch('/:id/visibility', async (req, res, next) => {
  try {
    const { isPublic } = req.body;

    const template = await TemplateDesign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isPublic },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
});

// Increment usage count
router.patch('/:id/usage', async (req, res, next) => {
  try {
    const template = await TemplateDesign.findOneAndUpdate(
      { _id: req.params.id },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template design not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        template
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get template categories
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = await TemplateDesign.distinct('category', {
      $or: [
        { userId: req.user.id },
        { isPublic: true }
      ]
    });

    const categoryStats = await TemplateDesign.aggregate([
      {
        $match: {
          $or: [
            { userId: req.user.id },
            { isPublic: true }
          ]
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        categories,
        categoryStats
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;