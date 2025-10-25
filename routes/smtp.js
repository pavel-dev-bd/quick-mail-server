const express = require('express');
const SMTPConfig = require('../models/SMTPConfig');
const { protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

router.use(protect);

// Test SMTP configuration
const testSMTPConnection = async (smtpConfig) => {
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password
      },
      connectionTimeout: 100000, // 10 seconds
      greetingTimeout: 100000,
      socketTimeout: 100000
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    await transporter.sendMail({
      from: {
        name: smtpConfig.fromName,
        address: smtpConfig.fromEmail
      },
      to: smtpConfig.fromEmail, // Send test email to yourself
      subject: 'SMTP Configuration Test - Resume Mailer',
      html: `
        <h2>SMTP Configuration Test Successful! 🎉</h2>
        <p>Your SMTP configuration for <strong>${smtpConfig.name}</strong> is working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li><strong>Host:</strong> ${smtpConfig.host}</li>
          <li><strong>Port:</strong> ${smtpConfig.port}</li>
          <li><strong>Secure:</strong> ${smtpConfig.secure ? 'Yes' : 'No'}</li>
          <li><strong>From:</strong> ${smtpConfig.fromName} &lt;${smtpConfig.fromEmail}&gt;</li>
        </ul>
        <p>You can now use this SMTP configuration to send emails through Resume Mailer.</p>
        <hr>
        <p><small>This is an automated test message from Resume Mailer.</small></p>
      `
    });

    return { success: true, message: 'SMTP configuration test successful' };
  } catch (error) {
    return { 
      success: false, 
      message: 'SMTP configuration test failed',
      error: error.message 
    };
  }
};

// Get all SMTP configurations for user
router.get('/', async (req, res, next) => {
  try {
    const configs = await SMTPConfig.find({ userId: req.user.id }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: configs.length,
      data: {
        configs: configs.map(config => ({
          ...config.toObject(),
          password: undefined // Don't send password back
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single SMTP configuration
router.get('/:id', async (req, res, next) => {
  try {
    const config = await SMTPConfig.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          ...config.toObject(),
          password: undefined // Don't send password back
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new SMTP configuration
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      host,
      port,
      secure,
      username,
      password,
      fromEmail,
      fromName,
      isActive,
      isDefault
    } = req.body;

    // If setting as active, deactivate others
    if (isActive) {
      await SMTPConfig.updateMany(
        { userId: req.user.id, isActive: true },
        { isActive: false }
      );
    }

    // If setting as default, remove default from others
    if (isDefault) {
      await SMTPConfig.updateMany(
        { userId: req.user.id, isDefault: true },
        { isDefault: false }
      );
    }

    const smtpConfig = await SMTPConfig.create({
      userId: req.user.id,
      name,
      host,
      port,
      secure: secure || false,
      username,
      password,
      fromEmail,
      fromName,
      isActive: isActive || false,
      isDefault: isDefault || false,
      testStatus: 'pending'
    });

    res.status(201).json({
      status: 'success',
      data: {
        config: {
          ...smtpConfig.toObject(),
          password: undefined
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update SMTP configuration
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      host,
      port,
      secure,
      username,
      password,
      fromEmail,
      fromName,
      isActive,
      isDefault
    } = req.body;

    const config = await SMTPConfig.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
      });
    }

    // If setting as active, deactivate others
    if (isActive && !config.isActive) {
      await SMTPConfig.updateMany(
        { userId: req.user.id, isActive: true, _id: { $ne: req.params.id } },
        { isActive: false }
      );
    }

    // If setting as default, remove default from others
    if (isDefault && !config.isDefault) {
      await SMTPConfig.updateMany(
        { userId: req.user.id, isDefault: true, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    const updateData = {
      name,
      host,
      port,
      secure,
      username,
      fromEmail,
      fromName,
      isActive,
      isDefault,
      testStatus: 'pending' // Reset test status when updating
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    const updatedConfig = await SMTPConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          ...updatedConfig.toObject(),
          password: undefined
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Test SMTP configuration
router.post('/:id/test', async (req, res, next) => {
  try {
    const config = await SMTPConfig.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
      });
    }

    const testResult = await testSMTPConnection(config);

    // Update test status
    await SMTPConfig.findByIdAndUpdate(config._id, {
      lastTested: new Date(),
      testStatus: testResult.success ? 'success' : 'failed',
      testErrorMessage: testResult.error || null
    });

    if (testResult.success) {
      res.status(200).json({
        status: 'success',
        data: {
          message: testResult.message
        }
      });
    } else {
      res.status(400).json({
        status: 'fail',
        message: testResult.message,
        error: testResult.error
      });
    }
  } catch (error) {
    next(error);
  }
});

// Set SMTP configuration as active
router.patch('/:id/set-active', async (req, res, next) => {
  try {
    // Deactivate all other configurations
    await SMTPConfig.updateMany(
      { userId: req.user.id, isActive: true },
      { isActive: false }
    );

    // Activate the specified configuration
    const config = await SMTPConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive: true },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          ...config.toObject(),
          password: undefined
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Set SMTP configuration as default
router.patch('/:id/set-default', async (req, res, next) => {
  try {
    // Remove default from all other configurations
    await SMTPConfig.updateMany(
      { userId: req.user.id, isDefault: true },
      { isDefault: false }
    );

    // Set the specified configuration as default
    const config = await SMTPConfig.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDefault: true },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          ...config.toObject(),
          password: undefined
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Delete SMTP configuration
router.delete('/:id', async (req, res, next) => {
  try {
    const config = await SMTPConfig.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'SMTP configuration not found'
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

// Get active SMTP configuration
router.get('/active/get', async (req, res, next) => {
  try {
    const config = await SMTPConfig.findOne({
      userId: req.user.id,
      isActive: true
    });

    if (!config) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active SMTP configuration found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        config: {
          ...config.toObject(),
          password: undefined
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;