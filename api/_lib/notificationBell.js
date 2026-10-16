/**
 * notificationBell.js
 *
 * Self-contained notifications bell UI component.
 *
 * Usage (browser module script):
 *   import { mountNotificationBell } from '/api/_lib/notificationBell.js';
 *   mountNotificationBell(document.getElementById('nav-bell-slot'));
 *
 * The component:
 *   1. Renders a bell icon button with an unread-count badge.
 *   2. Polls /api/notify/inapp every POLL_INTERVAL_MS milliseconds.
 *   3. On click, toggles a drop-down feed panel.
 *   4. Clicking a notification item marks it read in the store and navigates
 *      to its href (if any).
 *   5. A "Mark all read" action is included in the panel.
 *
 * Styling: injects minimal <style> once; all class names are prefixed `nb-`
 * to avoid collisions with page styles.
 *
 * Dependencies: notificationStore (same package), no external libs.
 */

import { createNotificationStore } from './notificationStore.js';

const POLL_INTERVAL_MS = 30_000; // 30 s
const FEED_URL = '/api/notify/inapp';

const STYLES = `
.nb-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.nb-bell-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s;
  color: inherit;
}
.nb-bell-btn:hover {
  background: rgba(0,0,0,0.08);
}
.nb-bell-btn svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.nb-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  background: #c9624a;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  font-family: system-ui, sans-serif;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  pointer-events: none;
}
.nb-badge[hidden] { display: none; }
.nb-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 420px;
  background: #fff;
  border: 1px solid #e8e0d0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
}
.nb-panel[hidden] { display: none; }
.nb-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e0d0;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1714;
}
.nb-mark-all-btn {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #2a7a6f;
  font-family: system-ui, sans-serif;
}
.nb-mark-all-btn:hover { text-decoration: underline; }
.nb-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nb-empty {
  padding: 32px 16px;
  text-align: center;
  color: #6b6560;
  font-size: 13px;
  font-family: system-ui, sans-serif;
}
.nb-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f0e8;
  cursor: pointer;
  text-align: left;
  font-family: system-ui, sans-serif;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  transition: background 0.12s;
}
.nb-item:last-child { border-bottom: none; }
.nb-item:hover { background: #faf8f4; }
.nb-item--unread { background: #f0f9f8; }
.nb-item--unread:hover { background: #e8f4f3; }
.nb-item__title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1714;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nb-item--unread .nb-item__title::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2a7a6f;
  margin-right: 6px;
  vertical-align: middle;
  flex-shrink: 0;
}
.nb-item__body {
  font-size: 12px;
  color: #6b6560;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nb-item__ts {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
}
`;

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  const el = document.createElement('style');
  el.textContent = STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

/** Format ISO timestamp to a human-readable relative string. */
function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Mount a notifications bell into the given container element.
 *
 * @param {HTMLElement} container - Where to render the bell.
 * @param {{ pollInterval?: number, feedUrl?: string }} [opts]
 * @returns {{ destroy: () => void }} - Call destroy() to clean up.
 */
export function mountNotificationBell(container, opts = {}) {
  const pollInterval = opts.pollInterval ?? POLL_INTERVAL_MS;
  const feedUrl = opts.feedUrl ?? FEED_URL;

  injectStyles();

  const store = createNotificationStore();

  // ── DOM ────────────────────────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'nb-wrap';

  const bellBtn = document.createElement('button');
  bellBtn.className = 'nb-bell-btn';
  bellBtn.setAttribute('aria-label', 'Notifications');
  bellBtn.setAttribute('aria-haspopup', 'true');
  bellBtn.setAttribute('aria-expanded', 'false');
  bellBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>`;

  const badge = document.createElement('span');
  badge.className = 'nb-badge';
  badge.setAttribute('aria-live', 'polite');
  badge.hidden = true;

  bellBtn.appendChild(badge);

  const panel = document.createElement('div');
  panel.className = 'nb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Notifications');
  panel.hidden = true;

  const header = document.createElement('div');
  header.className = 'nb-panel-header';
  const heading = document.createElement('span');
  heading.textContent = 'Notifications';
  const markAllBtn = document.createElement('button');
  markAllBtn.className = 'nb-mark-all-btn';
  markAllBtn.textContent = 'Mark all read';
  header.appendChild(heading);
  header.appendChild(markAllBtn);

  const list = document.createElement('ul');
  list.className = 'nb-list';

  panel.appendChild(header);
  panel.appendChild(list);

  wrap.appendChild(bellBtn);
  wrap.appendChild(panel);
  container.appendChild(wrap);

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderList() {
    list.innerHTML = '';
    const items = store.getAll();
    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'nb-empty';
      empty.textContent = 'No notifications yet.';
      list.appendChild(empty);
      return;
    }
    items.forEach(n => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = `nb-item${store.isRead(n.id) ? '' : ' nb-item--unread'}`;
      btn.innerHTML = `
        <div class="nb-item__title">${escapeHtml(n.title)}</div>
        <div class="nb-item__body">${escapeHtml(n.body)}</div>
        <div class="nb-item__ts">${relativeTime(n.ts)}</div>`;
      btn.addEventListener('click', () => {
        store.markRead(n.id);
        if (n.href) {
          window.location.href = n.href;
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function renderBadge() {
    const count = store.unreadCount();
    if (count === 0) {
      badge.hidden = true;
      badge.textContent = '';
    } else {
      badge.hidden = false;
      badge.textContent = count > 99 ? '99+' : String(count);
    }
    bellBtn.setAttribute('aria-label', count === 0 ? 'Notifications' : `Notifications — ${count} unread`);
  }

  function render() {
    renderBadge();
    if (!panel.hidden) {
      renderList();
    }
  }

  store.subscribe(render);

  // ── Toggle panel ───────────────────────────────────────────────────────────
  let panelOpen = false;

  function openPanel() {
    panelOpen = true;
    panel.hidden = false;
    bellBtn.setAttribute('aria-expanded', 'true');
    renderList();
  }

  function closePanel() {
    panelOpen = false;
    panel.hidden = true;
    bellBtn.setAttribute('aria-expanded', 'false');
  }

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelOpen ? closePanel() : openPanel();
  });

  markAllBtn.addEventListener('click', () => {
    store.markAllRead();
    renderList();
  });

  // Close on outside click
  function onDocClick(e) {
    if (!wrap.contains(e.target)) {
      closePanel();
    }
  }
  document.addEventListener('click', onDocClick);

  // Close on Escape
  function onKeydown(e) {
    if (e.key === 'Escape' && panelOpen) {
      closePanel();
      bellBtn.focus();
    }
  }
  document.addEventListener('keydown', onKeydown);

  // ── Polling ────────────────────────────────────────────────────────────────
  async function fetchFeed() {
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        store.mergeNotifications(data);
      }
    } catch {
      // network error — swallow
    }
  }

  // Initial fetch
  fetchFeed();
  const timerId = setInterval(fetchFeed, pollInterval);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  return {
    destroy() {
      clearInterval(timerId);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeydown);
      container.removeChild(wrap);
    },
  };
}

/** Basic HTML escape to prevent XSS in notification titles/bodies. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
