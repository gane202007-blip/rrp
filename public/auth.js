/**
 * PlastiCore AI — Auth Client Logic
 * ===================================
 * Handles login, register, logout, and auth state management.
 * JWT tokens are stored in localStorage.
 * 
 * BEGINNER NOTE:
 *   - After login/register, the JWT token is saved to localStorage
 *   - Every API call to protected routes includes: Authorization: Bearer <token>
 *   - getUser() decodes the token to get user info without an API call
 */

const API_BASE = '/api';

// ══════════════════════════════════════
// AUTH STATE HELPERS
// ══════════════════════════════════════

/** Check if user is logged in (has a valid token) */
function isLoggedIn() {
  const token = localStorage.getItem('plasticore_token');
  if (!token) return false;
  
  try {
    // Check if token is expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Get stored JWT token */
function getToken() {
  return localStorage.getItem('plasticore_token');
}

/** Get user info from stored data */
function getUser() {
  const data = localStorage.getItem('plasticore_user');
  return data ? JSON.parse(data) : null;
}

/** Get auth headers for API calls */
function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ══════════════════════════════════════
// LOGIN
// ══════════════════════════════════════

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById('authError');
  
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showAuthError('Please fill in all fields');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errorDiv.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Save token and user info
    localStorage.setItem('plasticore_token', data.token);
    localStorage.setItem('plasticore_user', JSON.stringify(data.user));

    // Redirect to dashboard
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAuthError(err.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

// ══════════════════════════════════════
// REGISTER
// ══════════════════════════════════════

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById('authError');

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;
  const role = form.role.value;
  const adminSecretKey = form.adminSecretKey ? form.adminSecretKey.value.trim() : '';

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    showAuthError('Please fill in all fields');
    return;
  }
  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }
  if (password !== confirmPassword) {
    showAuthError('Passwords do not match');
    return;
  }
  if (role === 'admin' && !adminSecretKey) {
    showAuthError('Admin secret key is required for admin registration');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account…';
  errorDiv.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, adminSecretKey }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Save token and user info
    localStorage.setItem('plasticore_token', data.token);
    localStorage.setItem('plasticore_user', JSON.stringify(data.user));

    // Redirect to dashboard
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAuthError(err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ══════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════

function handleLogout() {
  localStorage.removeItem('plasticore_token');
  localStorage.removeItem('plasticore_user');
  window.location.href = '/login.html';
}

// ══════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

/** Toggle admin secret key field visibility based on role selection */
function toggleAdminKey() {
  const roleSelect = document.getElementById('roleSelect');
  const adminKeyGroup = document.getElementById('adminKeyGroup');
  if (roleSelect && adminKeyGroup) {
    adminKeyGroup.style.display = roleSelect.value === 'admin' ? 'block' : 'none';
  }
}

/** Update navigation based on auth state (used on index.html) */
function updateNavAuth() {
  const nav = document.querySelector('.header-nav');
  if (!nav) return;

  if (isLoggedIn()) {
    const user = getUser();
    // Add dashboard and logout links
    const dashLink = document.createElement('a');
    dashLink.href = '/dashboard.html';
    dashLink.textContent = '📊 Dashboard';
    dashLink.className = 'nav-auth-link';

    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Logout';
    logoutLink.className = 'nav-auth-link nav-logout';
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });

    const userBadge = document.createElement('span');
    userBadge.className = 'nav-user-badge';
    userBadge.textContent = `${user?.name || 'User'} (${user?.role || 'user'})`;

    nav.appendChild(dashLink);
    nav.appendChild(userBadge);
    nav.appendChild(logoutLink);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = '/login.html';
    loginLink.textContent = 'Login';
    loginLink.className = 'nav-auth-link';

    const regLink = document.createElement('a');
    regLink.href = '/register.html';
    regLink.textContent = 'Sign Up';
    regLink.className = 'nav-auth-link nav-signup';

    nav.appendChild(loginLink);
    nav.appendChild(regLink);
  }
}

// Run nav update on page load for index.html
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
});
