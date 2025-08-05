/**
 * Database initialization script for the DevMind Demo Project
 * This script creates the necessary database and tables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { closeDatabase } = require('../database');

// Database configuration without database name
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

// Database name
const dbName = process.env.DB_NAME || 'devmind_demo';

/**
 * Creates the database if it doesn't exist
 */
async function createDatabase() {
  let connection;
  
  try {
    // Connect to MySQL server
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    
    console.log(`Database '${dbName}' created or already exists`);
    
    // Use the database
    await connection.query(`USE ${dbName}`);
    
    // Create tables
    await createTables(connection);
    
    // Insert sample data
    await insertSampleData(connection);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

/**
 * Creates the necessary tables
 * @param {Object} connection - The database connection
 */
async function createTables(connection) {
  try {
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Users table created or already exists');
    
    // Create posts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    console.log('Posts table created or already exists');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Inserts sample data into the tables
 * @param {Object} connection - The database connection
 */
async function insertSampleData(connection) {
  try {
    // Check if users table is empty
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      // Insert sample users
      const hashedPassword1 = crypto.createHash('sha256').update('password123').digest('hex');
      const hashedPassword2 = crypto.createHash('sha256').update('password456').digest('hex');
      
      await connection.query(`
        INSERT INTO users (username, email, password) VALUES
        ('john_doe', 'john@example.com', '${hashedPassword1}'),
        ('jane_smith', 'jane@example.com', '${hashedPassword2}')
      `);
      
      console.log('Sample users inserted');
      
      // Get user IDs
      const [userRows] = await connection.query('SELECT id FROM users');
      const user1Id = userRows[0].id;
      const user2Id = userRows[1].id;
      
      // Insert sample posts
      await connection.query(`
        INSERT INTO posts (user_id, title, content) VALUES
        (${user1Id}, 'Getting Started with DevMind', 'DevMind is an amazing VS Code extension that helps you write better code...'),
        (${user1Id}, 'Advanced DevMind Features', 'Here are some advanced features of DevMind that you might not know about...'),
        (${user2Id}, 'My Experience with DevMind', 'I\'ve been using DevMind for a month now, and it has completely changed how I code...')
      `);
      
      console.log('Sample posts inserted');
    } else {
      console.log('Sample data already exists, skipping insertion');
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
    throw error;
  }
}

// Run the initialization
createDatabase();