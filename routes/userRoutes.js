const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  deleteAccount,
  getUserById
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { cloudinaryUpload, handleUploadErrors } = require('../middleware/cloudinaryUpload');
const { body } = require('express-validator');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes
router.get('/:id', getUserById);

// Protected routes
router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfileValidation, updateProfile)
  .delete(deleteAccount);

router.post('/avatar', cloudinaryUpload.single('avatar'),  uploadAvatar);
router.delete('/avatar', deleteAvatar);

router.put('/password', changePasswordValidation, changePassword);

module.exports = router;