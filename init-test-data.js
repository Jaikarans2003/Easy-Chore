const mongoose = require('mongoose');
const User = require('./models/User');
const Home = require('./models/Home');
const Chore = require('./models/Chore');
const Expense = require('./models/Expense');
require('dotenv').config();

console.log('Connecting to MongoDB...');
console.log('URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    
    try {
      // Clear existing data
      await User.deleteMany({});
      await Home.deleteMany({});
      await Chore.deleteMany({});
      await Expense.deleteMany({});
      
      console.log('Cleared existing data');
      
      // Create test user
      const testUser = new User({
        uid: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        homes: []
      });
      
      await testUser.save();
      console.log('Created test user:', testUser._id);
      
      // Create test home
      const testHome = new Home({
        name: 'Test Home',
        homeId: 'TEST123',
        members: [
          {
            name: testUser.name,
            email: testUser.email,
            uid: testUser.uid
          }
        ],
        createdBy: testUser.uid
      });
      
      await testHome.save();
      console.log('Created test home:', testHome._id);
      
      // Add home to user's homes
      testUser.homes.push(testHome._id);
      await testUser.save();
      console.log('Added home to user');
      
      // Create test chores
      const testChores = [
        new Chore({
          homeId: testHome.homeId,
          choreType: 'Kitchen',
          doneBy: testUser.name,
          date: new Date(),
          photoUrl: 'https://example.com/photo1.jpg',
          notes: 'Cleaned the kitchen thoroughly'
        }),
        new Chore({
          homeId: testHome.homeId,
          choreType: 'Trash',
          doneBy: testUser.name,
          date: new Date(Date.now() - 86400000), // Yesterday
          photoUrl: 'https://example.com/photo2.jpg',
          notes: 'Took out all trash bags'
        })
      ];
      
      await Chore.insertMany(testChores);
      console.log('Created test chores');
      
      // Create test expenses
      const testExpenses = [
        new Expense({
          homeId: testHome.homeId,
          payer: testUser.name,
          amount: 75.50,
          reason: 'Groceries',
          splitType: 'equal',
          debtors: [
            {
              name: testUser.name,
              amount: 75.50,
              paid: true
            }
          ],
          date: new Date()
        }),
        new Expense({
          homeId: testHome.homeId,
          payer: testUser.name,
          amount: 60.00,
          reason: 'Internet Bill',
          splitType: 'equal',
          debtors: [
            {
              name: testUser.name,
              amount: 60.00,
              paid: true
            }
          ],
          date: new Date(Date.now() - 86400000) // Yesterday
        })
      ];
      
      await Expense.insertMany(testExpenses);
      console.log('Created test expenses');
      
      console.log('Test data initialization complete!');
      process.exit(0);
    } catch (error) {
      console.error('Error initializing test data:', error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error initializing test data:', err);
    process.exit(1);
  }); 