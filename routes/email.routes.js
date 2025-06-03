const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendEmailOnFormSubmission } = require('../controllers/email.controller');

// Configure multer for CV file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only PDF and DOC/DOCX files
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and DOC/DOCX files are allowed!'), false);
        }
    }
});

// Route for form submission with CV upload
router.post('/send-form', upload.single('cv'), sendEmailOnFormSubmission);

module.exports = router; 