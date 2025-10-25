const cloudinary = require('cloudinary').v2;

// load .env in non-production node environments
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (CLOUDINARY_URL) {
  // allow using a single CLOUDINARY_URL env var (recommended)
  cloudinary.config({ cloudinary_url: CLOUDINARY_URL });
} else if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
} else {
  // no credentials found — log warning (do not hardcode secrets here)
  console.warn('Cloudinary credentials not found in environment. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.');
}

module.exports = cloudinary;