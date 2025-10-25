 const express = require('express');
const nodemailer = require('nodemailer');
const SMTPConfig = require('../models/SMTPConfig');
const Company = require('../models/Company');
const Resume = require('../models/Resume');
const EmailTemplate = require('../models/EmailTemplate');
const EmailHistory = require('../models/EmailHistory');
const User = require('../models/User');
const TemplateDesign = require('../models/TemplateDesign');
const { protect } = require('../middleware/auth');
const fs = require('fs');

const router = express.Router();

router.use(protect);

// Replace the createTransporter function with this:
const createTransporter = async (userId) => {
  try { 
    // Try to get user's active SMTP configuration
    const userSMTPConfig = await SMTPConfig.findOne({ 
      userId: userId, 
      isActive: true 
    });

    if (userSMTPConfig && userSMTPConfig.testStatus === 'success') {
      // Use user's SMTP configuration
      return nodemailer.createTransport({
        host: userSMTPConfig.host,
        port: userSMTPConfig.port,
        secure: userSMTPConfig.secure,
        auth: {
          user: userSMTPConfig.username,
          pass: userSMTPConfig.password
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });
    } else {
      // Fallback to default system SMTP
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
  } catch (error) {
    // Fallback to default system SMTP
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
};

const customizeEmailContent = (template, company, user, customSubject, customMessage) => {
  let subject = customSubject ?? template?.subject ?? 'Job Application';
  let body = customMessage ?? template?.htmlContent ?? '';
  
  // Calculate dynamic dates
  const currentDate = new Date();
  const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Format dates
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate days since application (example: 3 days ago)
  const applicationDate = user.lastApplicationDate ?? currentDate;
  const daysSinceApplication = Math.floor((currentDate - new Date(applicationDate)) / (1000 * 60 * 60 * 24));
  
  // Replace placeholders with comprehensive data
  const placeholders = {
    // Company Information
    '{companyName}': company?.name ?? '',
    '{companyEmail}': company?.email ?? '',
    '{companyPhone}': company?.phone ?? '',
    '{companyWebsite}': company?.website ?? '',
    '{companyAddress}': company?.address ?? '',
    '{companySize}': company?.size ?? '',
    '{industry}': company?.industry ?? '',
    '{companyDescription}': company?.description ?? '',
    '{companyValues}': company?.values ?? '',
    
    // Job Information
    '{position}': company?.position ?? '',
    '{jobTitle}': company?.position ?? '', // alias for position
    '{jobType}': company?.jobType ?? '',
    '{jobLocation}': company?.location ?? '',
    '{remotePolicy}': company?.remotePolicy ?? '',
    '{salaryRange}': company?.salaryRange ?? '',
    '{experienceLevel}': company?.experienceLevel ?? '',
    '{applicationDeadline}': company?.deadline ? formatDate(new Date(company?.deadline)) : '',
    '{startDate}': company?.startDate ? formatDate(new Date(company?.startDate)) : '',
    '{jobDescription}': company?.jobDescription ?? '',
    '{keyResponsibilities}': company?.responsibilities ?? '',
    '{requiredSkills}': company?.requiredSkills ?? '',
    '{preferredSkills}': company?.preferredSkills ?? '',
    '{teamName}': company?.teamName ?? '',
    
    // Personal Information
    '{userName}': user?.name ?? '',
    '{userFirstName}': user?.name?.split(' ')[0] ?? user?.name ?? '',
    '{userLastName}': user?.name?.split(' ').slice(1).join(' ') ?? '',
    '{userEmail}': user?.email ?? '',
    '{userPhone}': user?.phone ?? '',
    '{userLocation}': user?.location ?? '',
    '{userWebsite}': user?.website ?? '',
    '{userLinkedIn}': user?.linkedin ?? '',
    '{userGitHub}': user?.github ?? '',
    '{userTitle}': user?.title ?? '',
    '{userExperience}': user?.experience ?? '',
    '{userEducation}': user?.education ?? '',
    '{userSkills}': user?.skills ?? '',
    '{userAchievements}': user?.achievements ?? '',
    
    // Contact Information
    '{contactPerson}': company?.contactPerson ?? 'Hiring Team',
    '{contactTitle}': company?.contactTitle ?? '',
    '{contactDepartment}': company?.contactDepartment ?? '',
    '{hiringManager}': company?.hiringManager ?? '',
    '{recruiterName}': company?.recruiterName ?? '',
    '{hrManager}': company?.hrManager ?? '',
    
    // Application Specific
    '{applicationDate}': formatDate(currentDate),
    '{applicationId}': company?.applicationId ?? '',
    '{jobReference}': company?.jobReference ?? '',
    '{source}': company?.source ?? '',
    '{referredBy}': company?.referredBy ?? '',
    
    // Company Culture & Benefits
    '{companyCulture}': company?.culture ?? '',
    '{companyMission}': company?.mission ?? '',
    '{companyBenefits}': company?.benefits ?? '',
    '{workEnvironment}': company?.workEnvironment ?? '',
    '{learningOpportunities}': company?.learningOpportunities ?? '',
    
    // Dynamic Content
    '{currentDate}': formatDate(currentDate),
    '{currentYear}': currentDate.getFullYear().toString(),
    '{daysSinceApplication}': daysSinceApplication.toString(),
    '{nextWeek}': formatDate(nextWeek),
    '{nextMonth}': formatDate(nextMonth),
    '{followUpNumber}': '1st', // This could be dynamic based on email history
    
    // Project Specific (if available)
    '{projectName}': company?.projectName ?? '',
    '{projectDescription}': company?.projectDescription ?? '',
    '{projectDuration}': company?.projectDuration ?? '',
    '{projectRole}': company?.projectRole ?? '',
    '{projectTechnologies}': company?.projectTechnologies ?? '',
    '{projectOutcome}': company?.projectOutcome ?? '',
    
    // Social Proof & Metrics
    '{metricImprovement}': user?.metricImprovement ?? '30%',
    '{achievementPercentage}': user?.achievementPercentage ?? '95%',
    '{projectBudget}': user?.projectBudget ?? '$50,000',
    '{teamSize}': user?.teamSize ?? '5',
    '{revenueImpact}': user?.revenueImpact ?? '$100,000',
    '{costSavings}': user?.costSavings ?? '$25,000',
    '{efficiencyGain}': user?.efficiencyGain ?? '40%',
    
    // Industry Specific
    '{certifications}': user?.certifications ?? '',
    '{toolsUsed}': user?.toolsUsed ?? '',
    '{methodologies}': user?.methodologies ?? '',
    '{complianceStandards}': user?.complianceStandards ?? '',
    
    // Personalization
    '{personalConnection}': company?.personalConnection ?? '',
    '{sharedConnection}': company?.sharedConnection ?? '',
    '{companyNews}': company?.recentNews ?? '',
    '{productUsed}': company?.productUsed ?? '',
    '{serviceAppreciated}': company?.serviceAppreciated ?? '',
    
    // Customizable Sections
    '{customSection1}': company?.customSection1 ?? '',
    '{customSection2}': company?.customSection2 ?? '',
    '{customSection3}': company?.customSection3 ?? '',
    '{customAchievement}': user.customAchievement ?? '',
    '{customSkill}': user.customSkill ?? '',
    
    // Email Specific
    '{emailSubject}': subject,
    '{emailOpening}': 'Dear ' + (company?.contactPerson || 'Hiring Team'),
    '{emailClosing}': 'Best regards',
    '{callToAction}': 'Looking forward to hearing from you'
  };
  
  // Replace all placeholders in subject and body
  Object.keys(placeholders).forEach(placeholder => {
    const regex = new RegExp(placeholder, 'g');
    subject = subject.replace(regex, placeholders[placeholder]);
    body = body.replace(regex, placeholders[placeholder]);
  });
  
  return { subject, body };
};
// Send bulk emails
router.post('/send-bulk', async (req, res, next) => {
  try {
    const { companyIds, resumeId, templateId, customSubject, customMessage } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please select at least one company'
      });
    }

    // if (!resumeId) {
    //   return res.status(400).json({
    //     status: 'fail',
    //     message: 'Please select a resume'
    //   });
    // }

    // Validate number of emails
    if (companyIds.length > 50) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot send more than 50 emails at once'
      });
    }

    // Fetch required data
    const [companies, resume, template, user] = await Promise.all([
      Company.find({ _id: { $in: companyIds }, userId: req.user.id }),
      resumeId ? Resume.findById(resumeId) : Promise.resolve(null),
      templateId ? TemplateDesign.findById(templateId) : Promise.resolve(null),
      User.findById(req.user.id)
    ]);

    // if (!resume) {
    //   return res.status(404).json({
    //     status: 'fail',
    //     message: 'Resume not found'
    //   });
    // }

    if (companies.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No companies found'
      });
    }

    // Check if resume file exists

    if (resume && !fs.existsSync(resume?.filePath)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume file not found on server'
      });
    }

    const transporter = await createTransporter(req.user.id);
    
    // Update the from address in mailOptions to use user's SMTP config
    const userSMTPConfig = await SMTPConfig.findOne({ 
      userId: req.user.id, 
      isActive: true,
      testStatus: 'success'
    });

    const fromAddress = userSMTPConfig ? {
      name: userSMTPConfig.fromName,
      address: userSMTPConfig.fromEmail
    } : {
      name: user.name,
      address: process.env.EMAIL_USERNAME
    };



    //const transporter = createTransporter();
    const emailResults = [];
    let sentCount = 0;
    let failedCount = 0;
    
    // Send emails with delay to avoid rate limiting
    for (const company of companies) {
      try {
        const emailContent = customizeEmailContent(
          template,
          company,
          user,
          customSubject,
          customMessage
        );

        const mailOptions = {
          from: fromAddress,
          to: company.email,
          subject: emailContent.subject,
          html:customMessage? emailContent.body.replace(/\n/g, '<br>'):emailContent.body,
          attachments: [{
            filename: resume?.originalName,
            path: resume?.filePath
          }]
        };
        if( resume == null){
          delete mailOptions.attachments;
        }
        

      const mailSent = await transporter.sendMail(mailOptions);
        console.log(mailSent);
      
        // Save to email history
        await EmailHistory.create({
          userId: req.user.id,
          companyId: company._id,
          resumeId: resume._id,
          templateId: template?._id,
          status: 'sent',
          email: company.email,
          companyName: company.name,
          position: company.position
        });
        
        sentCount++;
        emailResults.push({
          company: company.name,
          email: company.email,
          status: 'success'
        });
        
        // Delay between emails (2 seconds) to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Failed to send email to ${company.email}:`, error);
        
        failedCount++;
        
        // Save failed attempt to history
        await EmailHistory.create({
          userId: req.user.id,
          companyId: company._id,
          resumeId: resume._id,
          templateId: template?._id,
          status: 'failed',
          errorMessage: error.message,
          email: company.email,
          companyName: company.name,
          position: company.position
        });
        
        emailResults.push({
          company: company.name,
          email: company.email,
          status: 'failed',
          error: error.message
        });
      }
    }

   return res.status(200).json({
      status: 'success',
      data: {
        message: `Emails sent successfully`,
        sentCount,
        failedCount,
        total: companies.length,
        results: emailResults
      }
    });

  } catch (error) {
    next(error);
  }
});

