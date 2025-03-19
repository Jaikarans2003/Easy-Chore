// Set environment to development for local testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      console.error('Invalid JSON in request body:', e.message);
      res.status(400).json({ message: 'Invalid JSON in request body' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.static('public'));

// Custom middleware to ensure all API responses are valid JSON
app.use('/api', (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    try {
      // Test if data is valid JSON
      JSON.stringify(data);
      return originalJson.call(this, data);
    } catch (e) {
      console.error('Invalid JSON response:', e.message);
      return originalJson.call(this, { 
        message: 'Server error: Invalid JSON response', 
        error: e.message 
      });
    }
  };
  next();
});

// Configure mock data usage for development
global.useMockData = false; // Set to false to use real database data

// Log MongoDB connection details (without showing sensitive data)
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB connection string configured:', process.env.MONGODB_URI ? 'Yes' : 'No');

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join a home's chat room
  socket.on('join-room', (homeId) => {
    console.log(`Socket ${socket.id} joining room: ${homeId}`);
    socket.join(homeId);
    // Send confirmation to client
    socket.emit('room-joined', { homeId, status: 'success' });
  });
  
  // Leave a home's chat room
  socket.on('leave-room', (homeId) => {
    console.log(`Socket ${socket.id} leaving room: ${homeId}`);
    socket.leave(homeId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io accessible to routes
app.set('io', io);

// Function to start the server
const startServer = () => {
  // Import routes
  const { router: authRouter } = require('./routes/auth');
  const homesRouter = require('./routes/homes');
  const choresRouter = require('./routes/chores');
  const expensesRouter = require('./routes/expenses');
  const uploadsRouter = require('./routes/uploads');
  const messagesRouter = require('./routes/messages');
  
  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/homes', homesRouter);
  app.use('/api/chores', choresRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/messages', messagesRouter);

  // Serve HTML files
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });

  app.get('/create-join-home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-join-home.html'));
  });

  // Add routes for all HTML files
  app.get('/add-chore', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'add-chore.html'));
  });

  app.get('/view-chores', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-chores.html'));
  });

  app.get('/add-expense', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'add-expense.html'));
  });

  app.get('/view-expenses', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-expenses.html'));
  });

  // Add home chat route - make this explicit and higher priority
  app.get('/home-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-chat.html'));
  });
  
  app.get('/home-chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-chat.html'));
  });

  // Add routes for home management
  app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-join-home.html'));
  });

  app.get('/select-home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'select-home.html'));
  });

  app.get('/manage-home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manage-home.html'));
  });

  // Error handling for API routes
  app.use('/api/*', (err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  });

  // Catch-all route for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Start the server with Socket.io
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(global.useMockData ? 'Using MOCK data (no MongoDB)' : 'Using real MongoDB data');
  });
};

// Connect to MongoDB with fallback for development
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB successfully');
  global.useMockData = false;
  console.log('Using real MongoDB data');
  startServer();
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  
  // Check for specific error types
  if (err.name === 'MongoParseError') {
    console.error('Invalid MongoDB connection string. Please check your MONGODB_URI in .env file');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('Could not connect to MongoDB server. Please check if the server is running and network connectivity');
  } else if (err.message.includes('Authentication failed')) {
    console.error('MongoDB authentication failed. Please check username and password in connection string');
  }
  
  // In development mode, continue with mock data
  if (process.env.NODE_ENV === 'development') {
    console.log('DEVELOPMENT MODE: Continuing with mock data despite MongoDB connection failure');
    global.useMockData = true;
    startServer();
  } else {
    console.error('Exiting application due to database connection failure');
    process.exit(1); // Exit the process if MongoDB connection fails in production
  }
});