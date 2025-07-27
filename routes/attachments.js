const express = require('express');
const multer = require('multer');

const {
  uploadAttachment,
  getAllAttachments,
  getAttachmentById,
  updateAttachment,
  deleteAttachment,
} = require('../controllers/attachments');

const router = express.Router();

// ✅ File filter to restrict uploads to only images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image or PDF type'), false);
  }
};

// ✅ Multer setup with memory storage and limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// ✅ Debug middleware for logging request details
const debugMiddleware = (req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  console.log('📝 Body:', req.body);
  if (req.files) {
    const fileSummary = Object.entries(req.files).reduce((acc, [key, files]) => {
      acc[key] = `${files.length} file(s)`;
      return acc;
    }, {});
    console.log('📁 Files:', fileSummary);
  } else {
    console.log('📁 Files: No files');
  }
  console.log('🆔 Params:', req.params);
  next();
};

router.use(debugMiddleware);

// ✅ ATTACHMENT ROUTES
router.post(
  '/',
  upload.fields([{ name: 'image', maxCount: 1 }]),
  uploadAttachment
);

router.get('/', getAllAttachments);
router.get('/:id', getAttachmentById);

router.put(
  '/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
    { name: 'specPdfFile', maxCount: 1 },
  ]),
  updateAttachment
);

router.delete('/:id', deleteAttachment);

// ✅ Legacy fallback route (optional)
router.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 },
    { name: 'specPdfFile', maxCount: 1 },
  ]),
  uploadAttachment
);

// ✅ Error handler
router.use((error, req, res, next) => {
  console.error('🚨 Route Error:', error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: `Upload error: ${error.message}`,
      code: error.code
    });
  }

  if (error.message.includes('Invalid image') || error.message.includes('Invalid image or PDF type')) {
    return res.status(400).json({
      error: error.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

module.exports = router;