// // Send test email
router.post('/send-test', async (req, res, next) => {
  try {
    const { email, resumeId, templateId, customSubject, customMessage } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a test email address'
      });
    }

    if (!resumeId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please select a resume'
      });
    }

    const [resume, template, user] = await Promise.all([
      Resume.findById(resumeId),
      templateId ? EmailTemplate.findById(templateId) : Promise.resolve(null),
      User.findById(req.user.id)
    ]);

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    // Check if resume file exists
    if (!fs.existsSync(resume.filePath)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume file not found on server'
      });
    }

    // const transporter = createTransporter();
     const transporter = await createTransporter(req.user.id);
    
    const userSMTPConfig = await SMTPConfig.findOne({ 
      userId: req.user.id, 
      isActive: true,
      testStatus: 'success'
    });

    const fromAddress = userSMTPConfig ? {
      name: userSMTPConfig.fromName,
      address: userSMTPConfig.fromEmail
    } : {
      name: user.name,
      address: process.env.EMAIL_USERNAME
    };

    
    const testCompany = {
      name: 'Test Company',
      position: 'Test Position',
      industry: 'Technology',
      contactPerson: 'Test Hiring Manager'
    };

    const emailContent = customizeEmailContent(
      template,
      testCompany,
      user,
      customSubject,
      customMessage
    );

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: `[TEST] ${emailContent.subject}`,
      html: emailContent.body.replace(/\n/g, '<br>'),
      attachments: [{
        filename: resume.originalName,
        path: resume.filePath
      }]
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Test email sent successfully'
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get email history
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, dateFrom, dateTo } = req.query;
    
    let query = { userId: req.user.id };
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    // Add date range filter
    if (dateFrom ?? dateTo) {
      query.sentAt = {};
      if (dateFrom) query.sentAt.$gte = new Date(dateFrom);
      if (dateTo) query.sentAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const history = await EmailHistory.find(query)
      .populate('companyId', 'name email position industry')
      .populate('resumeId', 'filename originalName')
      .populate('templateId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ sentAt: -1 });
    
    const total = await EmailHistory.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalHistory: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get email statistics
router.get('/statistics', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const statistics = await EmailHistory.aggregate([
      {
        $match: {
          userId: req.user.id,
          sentAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalSent = statistics.find(stat => stat._id === 'sent')?.count ?? 0;
    const totalFailed = statistics.find(stat => stat._id === 'failed')?.count ?? 0;
    const totalEmails = totalSent + totalFailed;
    
    // Get daily statistics for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyStats = await EmailHistory.aggregate([
      {
        $match: {
          userId: req.user.id,
          sentAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$sentAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalEmails,
          totalSent,
          totalFailed,
          successRate: totalEmails > 0 ? (totalSent / totalEmails * 100).toFixed(2) : 0
        },
        dailyStats
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single email history item
router.get('/history/:id', async (req, res, next) => {
  try {
    const history = await EmailHistory.findOne({
      _id: req.params.id,
      userId: req.user.id
    })
    .populate('companyId', 'name email position industry contactPerson website')
    .populate('resumeId', 'filename originalName fileSize')
    .populate('templateId', 'name subject body');

    if (!history) {
      return res.status(404).json({
        status: 'fail',
        message: 'Email history not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        history
      }
    });
  } catch (error) {
    next(error);
  }
});

// Resend failed email
router.post('/history/:id/resend', async (req, res, next) => {
  try {
    const history = await EmailHistory.findOne({
      _id: req.params.id,
      userId: req.user.id,
      status: 'failed'
    })
    .populate('companyId')
    .populate('resumeId')
    .populate('templateId')
    .populate('userId');

    if (!history) {
      return res.status(404).json({
        status: 'fail',
        message: 'Failed email not found for resending'
      });
    }

    const transporter = createTransporter();
    
    const emailContent = customizeEmailContent(
      history.templateId,
      history.companyId,
      history.userId,
      history.templateId?.subject,
      history.templateId?.body
    );

    const mailOptions = {
      from: {
        name: history.userId.name,
        address: process.env.EMAIL_USERNAME
      },
      to: history.email,
      subject: emailContent.subject,
      html: emailContent.body.replace(/\n/g, '<br>'),
      attachments: [{
        filename: history.resumeId.originalName,
        path: history.resumeId.filePath
      }]
    };

    await transporter.sendMail(mailOptions);
    
    // Update history record
    await EmailHistory.findByIdAndUpdate(history._id, {
      status: 'sent',
      errorMessage: null,
      sentAt: new Date()
    });

    res.status(200).json({
      status: 'success',
      data: {
        message: 'Email resent successfully'
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;