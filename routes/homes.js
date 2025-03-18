const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const Home = require('../models/Home');
const User = require('../models/User');

// Mock data for development
const mockHome = {
  _id: 'mock-home-id',
  name: 'Mock Home',
  homeId: 'MOCK123',
  members: [
    {
      name: 'Test User',
      email: 'test@example.com',
      uid: 'test-user-id'
    }
  ],
  createdBy: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Helper function to handle database errors
const handleDbOperation = async (operation, mockResponse) => {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation error:', error);
    if (global.useMockData) {
      return mockResponse;
    }
    throw error;
  }
};

// Create a new home
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('Creating new home with data:', req.body);
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Home name is required' });
    }
    
    const userId = req.user.uid;
    console.log('User ID:', userId);
    
    // Generate a unique 6-character home ID
    const homeId = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Generated home ID:', homeId);
    
    // If we're using mock data, return a mock home
    if (global.useMockData) {
      console.log('Using mock data for home creation');
      const mockHomeWithName = { 
        ...mockHome, 
        name,
        homeId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(201).json({ home: mockHomeWithName });
    }
    
    // Otherwise, try to create a real home in the database
    try {
      // Try to find user in database
      const user = await User.findOne({ uid: userId });
      console.log('Found user:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('User not found in database, creating user automatically');
        
        // Create user automatically with available data
        const newUser = new User({
          uid: userId,
          name: req.user.name || 'New User',
          email: req.user.email || `user-${userId}@example.com`,
          homes: []
        });
        
        await newUser.save();
        console.log('Created user automatically:', newUser._id);
        
        // Create new home in database
        console.log('Creating home in database');
        const newHome = new Home({
          name,
          homeId,
          members: [
            {
              name: newUser.name,
              email: newUser.email,
              uid: userId
            }
          ],
          createdBy: userId
        });
        
        await newHome.save();
        console.log('Home saved to database:', newHome._id);
        
        // Add home to user's homes array
        newUser.homes.push(newHome._id);
        await newUser.save();
        console.log('Home added to user');
        
        return res.status(201).json({ home: newHome });
      }
      
      // Create new home in database
      console.log('Creating home in database');
      const newHome = new Home({
        name,
        homeId,
        members: [
          {
            name: user.name,
            email: user.email,
            uid: userId
          }
        ],
        createdBy: userId
      });
      
      await newHome.save();
      console.log('Home saved to database:', newHome._id);
      
      // Add home to user's homes array
      user.homes.push(newHome._id);
      await user.save();
      console.log('Home added to user');
      
      return res.status(201).json({ home: newHome });
    } catch (error) {
      console.error('Error creating home in database:', error);
      
      // Try simulating a successful response to continue app flow
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV MODE: Returning mock home despite database error');
        const mockHomeWithName = { 
          _id: 'mock-home-id-' + Date.now(),
          name,
          homeId,
          members: [
            {
              name: req.user.name || 'Dev User',
              email: req.user.email || 'dev@example.com',
              uid: userId
            }
          ],
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return res.status(201).json({ home: mockHomeWithName });
      }
      
      return res.status(500).json({ message: 'Error creating home', details: error.message });
    }
  } catch (error) {
    console.error('Create home error:', error);
    return res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Get user's homes
router.get('/user/homes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    console.log(`Getting homes for user: ${userId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for user homes');
      return res.status(200).json({ homes: [mockHome] });
    }
    
    try {
      // Find user first to ensure they exist
      const user = await User.findOne({ uid: userId });
      
      if (!user) {
        console.log(`User ${userId} not found in database when retrieving homes`);
        
        if (process.env.NODE_ENV === 'development') {
          // Return mock home in development mode to allow testing
          console.log('DEV MODE: Returning mock home for non-existent user');
          return res.status(200).json({ homes: [mockHome] });
        }
        
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Find homes where user is a member - using aggregation for more reliability
      const homes = await Home.find({ 'members.uid': userId });
      console.log(`Found ${homes.length} homes for user ${userId}`);
      
      // If no homes found but we know user exists, return empty array
      if (!homes || homes.length === 0) {
        console.log(`No homes found for user ${userId}`);
        return res.status(200).json({ homes: [] });
      }
      
      res.status(200).json({ homes });
    } catch (dbError) {
      console.error('Database error retrieving homes:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Return mock data in development to allow testing
        console.log('DEV MODE: Returning mock home due to database error');
        return res.status(200).json({ homes: [mockHome] });
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Get user homes error:', error);
    res.status(500).json({ 
      message: 'Error retrieving homes', 
      details: error.message 
    });
  }
});

