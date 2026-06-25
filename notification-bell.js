/**
 * notification-bell.js — In-app notification center widget.
 *
 * Mounts a bell icon with an unread-count badge into any element that has
 * [data-notification-bell].  Clicking it opens a dropdown that lists
 * notifications with mark-as-read and clear-all actions.
 *
 * Usage (HTML):
 *   <div data-notification-bell data-user-id="demo-user"></div>
 *
 * The widget uses /api/notifications for all data operations.
 * It polls every 30 s while the page is visible (visibilitychange / focus).
 *
 * No external dependencies — vanilla JS + inline CSS injected once.
 */

// ── Inline styles (injected once) ─────────────────────────────────────────────

const STYLE_ID = '__wander-notif-styles__';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* ── Bell button ──────────────────────────────────────────────── */
    .nb-bell-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nb-bell-btn {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      color: inherit;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nb-bell-btn:hover { background: rgba(0,0,0,0.07); }
    .nb-bell-btn:focus-visible {
      outline: 2px solid #2a7a6f;
      outline-offset: 2px;
    }

    .nb-badge {
      position: absolute;
      top: 4px; right: 4px;
      min-width: 16px; height: 16px;
      border-radius: 8px;
      background: #c9624a;
      color: white;
      font-size: 10px;
      font-weight: 600;
      line-height: 16px;
      text-align: center;
      padding: 0 4px;
      pointer-events: none;
      display: none;
    }
    .nb-badge[data-count]:not([data-count="0"]) { display: block; }

    /* ── Dropdown ─────────────────────────────────────────────────── */
    .nb-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 360px;
      max-width: calc(100vw - 32px);
      background: #fff;
      border: 1px solid #e8e0d0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14);
      z-index: 9999;
      overflow: hidden;
      display: none;
      flex-direction: column;
    }
    .nb-dropdown.nb-open { display: flex; }

    .nb-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid #e8e0d0;
    }
    .nb-header-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.1rem;
      font-weight: 400;
      color: #1a1714;
      margin: 0;
    }
    .nb-header-actions {
      display: flex;
      gap: 8px;
    }

    .nb-action-btn {
      background: none;
      border: 1px solid #e8e0d0;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b6560;
      cursor: pointer;
      padding: 4px 10px;
      transition: border-color 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .nb-action-btn:hover { border-color: #6b6560; color: #1a1714; }
    .nb-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── List ─────────────────────────────────────────────────────── */
    .nb-list {
      list-style: none;
      padding: 0;
      margin: 0;
      overflow-y: auto;
      max-height: 380px;
    }

    .nb-empty {
      padding: 32px 16px;
      text-align: center;
      color: #6b6560;
      font-size: 0.88rem;
    }

    .nb-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #f0ece4;
      cursor: pointer;
      transition: background 0.15s;
    }
    .nb-item:last-child { border-bottom: none; }
    .nb-item:hover { background: #faf8f4; }
    .nb-item.nb-unread { background: #f5f9f8; }
    .nb-item.nb-unread:hover { background: #ecf4f3; }

    .nb-dot {
      flex-shrink: 0;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #2a7a6f;
      margin-top: 6px;
      visibility: hidden;
    }
    .nb-unread .nb-dot { visibility: visible; }

    .nb-item-body { flex: 1; min-width: 0; }
    .nb-item-title {
      font-size: 0.88rem;
      font-weight: 500;
      color: #1a1714;
      line-height: 1.4;
      margin: 0 0 2px;
    }
    .nb-item-body-text {
      font-size: 0.78rem;
      color: #6b6560;
      line-height: 1.5;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nb-item-meta {
      font-size: 0.7rem;
      color: #a8a098;
    }

    /* ── Footer ───────────────────────────────────────────────────── */
    .nb-footer {
      padding: 10px 16px;
      border-top: 1px solid #e8e0d0;
      text-align: center;
    }
    .nb-footer a {
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #2a7a6f;
      text-decoration: none;
      border-bottom: 1px solid #2a7a6f;
      padding-bottom: 1px;
    }
    .nb-footer a:hover { opacity: 0.7; }
  `;
  document.head.appendChild(style);
}

// ── Time formatting ───────────────────────────────────────────────────────────

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ── Bell icon SVG ─────────────────────────────────────────────────────────────

const BELL_SVG = `
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
       aria-hidden="true" focusable="false"
       xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z"
          stroke="currentColor" stroke-width="1.4"
          stroke-linejoin="round" fill="none"/>
    <path d="M8.5 16.5a1.5 1.5 0 003 0"
          stroke="currentColor" stroke-width="1.4"
          stroke-linecap="round" fill="none"/>
  </svg>
`;

// ── NotificationBell class ────────────────────────────────────────────────────

class NotificationBell {
  /**
   * @param {HTMLElement} root  - the [data-notification-bell] element
   */
  constructor(root) {
    this._root    = root;
    this._userId  = root.dataset.userId || 'demo-user';
    this._apiBase = '/api/notifications';
    this._open    = false;
    this._notifications = [];
    this._unreadCount   = 0;
    this._pollTimer     = null;

    this._build();
    this._attachEvents();
    this._load();
    this._startPolling();
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  _build() {
    this._root.innerHTML = '';
    this._root.className = 'nb-bell-wrap';

    // Bell button
    this._btn = document.createElement('button');
    this._btn.type = 'button';
    this._btn.className = 'nb-bell-btn';
    this._btn.setAttribute('aria-label', 'Notifications');
    this._btn.setAttribute('aria-haspopup', 'true');
    this._btn.setAttribute('aria-expanded', 'false');
    this._btn.innerHTML = BELL_SVG;

    // Badge
    this._badge = document.createElement('span');
    this._badge.className = 'nb-badge';
    this._badge.setAttribute('aria-hidden', 'true');
    this._btn.appendChild(this._badge);

    // Dropdown
    this._dropdown = document.createElement('div');
    this._dropdown.className = 'nb-dropdown';
    this._dropdown.setAttribute('role', 'dialog');
    this._dropdown.setAttribute('aria-label', 'Notifications');

    // Header
    const header = document.createElement('div');
    header.className = 'nb-header';

    const title = document.createElement('h2');
    title.className = 'nb-header-title';
    title.textContent = 'Notifications';

    const actions = document.createElement('div');
    actions.className = 'nb-header-actions';

    this._markAllBtn = document.createElement('button');
    this._markAllBtn.type = 'button';
    this._markAllBtn.className = 'nb-action-btn';
    this._markAllBtn.textContent = 'Mark all read';

    this._clearBtn = document.createElement('button');
    this._clearBtn.type = 'button';
    this._clearBtn.className = 'nb-action-btn';
    this._clearBtn.textContent = 'Clear all';

    actions.appendChild(this._markAllBtn);
    actions.appendChild(this._clearBtn);
    header.appendChild(title);
    header.appendChild(actions);

    // List
    this._list = document.createElement('ul');
    this._list.className = 'nb-list';
    this._list.setAttribute('aria-live', 'polite');

    // Footer link to settings
    const footer = document.createElement('div');
    footer.className = 'nb-footer';
    footer.innerHTML = '<a href="settings.html">Notification settings</a>';

    this._dropdown.appendChild(header);
    this._dropdown.appendChild(this._list);
    this._dropdown.appendChild(footer);

    this._root.appendChild(this._btn);
    this._root.appendChild(this._dropdown);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _attachEvents() {
    this._btn.addEventListener('click', () => this._toggle());

    this._markAllBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this._markAllRead();
    });

    this._clearBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this._clearAll();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this._open && !this._root.contains(e.target)) {
        this._close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) this._close();
    });

    // Reload on page focus / visibility regain
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this._load();
    });
    window.addEventListener('focus', () => this._load());
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  _toggle() {
    this._open ? this._close() : this._openDropdown();
  }

  _openDropdown() {
    this._open = true;
    this._dropdown.classList.add('nb-open');
    this._btn.setAttribute('aria-expanded', 'true');
    this._load();
  }

  _close() {
    this._open = false;
    this._dropdown.classList.remove('nb-open');
    this._btn.setAttribute('aria-expanded', 'false');
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  async _load() {
    try {
      const res = await fetch(
        `${this._apiBase}?userId=${encodeURIComponent(this._userId)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      this._notifications = data.notifications ?? [];
      this._unreadCount   = data.unreadCount   ?? 0;
      this._render();
    } catch {
      // silently ignore network errors
    }
  }

  async _markOneRead(notifId) {
    try {
      const res = await fetch(
        `${this._apiBase}?userId=${encodeURIComponent(this._userId)}&notificationId=${encodeURIComponent(notifId)}`,
        { method: 'PATCH' },
      );
      if (!res.ok) return;
      const data = await res.json();
      const updated = data.notification;
      this._notifications = this._notifications.map(n =>
        n.id === updated.id ? updated : n,
      );
      this._unreadCount = this._notifications.filter(n => !n.read).length;
      this._render();
    } catch {
      // ignore
    }
  }

  async _markAllRead() {
    this._markAllBtn.disabled = true;
    try {
      const res = await fetch(
        `${this._apiBase}?userId=${encodeURIComponent(this._userId)}&action=read-all`,
        { method: 'POST' },
      );
      if (!res.ok) return;
      await this._load();
    } catch {
      // ignore
    } finally {
      this._markAllBtn.disabled = false;
    }
  }

  async _clearAll() {
    this._clearBtn.disabled = true;
    try {
      const res = await fetch(
        `${this._apiBase}?userId=${encodeURIComponent(this._userId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) return;
      this._notifications = [];
      this._unreadCount   = 0;
      this._render();
    } catch {
      // ignore
    } finally {
      this._clearBtn.disabled = false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    // Update badge
    if (this._unreadCount > 0) {
      this._badge.setAttribute('data-count', String(this._unreadCount));
      this._badge.textContent = this._unreadCount > 99 ? '99+' : String(this._unreadCount);
    } else {
      this._badge.setAttribute('data-count', '0');
    }

    // Update aria-label on button
    this._btn.setAttribute(
      'aria-label',
      this._unreadCount > 0
        ? `Notifications — ${this._unreadCount} unread`
        : 'Notifications',
    );

    // Update list
    this._list.innerHTML = '';
    if (this._notifications.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'nb-empty';
      empty.textContent = 'You\'re all caught up ✓';
      this._list.appendChild(empty);
      return;
    }

    for (const n of this._notifications) {
      const li = document.createElement('li');
      li.className = `nb-item${n.read ? '' : ' nb-unread'}`;
      li.setAttribute('data-id', n.id);

      const dot = document.createElement('span');
      dot.className = 'nb-dot';
      dot.setAttribute('aria-hidden', 'true');

      const body = document.createElement('div');
      body.className = 'nb-item-body';

      const titleEl = document.createElement('p');
      titleEl.className = 'nb-item-title';
      titleEl.textContent = n.title;

      const meta = document.createElement('p');
      meta.className = 'nb-item-meta';
      meta.textContent = relativeTime(n.createdAt);

      body.appendChild(titleEl);

      if (n.body) {
        const bodyText = document.createElement('p');
        bodyText.className = 'nb-item-body-text';
        bodyText.textContent = n.body;
        body.appendChild(bodyText);
      }

      body.appendChild(meta);
      li.appendChild(dot);
      li.appendChild(body);

      if (!n.read) {
        li.title = 'Click to mark as read';
        li.addEventListener('click', () => this._markOneRead(n.id));
      }

      this._list.appendChild(li);
    }
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  _startPolling() {
    const INTERVAL_MS = 30_000;
    this._pollTimer = setInterval(() => {
      if (!document.hidden) this._load();
    }, INTERVAL_MS);
  }

  destroy() {
    clearInterval(this._pollTimer);
  }
}

// ── Auto-mount on DOMContentLoaded ────────────────────────────────────────────

function mount() {
  injectStyles();
  const roots = document.querySelectorAll('[data-notification-bell]');
  roots.forEach(root => new NotificationBell(root));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

export { NotificationBell };
