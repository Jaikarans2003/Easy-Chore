// Set environment to development for local testing
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Set a flag to indicate we're using real data by default
// This will be switched to true if MongoDB connection fails in development mode
global.useMockData = false;

// Log MongoDB connection details (without showing sensitive data)
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB connection string configured:', process.env.MONGODB_URI ? 'Yes' : 'No');

// Function to start the server
const startServer = () => {
  // Import routes
  const { router: authRouter } = require('./routes/auth');
  const homesRouter = require('./routes/homes');
  const choresRouter = require('./routes/chores');
  const expensesRouter = require('./routes/expenses');
  const uploadsRouter = require('./routes/uploads');

  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/homes', homesRouter);
  app.use('/api/chores', choresRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/uploads', uploadsRouter);

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

  // Start server with error handling
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(global.useMockData ? 'Using MOCK data (no MongoDB)' : 'Using real MongoDB data');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
      // Try the next port
      const newServer = app.listen(PORT + 1, () => {
        console.log(`Server running on port ${PORT + 1}`);
        console.log(`Open http://localhost:${PORT + 1} in your browser`);
        console.log(global.useMockData ? 'Using MOCK data (no MongoDB)' : 'Using real MongoDB data');
      });
    } else {
      console.error('Server error:', err);
    }
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