// @desc    Upload single file
// @route   POST /api/upload/upload
// @access  Private
exports.uploadSingle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        console.log(req.file);
        // Return the file path
        res.status(200).json({
            message: 'File uploaded successfully',
            filePath: req.file.path,
            fileName: req.file.filename,
            fileSize: req.file.size,
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
        const files = req.files.map(file => { return { filePath: file.path, fileName: file.filename, fileSize: file.size } });

        res.status(200).json({
            message: 'Files uploaded successfully',
            files: files
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 