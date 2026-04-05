/**
 * PlastiCore AI — Multilingual Support (English + Telugu)
 */
(function () {
  'use strict';

  let currentLang = localStorage.getItem('plasticore_lang') || 'en';
  let translations = {};

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      translations = await res.json();
    } catch (e) {
      translations = {};
    }
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[key]) el.textContent = translations[key];
    });
  }

  async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('plasticore_lang', lang);
    document.documentElement.lang = lang === 'te' ? 'te' : 'en';
    await loadTranslations(lang);
    applyTranslations();
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.textContent = lang === 'te' ? 'EN / తె ✓తె' : 'EN / తె ✓EN';
  }

  function toggleLang() {
    setLang(currentLang === 'en' ? 'te' : 'en');
  }

  async function init() {
    await loadTranslations(currentLang);
    applyTranslations();
    const btn = document.getElementById('langToggleBtn');
    if (btn) {
      btn.textContent = currentLang === 'te' ? 'EN / తె ✓తె' : 'EN / తె';
      btn.addEventListener('click', toggleLang);
    }
  }

  // Expose globally so other scripts can call t(key)
  window.t = function (key) {
    return translations[key] || key;
  };

  window.PlastiLang = { init, setLang, toggleLang };
  document.addEventListener('DOMContentLoaded', init);

  // ── DARK / LIGHT THEME TOGGLE ──
  const savedTheme = localStorage.getItem('plasticore_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('plasticore_theme', next);
        btn.textContent = next === 'dark' ? '🌙' : '☀️';
      });
    }
  });

  // ── GLOBAL TOAST UTILITY ──
  window.showToast = function (message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  };
})();
