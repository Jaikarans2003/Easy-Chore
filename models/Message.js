const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  homeId: { 
    type: String, 
    required: true,
    index: true 
  },
  senderId: { 
    type: String, 
    required: true 
  },
  senderName: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String,
    required: true
  },
  messageType: { 
    type: String, 
    enum: ['text', 'image'], 
    default: 'text' 
  },
  imageUrl: { 
    type: String,
    default: ''
  },
  reactions: [{
    userId: String,
    emoji: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, 
{ 
  timestamps: true 
});

// Create a compound index for efficient querying of messages by homeId and creation time
messageSchema.index({ homeId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema); 