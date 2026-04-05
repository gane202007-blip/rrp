/**
 * PlastiCore AI — Marketplace Frontend Logic
 */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('marketGrid');
  const modal = document.getElementById('listingModal');
  const openBtn = document.getElementById('openListingModal');
  const closeBtn = document.getElementById('closeListingModal');
  const form = document.getElementById('listingForm');
  const formMsg = document.getElementById('mktFormMsg');
  const applyFilter = document.getElementById('mktApplyFilter');
  const categoryFilter = document.getElementById('mktCategoryFilter');
  const typeFilter = document.getElementById('mktTypeFilter');

  const token = localStorage.getItem('plasticore_token');

  // ── Load Listings ──
  async function loadListings(category = '', plasticType = '') {
    grid.innerHTML = '<div class="table-loading">Loading listings…</div>';
    try {
      let url = '/api/marketplace';
      const params = [];
      if (category) params.push(`category=${category}`);
      if (plasticType) params.push(`plasticType=${plasticType}`);
      if (params.length) url += '?' + params.join('&');

      const res = await fetch(url);
      const data = await res.json();

      if (!data.items || data.items.length === 0) {
        grid.innerHTML = '<p class="table-loading">No listings found. Be the first to list!</p>';
        return;
      }

      grid.innerHTML = data.items.map((item) => `
        <div class="market-card">
          <div class="market-card-header">
            <span class="tag ${item.plasticType?.toLowerCase()}">${item.plasticType || 'Unknown'}</span>
            <span class="market-badge ${item.category === 'donate' ? 'badge-donate' : 'badge-sell'}">
              ${item.category === 'donate' ? '🎁 Free' : '💰 For Sale'}
            </span>
          </div>
          <h3 class="market-card-title">${escapeHtml(item.title)}</h3>
          <p class="market-card-desc">${escapeHtml(item.description || '')}</p>
          <div class="market-card-meta">
            ${item.quantity ? `<span>📦 ${escapeHtml(item.quantity)}</span>` : ''}
            ${item.category === 'sell' && item.price > 0 ? `<span>₹${item.price}</span>` : ''}
          </div>
          <div class="market-card-footer">
            <span class="market-card-user">👤 ${escapeHtml(item.userId?.name || 'Anonymous')}</span>
            ${item.contact ? `<span class="market-card-contact">📞 ${escapeHtml(item.contact)}</span>` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      grid.innerHTML = '<p class="table-loading">Failed to load listings.</p>';
    }
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  applyFilter?.addEventListener('click', () => {
    loadListings(categoryFilter.value, typeFilter.value);
  });

  // ── Modal ──
  openBtn?.addEventListener('click', () => {
    if (!token) {
      showToast('Please log in to create a listing.', 'error');
      setTimeout(() => (window.location.href = '/login.html'), 1500);
      return;
    }
    modal.style.display = 'flex';
  });

  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // ── Submit Listing ──
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';

    const payload = {
      title: document.getElementById('mktTitle').value.trim(),
      category: document.getElementById('mktCategory').value,
      plasticType: document.getElementById('mktPlasticType').value,
      quantity: document.getElementById('mktQuantity').value.trim(),
      price: parseFloat(document.getElementById('mktPrice').value) || 0,
      description: document.getElementById('mktDescription').value.trim(),
      contact: document.getElementById('mktContact').value.trim(),
    };

    if (!payload.title) {
      formMsg.textContent = 'Title is required.';
      formMsg.className = 'form-msg form-msg-error';
      return;
    }

    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Listing published!', 'success');
        modal.style.display = 'none';
        form.reset();
        loadListings();
      } else {
        formMsg.textContent = data.message || 'Failed to publish.';
        formMsg.className = 'form-msg form-msg-error';
      }
    } catch (err) {
      formMsg.textContent = 'Network error. Try again.';
      formMsg.className = 'form-msg form-msg-error';
    }
  });

  // Initial load
  loadListings();
});
