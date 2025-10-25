const express = require('express');
const {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,   
  deleteCompany,
  bulkCreateCompanies
} = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
 
router
  .route('/')
  .post(createCompany)
  .get(getCompanies);

router
  .route('/:id')
  .get(getCompany)
  .patch(updateCompany)
  .delete(deleteCompany);

router.post('/bulk', bulkCreateCompanies);

module.exports = router;