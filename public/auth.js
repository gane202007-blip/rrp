/**
 * PlastiCore AI — Auth Client Logic
 */

const API_BASE = '/api';

function isLoggedIn() {
  const token = localStorage.getItem('plasticore_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function getToken() {
  return localStorage.getItem('plasticore_token');
}

function getUser() {
  const data = localStorage.getItem('plasticore_user');
  return data ? JSON.parse(data) : null;
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById('authError');
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) { showAuthError('Please fill in all fields'); return; }

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
    if (!res.ok) throw new Error(data.message || 'Login failed');
    localStorage.setItem('plasticore_token', data.token);
    localStorage.setItem('plasticore_user', JSON.stringify(data.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAuthError(err.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

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

  if (!name || !email || !password || !confirmPassword) { showAuthError('Please fill in all fields'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
  if (password !== confirmPassword) { showAuthError('Passwords do not match'); return; }
  if (role === 'admin' && !adminSecretKey) { showAuthError('Admin secret key is required'); return; }

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
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    localStorage.setItem('plasticore_token', data.token);
    localStorage.setItem('plasticore_user', JSON.stringify(data.user));
    window.location.href = '/dashboard.html';
  } catch (err) {
    showAuthError(err.message);
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function handleLogout() {
  localStorage.removeItem('plasticore_token');
  localStorage.removeItem('plasticore_user');
  window.location.href = '/login.html';
}

function showAuthError(message) {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

function toggleAdminKey() {
  const roleSelect = document.getElementById('roleSelect');
  const adminKeyGroup = document.getElementById('adminKeyGroup');
  if (roleSelect && adminKeyGroup) {
    adminKeyGroup.style.display = roleSelect.value === 'admin' ? 'block' : 'none';
  }
}

/** Update the header auth area (Login/Signup or user info) */
function updateHeaderAuth() {
  const area = document.getElementById('headerAuthArea');
  if (!area) return;

  if (isLoggedIn()) {
    const user = getUser();
    area.innerHTML = `
      <a href="/dashboard.html" class="btn-ghost btn-sm">Dashboard</a>
      <button class="btn-ghost btn-sm" id="headerLogoutBtn">Logout</button>
    `;
    document.getElementById('headerLogoutBtn')?.addEventListener('click', handleLogout);
  }
  // else default login/signup links are already in HTML
}

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAuth();
});
