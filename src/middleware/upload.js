const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

const uploadDir = path.join(process.cwd(), config.uploads.dir, 'profile-photos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: config.uploads.maxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPEG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
}).single('photo');

module.exports = { uploadProfilePhoto };
