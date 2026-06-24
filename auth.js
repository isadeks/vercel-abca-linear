/**
 * auth.js — Client-side authentication widget for Wander.
 *
 * Drop a <script type="module" src="/auth.js"></script> tag before </body>
 * on any page to enable Sign In / Register / Sign Out in the nav.
 *
 * Renders a "Sign in" button in the element with id="auth-slot" (added to
 * each nav). When authenticated the button becomes the user's name + a
 * "Sign out" option in a dropdown.
 *
 * JWT is stored in localStorage under the key `wander_token`.
 */

const TOKEN_KEY = 'wander_token';

// ── State helpers ─────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

async function register(email, password, name) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setToken(data.token);
  return data.user;
}

async function fetchMe() {
  const data = await apiFetch('/api/auth/me');
  return data.user;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function buildModal() {
  const el = document.createElement('div');
  el.id = 'wander-auth-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'wander-auth-title');
  el.innerHTML = `
    <div class="wam-overlay"></div>
    <div class="wam-box">
      <button class="wam-close" aria-label="Close">&times;</button>
      <h2 class="wam-title" id="wander-auth-title">Sign in</h2>
      <p class="wam-error" id="wam-error" aria-live="assertive"></p>
      <form class="wam-form" novalidate>
        <div class="wam-field wam-field--name" style="display:none">
          <label for="wam-name">Name</label>
          <input id="wam-name" type="text" placeholder="Your name" autocomplete="name" />
        </div>
        <div class="wam-field">
          <label for="wam-email">Email</label>
          <input id="wam-email" type="email" placeholder="you@example.com" autocomplete="email" />
        </div>
        <div class="wam-field">
          <label for="wam-password">Password</label>
          <input id="wam-password" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button type="submit" class="wam-submit">Sign in</button>
      </form>
      <p class="wam-toggle">
        Don't have an account?
        <button class="wam-toggle-btn" type="button">Create one</button>
      </p>
    </div>
  `;

  // Styles (injected once)
  if (!document.getElementById('wander-auth-styles')) {
    const style = document.createElement('style');
    style.id = 'wander-auth-styles';
    style.textContent = `
      #wander-auth-modal { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; }
      #wander-auth-modal.wam-hidden { display:none; }
      .wam-overlay { position:fixed; inset:0; background:rgba(26,23,20,0.6); backdrop-filter:blur(6px); }
      .wam-box { position:relative; z-index:1; background:#faf8f4; border-radius:2px; padding:48px 44px; width:min(420px,94vw); box-shadow:0 32px 80px rgba(26,23,20,.20); border-top:3px solid #2a7a6f; }
      .wam-close { position:absolute; top:16px; right:20px; background:none; border:none; font-size:1.4rem; cursor:pointer; color:#6b6560; line-height:1; transition:color .2s; }
      .wam-close:hover { color:#1a1714; }
      .wam-title { font-family:'Cormorant Garamond',Georgia,serif; font-size:2.2rem; font-weight:400; margin-bottom:24px; color:#1a1714; letter-spacing:.02em; }
      .wam-error { color:#c9624a; font-size:0.82rem; min-height:1.2em; margin-bottom:10px; font-style:italic; }
      .wam-form { display:flex; flex-direction:column; gap:18px; }
      .wam-field { display:flex; flex-direction:column; gap:6px; }
      .wam-field label { font-family:'Inter',system-ui,sans-serif; font-size:0.75rem; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:#6b6560; }
      .wam-field input { padding:12px 16px; border:1px solid #e8e0d0; border-radius:0; font-family:'Inter',system-ui,sans-serif; font-size:0.9rem; background:#fff; color:#1a1714; outline:none; transition:border-color .2s,box-shadow .2s; }
      .wam-field input:focus { border-color:#2a7a6f; box-shadow:0 0 0 3px rgba(42,122,111,.08); }
      .wam-submit { margin-top:4px; padding:14px 28px; background:#2a7a6f; color:#fff; border:1px solid #2a7a6f; border-radius:0; font-family:'Inter',system-ui,sans-serif; font-size:0.78rem; font-weight:500; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; transition:background .2s,border-color .2s; width:100%; }
      .wam-submit:hover { background:#22665c; border-color:#22665c; }
      .wam-submit:disabled { opacity:0.6; cursor:not-allowed; }
      .wam-toggle { margin-top:20px; font-size:0.85rem; color:#6b6560; text-align:center; }
      .wam-toggle-btn { background:none; border:none; color:#2a7a6f; cursor:pointer; font-size:inherit; text-decoration:underline; font-family:inherit; }

      /* Auth slot button */
      .wander-auth-btn { background:none; border:1px solid currentColor; border-radius:0; padding:8px 18px; font-family:'Inter',system-ui,sans-serif; font-size:0.78rem; font-weight:500; letter-spacing:.12em; text-transform:uppercase; cursor:pointer; color:inherit; transition:background .2s,color .2s,border-color .2s; }
      .wander-auth-btn:hover { background:rgba(255,255,255,.15); }
      .nav.scrolled .wander-auth-btn:hover { background:#2a7a6f; color:#fff; border-color:#2a7a6f; }

      /* User menu dropdown */
      .wander-user-menu { position:relative; display:inline-block; }
      .wander-user-name { background:none; border:none; cursor:pointer; font-family:'Inter',system-ui,sans-serif; font-size:0.78rem; font-weight:500; letter-spacing:.12em; text-transform:uppercase; color:inherit; display:flex; align-items:center; gap:6px; transition:color .2s; }
      .wander-user-name::after { content:'▾'; font-size:0.65rem; opacity:.7; }
      .wander-user-dropdown { display:none; position:absolute; right:0; top:calc(100% + 10px); background:#faf8f4; border:1px solid #e8e0d0; border-radius:2px; box-shadow:0 12px 32px rgba(26,23,20,.14); min-width:160px; padding:6px; }
      .wander-user-menu:hover .wander-user-dropdown,
      .wander-user-menu:focus-within .wander-user-dropdown { display:block; }
      .wander-user-dropdown button { display:block; width:100%; background:none; border:none; text-align:left; padding:10px 14px; font-family:'Inter',system-ui,sans-serif; font-size:0.75rem; letter-spacing:.1em; text-transform:uppercase; color:#1a1714; cursor:pointer; border-radius:0; transition:background .15s,color .15s; }
      .wander-user-dropdown button:hover { background:#f5f0e8; color:#2a7a6f; }
    `;
    document.head.appendChild(style);
  }

  return el;
}

// ── Mount into page ───────────────────────────────────────────────────────────

let _modal = null;
let _mode = 'login'; // 'login' | 'register'

function openModal(startMode = 'login') {
  _mode = startMode;
  syncModalMode();
  _modal.classList.remove('wam-hidden');
  _modal.querySelector('#wam-error').textContent = '';
  _modal.querySelector('#wam-email').value = '';
  _modal.querySelector('#wam-password').value = '';
  _modal.querySelector('#wam-name').value = '';
  setTimeout(() => _modal.querySelector('#wam-email').focus(), 50);
}

function closeModal() {
  _modal.classList.add('wam-hidden');
}

function syncModalMode() {
  const isRegister = _mode === 'register';
  _modal.querySelector('.wam-title').textContent = isRegister ? 'Create account' : 'Sign in';
  _modal.querySelector('.wam-submit').textContent = isRegister ? 'Create account' : 'Sign in';
  _modal.querySelector('.wam-toggle').innerHTML = isRegister
    ? 'Already have an account? <button class="wam-toggle-btn" type="button">Sign in</button>'
    : "Don't have an account? <button class=\"wam-toggle-btn\" type=\"button\">Create one</button>";
  _modal.querySelector('.wam-field--name').style.display = isRegister ? '' : 'none';
  _modal.querySelector('#wam-password').autocomplete = isRegister ? 'new-password' : 'current-password';

  // Re-attach toggle handler after innerHTML replacement
  _modal.querySelector('.wam-toggle-btn').addEventListener('click', () => {
    _mode = _mode === 'login' ? 'register' : 'login';
    syncModalMode();
  });
}

function renderAuthSlot(slot, user) {
  slot.innerHTML = '';
  if (user) {
    const menu = document.createElement('div');
    menu.className = 'wander-user-menu';
    menu.innerHTML = `
      <button class="wander-user-name" aria-haspopup="true">${escHtml(user.name)}</button>
      <div class="wander-user-dropdown" role="menu">
        <button id="wam-signout">Sign out</button>
      </div>
    `;
    menu.querySelector('#wam-signout').addEventListener('click', () => {
      clearToken();
      renderAuthSlot(slot, null);
    });
    slot.appendChild(menu);
  } else {
    const btn = document.createElement('button');
    btn.className = 'wander-auth-btn';
    btn.textContent = 'Sign in';
    btn.addEventListener('click', () => openModal('login'));
    slot.appendChild(btn);
  }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  const slot = document.getElementById('auth-slot');
  if (!slot) return; // nav has no auth slot on this page

  _modal = buildModal();
  _modal.classList.add('wam-hidden');
  document.body.appendChild(_modal);

  // Close on overlay click or Escape
  _modal.querySelector('.wam-overlay').addEventListener('click', closeModal);
  _modal.querySelector('.wam-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !_modal.classList.contains('wam-hidden')) closeModal();
  });

  // Form submit
  _modal.querySelector('.wam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = _modal.querySelector('#wam-error');
    const submitBtn = _modal.querySelector('.wam-submit');
    const email = _modal.querySelector('#wam-email').value.trim();
    const password = _modal.querySelector('#wam-password').value;
    const name = _modal.querySelector('#wam-name').value.trim();

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = _mode === 'register' ? 'Creating…' : 'Signing in…';

    try {
      let user;
      if (_mode === 'register') {
        user = await register(email, password, name);
      } else {
        user = await login(email, password);
      }
      closeModal();
      renderAuthSlot(slot, user);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = _mode === 'register' ? 'Create account' : 'Sign in';
    }
  });

  // Toggle handler (initial)
  _modal.querySelector('.wam-toggle-btn').addEventListener('click', () => {
    _mode = _mode === 'login' ? 'register' : 'login';
    syncModalMode();
  });

  // Try to restore session from stored token
  let currentUser = null;
  const token = getToken();
  if (token) {
    try {
      currentUser = await fetchMe();
    } catch {
      clearToken();
    }
  }
  renderAuthSlot(slot, currentUser);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
