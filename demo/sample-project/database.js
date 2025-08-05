/**
 * Database module for the DevMind Demo Project
 * Handles database connection and query execution
 */

const mysql = require('mysql2/promise');
const logger = require('./utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'devmind_demo',
  connectionLimit: 10
};

let pool;

/**
 * Connects to the database and creates a connection pool
 * @returns {Promise<Object>} - The database connection pool
 */
async function connectToDatabase() {
  try {
    // This creates a connection pool
    pool = mysql.createPool(dbConfig);
    
    // Test the connection
    const connection = await pool.getConnection();
    connection.release();
    
    logger.info('Database connection established');
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
}

/**
 * Executes a SQL query
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - The parameters for the query
 * @returns {Promise<Array>} - The query results
 */
async function query(sql, params = []) {
  try {
    // This function has a potential issue - it doesn't check if pool exists
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error(`Query error: ${sql}`, error);
    throw error;
  }
}

/**
 * Closes the database connection pool
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  try {
    if (pool) {
      await pool.end();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection', error);
    throw error;
  }
}

/**
 * Initializes the database with required tables
 * @returns {Promise<void>}
 */
async function initializeDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create posts table
    await query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    logger.info('Database initialized with required tables');
  } catch (error) {
    logger.error('Error initializing database', error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  query,
  closeDatabase,
  initializeDatabase
};