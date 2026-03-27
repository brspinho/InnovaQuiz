/**
 * app.js – SPA Router & shared utilities
 */

// ── Socket.IO connection ──────────────────────────────────────────────────────
const socket = io();

// ── Page router ───────────────────────────────────────────────────────────────
const app = {
  currentPage: 'home',

  goTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) {
      target.classList.add('active');
      this.currentPage = pageId;
      window.scrollTo(0, 0);

      // Initialize host setup if entering
      if (pageId === 'host-setup') {
        hostSetup.init();
      }
    }
  },

  showToast(msg, duration = 3000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  },

  AVATARS: ['🦊', '🐼', '🦁', '🐸', '🦄', '🐙', '🦋', '🐺'],

  avatar(index) {
    return this.AVATARS[index % this.AVATARS.length];
  },
};

// ── Global socket error handler ───────────────────────────────────────────────
socket.on('error', ({ message }) => {
  app.showToast('⚠️ ' + message);
});

socket.on('connect_error', () => {
  app.showToast('❌ Erro de conexão com o servidor.');
});

socket.on('disconnect', () => {
  app.showToast('📡 Conexão perdida. Recarregue a página.');
});
