const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { verifyToken } = require('./auth');

// Get messages for a specific home (with pagination)
router.get('/home/:homeId', verifyToken, async (req, res) => {
  try {
    const { homeId } = req.params;
    console.log(`[GET /home/${homeId}] Request received from user:`, req.user.uid);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Verify the user has access to this home
    // This would typically check if the user is a member of the home
    // For now, we'll just proceed with the query
    
    // Count total messages for pagination
    const totalMessages = await Message.countDocuments({ 
      homeId,
      isDeleted: { $ne: true }
    });
    
    // Get messages with pagination, sorted by most recent first
    const messages = await Message.find({ 
      homeId,
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    // Calculate pagination details
    const totalPages = Math.ceil(totalMessages / limit);
    
    // Reverse the array to show oldest first in the frontend
    const orderedMessages = messages.reverse();
    
    res.json({
      messages: orderedMessages,
      totalPages,
      currentPage: page,
      totalMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// Send a new message
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('[POST /] Message creation request received:', req.body);
    const { homeId, content, messageType = 'text', imageUrl = '' } = req.body;
    
    if (!homeId) {
      console.error('[POST /] Missing homeId in request:', req.body);
      return res.status(400).json({ message: 'Home ID is required' });
    }
    
    if (!content) {
      console.error('[POST /] Missing content in request:', req.body);
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Get user details from request
    const { uid, name, email } = req.user;
    console.log(`[POST /] Message from user ${name || email} (${uid}) for home ${homeId}`);
    
    // Create new message
    const newMessage = new Message({
      homeId,
      senderId: uid,
      senderName: name || email.split('@')[0], // Use name or fallback to email username
      content,
      messageType,
      imageUrl: messageType === 'image' ? imageUrl : '',
      reactions: []
    });
    
    // Save to database
    const savedMessage = await newMessage.save();
    console.log(`[POST /] Message saved with ID: ${savedMessage._id}`);
    
    // Emit to Socket.io if available
    const io = req.app.get('io');
    if (io) {
      console.log(`[POST /] Emitting new-message event to room ${homeId}`);
      io.to(homeId).emit('new-message', savedMessage);
    } else {
      console.warn('[POST /] Socket.io not available for message emission');
    }
    
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// Delete a message (soft delete)
router.delete('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { uid } = req.user;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if the user is the sender
    if (message.senderId !== uid) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    // Soft delete by marking as deleted
    message.isDeleted = true;
    await message.save();
    
    // Notify clients about the deletion
    const io = req.app.get('io');
    if (io) {
      io.to(message.homeId).emit('message-deleted', { messageId });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
});

// Add a reaction to a message
router.post('/:messageId/reactions', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const { uid } = req.user;
    
    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      reaction => reaction.userId === uid && reaction.emoji === emoji
    );
    
    if (existingReactionIndex > -1) {
      // Remove the reaction if it already exists (toggle)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add the new reaction
      message.reactions.push({ userId: uid, emoji });
    }
    
    // Save changes
    await message.save();
    
    // Notify clients about the reaction update
    const io = req.app.get('io');
    if (io) {
      io.to(message.homeId).emit('message-reaction', { 
        messageId, 
        reactions: message.reactions 
      });
    }
    
    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error('Error updating reaction:', error);
    res.status(500).json({ message: 'Failed to update reaction', error: error.message });
  }
});

module.exports = router;