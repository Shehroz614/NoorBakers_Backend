const { sendFormSubmissionEmail } = require('../utils/emailService');

const sendEmailOnFormSubmission = async (req, res) => {
    try {
        // Get form data and CV file from request
        const formData = req.body;
        const cvFile = req.file; // Assuming you're using multer for file upload

        // Validate required fields
        const requiredFields = ['fullName', 'email', 'phone']; // Add any other required fields
        for (const field of requiredFields) {
            if (!formData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `${field} is required`
                });
            }
        }

        // Send email
        const emailResult = await sendFormSubmissionEmail(formData, cvFile);

        return res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            messageId: emailResult.messageId
        });

    } catch (error) {
        console.error('Form submission error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process form submission',
            error: error.message
        });
    }
};

module.exports = {
    sendEmailOnFormSubmission
}; 