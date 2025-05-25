const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Helper to generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Helper to capitalize names (first letter uppercase, rest lowercase)
const formatName = (str = '') => {
    return str
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        // Destructure and normalize inputs
        const {
            name,
            email,
            password,
            role,
            businessName,
            address,
            phone
        } = req.body;

        const normalizedEmail = email.toLowerCase();
        const formattedName = formatName(name);
        const formattedBusinessName = formatName(businessName);

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Create user
        const user = await User.create({
            name: formattedName,
            email: normalizedEmail,
            password,
            role,
            businessName: formattedBusinessName,
            address,
            phone
        });

        // Create token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.noorbakersandsweets.co.uk' : 'localhost',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        res.status(201).json({
            success: true,
            token,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase();

        // Check for user email
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie('token', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.noorbakersandsweets.co.uk' : 'localhost',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        res.json({
            success: true,
            token,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    res.cookie('token', '', {
        expires: new Date(0),
        domain: process.env.NODE_ENV === 'production' ? '.noorbakersandsweets.co.uk' : 'localhost',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
