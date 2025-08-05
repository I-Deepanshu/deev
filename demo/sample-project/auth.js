/**
 * Authentication module for the DevMind Demo Project
 * Handles user authentication and session management
 */

const crypto = require('crypto');
const { query } = require('./database');
const logger = require('./utils/logger');

/**
 * Authenticates a user with the provided credentials
 * @param {string} username - The user's username
 * @param {string} password - The user's password (plaintext)
 * @returns {Promise<Object|null>} - The user object if authentication succeeds, null otherwise
 */
async function authenticateUser(username, password) {
  try {
    // This query is vulnerable to SQL injection
    const result = await query(`SELECT * FROM users WHERE username = '${username}'`);
    
    if (result.length === 0) {
      logger.info(`Authentication failed: User ${username} not found`);
      return null;
    }
    
    const user = result[0];
    
    // This is insecure - should use a proper password hashing library
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
    
    if (hashedPassword === user.password) {
      // Don't log sensitive information
      logger.info(`User ${username} authenticated successfully`);
      
      // Don't return the password in the user object
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } else {
      logger.info(`Authentication failed: Invalid password for user ${username}`);
      return null;
    }
  } catch (error) {
    logger.error('Error during authentication', error);
    throw error;
  }
}

/**
 * Creates a session for an authenticated user
 * @param {Object} user - The authenticated user object
 * @returns {string} - The session token
 */
function createSession(user) {
  // This is a simplified implementation - not suitable for production
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
  // In a real application, store this in a database or Redis
  sessions[sessionToken] = {
    userId: user.id,
    created: new Date(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
  
  return sessionToken;
}

/**
 * Verifies a session token
 * @param {string} token - The session token to verify
 * @returns {Object|null} - The user ID if the session is valid, null otherwise
 */
function verifySession(token) {
  // This function has a bug - 'sessions' is not defined
  const session = sessions[token];
  
  if (!session) {
    return null;
  }
  
  if (session.expires < new Date()) {
    delete sessions[token];
    return null;
  }
  
  return { userId: session.userId };
}

/**
 * Authentication middleware for Express
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The Express next function
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const session = verifySession(token);
  
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  
  req.userId = session.userId;
  next();
}

module.exports = {
  authenticateUser,
  createSession,
  verifySession,
  authMiddleware
};