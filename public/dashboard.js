/**
 * PlastiCore AI — Dashboard Logic (Enhanced)
 */

const DASH_API = '/api';
let userImpactChartInst = null;
let adminImpactChartInst = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return; }

  const user = getUser();
  if (!user) { window.location.href = '/login.html'; return; }

  document.getElementById('dashUserName').textContent = user.name;
  document.getElementById('dashUserRole').textContent = user.role === 'admin' ? 'Admin' : 'User';
  document.getElementById('dashUserRole').className = `role-badge role-${user.role}`;

  if (user.role === 'admin') {
    document.getElementById('adminDashboard').style.display = 'block';
    document.getElementById('userDashboard').style.display = 'none';
    await loadAdminData();
    await loadAdminUsers();
    await loadAdminStats();
  } else {
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';
    await loadUserProfile();
    await loadUserUploads();
    await loadLeaderboard();
  }

  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('dashLogoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('applyFilterBtn')?.addEventListener('click', loadAdminData);
  document.getElementById('clearFilterBtn')?.addEventListener('click', () => {
    ['filterPlasticType', 'filterDateFrom', 'filterDateTo', 'filterUser'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    loadAdminData();
  });
  document.getElementById('downloadCsvBtn')?.addEventListener('click', downloadCSV);
  document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadPDF);
}

// ── USER PROFILE (points + badge) ──
async function loadUserProfile() {
  try {
    const res = await fetch(`${DASH_API}/user/profile`, { headers: authHeaders() });
    if (!res.ok) return;
    const { user } = await res.json();
    document.getElementById('userPoints').textContent = user.points || 0;
    document.getElementById('userBadge').textContent = user.badge || 'Beginner';
  } catch (_) {}
}

// ── LEADERBOARD ──
async function loadLeaderboard() {
  const container = document.getElementById('leaderboardList');
  if (!container) return;
  try {
    const res = await fetch(`${DASH_API}/user/leaderboard`, { headers: authHeaders() });
    const data = await res.json();
    const medals = ['🥇', '🥈', '🥉'];
    container.innerHTML = data.leaderboard.map((u, i) => `
      <div class="leaderboard-row">
        <span class="lb-rank">${medals[i] || `#${i + 1}`}</span>
        <span class="lb-name">${escHtml(u.name)}</span>
        <span class="lb-badge">${u.badge}</span>
        <span class="lb-points">${u.points} pts</span>
      </div>
    `).join('') || '<p class="table-loading">No users yet.</p>';
  } catch (_) {
    container.innerHTML = '<p class="table-loading">Could not load leaderboard.</p>';
  }
}

// ── USER UPLOADS ──
async function loadUserUploads() {
  const tableBody = document.getElementById('userTableBody');
  const countEl = document.getElementById('userUploadCount');
  const co2El = document.getElementById('userCo2');

  tableBody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading your records…</td></tr>';

  try {
    const res = await fetch(`${DASH_API}/user/uploads`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load uploads');
    const data = await res.json();
    countEl.textContent = data.count;

    const plasticUploads = data.uploads.filter((u) => u.isPlastic);
    const totalCo2 = plasticUploads.reduce((s, u) => s + (u.co2Saved || 0), 0);
    if (co2El) co2El.textContent = Math.round(totalCo2 * 10) / 10;

    if (plasticUploads.length > 0) {
      renderUserImpactChart(plasticUploads);
      document.getElementById('userChartSection').style.display = 'block';
    }

    if (data.uploads.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="8" class="table-empty">
          <div class="empty-state">
            <div class="empty-icon">📷</div>
            <p>No uploads yet. Start by analyzing some plastic waste!</p>
            <a href="/#upload-section" class="btn-primary" style="margin-top:12px">Analyze Images →</a>
          </div>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = data.uploads.map((u, i) => `
      <tr class="table-row-animate" style="animation-delay:${i * 0.03}s">
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td class="cell-filename">${escHtml(u.fileName)}</td>
        <td><span class="table-badge badge-${(u.plasticType || 'unknown').toLowerCase()}">${u.isPlastic ? u.plasticType : 'N/A'}</span></td>
        <td>${u.isPlastic ? Math.round(u.confidence * 100) + '%' : '—'}</td>
        <td>${u.isPlastic ? escHtml(u.primaryUse) : 'Not Plastic'}</td>
        <td>${u.isPlastic ? u.strength : '—'}</td>
        <td class="cell-co2">${u.isPlastic ? u.co2Saved + ' kg' : '—'}</td>
        <td class="cell-suggestions">
          ${u.isPlastic && u.reuseSuggestions?.length
            ? `<ul class="suggestions-list">${u.reuseSuggestions.map((s) => `<li>${escHtml(s)}</li>`).join('')}</ul>`
            : '—'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" class="table-error">Error: ${err.message}</td></tr>`;
  }
}

function renderUserImpactChart(uploads) {
  const ctx = document.getElementById('userImpactChart');
  if (!ctx) return;
  if (userImpactChartInst) userImpactChartInst.destroy();

  const types = [...new Set(uploads.map((u) => u.plasticType))];
  const co2 = types.map((t) =>
    uploads.filter((u) => u.plasticType === t).reduce((s, u) => s + (u.co2Saved || 0), 0)
  );
  const energy = types.map((t) =>
    uploads.filter((u) => u.plasticType === t).reduce((s, u) => s + (u.energySaved || 0), 0)
  );

  userImpactChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: types,
      datasets: [
        { label: 'CO₂ Saved (kg)', data: co2, backgroundColor: '#00e5a0cc', borderRadius: 6 },
        { label: 'Energy Saved (MJ)', data: energy, backgroundColor: '#00b8d4cc', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#aaa' } } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
        y: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
      },
    },
  });
}

