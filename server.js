const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));
console.log(process.env.FRONTEND_URL);

app.use(cors({
   
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));
 app.use(express.urlencoded({ extended: true, limit: '2mb' }));
// app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many emails sent, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/emails/send-bulk', emailLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/smtp', require('./routes/smtp'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/template-designs', require('./routes/templateDesigns'));
app.use('/api/user', require('./routes/userRoutes'));

// Serve static files from React build in production

// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(path.resolve(), '../dist')));
  
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(path.resolve(), '../dist/index.html'));
//   });
// }

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Backend API is running!', 
    timestamp: new Date().toISOString() 
  });
});
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// Handle unhandled routes
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
