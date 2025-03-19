const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase');
const User = require('../models/User');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ message: 'No token provided' });
    }
    
    try {
      // Verify the token with Firebase
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Token verified successfully for user:', decodedToken.email || decodedToken.uid);
      
      // Ensure we have valid user data in the token
      if (!decodedToken.uid) {
        console.error('Token is missing user ID');
        return res.status(401).json({ message: 'Invalid token - missing user ID' });
      }
      
      req.user = decodedToken;
      next();
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError.message);
      return res.status(401).json({ message: 'Invalid token: ' + firebaseError.message });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { uid, name, email } = req.body;
    console.log('Registration attempt for:', { uid, name, email });
    
    // Validate required fields
    if (!uid || !name || !email) {
      console.log('Missing required fields:', { uid, name, email });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ uid });
    if (user) {
      console.log('User already exists in database:', user);
      return res.status(200).json({ user });
    }
    
    // Create new user 
    user = new User({
      uid: uid,
      name: name,
      email: email,
      homes: []
    });
    
    console.log('Saving new user to database:', { uid, name, email });
    const savedUser = await user.save();
    console.log('New user created successfully. ID:', savedUser._id);
    res.status(201).json({ user: savedUser });
  } catch (error) {
    console.error('Registration error details:', error);
    
    if (error.code === 11000) {
      // Duplicate key error - most likely email
      console.error('Duplicate key error. Keys:', error.keyValue);
      return res.status(400).json({ 
        message: 'User with this email already exists',
        details: error.keyValue
      });
    }
    
    if (error.name === 'ValidationError') {
      // Mongoose validation error
      console.error('Validation error:', error.message);
      return res.status(400).json({ 
        message: 'Validation error',
        details: error.errors
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Server error during registration',
      details: error.message
    });
  }
});

// Get user data
router.get('/user', verifyToken, async (req, res) => {
  try {
    console.log('Fetching user data for:', req.user.uid);
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      console.log('User not found:', req.user.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('User data found:', user);
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Update user's UPI ID
router.put('/user/upi', verifyToken, async (req, res) => {
  try {
    const { upiId } = req.body;
    console.log(`Updating UPI ID for user ${req.user.uid} to: ${upiId}`);
    
    if (!upiId) {
      return res.status(400).json({ message: 'UPI ID is required' });
    }
    
    // Validate UPI ID format (basic validation)
    const upiRegex = /^[\w\.\-]+@[\w\.\-]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({ message: 'Invalid UPI ID format' });
    }
    
    // Find and update the user
    const user = await User.findOneAndUpdate(
      { uid: req.user.uid },
      { upiId: upiId },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('UPI ID updated successfully for user:', user.uid);
    res.status(200).json({ user });
  } catch (error) {
    console.error('Update UPI ID error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Export both the router and verifyToken middleware
module.exports = { router, verifyToken };