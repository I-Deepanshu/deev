/**
 * Frontend JavaScript for the DevMind Demo Project
 * This file contains client-side logic for the application
 */

// DOM Elements
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const dashboardSection = document.getElementById('dashboard-section');
const newPostSection = document.getElementById('new-post-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const postForm = document.getElementById('post-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const newPostBtn = document.getElementById('new-post-btn');
const cancelPostBtn = document.getElementById('cancel-post');
const userNameSpan = document.getElementById('user-name');
const postsContainer = document.getElementById('posts-container');
const notification = document.getElementById('notification');

// State
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
postForm.addEventListener('submit', handleNewPost);
showRegisterLink.addEventListener('click', showRegister);
showLoginLink.addEventListener('click', showLogin);
logoutBtn.addEventListener('click', handleLogout);
newPostBtn.addEventListener('click', showNewPostForm);
cancelPostBtn.addEventListener('click', hideNewPostForm);

/**
 * Initializes the application
 */
function initialize() {
  if (authToken) {
    // Attempt to restore session
    fetchCurrentUser()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          showDashboard();
          fetchPosts();
        } else {
          // Invalid token
          localStorage.removeItem('authToken');
          authToken = null;
          showLogin();
        }
      })
      .catch(error => {
        console.error('Error initializing app:', error);
        showLogin();
      });
  } else {
    showLogin();
  }
}

/**
 * Shows the login section
 * @param {Event} [event] - The triggering event
 */
function showLogin(event) {
  if (event) event.preventDefault();
  loginSection.classList.remove('hidden');
  registerSection.classList.add('hidden');
  dashboardSection.classList.add('hidden');
  newPostSection.classList.add('hidden');
  loginForm.reset();
}

/**
 * Shows the registration section
 * @param {Event} [event] - The triggering event
 */
function showRegister(event) {
  if (event) event.preventDefault();
  loginSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  newPostSection.classList.add('hidden');
  registerForm.reset();
}

/**
 * Shows the dashboard section
 */
function showDashboard() {
  loginSection.classList.add('hidden');
  registerSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  newPostSection.classList.add('hidden');
  userNameSpan.textContent = currentUser.username;
}

/**
 * Shows the new post form
 */
function showNewPostForm() {
  newPostSection.classList.remove('hidden');
  postForm.reset();
}

/**
 * Hides the new post form
 */
function hideNewPostForm() {
  newPostSection.classList.add('hidden');
}

/**
 * Handles the login form submission
 * @param {Event} event - The form submission event
 */
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // This has a bug - authToken is not set from the response
      authToken = 'dummy-token'; // Should be data.token
      localStorage.setItem('authToken', authToken);
      setCurrentUser(data.user);
      showDashboard();
      fetchPosts();
      showNotification('Login successful!');
    } else {
      showNotification(data.message || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('An error occurred during login', 'error');
  }
}

/**
 * Handles the registration form submission
 * @param {Event} event - The form submission event
 */
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  
  // Client-side validation
  if (password !== confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }
  
  try {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Registration successful! Please log in.');
      showLogin();
    } else {
      showNotification(data.message || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('An error occurred during registration', 'error');
  }
}

/**
 * Handles the new post form submission
 * @param {Event} event - The form submission event
 */
async function handleNewPost(event) {
  event.preventDefault();
  
  const title = document.getElementById('post-title').value;
  const content = document.getElementById('post-content').value;
  
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title, content })
    });
    
    const data = await response.json();
    
    if (data.success) {
      hideNewPostForm();
      fetchPosts();
      showNotification('Post created successfully!');
    } else {
      showNotification(data.message || 'Failed to create post', 'error');
    }
  } catch (error) {
    console.error('Post creation error:', error);
    showNotification('An error occurred while creating the post', 'error');
  }
}

/**
 * Handles user logout
 */
function handleLogout() {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showLogin();
  showNotification('Logged out successfully');
}

/**
 * Fetches the current user's information
 * @returns {Promise<Object|null>} - The user object or null if not authenticated
 */
async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Fetches the user's posts
 */
async function fetchPosts() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`/api/posts?userId=${currentUser.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderPosts(data.posts);
    } else {
      console.error('Failed to fetch posts:', data.message);
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
  }
}

/**
 * Renders the user's posts
 * @param {Array} posts - The posts to render
 */
function renderPosts(posts) {
  if (!posts || posts.length === 0) {
    postsContainer.innerHTML = '<p class="text-center">You haven\'t created any posts yet.</p>';
    return;
  }
  
  postsContainer.innerHTML = '';
  
  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.innerHTML = `
      <h3>${post.title}</h3>
      <p>${post.content}</p>
      <small>Created on ${new Date(post.created_at).toLocaleDateString()}</small>
    `;
    postsContainer.appendChild(postElement);
  });
}

/**
 * Sets the current user
 * @param {Object} user - The user object
 */
function setCurrentUser(user) {
  currentUser = user;
}

/**
 * Shows a notification message
 * @param {string} message - The message to display
 * @param {string} [type='success'] - The notification type (success, error, warning)
 */
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = type;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}