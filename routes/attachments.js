const express = require('express');
const multer = require('multer');
const {
  uploadAttachment,
  getAllAttachments,
  updateAttachment,
  deleteAttachment,
} = require('../controllers/attachments');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('image'), uploadAttachment);
router.get('/', getAllAttachments);
router.put('/:id', upload.single('image'), updateAttachment);
router.delete('/:id', deleteAttachment);

module.exports = router;
