const express = require('express');
const multer = require('multer');
const router = express.Router();
const { uploadProduct, getAllProducts } = require('../controllers/products');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), uploadProduct);
router.get('/', getAllProducts);

module.exports = router;