// Join a home
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { homeId } = req.body;
    const userId = req.user.uid;
    
    console.log(`User ${userId} joining home with ID: ${homeId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for joining home');
      return res.status(200).json({ home: mockHome });
    }
    
    // Find the home
    const home = await Home.findOne({ homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found' });
    }
    
    // Find the user
    const user = await User.findOne({ uid: userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already a member
    const isMember = home.members.some(member => member.uid === userId);
    
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member of this home' });
    }
    
    // Add user to home members
    home.members.push({
      name: user.name,
      email: user.email,
      uid: userId
    });
    
    await home.save();
    
    // Add home to user's homes
    user.homes.push(home._id);
    await user.save();
    
    res.status(200).json({ home });
  } catch (error) {
    console.error('Join home error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get home by ID
router.get('/:homeId', verifyToken, async (req, res) => {
  try {
    const homeId = req.params.homeId;
    console.log(`Getting home with ID: ${homeId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for home retrieval');
      return res.status(200).json({ home: mockHome });
    }
    
    try {
      // Validate homeId
      if (!homeId || homeId === 'undefined' || homeId === 'null') {
        console.error('Invalid homeId provided:', homeId);
        return res.status(400).json({ message: 'Invalid home ID' });
      }
      
      const home = await Home.findOne({ homeId });
      
      if (!home) {
        console.log(`Home with ID ${homeId} not found`);
        
        if (process.env.NODE_ENV === 'development') {
          // Return mock home in development mode
          console.log('DEV MODE: Returning mock home for non-existent home ID');
          const customMockHome = {
            ...mockHome,
            homeId: homeId,
            name: `Mock Home (${homeId})`
          };
          return res.status(200).json({ home: customMockHome });
        }
        
        return res.status(404).json({ message: 'Home not found' });
      }
      
      console.log(`Found home: ${home.name} with ID ${homeId}`);
      res.status(200).json({ home });
    } catch (dbError) {
      console.error('Database error retrieving home:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Create a custom mock home with the requested ID
        console.log('DEV MODE: Returning mock home due to database error');
        const customMockHome = {
          ...mockHome,
          homeId: homeId,
          name: `Mock Home (${homeId})`
        };
        return res.status(200).json({ home: customMockHome });
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Get home error:', error);
    res.status(500).json({ 
      message: 'Error retrieving home', 
      details: error.message 
    });
  }
});

// Get home members
router.get('/:homeId/members', verifyToken, async (req, res) => {
  try {
    const homeId = req.params.homeId;
    console.log(`Getting members for home: ${homeId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for home members');
      return res.status(200).json({ members: mockHome.members });
    }
    
    const home = await Home.findOne({ homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found' });
    }
    
    res.status(200).json({ members: home.members });
  } catch (error) {
    console.error('Get home members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a member to a home
router.post('/add-member', verifyToken, async (req, res) => {
  try {
    const { homeId, member } = req.body;
    const userId = req.user.uid;
    
    console.log(`User ${userId} adding member to home ${homeId}:`, member);
    
    if (!homeId || !member || !member.name || !member.email) {
      return res.status(400).json({ 
        message: 'Invalid request. Home ID, member name, and email are required' 
      });
    }
    
    if (global.useMockData) {
      console.log('Using mock data for adding member to home');
      return res.status(200).json({ 
        success: true,
        message: 'Member added successfully',
        member: {
          ...member,
          addedAt: new Date()
        }
      });
    }
    
    // Find the home
    const home = await Home.findOne({ homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found' });
    }
    
    // Check if user is a member of the home (optional security check)
    const requestingUserIsMember = home.members.some(m => m.uid === userId);
    
    if (!requestingUserIsMember) {
      return res.status(403).json({ 
        message: 'You must be a member of the home to add other members' 
      });
    }
    
    // Check if the email is already registered
    const existingMember = home.members.find(m => m.email === member.email);
    
    if (existingMember) {
      return res.status(400).json({ 
        message: 'A member with this email already exists in this home' 
      });
    }
    
    // Check if there's a user with this email
    const existingUser = await User.findOne({ email: member.email });
    
    if (existingUser) {
      // If user exists, add the home to their homes list
      const memberData = {
        name: member.name,
        email: member.email,
        uid: existingUser.uid
      };
      
      // Add member to home
      home.members.push(memberData);
      await home.save();
      
      // Add home to user's homes array if not already there
      if (!existingUser.homes.includes(home._id)) {
        existingUser.homes.push(home._id);
        await existingUser.save();
      }
      
      return res.status(200).json({
        success: true,
        message: 'Member added successfully',
        member: memberData
      });
    } else {
      // If user doesn't exist yet, just add them to the home
      // They'll be properly connected when they sign up
      const memberData = {
        name: member.name,
        email: member.email,
        // No UID yet, will be linked when user registers
        invitedBy: userId,
        invitedAt: new Date()
      };
      
      // Add member to home
      home.members.push(memberData);
      await home.save();
      
      return res.status(200).json({
        success: true,
        message: 'Member invited successfully',
        member: memberData
      });
    }
  } catch (error) {
    console.error('Add home member error:', error);
    res.status(500).json({ 
      message: 'Server error adding member', 
      details: error.message 
    });
  }
});

module.exports = router;