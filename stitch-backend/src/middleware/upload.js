const multer = require("multer");
const path = require("path");

// Use memory storage to keep files in memory (Buffer)
// This avoids saving files locally to disk, allowing direct upload to ImageKit.
const storage = multer.memoryStorage();

// File filter to restrict uploads to common image formats
const fileFilter = (req, file, cb) => {
  const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);

  if (ALLOWED_MIMETYPES.has(file.mimetype.toLowerCase())) {
    return cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit size to 10MB per image
  fileFilter: fileFilter
});

module.exports = upload;
