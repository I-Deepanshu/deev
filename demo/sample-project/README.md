# DevMind Demo Project

## Overview

This is a sample project designed to demonstrate the capabilities of the DevMind VS Code extension. It's a simple web application with user authentication, posts, and a frontend interface.

## Project Structure

```
├── app.js                 # Main application file
├── auth.js                # Authentication module
├── database.js            # Database connection and queries
├── public/                # Static files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styles
│   └── app.js             # Frontend JavaScript
└── utils/                 # Utility modules
    └── logger.js          # Logging utility
```

## Features

- User authentication (login/register)
- User posts (create/view)
- Database integration
- Logging system
- Frontend interface

## Intentional Issues

This project contains several intentional issues that can be discovered and fixed using the DevMind extension's AI agents:

1. **Security Issues**:
   - SQL injection vulnerabilities
   - Insecure password storage
   - Missing input validation
   - Missing authentication checks

2. **Code Quality Issues**:
   - Memory leaks
   - Synchronous file I/O
   - Circular reference handling
   - Undefined variables

3. **Architecture Issues**:
   - Inconsistent error handling
   - Missing middleware
   - Incomplete implementation of features

## How to Use with DevMind

1. Open this project in VS Code with the DevMind extension installed
2. Use the different AI agents to analyze and improve the code:
   - **Architect**: Analyze the overall architecture and suggest improvements
   - **CodeSmith**: Generate missing code or improve existing code
   - **BugHunter**: Find and fix the intentional bugs and security issues
   - **DocGuru**: Improve the documentation and comments

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables (create a `.env` file):
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=devmind_demo
   PORT=3000
   ```

3. Initialize the database:
   ```
   node scripts/init-db.js
   ```

4. Start the server:
   ```
   node app.js
   ```

5. Open `http://localhost:3000` in your browser

## License

MIT