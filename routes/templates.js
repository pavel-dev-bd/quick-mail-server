const express = require('express');
const EmailTemplate = require('../models/EmailTemplate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Create new template
router.post('/', async (req, res, next) => {
  try {
    const template = await EmailTemplate.create({
      userId: req.user.id,
      ...req.body
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

// Get all templates for user
router.get('/', async (req, res, next) => {
  try {
    const templates = await EmailTemplate.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: templates.length,
      data: {
        templates
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single template
router.get('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found'
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

// Update template
router.patch('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found'
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

// Delete template
router.delete('/:id', async (req, res, next) => {
  try {
    const template = await EmailTemplate.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found'
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

// Set template as default
router.patch('/:id/set-default', async (req, res, next) => {
  try {
    // First, unset any existing default template
    await EmailTemplate.updateMany(
      { userId: req.user.id, isDefault: true },
      { isDefault: false }
    );

    // Set the specified template as default
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDefault: true },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        status: 'fail',
        message: 'Template not found'
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

// Get default template
router.get('/default/get', async (req, res, next) => {
  try {
    const template = await EmailTemplate.findOne({
      userId: req.user.id,
      isDefault: true
    });

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

module.exports = router;