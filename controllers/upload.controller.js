// @desc    Upload single file
// @route   POST /api/upload/upload
// @access  Private
exports.uploadSingle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the file path
        res.status(200).json({
            message: 'File uploaded successfully',
            filePath: req.file.path
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload multiple files
// @route   POST /api/upload/upload-multiple
// @access  Private
exports.uploadMultiple = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Return the file paths
        const filePaths = req.files.map(file => file.path);
        res.status(200).json({
            message: 'Files uploaded successfully',
            filePaths: filePaths
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 