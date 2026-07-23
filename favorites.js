/*
 * Wander — favorite places (UI layer)
 * -----------------------------------
 * Builds on the account foundation in auth.js. It injects a "save" control
 * onto destination and guide cards (index.html, destinations.html) and onto
 * the hero of the individual *-guide.html pages, and keeps each control in
 * sync with the signed-in account's saved list.
 *
 * Favorites themselves live inside the account record in localStorage — see
 * WanderAuth.addFavorite / removeFavorite / toggleFavorite / getFavorites.
 * This file only handles the interface: rendering buttons, reflecting saved
 * state, toggling on click, and prompting to sign in when nobody is logged in.
 */
(function (global) {
  'use strict';

  var Auth = global.WanderAuth;
  if (!Auth) return; // auth.js must load first.

  // ── One-time styles ──────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('wander-fav-styles')) return;
    var css = [
      '.fav-btn{',
      '  position:absolute;top:14px;right:14px;z-index:5;',
      '  display:inline-flex;align-items:center;justify-content:center;',
      '  width:40px;height:40px;padding:0;border-radius:50%;cursor:pointer;',
      '  background:rgba(250,248,244,0.92);border:1px solid rgba(0,0,0,0.08);',
      '  color:#c9624a;line-height:0;',
      '  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);',
      '  transition:background 0.2s, transform 0.2s;',
      '}',
      '.fav-btn:hover{transform:scale(1.08);background:#fff;}',
      '.fav-btn svg{width:20px;height:20px;display:block;}',
      '.fav-btn__heart{fill:none;stroke:currentColor;stroke-width:1.8;}',
      '.fav-btn.is-fav .fav-btn__heart{fill:currentColor;stroke:currentColor;}',
      // Inline variant used on guide-page heroes.
      '.fav-btn--inline{',
      '  position:static;width:auto;height:auto;border-radius:999px;',
      '  gap:8px;padding:10px 18px;margin-top:18px;color:#fff;',
      '  background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.4);',
      '  font-family:inherit;font-size:0.72rem;font-weight:500;',
      '  letter-spacing:0.12em;text-transform:uppercase;',
      '}',
      '.fav-btn--inline:hover{transform:none;background:rgba(255,255,255,0.26);}',
      '.fav-btn--inline svg{width:16px;height:16px;}',
      '.fav-btn--inline .fav-btn__heart{stroke:#fff;}',
      '.fav-btn--inline.is-fav .fav-btn__heart{fill:#fff;stroke:#fff;}',
      // Sign-in prompt toast.
      '.fav-toast{',
      '  position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);',
      '  z-index:2000;display:flex;align-items:center;gap:16px;',
      '  padding:14px 22px;border-radius:4px;',
      '  background:#1a1714;color:#faf8f4;',
      '  font-family:inherit;font-size:0.9rem;line-height:1.4;',
      '  box-shadow:0 12px 40px rgba(0,0,0,0.28);',
      '  opacity:0;pointer-events:none;transition:opacity 0.25s, transform 0.25s;',
      '}',
      '.fav-toast.is-visible{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}',
      '.fav-toast a{color:#7fd0c6;font-weight:500;border-bottom:1px solid currentColor;}',
      '@media (max-width:560px){.fav-toast{left:16px;right:16px;transform:translateY(20px);width:auto;}',
      '  .fav-toast.is-visible{transform:translateY(0);}}'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'wander-fav-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  var HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path class="fav-btn__heart" d="M12 20.5S3.5 14.4 3.5 8.9C3.5 6.3 5.6 4.5 8 4.5c1.7 0 3.2 1 4 2.4.8-1.4 2.3-2.4 4-2.4 2.4 0 4.5 1.8 4.5 4.4C20.5 14.4 12 20.5 12 20.5z"/>' +
    '</svg>';

  // ── Sign-in prompt ───────────────────────────────────────────
  var toastEl = null;
  var toastTimer = null;
  function promptSignIn() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'fav-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.innerHTML =
        '<span>Sign in to save your favorite places.</span>' +
        '<a href="login.html">Sign in</a>';
      document.body.appendChild(toastEl);
    }
    // Force reflow so the transition runs when re-shown.
    void toastEl.offsetWidth;
    toastEl.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, 4500);
  }

  // ── Button rendering ─────────────────────────────────────────
  function reflect(btn) {
    var favorited = Auth.isFavorite(btn.getAttribute('data-fav-id'));
    var title = btn.getAttribute('data-fav-title') || 'this place';
    btn.classList.toggle('is-fav', favorited);
    btn.setAttribute('aria-pressed', favorited ? 'true' : 'false');
    var label = (favorited ? 'Remove ' : 'Save ') + title +
      (favorited ? ' from favorites' : ' to favorites');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', favorited ? 'Saved — click to remove' : 'Save to favorites');
    var text = btn.querySelector('.fav-btn__text');
    if (text) text.textContent = favorited ? 'Saved' : 'Save';
  }

  function makeButton(place, inline) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fav-btn' + (inline ? ' fav-btn--inline' : '');
    btn.setAttribute('data-fav-id', place.id);
    btn.setAttribute('data-fav-title', place.title);
    btn.setAttribute('data-fav-url', place.url);
    btn.innerHTML = HEART_SVG + (inline ? '<span class="fav-btn__text">Save</span>' : '');

    btn.addEventListener('click', function (e) {
      // Cards are often wrapped in links; keep the click on the button.
      e.preventDefault();
      e.stopPropagation();
      if (!Auth.isSignedIn()) {
        promptSignIn();
        return;
      }
      Auth.toggleFavorite({
        id: btn.getAttribute('data-fav-id'),
        title: btn.getAttribute('data-fav-title'),
        url: btn.getAttribute('data-fav-url')
      });
      reflect(btn);
    });

    reflect(btn);
    return btn;
  }

  // ── Deriving a place from a card ──────────────────────────────
  function guideHrefFrom(el) {
    // The card's own href (destinations.html uses <a class="dest-card">) …
    var href = el.getAttribute('href');
    if (href && /-guide\.html/.test(href)) return href;
    // … otherwise the first inner link to a guide (index.html cards).
    var link = el.querySelector('a[href*="-guide.html"]');
    return link ? link.getAttribute('href') : null;
  }

  function titleFrom(el) {
    var node = el.querySelector('.dest-card__name, .guide-card__title');
    if (!node) return null;
    return node.textContent.replace(/\s+/g, ' ').trim();
  }

  function idFromHref(href) {
    // Normalise to just the filename so the same guide keys consistently
    // regardless of the linking page.
    return String(href).split(/[?#]/)[0].split('/').pop();
  }

  function enhanceCard(el) {
    if (el.getAttribute('data-fav-enhanced') === 'true') return;
    var href = guideHrefFrom(el);
    var title = titleFrom(el);
    if (!href || !title) return;
    el.setAttribute('data-fav-enhanced', 'true');

    // The button is absolutely positioned; make sure the card is a
    // positioning context (dest-card already is; guide-card may not be).
    var pos = global.getComputedStyle(el).position;
    if (pos === 'static' || !pos) el.style.position = 'relative';

    var id = idFromHref(href);
    el.appendChild(makeButton({ id: id, title: title, url: href }, false));
  }

  // Guide pages: add an inline control to the hero.
  function enhanceGuideHero() {
    var content = document.querySelector('.guide-hero__content');
    if (!content || content.querySelector('.fav-btn')) return;
    var titleEl = content.querySelector('.guide-hero__title');
    var id = idFromHref(global.location.pathname.split('/').pop() || '');
    if (!/-guide\.html/.test(id)) return;
    var title = titleEl
      ? titleEl.textContent.replace(/\s+/g, ' ').trim()
      : id.replace('-guide.html', '');
    content.appendChild(makeButton({ id: id, title: title, url: id }, true));
  }

  function enhanceAll() {
    injectStyles();
    var cards = document.querySelectorAll('.dest-card, .guide-card');
    for (var i = 0; i < cards.length; i++) enhanceCard(cards[i]);
    enhanceGuideHero();
  }

  // Keep buttons in sync if the account changes in another tab.
  global.addEventListener('storage', function (e) {
    if (e.key !== 'wander:accounts' && e.key !== 'wander:session') return;
    var btns = document.querySelectorAll('.fav-btn');
    for (var i = 0; i < btns.length; i++) reflect(btns[i]);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll);
  } else {
    enhanceAll();
  }

  // Expose a manual re-scan hook for dynamically added cards.
  global.WanderFavorites = { enhance: enhanceAll, reflectButton: reflect };
})(window);
