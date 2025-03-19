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
router.post('/create', verifyToken, async (req, res) => {
  try {
    console.log('Creating new home with data:', req.body);
    const { name, members = [] } = req.body;
    
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
      
      return res.status(201).json({ 
        home: mockHomeWithName,
        homeId: mockHomeWithName.homeId
      });
    }
    
    // Otherwise, try to create a real home in the database
    try {
      // Try to find user in database
      let user = await User.findOne({ uid: userId });
      console.log('Found user:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('User not found in database, creating user automatically');
        
        // Create user automatically with available data
        const newUser = new User({
          uid: userId,
          name: req.user.name || 'New User',
          email: req.user.email || '',
          homes: []
        });
        
        await newUser.save();
        console.log('New user created with ID:', newUser._id);
        
        // Use the newly created user
        user = newUser;
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
      
      // Add additional members if provided
      if (members && members.length > 0) {
        console.log(`Adding ${members.length} additional members`);
        members.forEach(member => {
          // Don't add duplicates
          if (member.email !== user.email) {
            newHome.members.push({
              name: member.name,
              email: member.email,
              uid: '' // Will be filled when they register
            });
          }
        });
      }
      
      await newHome.save();
      console.log('Home saved to database:', newHome._id);
      
      // Add home to user's homes array if not already there
      if (!user.homes.includes(newHome._id)) {
        user.homes.push(newHome._id);
        await user.save();
        console.log('Home added to user');
      }
      
      return res.status(201).json({ 
        home: newHome,
        homeId: newHome.homeId
      });
      
    } catch (dbError) {
      console.error('Database error creating home:', dbError);
      return res.status(500).json({ 
        message: 'Error creating home in database', 
        details: dbError.message 
      });
    }
  } catch (error) {
    console.error('Create home error:', error);
    res.status(500).json({ 
      message: 'Error creating home', 
      details: error.message 
    });
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
      return res.status(200).json({ 
        home: mockHome,
        homeId: mockHome.homeId
      });
    }
    
    // Find the home
    const home = await Home.findOne({ homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found with the provided ID' });
    }
    
    // Find the user or create if not found
    let user = await User.findOne({ uid: userId });
    
    if (!user) {
      console.log('User not found in database, creating user automatically');
      // Create user automatically with available data
      user = new User({
        uid: userId,
        name: req.user.name || 'New User',
        email: req.user.email || '',
        homes: []
      });
      await user.save();
      console.log('Created new user for join:', user._id);
    }
    
    // Check if user is already a member
    const isMember = home.members.some(member => member.uid === userId);
    
    if (isMember) {
      return res.status(200).json({ 
        message: 'You are already a member of this home',
        home: home,
        homeId: home.homeId 
      });
    }
    
    // Add user to home members
    home.members.push({
      name: user.name,
      email: user.email,
      uid: userId
    });
    
    await home.save();
    
    // Add home to user's homes if not already there
    if (!user.homes.includes(home._id)) {
      user.homes.push(home._id);
      await user.save();
    }
    
    res.status(200).json({ 
      home: home,
      homeId: home.homeId
    });
    
  } catch (error) {
    console.error('Join home error:', error);
    res.status(500).json({ 
      message: 'Error joining home', 
      details: error.message 
    });
  }
});

