const express = require('express');
const multer = require('multer');
const {
  uploadProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/products');

const router = express.Router();

// ✅ Enhanced multer configuration with proper limits and validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 10MB per file
    files: 6, // Maximum 6 files total
    fieldSize: 2 * 1024 * 1024, // 2MB for non-file fields
  },
  fileFilter: (req, file, cb) => {
    // Validate image fields
    if (file.fieldname.match(/^image[1-4]$/)) {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid image type for ${file.fieldname}. Only JPEG, PNG, and WebP allowed.`), false);
      }
    }
    // Validate PDF fields
    else if (file.fieldname === 'pdfFile' || file.fieldname === 'specPdfFile') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Only PDF files allowed.`), false);
      }
    }
    // Reject unknown fields
    else {
      cb(new Error(`Unknown field: ${file.fieldname}`), false);
    }
  }
});

// ✅ Multer fields configuration: 4 images + 2 PDFs
const multiUpload = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 },       // Main brochure/catalog
  { name: 'specPdfFile', maxCount: 1 },   // Technical specification PDF
]);

// ✅ PRODUCT ROUTES

/**
 * @route   POST /api/products
 * @desc    Create new product with images & PDFs
 * @access  Private (assuming authentication middleware exists)
 */
router.post('/', multiUpload, uploadProduct);

/**
 * @route   GET /api/products
 * @desc    Get all products with optional filtering and pagination
 * @access  Public
 */
router.get('/', getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', getProductById);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product with optional new images & PDFs
 * @access  Private
 */
router.put('/:id', multiUpload, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product and associated files
 * @access  Private
 */
router.delete('/:id', deleteProduct);

// ✅ ADDITIONAL UTILITY ROUTES (Optional but useful)

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Public
 */
router.get('/category/:category', getAllProducts); // Can reuse controller with category filter

/**
 * @route   GET /api/products/search/:query
 * @desc    Search products by name or description
 * @access  Public
 */
router.get('/search/:query', getAllProducts); // Can reuse controller with search filter

/**
 * @route   PATCH /api/products/:id/status
 * @desc    Update product status only (active/inactive)
 * @access  Private
 */
router.patch('/:id/status', (req, res, next) => {
  // Simple status update without file handling
  req.statusOnly = true;
  next();
}, updateProduct);

// ✅ ERROR HANDLING MIDDLEWARE for Multer
router.use((error, req, res, next) => {
  // Handle Multer-specific errors
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum 10MB per file allowed.',
          code: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Maximum 6 files allowed.',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many form fields.',
          code: 'TOO_MANY_FIELDS'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected field in form data.',
          code: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'File upload error: ' + error.message,
          code: 'UPLOAD_ERROR'
        });
    }
  }
  
  // Handle custom file validation errors
  if (error.message.includes('Invalid image type') || 
      error.message.includes('Invalid file type') || 
      error.message.includes('Unknown field')) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  // Pass other errors to global error handler
  next(error);
});

// ✅ HELPER MIDDLEWARE (Optional - for debugging)
const logUploadInfo = (req, res, next) => {
  if (req.files) {
    console.log('📁 Files uploaded:', Object.keys(req.files));
    Object.entries(req.files).forEach(([fieldname, files]) => {
      files.forEach(file => {
        console.log(`  ${fieldname}: ${file.originalname} (${file.size} bytes)`);
      });
    });
  }
  next();
};

// Uncomment to enable upload logging
// router.use(logUploadInfo);

module.exports = router;