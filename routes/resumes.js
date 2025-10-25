const express = require('express');
const Resume = require('../models/Resume');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.use(protect);

// Upload resume
router.post('/upload', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a resume file'
      });
    }

    const resume = await Resume.create({
      userId: req.user.id,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      originalName: req.file.originalname
    });

    res.status(201).json({
      status: 'success',
      data: {
        resume
      }
    });
  } catch (error) {
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Get all resumes for user
router.get('/', async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: resumes.length,
      data: {
        resumes
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single resume
router.get('/:id', async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        resume
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete resume
router.delete('/:id', async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }

    await Resume.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
});

// Download resume
router.get('/:id/download', async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    if (!fs.existsSync(resume.filePath)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume file not found'
      });
    }

    res.download(resume.filePath, resume.originalName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          status: 'error',
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set resume as active/inactive
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        resume
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;