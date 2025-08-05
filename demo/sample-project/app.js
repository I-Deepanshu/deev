/**
 * Main application file for the DevMind Demo Project
 * This file demonstrates various coding patterns and potential use cases
 * for the DevMind extension's AI agents.
 */

// Import dependencies
const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateUser } = require('./auth');
const { connectToDatabase } = require('./database');
const logger = require('./utils/logger');

// Initialize the application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
let db;
connectToDatabase()
  .then((database) => {
    db = database;
    logger.info('Connected to database successfully');
  })
  .catch((err) => {
    logger.error('Failed to connect to database', err);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User authentication route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // This has a potential bug - no validation of inputs
  authenticateUser(username, password)
    .then((user) => {
      if (user) {
        // Create session or token (not implemented)
        res.json({ success: true, user: user });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    })
    .catch((err) => {
      logger.error('Authentication error', err);
      res.status(500).json({ success: false, message: 'Server error' });
    });
});

// Get user data - requires authentication
app.get('/api/user/:id', (req, res) => {
  // Missing authentication check - security issue
  const userId = req.params.id;
  
  // Potential SQL injection vulnerability
  db.query(`SELECT * FROM users WHERE id = ${userId}`)
    .then((results) => {
      if (results.length > 0) {
        res.json({ success: true, user: results[0] });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    })
    .catch((err) => {
      logger.error('Database query error', err);
      res.status(500).json({ success: false, message: 'Server error' });
    });
});

// Create a new user
app.post('/api/user', (req, res) => {
  const { username, email, password } = req.body;
  
  // This function needs input validation
  createUser(username, email, password)
    .then((userId) => {
      res.json({ success: true, userId: userId });
    })
    .catch((err) => {
      logger.error('User creation error', err);
      res.status(500).json({ success: false, message: 'Server error' });
    });
});

// Helper function to create a user
// This function has a memory leak - connection not closed
function createUser(username, email, password) {
  return new Promise((resolve, reject) => {
    // Password should be hashed before storage
    const query = `INSERT INTO users (username, email, password) VALUES ('${username}', '${email}', '${password}')`;
    
    db.query(query)
      .then((result) => {
        resolve(result.insertId);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// TODO: Implement proper error handling
// TODO: Add authentication middleware
// TODO: Implement user registration validation
// TODO: Add CSRF protection

module.exports = app;