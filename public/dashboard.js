/**
 * PlastiCore AI — Dashboard Logic
 * =================================
 * Renders the admin or user dashboard based on role.
 * 
 * USER DASHBOARD:
 *   - Shows personal upload history in a table
 *   - Link to analyze new images
 * 
 * ADMIN DASHBOARD:
 *   - Shows ALL uploads from all users
 *   - Filter controls (plastic type, date range, user)
 *   - Download reports (CSV / PDF)
 *   - View all registered users
 */

const DASH_API = '/api';

// ══════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  const user = getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Set user info in header
  document.getElementById('dashUserName').textContent = user.name;
  document.getElementById('dashUserRole').textContent = user.role === 'admin' ? 'Admin' : 'User';
  document.getElementById('dashUserRole').className = `role-badge role-${user.role}`;

  // Show the correct dashboard based on role
  if (user.role === 'admin') {
    document.getElementById('adminDashboard').style.display = 'block';
    document.getElementById('userDashboard').style.display = 'none';
    await loadAdminData();
    await loadAdminUsers();
  } else {
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';
    await loadUserUploads();
  }

  // Setup event listeners
  setupEventListeners();
});

// ══════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════

function setupEventListeners() {
  // Logout button
  const logoutBtn = document.getElementById('dashLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Admin filter button
  const filterBtn = document.getElementById('applyFilterBtn');
  if (filterBtn) filterBtn.addEventListener('click', loadAdminData);

  // Admin clear filter
  const clearFilterBtn = document.getElementById('clearFilterBtn');
  if (clearFilterBtn) clearFilterBtn.addEventListener('click', () => {
    document.getElementById('filterPlasticType').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterUser').value = '';
    loadAdminData();
  });

  // Download buttons
  const csvBtn = document.getElementById('downloadCsvBtn');
  if (csvBtn) csvBtn.addEventListener('click', downloadCSV);

  const pdfBtn = document.getElementById('downloadPdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', downloadPDF);
}

// ══════════════════════════════════════
// USER DASHBOARD
// ══════════════════════════════════════

async function loadUserUploads() {
  const tableBody = document.getElementById('userTableBody');
  const countEl = document.getElementById('userUploadCount');

  tableBody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading your records…</td></tr>';

  try {
    const res = await fetch(`${DASH_API}/user/uploads`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load uploads');

    const data = await res.json();
    countEl.textContent = data.count;

    if (data.uploads.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty">
            <div class="empty-state">
              <div class="empty-icon">📷</div>
              <p>No uploads yet. Start by analyzing some plastic waste!</p>
              <a href="/index.html#upload-section" class="btn-primary" style="margin-top:12px">Analyze Images →</a>
            </div>
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = data.uploads.map((u, i) => `
      <tr class="table-row-animate" style="animation-delay: ${i * 0.03}s">
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td class="cell-filename">${u.fileName}</td>
        <td><span class="table-badge badge-${(u.plasticType || 'unknown').toLowerCase()}">${u.isPlastic ? u.plasticType : 'N/A'}</span></td>
        <td>${u.isPlastic ? Math.round(u.confidence * 100) + '%' : '—'}</td>
        <td>${u.isPlastic ? u.primaryUse : 'Not Plastic'}</td>
        <td>${u.isPlastic ? u.strength : '—'}</td>
        <td class="cell-co2">${u.isPlastic ? u.co2Saved + ' kg' : '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" class="table-error">Error: ${err.message}</td></tr>`;
  }
}

// ══════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════

async function loadAdminData() {
  const tableBody = document.getElementById('adminTableBody');
  const countEl = document.getElementById('adminUploadCount');

  // Build query params from filters
  const plasticType = document.getElementById('filterPlasticType')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';
  const userId = document.getElementById('filterUser')?.value || '';

  const params = new URLSearchParams();
  if (plasticType) params.append('plasticType', plasticType);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (userId) params.append('userId', userId);

  const queryString = params.toString() ? `?${params.toString()}` : '';

  tableBody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading all records…</td></tr>';

  try {
    const res = await fetch(`${DASH_API}/admin/uploads${queryString}`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load uploads');

    const data = await res.json();
    countEl.textContent = data.count;

    if (data.uploads.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>No records found matching your filters.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = data.uploads.map((u, i) => `
      <tr class="table-row-animate" style="animation-delay: ${i * 0.02}s">
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td class="cell-user">${u.userId?.name || 'Unknown'}</td>
        <td class="cell-filename">${u.fileName}</td>
        <td><span class="table-badge badge-${(u.plasticType || 'unknown').toLowerCase()}">${u.isPlastic ? u.plasticType : 'N/A'}</span></td>
        <td>${u.isPlastic ? Math.round(u.confidence * 100) + '%' : '—'}</td>
        <td>${u.isPlastic ? u.primaryUse : 'Not Plastic'}</td>
        <td>${u.isPlastic ? u.strength : '—'}</td>
        <td class="cell-co2">${u.isPlastic ? u.co2Saved + ' kg' : '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" class="table-error">Error: ${err.message}</td></tr>`;
  }
}

async function loadAdminUsers() {
  const container = document.getElementById('adminUsersGrid');
  if (!container) return;

  try {
    const res = await fetch(`${DASH_API}/admin/users`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Failed to load users');

    const data = await res.json();
    document.getElementById('adminUserCount').textContent = data.count;

    container.innerHTML = data.users.map((u, i) => `
      <div class="user-card" style="animation-delay: ${i * 0.05}s">
        <div class="user-card-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div class="user-card-info">
          <div class="user-card-name">${u.name}</div>
          <div class="user-card-email">${u.email}</div>
        </div>
        <span class="role-badge role-${u.role}">${u.role}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="table-error">Error: ${err.message}</p>`;
  }
}

// ══════════════════════════════════════
// REPORT DOWNLOADS
// ══════════════════════════════════════

function getFilterQueryString() {
  const plasticType = document.getElementById('filterPlasticType')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';
  const userId = document.getElementById('filterUser')?.value || '';

  const params = new URLSearchParams();
  if (plasticType) params.append('plasticType', plasticType);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (userId) params.append('userId', userId);

  return params.toString() ? `?${params.toString()}` : '';
}

async function downloadCSV() {
  const btn = document.getElementById('downloadCsvBtn');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  try {
    const query = getFilterQueryString();
    const res = await fetch(`${DASH_API}/admin/reports/csv${query}`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Failed to generate CSV');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PlastiCore_Report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📄 Download CSV';
  }
}

async function downloadPDF() {
  const btn = document.getElementById('downloadPdfBtn');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  try {
    const query = getFilterQueryString();
    const res = await fetch(`${DASH_API}/admin/reports/pdf${query}`, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error('Failed to generate PDF');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PlastiCore_Admin_Report_${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📑 Download PDF';
  }
}
