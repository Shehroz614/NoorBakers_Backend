const nodemailer = require('nodemailer');

// Create transporter with IONOS SMTP configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Function to format form data into HTML
const formatFormDataToHTML = (formData) => {
    const fields = Object.entries(formData)
        .filter(([key]) => key !== 'cv') // Exclude CV from form fields
        .map(([key, value]) => `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${key.charAt(0).toUpperCase() + key.slice(1)}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${value}</td>
            </tr>
        `).join('');

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tbody>
                    ${fields}
                </tbody>
            </table>
        </div>
    `;
};

// Main email sending function
const sendFormSubmissionEmail = async (formData, cvFile) => {
    try {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_TO,
            subject: 'New Form Submission',
            html: formatFormDataToHTML(formData),
            attachments: cvFile ? [
                {
                    filename: cvFile.originalname,
                    content: cvFile.buffer
                }
            ] : []
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = {
    sendFormSubmissionEmail
}; 