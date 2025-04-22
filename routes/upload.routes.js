const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { uploadSingle, uploadMultiple } = require('../controllers/upload.controller');

// Single file upload route
router.post('/upload', upload.single('image'), uploadSingle);

// Multiple files upload route
router.post('/upload-multiple', upload.array('images', 5), uploadMultiple);

module.exports = router; 