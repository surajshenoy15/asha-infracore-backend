const express = require('express');
const multer = require('multer');
const { uploadProduct, getAllProducts, updateProduct, deleteProduct } = require('../controllers/products');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), uploadProduct);
router.get('/', getAllProducts);
router.put('/:id', upload.single('image'), updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
