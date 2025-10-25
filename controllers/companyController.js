const Company = require('../models/Company');

exports.createCompany = async (req, res, next) => {
  try {
    const company = await Company.create({
      userId: req.user.id,
      ...req.body
    });

    res.status(201).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search = '' } = req.query;
    
    const query = { 
      userId: req.user.id,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } }
      ]
    };
    
    const companies = await Company.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Company.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      results: companies.length,
      data: {
        companies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCompanies: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Company not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Company not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Company not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkCreateCompanies = async (req, res, next) => {
  try {
    const { companies } = req.body;
    
    const companiesWithUserId = companies.map(company => ({
      ...company,
      userId: req.user.id
    }));

    const createdCompanies = await Company.insertMany(companiesWithUserId, {
      ordered: false
    });

    res.status(201).json({
      status: 'success',
      results: createdCompanies.length,
      data: {
        companies: createdCompanies
      }
    });
  } catch (error) {
    next(error);
  }
};