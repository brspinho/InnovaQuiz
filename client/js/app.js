/**
 * app.js – SPA Router & shared utilities
 */

// ── Socket.IO connection ──────────────────────────────────────────────────────
const socket = io();

// ─── AUTH LOGIC ──────────────────────────────────────────────────────────────
const hostAuth = {
  isAuthenticated: false,
  
  show() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex';
    const input = document.getElementById('host-pass-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
  },

  hide() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
  },

  verify() {
    const input = document.getElementById('host-pass-input');
    if (!input) return;
    const pass = input.value;
    socket.emit('check-host-password', pass, (isValid) => {
      if (isValid) {
        this.isAuthenticated = true;
        this.hide();
        app.goTo('host-setup');
        app.showToast('🔓 Acesso autorizado');
      } else {
        const err = document.getElementById('auth-error');
        if (err) err.style.display = 'block';
        input.value = '';
        input.focus();
      }
    });
  }
};

// Listen for Enter key on password input
document.addEventListener('DOMContentLoaded', () => {
  const passInput = document.getElementById('host-pass-input');
  if (passInput) {
    passInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') hostAuth.verify();
    });
  }
});

// ── Page router ───────────────────────────────────────────────────────────────
const app = {
  socket,
  currentPage: 'home',

  goTo(pageId) {
    if (pageId === 'host-setup' && !hostAuth.isAuthenticated) {
      hostAuth.show();
      return;
    }

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