// ── ADMIN ──
async function loadAdminStats() {
  try {
    const res = await fetch(`${DASH_API}/stats`);
    const data = await res.json();
    const el = document.getElementById('adminCo2Total');
    if (el) el.textContent = data.totalCo2 || 0;
  } catch (_) {}
}

async function loadAdminData() {
  const tableBody = document.getElementById('adminTableBody');
  const countEl = document.getElementById('adminUploadCount');

  const plasticType = document.getElementById('filterPlasticType')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';
  const userId = document.getElementById('filterUser')?.value || '';

  const params = new URLSearchParams();
  if (plasticType) params.append('plasticType', plasticType);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (userId) params.append('userId', userId);
  const qs = params.toString() ? `?${params.toString()}` : '';

  tableBody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading all records…</td></tr>';

  try {
    const res = await fetch(`${DASH_API}/admin/uploads${qs}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load uploads');
    const data = await res.json();
    countEl.textContent = data.count;

    const plasticUploads = data.uploads.filter((u) => u.isPlastic);
    if (plasticUploads.length > 0) {
      renderAdminImpactChart(plasticUploads);
      document.getElementById('adminChartSection').style.display = 'block';
    }

    if (data.uploads.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-state"><div class="empty-icon">📋</div><p>No records found.</p></div></td></tr>`;
      return;
    }

    tableBody.innerHTML = data.uploads.map((u, i) => `
      <tr class="table-row-animate" style="animation-delay:${i * 0.02}s">
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td class="cell-user">${escHtml(u.userId?.name || 'Unknown')}</td>
        <td class="cell-filename">${escHtml(u.fileName)}</td>
        <td><span class="table-badge badge-${(u.plasticType || 'unknown').toLowerCase()}">${u.isPlastic ? u.plasticType : 'N/A'}</span></td>
        <td>${u.isPlastic ? Math.round(u.confidence * 100) + '%' : '—'}</td>
        <td>${u.isPlastic ? escHtml(u.primaryUse) : 'Not Plastic'}</td>
        <td>${u.isPlastic ? u.strength : '—'}</td>
        <td class="cell-co2">${u.isPlastic ? u.co2Saved + ' kg' : '—'}</td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="8" class="table-error">Error: ${err.message}</td></tr>`;
  }
}

function renderAdminImpactChart(uploads) {
  const ctx = document.getElementById('adminImpactChart');
  if (!ctx) return;
  if (adminImpactChartInst) adminImpactChartInst.destroy();

  const types = [...new Set(uploads.map((u) => u.plasticType))];
  const co2 = types.map((t) =>
    uploads.filter((u) => u.plasticType === t).reduce((s, u) => s + (u.co2Saved || 0), 0)
  );

  adminImpactChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: types,
      datasets: [{ data: co2, backgroundColor: ['#00e5a0', '#00b8d4', '#ff6b35', '#7c4dff', '#ffd740', '#ff4081'], borderWidth: 0 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#aaa' } } },
    },
  });
}

async function loadAdminUsers() {
  const container = document.getElementById('adminUsersGrid');
  if (!container) return;
  try {
    const res = await fetch(`${DASH_API}/admin/users`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    document.getElementById('adminUserCount').textContent = data.count;

    container.innerHTML = data.users.map((u, i) => `
      <div class="user-card" style="animation-delay:${i * 0.05}s">
        <div class="user-card-avatar">${u.name.charAt(0).toUpperCase()}</div>
        <div class="user-card-info">
          <div class="user-card-name">${escHtml(u.name)}</div>
          <div class="user-card-email">${escHtml(u.email)}</div>
          <div class="user-card-points">⭐ ${u.points || 0} pts · ${u.badge || 'Beginner'}</div>
        </div>
        <span class="role-badge role-${u.role}">${u.role}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p class="table-error">Error: ${err.message}</p>`;
  }
}

function getFilterQueryString() {
  const params = new URLSearchParams();
  const plasticType = document.getElementById('filterPlasticType')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';
  const userId = document.getElementById('filterUser')?.value || '';
  if (plasticType) params.append('plasticType', plasticType);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  if (userId) params.append('userId', userId);
  return params.toString() ? `?${params.toString()}` : '';
}

async function downloadCSV() {
  const btn = document.getElementById('downloadCsvBtn');
  btn.disabled = true; btn.textContent = 'Generating…';
  try {
    const res = await fetch(`${DASH_API}/admin/reports/csv${getFilterQueryString()}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to generate CSV');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PlastiCore_Report_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📄 Download CSV';
  }
}

async function downloadPDF() {
  const btn = document.getElementById('downloadPdfBtn');
  btn.disabled = true; btn.textContent = 'Generating…';
  try {
    const res = await fetch(`${DASH_API}/admin/reports/pdf${getFilterQueryString()}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to generate PDF');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PlastiCore_Admin_Report_${Date.now()}.pdf`; a.click();
    URL.revokeObjectURL(url);
    showToast('PDF downloaded!', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📑 Download PDF';
  }
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