// Get a single home by ID
router.get('/:homeId', verifyToken, async (req, res) => {
  try {
    const { homeId } = req.params;
    const userId = req.user.uid;
    
    console.log(`Getting home ${homeId} for user ${userId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for getting home by ID');
      // Add isCreator flag to mock data
      return res.status(200).json({ 
        home: {
          ...mockHome,
          isCreator: mockHome.createdBy === userId
        } 
      });
    }
    
    try {
      // Find home by homeId (string) field, not by _id (ObjectId)
      const home = await Home.findOne({ homeId: homeId });
      
      if (!home) {
        return res.status(404).json({ message: 'Home not found' });
      }
      
      // Check if user is a member of the home
      const isMember = home.members.some(member => member.uid === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this home' });
      }
      
      // Add flag to indicate if the user is the creator
      const homeData = home.toObject();
      homeData.isCreator = home.createdBy === userId;
      
      res.status(200).json({ home: homeData });
    } catch (dbError) {
      console.error('Database error getting home:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Return mock data in development mode
        console.log('DEV MODE: Returning mock home due to database error');
        return res.status(200).json({ 
          home: {
            ...mockHome,
            isCreator: mockHome.createdBy === userId
          } 
        });
      }
      
      throw dbError;
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
    const { homeId } = req.params;
    const userId = req.user.uid;
    
    console.log(`Getting members for home ${homeId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for home members');
      return res.status(200).json({ 
        members: [
          {
            userId: 'mock-user-1',
            name: 'Mock User 1',
            email: 'user1@example.com',
            isCreator: true
          },
          {
            userId: 'mock-user-2',
            name: 'Mock User 2',
            email: 'user2@example.com',
            isCreator: false
          }
        ] 
      });
    }
    
    try {
      // Find home by homeId (string) field, not by _id (ObjectId)
      const home = await Home.findOne({ homeId: homeId });
      
      if (!home) {
        return res.status(404).json({ message: 'Home not found' });
      }
      
      // Check if user is a member of the home
      const isMember = home.members.some(member => member.uid === userId);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this home' });
      }
      
      // Format members data
      const members = home.members.map(member => ({
        userId: member.uid,
        name: member.name,
        email: member.email,
        isCreator: home.createdBy === member.uid
      }));
      
      res.status(200).json({ members });
    } catch (dbError) {
      console.error('Database error getting home members:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Return mock data in development mode
        console.log('DEV MODE: Returning mock members due to database error');
        return res.status(200).json({ 
          members: [
            {
              userId: 'mock-user-1',
              name: 'Mock User 1',
              email: 'user1@example.com',
              isCreator: true
            },
            {
              userId: 'mock-user-2',
              name: 'Mock User 2',
              email: 'user2@example.com',
              isCreator: false
            }
          ] 
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Get home members error:', error);
    res.status(500).json({ 
      message: 'Error retrieving home members', 
      details: error.message 
    });
  }
});

// Add member to home
router.post('/add-member', verifyToken, async (req, res) => {
  try {
    const { homeId, member } = req.body;
    const userId = req.user.uid;
    
    console.log(`User ${userId} adding member to home ${homeId}:`, member);
    
    if (!homeId || !member || !member.email) {
      return res.status(400).json({ message: 'Home ID and member email are required' });
    }
    
    if (global.useMockData) {
      console.log('Using mock data for adding member');
      return res.status(200).json({ 
        message: 'Member added successfully',
        member: {
          userId: 'mock-new-user',
          name: member.name || 'New Mock User',
          email: member.email
        }
      });
    }
    
    try {
      // Find home by homeId (string) field, not by _id (ObjectId)
      const home = await Home.findOne({ homeId: homeId });
      
      if (!home) {
        return res.status(404).json({ message: 'Home not found' });
      }
      
      // Check if user is the creator of the home
      if (home.createdBy !== userId) {
        return res.status(403).json({ message: 'Only the home creator can add members' });
      }
      
      // Find the user by email
      const targetUser = await User.findOne({ email: member.email });
      
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found. They need to sign up first.' });
      }
      
      // Check if user is already a member
      const isAlreadyMember = home.members.some(m => m.uid === targetUser.uid);
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: 'User is already a member of this home' });
      }
      
      // Add user to home members
      home.members.push({
        name: member.name || targetUser.name,
        email: targetUser.email,
        uid: targetUser.uid
      });
      
      await home.save();
      
      // Add home to user's homes (use home._id which is an ObjectId)
      if (!targetUser.homes.includes(home._id)) {
        targetUser.homes.push(home._id);
        await targetUser.save();
      }
      
      res.status(200).json({ 
        message: 'Member added successfully',
        member: {
          userId: targetUser.uid,
          name: member.name || targetUser.name,
          email: targetUser.email
        }
      });
    } catch (dbError) {
      console.error('Database error adding member:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Return mock success in development mode
        console.log('DEV MODE: Returning mock success due to database error');
        return res.status(200).json({ 
          message: 'Member added successfully (mock)',
          member: {
            userId: 'mock-new-user-' + Date.now(),
            name: member.name || 'New Mock User',
            email: member.email
          }
        });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ 
      message: 'Error adding member', 
      details: error.message 
    });
  }
});

// Remove member from home
router.post('/remove-member', verifyToken, async (req, res) => {
  try {
    const { homeId, memberId } = req.body;
    const userId = req.user.uid;
    
    console.log(`User ${userId} removing member ${memberId} from home ${homeId}`);
    
    if (!homeId || !memberId) {
      return res.status(400).json({ message: 'Home ID and member ID are required' });
    }
    
    if (global.useMockData) {
      console.log('Using mock data for removing member');
      return res.status(200).json({ message: 'Member removed successfully' });
    }
    
    try {
      // Find home by homeId (string) field, not by _id (ObjectId)
      const home = await Home.findOne({ homeId: homeId });
      
      if (!home) {
        return res.status(404).json({ message: 'Home not found' });
      }
      
      // Check if user is the creator of the home
      if (home.createdBy !== userId) {
        return res.status(403).json({ message: 'Only the home creator can remove members' });
      }
      
      // Check if trying to remove the creator
      if (memberId === home.createdBy) {
        return res.status(400).json({ message: 'Cannot remove the home creator' });
      }
      
      // Find the member in the home
      const memberIndex = home.members.findIndex(m => m.uid === memberId);
      
      if (memberIndex === -1) {
        return res.status(404).json({ message: 'Member not found in this home' });
      }
      
      // Remove member from home
      home.members.splice(memberIndex, 1);
      await home.save();
      
      // Remove home from user's homes list
      await User.updateOne(
        { uid: memberId },
        { $pull: { homes: home._id } }
      );
      
      res.status(200).json({ message: 'Member removed successfully' });
    } catch (dbError) {
      console.error('Database error removing member:', dbError);
      
      if (process.env.NODE_ENV === 'development') {
        // Return mock success in development mode
        console.log('DEV MODE: Returning mock success due to database error');
        return res.status(200).json({ message: 'Member removed successfully (mock)' });
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ 
      message: 'Error removing member', 
      details: error.message 
    });
  }
});

// Delete a home
router.delete('/:homeId', verifyToken, async (req, res) => {
  try {
    const homeId = req.params.homeId;
    const userId = req.user.uid;
    console.log(`Deleting home with ID: ${homeId} by user: ${userId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for deleting home');
      return res.status(200).json({ message: 'Home deleted successfully' });
    }
    
    // Find the home by homeId
    const home = await Home.findOne({ homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found' });
    }
    
    // Check if the user is the creator of the home
    if (home.createdBy !== userId) {
      return res.status(403).json({ message: 'Only the creator of the home can delete it' });
    }
    
    // Delete the home
    await Home.deleteOne({ homeId });
    
    // Remove home from all users' homes array
    await User.updateMany(
      { 'homes': home._id },
      { $pull: { 'homes': home._id } }
    );
    
    // Also delete all associated chores and expenses
    const Chore = require('../models/Chore');
    const Expense = require('../models/Expense');
    
    await Chore.deleteMany({ homeId });
    await Expense.deleteMany({ homeId });
    
    res.status(200).json({ message: 'Home deleted successfully' });
  } catch (error) {
    console.error('Delete home error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;