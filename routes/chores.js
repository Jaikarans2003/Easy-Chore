const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const Chore = require('../models/Chore');
const Home = require('../models/Home');

// Mock data for development
const mockChores = [
  {
    _id: 'mock-chore-1',
    homeId: 'mock-home-id',
    choreType: 'Kitchen',
    doneBy: 'Test User',
    date: new Date(Date.now() - 86400000), // Yesterday
    photoUrl: 'https://example.com/photo1.jpg',
    notes: 'Cleaned the kitchen thoroughly',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mock-chore-2',
    homeId: 'mock-home-id',
    choreType: 'Trash',
    doneBy: 'Test User',
    date: new Date(Date.now() - 172800000), // 2 days ago
    photoUrl: 'https://example.com/photo2.jpg',
    notes: 'Took out all trash bags',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Get all chores for a home
router.get('/home/:homeId', verifyToken, async (req, res) => {
  try {
    const homeId = req.params.homeId;
    console.log(`Getting chores for home: ${homeId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for chores');
      return res.status(200).json({ chores: mockChores });
    }
    
    const chores = await Chore.find({ homeId }).sort({ date: -1 });
    res.status(200).json({ chores });
  } catch (error) {
    console.error('Get chores error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new chore
router.post('/', verifyToken, async (req, res) => {
  try {
    const { homeId, choreType, doneBy, photoUrl, notes } = req.body;
    console.log('Adding new chore:', req.body);
    
    if (global.useMockData) {
      console.log('Using mock data for adding chore');
      const newMockChore = {
        _id: `mock-chore-${Date.now()}`,
        homeId,
        choreType,
        doneBy,
        date: new Date(),
        photoUrl: photoUrl || '',
        notes: notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(201).json({ chore: newMockChore });
    }
    
    // Verify home exists
    const home = await Home.findOne({ homeId });
    if (!home) {
      return res.status(404).json({ message: 'Home not found' });
    }
    
    // Create new chore
    const newChore = new Chore({
      homeId,
      choreType,
      doneBy,
      photoUrl: photoUrl || '',
      notes: notes || '',
      date: new Date()
    });
    
    await newChore.save();
    res.status(201).json({ chore: newChore });
  } catch (error) {
    console.error('Add chore error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chore by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const choreId = req.params.id;
    console.log(`Getting chore with ID: ${choreId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for chore');
      return res.status(200).json({ chore: mockChores[0] });
    }
    
    const chore = await Chore.findById(choreId);
    
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }
    
    res.status(200).json({ chore });
  } catch (error) {
    console.error('Get chore error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a chore
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const choreId = req.params.id;
    const updates = req.body;
    console.log(`Updating chore with ID: ${choreId}`, updates);
    
    if (global.useMockData) {
      console.log('Using mock data for updating chore');
      const updatedMockChore = {
        ...mockChores[0],
        ...updates,
        updatedAt: new Date()
      };
      
      return res.status(200).json({ chore: updatedMockChore });
    }
    
    const chore = await Chore.findByIdAndUpdate(
      choreId,
      { $set: updates },
      { new: true }
    );
    
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }
    
    res.status(200).json({ chore });
  } catch (error) {
    console.error('Update chore error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a chore
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const choreId = req.params.id;
    const userId = req.user.uid;
    console.log(`Deleting chore with ID: ${choreId} by user: ${userId}`);
    
    if (global.useMockData) {
      console.log('Using mock data for deleting chore');
      return res.status(200).json({ message: 'Chore deleted successfully' });
    }
    
    // Find the chore
    const chore = await Chore.findById(choreId);
    
    if (!chore) {
      return res.status(404).json({ message: 'Chore not found' });
    }
    
    // Find the home to check permissions
    const home = await Home.findOne({ homeId: chore.homeId });
    
    if (!home) {
      return res.status(404).json({ message: 'Home not found for this chore' });
    }
    
    // Check if the user added this chore (based on user name matching the doneBy field)
    // We don't have a direct createdBy field in chores, so we'll use doneBy as a proxy
    // or allow home creator to delete any chore
    const userMember = home.members.find(member => member.uid === userId);
    const isHomeCreator = home.createdBy === userId;
    const isChoreCreator = userMember && userMember.name === chore.doneBy;
    
    if (!isHomeCreator && !isChoreCreator) {
      return res.status(403).json({ 
        message: 'Only the creator of the chore or the home creator can delete it' 
      });
    }
    
    // Delete the chore
    await Chore.findByIdAndDelete(choreId);
    
    res.status(200).json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Delete chore error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;