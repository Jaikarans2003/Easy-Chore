// Script to fix missing users in MongoDB
const mongoose = require('mongoose');
const { admin } = require('./config/firebase');
const User = require('./models/User');
require('dotenv').config();

console.log('Connecting to MongoDB...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Defined' : 'Not defined');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    
    try {
      // Create the specific user we know exists in Firebase
      const uid = 'B1kmOxwITiexsRxqSQWQ9ICq0S02'; // From your logs
      
      // Check if user already exists in MongoDB
      console.log('Checking if user exists in MongoDB...');
      const existingUser = await User.findOne({ uid });
      
      if (existingUser) {
        console.log('User already exists in MongoDB:', existingUser);
      } else {
        console.log('User not found in MongoDB. Attempting to fetch from Firebase...');
        
        try {
          // Try to get user from Firebase
          const firebaseUser = await admin.auth().getUser(uid);
          console.log('Found user in Firebase:', firebaseUser.email);
          
          // Create user in MongoDB
          const newUser = new User({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Karan', // Use default if no display name
            email: firebaseUser.email,
            homes: []
          });
          
          await newUser.save();
          console.log('User created successfully in MongoDB:', newUser);
        } catch (firebaseError) {
          console.error('Error fetching user from Firebase:', firebaseError);
          console.log('Creating user manually...');
          
          // Create user manually
          const manualUser = new User({
            uid: uid,
            name: 'Karan', 
            email: 'jaikaran.pesce@gmail.com',
            homes: []
          });
          
          await manualUser.save();
          console.log('User created manually in MongoDB:', manualUser);
        }
      }

      // List all users in the database
      console.log('Listing all users in the database:');
      const allUsers = await User.find({});
      if (allUsers.length === 0) {
        console.log('No users found in the database');
      } else {
        allUsers.forEach(user => {
          console.log(`- User: ${user.name}, Email: ${user.email}, UID: ${user.uid}`);
        });
      }
      
      console.log('Script completed!');
      process.exit(0);
    } catch (error) {
      console.error('Error running script:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 