
// ── NFT Detail Modal ─────────────────────────────────────────
async function showNftModal(slug) {
  const overlay = document.getElementById('nft-modal-overlay');
  const img     = document.getElementById('nft-modal-img');
  const title   = document.getElementById('nft-modal-title');
  const sub     = document.getElementById('nft-modal-sub');
  const rows    = document.getElementById('nft-modal-rows');
  const link    = document.getElementById('nft-modal-link');

  // عرض مبدئي فوري
  img.src = `/nft-image/${slug}`;
  title.textContent = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  sub.textContent = 'NFT · Fragment';
  rows.innerHTML = '<div style="color:var(--t2);text-align:center;padding:20px">جارٍ التحميل…</div>';
  link.href = `https://t.me/nft/${slug}`;
  overlay.classList.add('show');

  // جلب البيانات
  try {
    const res = await fetch(`/nft-image-data/${slug}`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const d = await res.json();
      title.textContent = d.name || title.textContent;
      if (d.image) img.src = d.image;
      const attrs = d.attributes || [];
      const get = (k) => attrs.find(a => a.trait_type === k)?.value || '—';
      rows.innerHTML = `
        <div class="nft-modal-row"><span class="nft-modal-label">النموذج</span><span class="nft-modal-val">${escHtml(get('Model'))}</span></div>
        <div class="nft-modal-row"><span class="nft-modal-label">الرمز</span><span class="nft-modal-val">${escHtml(get('Symbol'))}</span></div>
        <div class="nft-modal-row"><span class="nft-modal-label">الخلفية</span><span class="nft-modal-val">${escHtml(get('Backdrop'))}</span></div>
        <div class="nft-modal-row"><span class="nft-modal-label">المجموعة</span><span class="nft-modal-val">${escHtml(d.collection?.name || '—')}</span></div>
      `;
    }
  } catch (_) {}
}

function closeNftModal() {
  document.getElementById('nft-modal-overlay').classList.remove('show');
}

// BOC builder
function buildBOC(comment) {
  const txt = new TextEncoder().encode(comment);
  const data = new Uint8Array(4 + txt.length);
  data.set(txt, 4);
  const refs = 0, bits = data.length * 8;
  const d1 = refs;
  const d2 = Math.ceil(bits / 8) + Math.floor(bits / 8);
  const cell = new Uint8Array([d1, d2, ...data]);
  const size = cell.length;
  const boc = new Uint8Array([0xb5,0xee,0x9c,0x72,0x01,0x01,size+3,0x01,0x01,0x00,size,...cell]);
  return btoa(String.fromCharCode(...boc));
}

/* ════════════════════════════════════
   GramEscrow — app.js
════════════════════════════════════ */

const API_BASE = '';

// ── Telegram WebApp Init ──────────────────────────────────────
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#05050D');
  tg.setBackgroundColor('#05050D');
}
function getInitData() { return tg?.initData || ''; }

// ── Firebase Auth (Android App — بدون Telegram) ───────────────
// يُفعَّل فقط عند غياب Telegram WebApp
let _firebaseUser = null;

async function _getFirebaseToken() {
  if (!_firebaseUser) return null;
  try { return await _firebaseUser.getIdToken(); }
  catch (_) { return null; }
}

function _isFirebaseMode() { return !tg && typeof firebase !== 'undefined'; }

// تهيئة Firebase عند التحميل
function _initFirebase() {
  if (tg || typeof firebase === 'undefined') return;
  firebase.auth().onAuthStateChanged(async (user) => {
    _firebaseUser = user;
    if (user) {
      // مستخدم مسجّل — أخفِ شاشة الدخول وابدأ التطبيق
      document.getElementById('fb-auth-screen')?.remove();
      init();
    } else {
      // غير مسجّل — أظهر شاشة الدخول
      _showFirebaseAuthScreen();
    }
  });
}

function _showFirebaseAuthScreen() {
  if (document.getElementById('fb-auth-screen')) return;
  const screen = document.createElement('div');
  screen.id = 'fb-auth-screen';
  screen.innerHTML = `
    <div class="fb-auth-bg">
      <div class="sp-b1"></div><div class="sp-b2"></div><div class="sp-b3"></div>
    </div>
    <div class="fb-auth-card">
      <div class="fb-auth-logo">
        <img src="assets/logo.jpg" alt="Hamogram" style="width:64px;height:64px;border-radius:16px;object-fit:cover;">
      </div>
      <h2 class="fb-auth-title">Hamo<span>gram</span></h2>
      <p class="fb-auth-sub">Sign in to continue</p>
      <div id="fb-auth-error" class="fb-auth-err" style="display:none"></div>
      <button class="btn btn-ton fb-auth-btn" id="fb-google-btn" onclick="_signInGoogle()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <div class="fb-auth-divider"><span>or</span></div>
      <input class="finput fb-auth-input" id="fb-email" type="email" placeholder="Email address" autocomplete="email">
      <input class="finput fb-auth-input" id="fb-password" type="password" placeholder="Password" autocomplete="current-password">
      <button class="btn btn-glass fb-auth-btn" id="fb-login-btn" onclick="_signInEmail()">Sign In</button>
      <button class="btn fb-auth-btn" id="fb-register-btn" onclick="_registerEmail()" style="background:transparent;color:var(--ton);border:1.5px solid var(--ton)">Create Account</button>
    </div>
  `;
  document.body.appendChild(screen);
}

async function _signInGoogle() {
  const btn = document.getElementById('fb-google-btn');
  const errEl = document.getElementById('fb-auth-error');
  btn.disabled = true; btn.textContent = 'Opening…';
  errEl.style.display = 'none';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ client_id: '63882007578-c5178lvbvcbgnad3gca254i20gb1okin.apps.googleusercontent.com' });
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continue with Google`;
  }
}

async function _signInEmail() {
  const email = document.getElementById('fb-email')?.value?.trim();
  const pass  = document.getElementById('fb-password')?.value;
  const errEl = document.getElementById('fb-auth-error');
  const btn   = document.getElementById('fb-login-btn');
  if (!email || !pass) { errEl.textContent = 'Enter email and password'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  errEl.style.display = 'none';
  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function _registerEmail() {
  const email = document.getElementById('fb-email')?.value?.trim();
  const pass  = document.getElementById('fb-password')?.value;
  const errEl = document.getElementById('fb-auth-error');
  const btn   = document.getElementById('fb-register-btn');
  if (!email || !pass) { errEl.textContent = 'Enter email and password'; errEl.style.display = 'block'; return; }
  if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Creating…';
  errEl.style.display = 'none';
  try {
    await firebase.auth().createUserWithEmailAndPassword(email, pass);
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

// ── API Helper ────────────────────────────────────────────────
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };

  if (_isFirebaseMode()) {
    // Android: Firebase Bearer token
    const token = await _getFirebaseToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Mini App: Telegram InitData
    headers['X-Telegram-Init-Data'] = getInitData();
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + path, opts);
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) {
      let msg = 'Server error';
      if (typeof data.detail === 'string') msg = data.detail;
      else if (Array.isArray(data.detail)) msg = data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      else if (data.detail) msg = JSON.stringify(data.detail);
      throw new Error(msg);
    }
    return data;
  } catch (e) { throw e; }
}

// ── State ─────────────────────────────────────────────────────
let _me = null, _deals = [], _stats = {}, _activeDeal = null, _pollInterval = null;
let _homeListSig = '', _allListSig = ''; // بصمة آخر عرض، لتجنّب إعادة بناء القائمة إذا لم تتغيّر البيانات (يمنع الرمش)

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  try {
    _me = await api('GET', '/me');
    updateWalletChip();
    await loadDeals();
    renderWalletPage();
    if (window.TON_CONNECT_UI) _initTcUI();
    startPolling();
  } catch (e) {
    toast(t('could_not_connect'), true);
    showDemoData();
  }
}

// ── Polling: تحديث تلقائي كل 3 ثوانٍ ───────────────────────────
function startPolling() {
  if (_pollInterval) return;
  _pollInterval = setInterval(async () => {
    try {
      const prevActiveId   = _activeDeal?.id;
      const prevActiveStat = _activeDeal?.status;

      await loadDeals();

      // إذا كانت بطاقة صفقة مفتوحة (sheet)، حدّثها إذا تغيّرت حالتها
      if (prevActiveId != null) {
        const updated = _deals.find(d => d.id === prevActiveId);
        const sheetOpen = document.getElementById('ov-deal')?.classList.contains('open');
        if (updated && sheetOpen) {
          _activeDeal = updated;
          if (updated.status !== prevActiveStat) openDeal(updated.id);
        }
      }
    } catch (_) {
      // تجاهل أخطاء الشبكة العابرة في polling
    }
  }, 3000);
}

function stopPolling() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
}

// إيقاف/استئناف الـ polling حسب رؤية الصفحة (لتوفير الطلبات)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else startPolling();
});

function showDemoData() {
  document.getElementById('home-deals-list').innerHTML = `<div class="empty"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.364 5.636a9 9 0 1 1-12.728 0"/><path d="M12 2v6"/></svg></div><strong>${t('could_not_load')}</strong><p>${t('try_again')}</p></div>`;
  document.getElementById('deals-list').innerHTML = `<div class="empty"><div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.364 5.636a9 9 0 1 1-12.728 0"/><path d="M12 2v6"/></svg></div><strong>${t('could_not_load')}</strong><p>${t('try_again')}</p></div>`;
  document.getElementById('walletChipText').textContent = t('offline');
  document.getElementById('wallet-info-block').innerHTML = '<div class="rrow"><div class="rlabel">Status</div><div class="rval" style="color:var(--red)">Disconnected</div></div>';
}

// ── Load Deals ────────────────────────────────────────────────
async function loadDeals() {
  const data = await api('GET', '/deals');
  _deals = data.deals || [];
  _stats = data.stats || {};
  renderStats();
  renderHomeDeals();
  renderAllDeals();
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats() {
  const s = _stats;
  document.getElementById('d-ton-held').textContent = s.ton_held ?? '0';
  document.getElementById('d-active').textContent = s.active ?? '0';
  document.getElementById('d-completed').textContent = s.completed ?? '0';
  document.getElementById('d-disputes').textContent = s.disputed ?? '0';
}

// ── Status Meta ───────────────────────────────────────────────
function statusMeta(status) {
  const colors = {
    PENDING:         { cls: 'purple', stripe: 'purple' },
    WAITING_PAYMENT: { cls: 'blue',   stripe: 'blue'   },
    PAID:            { cls: 'blue',   stripe: 'blue'   },
    GIFT_SENT:       { cls: 'yellow', stripe: 'yellow' },
    COMPLETED:       { cls: 'green',  stripe: 'green'  },
    DISPUTED:        { cls: 'red',    stripe: 'red'    },
    REFUNDED:        { cls: 'red',    stripe: 'red'    },
    EXPIRED:         { cls: 'red',    stripe: 'red'    },
    REJECTED:        { cls: 'red',    stripe: 'red'    },
    PAY_FAILED:      { cls: 'red',    stripe: 'red'    },
  };
  const c = colors[status] || { cls: 'purple', stripe: 'purple' };
  return { label: t('status_' + status) || status, cls: c.cls, stripe: c.stripe };
}

// ── Time Helpers ──────────────────────────────────────────────
function timeAgo(ts) {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60)    return 'just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ── Countdown ─────────────────────────────────────────────────
const TIMEOUT_MAP = {
  WAITING_PAYMENT: 30 * 60,
  PAID:            15 * 60,
};

function getDeadline(deal) {
  const secs = TIMEOUT_MAP[deal.status];
  if (!secs) return null;
  return deal.updated_at + secs;
}

function formatCountdown(secondsLeft) {
  if (secondsLeft <= 0) return { text: t('status_EXPIRED'), cls: 'done' };
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const text = m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  const cls = secondsLeft < 120 ? 'urgent' : 'normal';
  return { text, cls };
}

const _countdownIntervals = {};

function startCountdown(dealId, deadline, elId) {
  if (_countdownIntervals[dealId]) clearInterval(_countdownIntervals[dealId]);
  function tick() {
    const el = document.getElementById(elId);
    if (!el) { clearInterval(_countdownIntervals[dealId]); return; }
    const left = Math.max(0, deadline - Math.floor(Date.now() / 1000));
    const { text, cls } = formatCountdown(left);
    el.className = `countdown ${cls}`;
    el.querySelector('.cd-text').textContent = text;
    if (left === 0) clearInterval(_countdownIntervals[dealId]);
  }
  tick();
  _countdownIntervals[dealId] = setInterval(tick, 1000);
}

function countdownLabel(deal) {
  if (deal.status === 'WAITING_PAYMENT') return t('cd_pay_within');
  if (deal.status === 'PAID') return t('cd_send_within');
  return '';
}

// ── Item Type Icons ──────────────────────────────────────────
function itemTypeIcon(type) {
  if (type === 'stars') {
    return `<svg width="14" height="14" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:2px"><defs><radialGradient id="icG" cx="38%" cy="28%" r="70%"><stop offset="0%" stop-color="#FFE566"/><stop offset="45%" stop-color="#FFB800"/><stop offset="100%" stop-color="#E07000"/></radialGradient><radialGradient id="icS" cx="30%" cy="20%" r="45%"><stop offset="0%" stop-color="#fff" stop-opacity=".55"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><polygon points="13,1.5 16.18,8.74 24,9.91 18.5,15.26 19.82,23.04 13,19.27 6.18,23.04 7.5,15.26 2,9.91 9.82,8.74" fill="url(#icG)"/><polygon points="13,1.5 16.18,8.74 24,9.91 18.5,15.26 19.82,23.04 13,19.27 6.18,23.04 7.5,15.26 2,9.91 9.82,8.74" fill="url(#icS)"/></svg>`;
  }
  return { gift: '🎁', id: '@', channel: '📣', group: '⊕' }[type] || '🎁';
}

// ── Helper: اسم العنصر المعروض بدل الرابط ─────────────────────
function dealDisplayName(deal) {
  if (deal.item_type === 'gift') {
    const slug = extractGiftSlug(deal.gift_desc || '');
    if (slug) return slug.replace(/-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return deal.gift_desc || '';
  }
  if (deal.item_type === 'channel' || deal.item_type === 'group') {
    return (deal.item_meta && deal.item_meta.title) ? deal.item_meta.title : (deal.gift_desc || '');
  }
  return deal.gift_desc || '';
}

// ── Deal Card ─────────────────────────────────────────────────
function dealCard(deal, onclick = '') {
  const m    = statusMeta(deal.status);
  const peer = deal.other_username ? `@${deal.other_username}` : `#${deal.other_id}`;
  const role = deal.role === 'seller' ? 'SELLER' : 'BUYER';
  const isActive = ['PENDING', 'WAITING_PAYMENT', 'PAID', 'GIFT_SENT'].includes(deal.status);
  const deadline = getDeadline(deal);
  const cdId     = `cd-${deal.id}`;

  const cdHtml = deadline
    ? `<div class="countdown normal" id="${cdId}">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span style="color:var(--t3);font-weight:500;margin-right:2px">${countdownLabel(deal)}</span>
        <span class="cd-text">…</span>
      </div>`
    : `<div style="font-size:10px;color:var(--t3);margin-top:8px">${timeAgo(deal.updated_at)}</div>`;

  if (deadline) setTimeout(() => startCountdown(deal.id, deadline, cdId), 0);

  return `<div class="gcard dcard" onclick="${onclick}" style="position:relative">
    <div class="dcard-badges">
      <div class="badge badge-card"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg></div>
      ${isActive ? `<div class="badge badge-rare"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg></div>` : ''}
    </div>
    <div class="dcard-stripe ${m.stripe}"></div>
    <div class="dcard-body">
      <div class="dcard-top">
        <div style="padding-top:28px">
          <div class="dcard-desc">${itemTypeIcon(deal.item_type)} ${escHtml(dealDisplayName(deal))}</div>
          <div class="dcard-id">#${deal.id} · ${role} · ${escHtml(peer)}</div>
        </div>
        <span class="pill ${m.cls}" style="margin-top:28px">${m.label}</span>
      </div>
      ${cdHtml}
      <div class="dcard-actions" style="margin-top:10px">
        <button class="btn-price" onclick="event.stopPropagation();${onclick}">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8.5 8.5h7M8.5 12h5M8.5 15.5h6"/></svg>
          ${deal.amount_ton} TON
        </button>
        <div class="btn-cart" onclick="event.stopPropagation();${onclick}">
          <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Render Lists ──────────────────────────────────────────────
function renderHomeDeals() {
  const ACTIVE = ['PENDING', 'WAITING_PAYMENT', 'PAID', 'GIFT_SENT'];
  const active = _deals.filter(d => ACTIVE.includes(d.status)).slice(0, 3);
  const el = document.getElementById('home-deals-list');

  const sig = JSON.stringify(active);
  if (sig === _homeListSig) return; // نفس البيانات، تجاهل إعادة البناء (يمنع الرمش)
  _homeListSig = sig;

  if (!active.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg></div><strong>${t('no_active')}</strong><p>${t('press_new')}</p></div>`;
    return;
  }
  el.innerHTML = active.map(d => dealCard(d, `openDeal(${d.id})`)).join('');
}

function renderAllDeals() {
  const el = document.getElementById('deals-list');

  const sig = JSON.stringify(_deals);
  if (sig === _allListSig) return; // نفس البيانات، تجاهل إعادة البناء (يمنع الرمش)
  _allListSig = sig;

  if (!_deals.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div><strong>${t('no_deals')}</strong><p>${t('create_first')}</p></div>`;
    return;
  }
  el.innerHTML = _deals.map(d => dealCard(d, `openDeal(${d.id})`)).join('');
}


function buildCommentBoc(text) {
    const textBytes = new TextEncoder().encode(text);
    const totalBits = 32 + textBytes.length * 8;
    const totalBytes = Math.ceil(totalBits / 8);
    const cellData = new Uint8Array(totalBytes);
    cellData[0]=0;cellData[1]=0;cellData[2]=0;cellData[3]=0;
    cellData.set(textBytes, 4);
    const d1 = 0;
    const bocHeader = new Uint8Array([0xb5,0xee,0x9c,0x72,0x01,0x01,0x01,0x01,0x00,totalBytes+2,0x00]);
    const cell = new Uint8Array(2 + totalBytes);
    cell[0] = d1;
    cell[1] = totalBits % 8 === 0 ? totalBytes*2 : totalBytes*2-1;
    cell.set(cellData, 2);
    const boc = new Uint8Array(bocHeader.length + cell.length);
    boc.set(bocHeader, 0); boc.set(cell, bocHeader.length);
    return btoa(String.fromCharCode(...boc));
}

async function payWithTonConnect(dealId, toAddress, amountTon, comment) {
    try {
        if (!window.TON_CONNECT_UI) { toast('TonConnect not loaded', true); return; }
        _initTcUI();

        // تأكد أن الجلسة المستعادة (إن وجدت) صالحة قبل الاعتماد عليها
        await _tcUI.connectionRestored;

        // إذا المحفظة غير متصلة، نفتح Telegram Wallet مباشرة
        if (!_tcUI.wallet) {
            try {
                await _tcUI.openModal();
            } catch(_) {}
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 60000);
                const unsub = _tcUI.onStatusChange(w => {
                    if (w) { clearTimeout(timeout); unsub(); resolve(w); }
                });
            });
        }

        // تحويل المبلغ إلى nanotons (1 TON = 1e9 nanoton)
        const nanotons = BigInt(Math.round(amountTon * 1e9)).toString();

        // بناء BOC صحيح للـ comment
        const payloadB64 = buildCommentBoc(String(comment));

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 300, // صالح 5 دقائق
            messages: [{
                address: toAddress,
                amount: nanotons,
                payload: payloadB64,
            }],
        };

        toast('⏳ Waiting for wallet confirmation...');
        const result = await _tcUI.sendTransaction(tx);
        toast('✅ Transaction sent! Waiting for confirmation...');
        console.log('[TonConnect] TX result:', result);
    } catch(e) {
        const msg = e?.message || e?.toString?.() || 'Transaction failed';
        if (msg.includes('User rejects') || msg.includes('Reject')) {
            toast('❌ Transaction cancelled.');
        } else if (msg.includes('TON_CONNECT_SDK_ERROR')) {
            try { _tcUI = null; _initTcUI(); } catch(_) {}
            toast('⚠️ Connection lost. Please tap Pay again.', true);
        } else {
            toast('❌ ' + msg, true);
        }
        console.error('[TonConnect] pay error:', e);
    }
}

function buildPaymentScreen(deal) {
    const wallet = deal.escrow_wallet || window._escrowWallet || '';
    const comment = String(deal.id);
    const amount = deal.amount_ton;
    return `
    <div style="width:100%;display:flex;flex-direction:column;gap:10px">

        <div style="background:var(--card);border-radius:14px;padding:14px;text-align:center">
            <div style="font-size:11px;color:var(--t3);margin-bottom:4px">Amount to pay</div>
            <div style="font-size:28px;font-weight:800;color:var(--ton)">${amount} TON</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">Comment / Memo: <strong style="color:#ff9900">${comment}</strong></div>
        </div>

        <button onclick="payWithTonConnect(${deal.id}, '${wallet}', ${amount}, '${comment}')"
            style="width:100%;background:var(--ton);color:#000;border:none;border-radius:14px;padding:16px;font-weight:800;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
            💎 Pay ${amount} TON Now
        </button>

        <details style="background:var(--card);border-radius:14px;padding:12px">
            <summary style="font-size:12px;color:var(--t2);cursor:pointer;font-weight:600">Manual payment (copy & paste)</summary>
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
                <div>
                    <div style="font-size:10px;color:var(--t3);margin-bottom:4px">📬 Wallet address</div>
                    <div style="font-size:11px;font-weight:600;color:var(--t1);word-break:break-all">${wallet}</div>
                    <button onclick="navigator.clipboard.writeText('${wallet}').then(()=>toast('✅ Address copied!'))"
                        style="margin-top:6px;width:100%;background:var(--glass);color:var(--t1);border:1px solid var(--border);border-radius:8px;padding:6px;font-weight:600;font-size:12px;cursor:pointer">
                        📋 Copy Address
                    </button>
                </div>
                <div>
                    <div style="font-size:10px;color:#ff9900;margin-bottom:4px;font-weight:700">⚠️ Comment / Memo (required)</div>
                    <div style="font-size:24px;font-weight:900;color:#ff9900;text-align:center;letter-spacing:2px">${comment}</div>
                    <button onclick="navigator.clipboard.writeText('${comment}').then(()=>toast('✅ Comment copied!'))"
                        style="margin-top:6px;width:100%;background:#ff990022;color:#ff9900;border:1px solid #ff9900;border-radius:8px;padding:6px;font-weight:700;font-size:12px;cursor:pointer">
                        📋 Copy Comment
                    </button>
                </div>
            </div>
        </details>

        <div style="font-size:10px;color:var(--t3);text-align:center;padding:4px 8px;line-height:1.5">
            🔒 Funds are held in escrow until you confirm receipt.<br>
            The bot detects payment automatically within seconds.
        </div>

        <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
    </div>`;
}

// ── Open Deal Sheet ───────────────────────────────────────────
function openDeal(id) {
  const deal = _deals.find(d => d.id === id);
  if (!deal) return;
  _activeDeal = deal;
  const m      = statusMeta(deal.status);
  const peer   = deal.other_username ? `@${deal.other_username}` : `#${deal.other_id}`;
  const isSeller = deal.role === 'seller';

  document.getElementById('sheet-deal-title').textContent = `Deal #${deal.id}`;
  document.getElementById('sheet-deal-accent').className  = `dcard-stripe ${m.stripe}`;

  // ── بناء الصفوف حسب الدور ─────────────────────────────────
  const cdRow = getDeadline(deal)
    ? `<div class="rrow"><div class="rlabel">${countdownLabel(deal)}</div><div class="rval"><span id="cd-sheet-${deal.id}" class="countdown normal" style="margin-top:0;padding:3px 8px"><svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="cd-text">…</span></span></div></div>`
    : '';

  let rows = '';
  if (isSeller) {
    // ── البائع: يرى ماذا يبيع، لمن، وكم سيستلم
    rows = `
      ${buildSheetGiftPreview(deal)}
      <div class="sheet-price-hero">
        <div class="sheet-price-label">You Receive</div>
        <div class="sheet-price-val green">${deal.seller_gets} TON</div>
        <div class="sheet-price-sub">After 5% fee · Deal total ${deal.amount_ton} TON</div>
      </div>
      <div class="rlist" style="margin-bottom:0">
        <div class="rrow"><div class="rlabel">Item</div><div class="rval">${itemTypeIcon(deal.item_type)} ${escHtml(deal.gift_desc)}</div></div>
        <div class="rrow"><div class="rlabel">Buyer</div><div class="rval">${escHtml(peer)}</div></div>
        <div class="rrow"><div class="rlabel">${t('your_role')}</div><div class="rval"><span class="pill blue">${t('role_seller')}</span></div></div>
        <div class="rrow"><div class="rlabel">Status</div><div class="rval"><span class="pill ${m.cls}">${m.label}</span></div></div>
        <div class="rrow"><div class="rlabel">Created</div><div class="rval">${timeAgo(deal.created_at)}</div></div>
        ${cdRow}
      </div>`;
  } else {
    // ── المشتري: يرى ماذا يشتري، من من، وكم يدفع
    rows = `
      ${buildSheetGiftPreview(deal)}
      <div class="sheet-price-hero">
        <div class="sheet-price-label">You Pay</div>
        <div class="sheet-price-val">${deal.amount_ton} TON</div>
        <div class="sheet-price-sub">Held in escrow · Released on confirmation</div>
      </div>
      <div class="rlist" style="margin-bottom:0">
        <div class="rrow"><div class="rlabel">Item</div><div class="rval">${itemTypeIcon(deal.item_type)} ${escHtml(deal.gift_desc)}</div></div>
        <div class="rrow"><div class="rlabel">Seller</div><div class="rval">${escHtml(peer)}</div></div>
        <div class="rrow"><div class="rlabel">${t('your_role')}</div><div class="rval"><span class="pill purple">${t('role_buyer')}</span></div></div>
        <div class="rrow"><div class="rlabel">Status</div><div class="rval"><span class="pill ${m.cls}">${m.label}</span></div></div>
        <div class="rrow"><div class="rlabel">Created</div><div class="rval">${timeAgo(deal.created_at)}</div></div>
        ${cdRow}
      </div>`;
  }

  document.getElementById('sheet-deal-rows').innerHTML = rows;

  const sheetDeadline = getDeadline(deal);
  if (sheetDeadline) setTimeout(() => startCountdown('sheet-' + deal.id, sheetDeadline, `cd-sheet-${deal.id}`), 0);

  // ── الأزرار حسب الدور والحالة ─────────────────────────────
  let btns = '';

  if (isSeller) {
    // البائع: زر واحد فقط عند PAID — "أرسلت الهدية"
    if (deal.status === 'PAID') {
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">
            ${t('hint_paid_buyer_for_seller')}
          </div>
          <div class="btn-row">
            <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
            <button class="btn btn-ton" onclick="markGiftSent(${deal.id})">${t('gift_sent_btn')}</button>
          </div>
        </div>`;
    } else if (deal.status === 'PENDING') {
      // البائع: الصفقة الخاصة بانتظار رد المشتري — يقدر يلغيها قبل أن يردّ
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">
            ${t('hint_pending_seller')}
          </div>
          <div class="btn-row">
            <button class="btn btn-danger" onclick="openCancelDealConfirm(${deal.id})">${t('cancel_btn')}</button>
            <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
          </div>
        </div>`;
    } else {
      // باقي الحالات: Close فقط + تلميح للحالة
      const hint = {
        GIFT_SENT:  t('hint_gift_sent_seller'),
        COMPLETED:  t('hint_completed'),
        DISPUTED:   t('hint_disputed'),
        REFUNDED:   t('hint_refunded'),
        EXPIRED:    t('hint_expired'),
        REJECTED:   t('hint_expired'),
        PAY_FAILED: t('hint_expired'),
      }[deal.status] || '';
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          ${hint ? `<div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">${hint}</div>` : ''}
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
        </div>`;
    }
  } else {
    // المشتري: زران عند PENDING — قبول أو رفض عرض الصفقة
    if (deal.status === 'PENDING') {
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">
            ${t('hint_pending_buyer')}
          </div>
          <div class="btn-row">
            <button class="btn btn-danger" onclick="rejectDeal(${deal.id})">${t('reject_btn')}</button>
            <button class="btn btn-ton" onclick="acceptDeal(${deal.id})">${t('accept_btn')}</button>
          </div>
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
        </div>`;
    } else if (deal.status === 'GIFT_SENT') {
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">
            ${t('hint_gift_sent_buyer')}
          </div>
          <div class="btn-row">
            <button class="btn btn-danger" onclick="disputeDeal(${deal.id})">${t('problem')}</button>
            <button class="btn btn-ton" onclick="confirmDeal(${deal.id})">${t('got_it')}</button>
          </div>
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
        </div>`;
    } else if (deal.status === 'WAITING_PAYMENT') {
      btns = buildPaymentScreen(deal);
    } else {
      const hint = {
        PAID:      t('hint_paid_buyer'),
        COMPLETED: t('hint_completed'),
        DISPUTED:  t('hint_disputed'),
        REFUNDED:  t('hint_refunded'),
        EXPIRED:   t('hint_expired'),
      }[deal.status] || '';
      btns = `
        <div style="width:100%;display:flex;flex-direction:column;gap:8px">
          ${hint ? `<div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">${hint}</div>` : ''}
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
        </div>`;
    }
  }

  document.getElementById('sheet-deal-btns').innerHTML = btns;
  document.getElementById('ov-deal').classList.add('open');
}

// ── Deal Actions ──────────────────────────────────────────────
async function markGiftSent(id) {
  try { await api('POST', `/deals/${id}/gift-sent`); toast(t('gift_sent_btn')); closeOv('ov-deal'); await loadDeals(); }
  catch (e) { toast(e.message, true); }
}

async function confirmDeal(id) {
  try { await api('POST', `/deals/${id}/confirm`); toast(t('completed')); closeOv('ov-deal'); await loadDeals(); }
  catch (e) { toast(e.message, true); }
}

async function disputeDeal(id) {
  try { await api('POST', `/deals/${id}/dispute`); toast(t('hint_disputed')); closeOv('ov-deal'); await loadDeals(); }
  catch (e) { toast(e.message, true); }
}

async function acceptDeal(id) {
  try { await api('POST', `/deals/${id}/accept`); toast(t('deal_accepted')); closeOv('ov-deal'); await loadDeals(); }
  catch (e) { toast(e.message, true); }
}

async function rejectDeal(id) {
  try { await api('POST', `/deals/${id}/reject`); toast(t('deal_rejected')); closeOv('ov-deal'); await loadDeals(); }
  catch (e) { toast(e.message, true); }
}

// ── Cancel Deal (seller, private deal still PENDING) ──────────
let _cancelDealId = null;

function openCancelDealConfirm(id) {
  _cancelDealId = id;
  document.getElementById('ov-cancel-deal').classList.add('open');
}

async function confirmCancelDeal() {
  if (_cancelDealId == null) return;
  const id = _cancelDealId;
  try {
    await api('POST', `/deals/${id}/cancel`);
    toast(t('deal_cancelled'));
    closeOv('ov-cancel-deal');
    closeOv('ov-deal');
    await loadDeals();
  } catch (e) {
    toast(e.message, true);
  } finally {
    _cancelDealId = null;
  }
}

// ── Gift Link Preview ─────────────────────────────────────────
// Detect fragment/t.me gift links and fetch metadata + Lottie animation

let _gpDebounce = null;
let _gpLottieInstance = null;
let _gpCurrentSlug = null;

function extractGiftSlug(val) {
  // Patterns supported:
  // https://t.me/nft/plush-pepe-1234   (Telegram links use PascalCase: PlushPepe-1234)
  // https://fragment.com/gift/plush-pepe-1234
  // plush-pepe-1234  (direct slug)
  // ملاحظة: Fragment API يتطلب giftname بحروف صغيرة فقط، بينما روابط
  // تيليجرام تستخدم PascalCase (مثال: JesterHat-113665) — لذلك نحوّل
  // الناتج دائماً إلى lowercase ليطابق صيغة nft.fragment.com.
  const patterns = [
    /t\.me\/nft\/([a-z0-9\-]+)/i,
    /fragment\.com\/gift\/([a-z0-9\-]+)/i,
    /nft\.fragment\.com\/gift\/([a-z0-9\-]+)/i,
  ];
  for (const re of patterns) {
    const m = val.match(re);
    if (m) return m[1].toLowerCase();
  }
  // Raw slug: letters, digits, hyphens, at least one hyphen + digits at end
  if (/^[a-zA-Z][a-zA-Z0-9\-]+-\d+$/i.test(val.trim())) return val.trim().toLowerCase();
  return null;
}

function gpShowLoading() {
  document.getElementById('gp-loading').classList.add('show');
  document.getElementById('gp-error').classList.remove('show');
  document.getElementById('gp-card').classList.remove('show');
}

function gpShowError(msg) {
  document.getElementById('gp-loading').classList.remove('show');
  const el = document.getElementById('gp-error');
  el.textContent = '⚠️ ' + msg;
  el.classList.add('show');
  document.getElementById('gp-card').classList.remove('show');
}

function gpHideAll() {
  document.getElementById('gp-loading').classList.remove('show');
  document.getElementById('gp-error').classList.remove('show');
  document.getElementById('gp-card').classList.remove('show');
}

function gpShowCard(name, collection, lottieUrl, imageUrl) {
  document.getElementById('gp-loading').classList.remove('show');
  document.getElementById('gp-error').classList.remove('show');

  document.getElementById('gp-name').textContent = name || 'Unknown Gift';
  document.getElementById('gp-collection').textContent = collection ? '📦 ' + collection : '';

  const animEl = document.getElementById('gp-anim');
  animEl.innerHTML = '';

  // Destroy previous Lottie instance if any
  if (_gpLottieInstance) {
    try { _gpLottieInstance.destroy(); } catch(_) {}
    _gpLottieInstance = null;
  }

  _fallbackImg(animEl, imageUrl);

  document.getElementById('gp-card').classList.add('show');
}

function _fallbackImg(container, imageUrl) {
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'gp-img';
    img.alt = 'Gift';
    container.appendChild(img);
  } else {
    container.innerHTML = '<div style="width:72px;height:72px;display:flex;align-items:center;justify-content:center;font-size:32px">🎁</div>';
  }
}

async function fetchGiftPreview(slug) {
  if (_gpCurrentSlug === slug) return;
  _gpCurrentSlug = slug;
  gpShowLoading();

  try {
    const metaUrl = `https://nft.fragment.com/gift/${slug}.json`;
    const res = await fetch(metaUrl, { signal: AbortSignal.timeout(5000) });

    if (res.ok) {
      const data = await res.json();
      const name = data.name || slug;
      const collection = data.collection?.name || data.attributes?.find(a => a.trait_type === 'Model')?.value || '';
      const imageUrl = data.image || `/nft-image/${slug}`;
      gpShowCard(name, collection, null, imageUrl);
      return;
    }
  } catch (_) {}

  try {
    const imageUrl = `/nft-image/${slug}`;
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    gpShowCard(name, '', null, imageUrl);
  } catch (e) {
    gpShowError('Could not load gift preview.');
    _gpCurrentSlug = null;
  }
}

function onGiftDescInput(val) {
  clearTimeout(_gpDebounce);
  const slug = extractGiftSlug(val.trim());
  if (!slug) {
    gpHideAll();
    _gpCurrentSlug = null;
    return;
  }
  // Debounce 600ms to avoid hammering while user types
  _gpDebounce = setTimeout(() => fetchGiftPreview(slug), 600);
}

// Helper: build a compact gift preview block for the deal sheet
function buildSheetGiftPreview(deal) {
  const giftDesc = deal.gift_desc;
  const itemType = deal.item_type || 'gift';
  const meta     = deal.item_meta;   // object أو null (فُكَّ ترميزه في _build_deal_out)

  // ── قناة أو كروب ───────────────────────────────────────────
  if ((itemType === 'channel' || itemType === 'group') && meta) {
    const icon    = itemType === 'channel' ? '📢' : '👥';
    const typeLabel = itemType === 'channel' ? 'Channel' : 'Group';
    const count   = meta.member_count != null
      ? (meta.member_count >= 1000
        ? (meta.member_count / 1000).toFixed(1) + 'K'
        : meta.member_count) + ' members'
      : typeLabel;
    const avatarHtml = meta.photo_url
      ? `<img src="${escHtml(meta.photo_url)}" alt="" onerror="this.parentElement.textContent='${icon}'">`
      : icon;

    return `
    <div class="sheet-chat-preview">
      <div class="sheet-chat-avatar">${avatarHtml}</div>
      <div class="sheet-chat-info">
        <div class="sheet-chat-title">${escHtml(meta.title || giftDesc)}</div>
        <div class="sheet-chat-sub">${meta.username ? '@' + escHtml(meta.username) + ' · ' : ''}${escHtml(count)}</div>
        <div class="sheet-chat-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Verified ${typeLabel}
        </div>
      </div>
    </div>`;
  }

  // ── هدية NFT (الأصلي) ──────────────────────────────────────
  const slug = extractGiftSlug(giftDesc);
  if (itemType === 'gift' && slug) {
    const divId = 'sgp-' + slug.replace(/[^a-z0-9]/gi, '-');
    const animId = divId + '-anim';
    setTimeout(() => {
      const animEl = document.getElementById(animId);
      if (!animEl) return;
      animEl.innerHTML = `<img src="/nft-image/${slug}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;cursor:pointer;" alt="" onerror="this.style.display='none'" onclick="showNftModal('${slug}')">`;
      const nameEl = document.getElementById(divId + '-name');
      const colEl  = document.getElementById(divId + '-col');
      if (nameEl) nameEl.textContent = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (colEl)  colEl.textContent  = '';
    }, 0);
    return `
    <div class="sheet-gift-preview" id="${divId}">
      <div class="sheet-gift-anim" id="${animId}">
        <div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:26px">🎁</div>
      </div>
      <div class="sheet-gift-info">
        <div class="sheet-gift-name" id="${divId}-name">${escHtml(slug)}</div>
        <div class="sheet-gift-col"  id="${divId}-col">Loading…</div>
        <div class="sheet-gift-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          NFT · Fragment
        </div>
      </div>
    </div>`;
  }

  // ── نجوم تيليجرام ──────────────────────────────────────────
  if (itemType === 'stars') {
    const count = deal.stars_count ? deal.stars_count.toLocaleString() : '?';
    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;background:linear-gradient(135deg,rgba(255,184,0,.13),rgba(224,112,0,.10));border:1.5px solid rgba(255,184,0,.35);margin-top:6px;">
      <svg width="48" height="48" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;filter:drop-shadow(0 3px 8px rgba(200,100,0,.45))">
        <defs>
          <radialGradient id="dsGrad" cx="38%" cy="28%" r="70%">
            <stop offset="0%"   stop-color="#FFE566"/>
            <stop offset="45%"  stop-color="#FFB800"/>
            <stop offset="100%" stop-color="#E07000"/>
          </radialGradient>
          <radialGradient id="dsShine" cx="30%" cy="20%" r="45%">
            <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <polygon points="13,1.5 16.18,8.74 24,9.91 18.5,15.26 19.82,23.04 13,19.27 6.18,23.04 7.5,15.26 2,9.91 9.82,8.74" fill="url(#dsGrad)"/>
        <polygon points="13,1.5 16.18,8.74 24,9.91 18.5,15.26 19.82,23.04 13,19.27 6.18,23.04 7.5,15.26 2,9.91 9.82,8.74" fill="url(#dsShine)"/>
      </svg>
      <div>
        <div style="font-size:16px;font-weight:800;color:#FFB800;letter-spacing:.3px;">${count} Telegram Stars</div>
        <div style="font-size:11px;color:var(--t2);margin-top:3px;">النجوم تُرسل للمشتري بعد تأكيد الدفع</div>
      </div>
    </div>`;
  }

  // plain text (id أو أي وصف حر) — لا معاينة
  return '';
}
let _currentItemType = 'gift';
let _chatPreviewOk   = false;   // true عندما تأتي معاينة قناة/كروب موثّقة
let _chatPreviewTimer = null;

const ITYPE_LABELS = {
  gift:    { en: 'Gift link (t.me/nft/…)',           ar: 'رابط هدية NFT',           ru: 'Ссылка на подарок' },
  id:      { en: 'Telegram username or ID',           ar: 'يوزر تيليجرام أو معرّف', ru: 'Юзернейм Telegram' },
  channel: { en: 'Channel link or @username',         ar: 'رابط قناة أو @يوزرنيم',  ru: 'Ссылка на канал'  },
  group:   { en: 'Group link or @username',           ar: 'رابط مجموعة أو @يوزرنيم', ru: 'Ссылка على группу' },
  stars:   { en: 'Number of Stars to sell',           ar: 'عدد النجوم للبيع',        ru: 'Количество звёзд' },
};

function setItemType(type) {
  _currentItemType = type;
  _chatPreviewOk   = false;
  clearTimeout(_chatPreviewTimer);   // إيقاف أي طلب قناة/كروب معلّق
  ['gift','id','channel','group','stars'].forEach(tp => {
    document.getElementById('itype-' + tp)?.classList.toggle('active', tp === type);
  });
  // تعديل الـ label بناءً على اللغة الحالية
  const lang = document.documentElement.lang || 'en';
  const lbl  = ITYPE_LABELS[type]?.[lang] || ITYPE_LABELS[type]?.en || '';
  document.getElementById('item-label').textContent = lbl;
  document.getElementById('inp-gift-desc').value = '';
  hideChatPreview();
  hideGiftPreview();

  // إظهار/إخفاء حقل النجوم
  const starsSection = document.getElementById('stars-section');
  const giftDescField = document.getElementById('gift-desc-field');
  if (type === 'stars') {
    if (starsSection) starsSection.style.display = 'block';
    if (giftDescField) giftDescField.style.display = 'none';
    document.getElementById('inp-stars-count').value = '';
  } else {
    if (starsSection) starsSection.style.display = 'none';
    if (giftDescField) giftDescField.style.display = 'block';
  }
}

function hideChatPreview() {
  document.getElementById('cp-loading')?.classList.remove('show');
  document.getElementById('cp-error')?.classList.remove('show');
  document.getElementById('cp-card')?.classList.remove('show');
  _chatPreviewOk = false;
}

function hideGiftPreview() {
  document.getElementById('gp-loading')?.classList.remove('show');
  document.getElementById('gp-error')?.classList.remove('show');
  document.getElementById('gp-card')?.classList.remove('show');
}

function updateStarsPreview() {
  const count = parseInt(document.getElementById('inp-stars-count')?.value);
  const card  = document.getElementById('stars-preview-card');
  const label = document.getElementById('stars-preview-count');
  if (!card || !label) return;
  if (count && count > 0) {
    label.textContent = count.toLocaleString() + ' Stars';
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}

async function _doFetchChatPreview(value) {
  const loadEl  = document.getElementById('cp-loading');
  const errEl   = document.getElementById('cp-error');
  const cardEl  = document.getElementById('cp-card');
  const titleEl = document.getElementById('cp-title');
  const subEl   = document.getElementById('cp-sub');
  const avatarEl= document.getElementById('cp-avatar');
  const badgeTxt= document.getElementById('cp-badge-text');
  _chatPreviewOk = false;
  loadEl.classList.add('show');
  errEl.classList.remove('show');
  cardEl.classList.remove('show');
  try {
    const _chatHeaders = { 'Content-Type': 'application/json' };
    if (_isFirebaseMode()) { const t = await _getFirebaseToken(); if (t) _chatHeaders['Authorization'] = `Bearer ${t}`; }
    else _chatHeaders['X-Telegram-Init-Data'] = getInitData();
    const res = await fetch(`/chat-preview?identifier=${encodeURIComponent(value)}`, {
      headers: _chatHeaders
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Not found');
    // تعبئة البطاقة
    const icon = data.type === 'channel' ? '📢' : '👥';
    const typeLabel = data.type === 'channel' ? 'Channel' : 'Group';
    const count = data.member_count != null
      ? (data.member_count >= 1000
          ? (data.member_count / 1000).toFixed(1) + 'K'
          : data.member_count) + ' members'
      : typeLabel;
    if (data.photo_url) {
      avatarEl.innerHTML = `<img src="${escHtml(data.photo_url)}" alt="" onerror="this.parentElement.textContent='${icon}'" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      avatarEl.textContent = icon;
    }
    titleEl.textContent = data.title || value;
    subEl.textContent   = (data.username ? '@' + data.username + ' · ' : '') + count;
    badgeTxt.textContent= 'Verified ' + typeLabel;
    loadEl.classList.remove('show');
    cardEl.classList.add('show');
    _chatPreviewOk = true;
  } catch (e) {
    loadEl.classList.remove('show');
    errEl.textContent = e.message;
    errEl.classList.add('show');
  }
}

function onItemInput(value) {
  if (_currentItemType === 'gift') {
    onGiftDescInput(value);   // المنطق القديم
    return;
  }
  if (_currentItemType === 'id') {
    hideChatPreview();        // لا معاينة للمعرّفات الشخصية
    return;
  }
  // channel أو group
  hideGiftPreview();
  hideChatPreview();
  _chatPreviewOk = false;
  clearTimeout(_chatPreviewTimer);
  if (value.trim().length < 3) return;
  _chatPreviewTimer = setTimeout(() => _doFetchChatPreview(value.trim()), 700);
}

// ── Create Deal ───────────────────────────────────────────────
async function createDeal() {
  const isMarket     = _publishMode === 'market';
  const rawBuyer      = isMarket ? '' : document.getElementById("inp-buyer-id").value.trim();
  const buyerId       = parseInt(rawBuyer);
  const buyerUsername = isNaN(buyerId) ? rawBuyer.replace("@","") : null;
  const giftDesc     = document.getElementById('inp-gift-desc').value.trim();
  const amount       = parseFloat(document.getElementById('inp-amount').value);

  // معالجة خاصة لنجوم تيليجرام
  if (_currentItemType === 'stars') {
    const starsCount = parseInt(document.getElementById('inp-stars-count').value);
    if (!isMarket && !rawBuyer)    { toast(t("enter_buyer"), true);   return; }
    if (!starsCount || starsCount < 1) { toast(t('stars_count_label') + ' ?', true); return; }
    if (!amount || amount < 0.01) { toast(t('enter_amount'), true);  return; }
    if (!_me?.wallet_address)     { toast(t('add_wallet_first'), true); go('wallet'); return; }

    const btn = document.getElementById('btn-create');
    btn.disabled = true; btn.textContent = t('creating');
    try {
      const res = await api('POST', '/deals', {
        mode:           _publishMode,
        buyer_id:       isMarket ? null : (buyerUsername ? null : buyerId),
        buyer_username: isMarket ? null : buyerUsername,
        gift_desc:      `⭐ ${starsCount} Telegram Stars`,
        item_type:      'stars',
        stars_count:    starsCount,
        amount_ton:     amount,
      });
      toast(`Deal #${res.deal_id} created — you receive ${res.seller_gets} TON`);
      document.getElementById('inp-buyer-id').value    = '';
      document.getElementById('inp-stars-count').value = '';
      document.getElementById('inp-amount').value      = '';
      setItemType('gift');
      await loadDeals(); go('deals');
    } catch (e) { toast(e.message, true); }
    finally { btn.disabled = false; btn.textContent = t('create_btn'); }
    return;
  }

  if (!isMarket && !rawBuyer)    { toast(t("enter_buyer"), true);   return; }
  if (!giftDesc)                { toast(t('describe_gift'), true); return; }
  if (!amount || amount < 0.01) { toast(t('enter_amount'), true);  return; }
  if (!_me?.wallet_address)     { toast(t('add_wallet_first'), true); go('wallet'); return; }

  // للقناة/الكروب: لا يُسمح بالإنشاء إلا بعد أن تنجح المعاينة
  if ((_currentItemType === 'channel' || _currentItemType === 'group') && !_chatPreviewOk) {
    toast('Please wait for channel/group verification first', true);
    return;
  }

  const btn = document.getElementById('btn-create');
  btn.disabled = true; btn.textContent = t('creating');
  try {
    const res = await api('POST', '/deals', {
      mode:          _publishMode,
      buyer_id:      isMarket ? null : (buyerUsername ? null : buyerId),
      buyer_username: isMarket ? null : buyerUsername,
      gift_desc:     giftDesc,
      item_type:     _currentItemType,
      amount_ton:    amount,
    });
    toast(`Deal #${res.deal_id} created — you receive ${res.seller_gets} TON`);
    document.getElementById('inp-buyer-id').value  = '';
    document.getElementById('inp-gift-desc').value = '';
    document.getElementById('inp-amount').value    = '';
    hideChatPreview(); hideGiftPreview();
    setItemType('gift');   // reset للنوع الافتراضي
    await loadDeals(); go('deals');
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = t('create_btn'); }
}

// ── Wallet ────────────────────────────────────────────────────
function updateWalletChip() {
  const addr = _me?.wallet_address;
  const dot  = document.getElementById('walletPulse');
  const txt  = document.getElementById('walletChipText');
  if (addr) { dot.classList.remove('off'); txt.textContent = addr.slice(0, 5) + '…' + addr.slice(-4); }
  else       { dot.classList.add('off');   txt.textContent = t('not_connected'); }
}

function renderWalletPage() {
  const addr  = _me?.wallet_address;
  const info  = document.getElementById('wallet-info-block');
  const inp   = document.getElementById('wallet-input-section');
  const disc  = document.getElementById('btn-disconnect');
  const title = document.getElementById('wallet-hero-title');
  const sub   = document.getElementById('wallet-hero-sub');
  const ws    = document.getElementById('create-wallet-status');

  if (addr) {
    // ── Avatar: أول حرف من اسم المستخدم أو صورته من تيليغرام
    const tgUser   = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const userName = tgUser?.first_name || tgUser?.username || 'U';
    const photoUrl = tgUser?.photo_url || '';
    const initials = userName.charAt(0).toUpperCase();

    const avatarInner = photoUrl
      ? `<img src="${photoUrl}" alt="${escHtml(userName)}">`
      : initials;

    title.textContent = '';
    sub.textContent   = '';

    info.innerHTML = `
      <div class="wallet-success-banner">
        <div class="wallet-avatar">
          ${avatarInner}
          <div class="wallet-avatar-badge">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="wallet-success-name">${escHtml(userName)}</div>
        <div class="wallet-success-addr">${addr.slice(0,6)}…${addr.slice(-5)}</div>
        <div class="wallet-success-pill">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          Wallet Connected
        </div>
      </div>
      <div class="rlist" style="margin-bottom:0">
        <div class="rrow"><div class="rlabel">Status</div><div class="rval"><span class="pill green">Active</span></div></div>
      </div>`;

    inp.style.display  = 'none';
    disc.style.display = 'flex';
  } else {
    title.textContent = t('connect_wallet');
    sub.textContent = t('wallet_sub_connect');
    info.innerHTML    = `<div class="rrow"><div class="rlabel">Status</div><div class="rval" style="color:var(--red)">Not connected</div></div>`;
    inp.style.display  = 'block';
    disc.style.display = 'none';
  }

  ws.textContent = addr ? t('wallet_connected') : t('not_connected');
  ws.style.color  = addr ? 'var(--green)' : 'var(--red)';
}

async function saveWallet() {
  const addr = document.getElementById('inp-wallet').value.trim();
  if (!addr)                                          { toast(t('enter_wallet'), true); return; }
  if (!(addr.startsWith('EQ') || addr.startsWith('UQ'))) { toast(t('wallet_eq'), true); return; }
  if (addr.length < 48)                              { toast(t('wallet_short'), true); return; }
  try {
    await api('POST', '/me/wallet', { wallet_address: addr });
    _me.wallet_address = addr;
    updateWalletChip();
    renderWalletPage();
    toast(t('wallet_saved'));
    document.getElementById('inp-wallet').value = '';
  } catch (e) { toast(e.message, true); }
}

async function disconnectWallet() {
  const btn = document.getElementById('btn-disconnect');
  if (btn) { btn.disabled = true; btn.textContent = t('disconnecting'); }
  try {
    await api('DELETE', '/me/wallet');
    // فصل TonConnect من جانب المتصفح أيضاً
    if (_tcUI) {
      try { await _tcUI.disconnect(); } catch (_) {}
    }
    _me.wallet_address = null;
    updateWalletChip();
    renderWalletPage();
    toast(t('disconnected'));
  } catch (e) {
    toast(e.message || t('disconnected'), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('disconnect'); }
    closeOv('ov-disc');
  }
}

// ── Navigation ────────────────────────────────────────────────
function go(p) {
  const already = document.getElementById('page-' + p)?.classList.contains('active');
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.bni').forEach(x => x.classList.remove('active'));
  const pg = document.getElementById('page-' + p);
  if (already) {
    // نفس الصفحة — أضف الكلاس بدون إعادة تشغيل الأنيميشن
    pg.style.animation = 'none';
    pg.classList.add('active');
    requestAnimationFrame(() => { pg.style.animation = ''; });
  } else {
    pg.classList.add('active');
  }
  document.getElementById('ni-' + p).classList.add('active');
  if (!already) document.querySelector('.scroll').scrollTop = 0;
  if (p === 'wallet' && _me) renderWalletPage();
  if (p === 'deals'  && _deals.length === 0) loadDeals().catch(() => {});
  if (p === 'market' && !_marketLoaded) loadMarket().catch(() => {});
}

// ── نشر: خاص / سوق ───────────────────────────────────────────
let _publishMode = 'private';
function setPublishMode(mode) {
  _publishMode = mode;
  document.getElementById('pmode-private').classList.toggle('active', mode === 'private');
  document.getElementById('pmode-market').classList.toggle('active', mode === 'market');
  document.getElementById('buyer-field').style.display  = mode === 'private' ? '' : 'none';
  const hint = document.getElementById('publish-mode-hint');
  hint.setAttribute('data-i18n', mode === 'private' ? 'publish_private_hint' : 'publish_market_hint');
  hint.textContent = mode === 'private'
    ? 'Only the buyer you choose can see and accept this deal.'
    : 'Anyone can see and buy this listing — no specific buyer required.';
}

// ── صفحة السوق ────────────────────────────────────────────────
let _marketLoaded = false;
let _marketTab = 'all';
let _marketAllListings = [];

function setMarketTab(tab) {
  _marketTab = tab;
  ['all', 'gift', 'channel', 'id', 'mine'].forEach(t => {
    const el = document.getElementById('mtab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  _marketLoaded = false;
  loadMarket().catch(() => {});
}

async function loadMarket() {
  if (_marketLoaded) return;
  _marketLoaded = true;
  const grid = document.getElementById('market-grid');
  grid.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const listings = await fetchMarketListings(_marketTab);
    _marketAllListings = listings;
    renderMarketGrid(listings);
  } catch (e) {
    grid.innerHTML = `<div class="market-empty"><div class="market-empty-icon">⚠️</div>Could not load listings.</div>`;
  }
}

async function fetchMarketListings(tab) {
  const params = tab && tab !== 'all' ? '?type=' + tab : '';
  return await api('GET', '/market' + params);
}

function filterMarket(query) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? _marketAllListings.filter(i =>
        (i.gift_desc || '').toLowerCase().includes(q) ||
        String(i.id).includes(q)
      )
    : _marketAllListings;
  renderMarketGrid(filtered);
}

function renderMarketGrid(listings) {
  const grid = document.getElementById('market-grid');
  if (!listings || listings.length === 0) {
    grid.innerHTML = `<div class="market-empty" style="grid-column:1/-1"><div class="market-empty-icon">🏪</div><span>${t('market_empty')}</span></div>`;
    return;
  }
  grid.innerHTML = listings.map(marketCardHtml).join('');
}

function marketCardHtml(item) {
  const typeIcons = { gift: '🎁', channel: '📣', group: '👥', id: '@', stars: '⭐' };
  const typeLabels = { gift: 'Gift', channel: 'Channel', group: 'Group', id: 'ID', stars: 'Stars' };
  const icon = typeIcons[item.item_type] || '🎁';
  const label = typeLabels[item.item_type] || 'Gift';

  // إنشاء صورة الهدية: نستخدم image_url من الـ API أو نستخرج slug من gift_desc
  let art, artClass = '';
  if (item.image_url) {
    art = `<img src="${item.image_url}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'gift-card-emoji\\'>${icon}</div>'">`; 
  } else if (item.item_type === 'gift') {
    const slug = extractGiftSlug(item.gift_desc || '');
    if (slug) {
      art = `<img src="/nft-image/${slug}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'gift-card-emoji\\'>${icon}</div>'">`;
    } else {
      art = `<div class="gift-card-emoji">${icon}</div>`;
    }
  } else if ((item.item_type === 'channel' || item.item_type === 'group') && item.item_meta?.photo_url) {
    // صورة القناة/القروب الحقيقية المحفوظة وقت إنشاء الصفقة (item_meta.photo_url)
    art = `<img src="${escHtml(item.item_meta.photo_url)}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'gift-card-emoji\\'>${icon}</div>'">`;
    artClass = ' photo-cover';
  } else if (item.item_type === 'channel' || item.item_type === 'group') {
    // لا توجد صورة — نعرض الأيقونة
    art = `<div class="gift-card-emoji">${icon}</div>`;
  } else {
    art = `<div class="gift-card-emoji">${icon}</div>`;
  }

  // ── اسم العنصر المعروض في الكارد ──
  // هدية: اسم الهدية المستخرج من الـ slug بدل الرابط الكامل
  // قناة/كروب: العنوان المحفوظ في item_meta بدل الرابط
  // باقي الأنواع: gift_desc كما هو
  let displayName;
  if (item.item_type === 'gift') {
    const slug = extractGiftSlug(item.gift_desc || '');
    if (slug) {
      // PlushPepe-1234 → "Plush Pepe"
      displayName = slug.replace(/-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } else {
      displayName = item.gift_desc || '';
    }
  } else if (item.item_type === 'channel' || item.item_type === 'group') {
    displayName = (item.item_meta && item.item_meta.title) ? item.item_meta.title : (item.gift_desc || '');
  } else {
    displayName = item.gift_desc || '';
  }

  const tagBg = item.item_type === 'channel' ? 'var(--purple)'
    : item.item_type === 'stars' ? 'var(--yellow)'
    : item.item_type === 'id' ? 'var(--green)'
    : item.item_type === 'group' ? 'var(--ton)'
    : 'var(--yellow)';
  const tagColor = (item.item_type === 'channel' || item.item_type === 'group' || item.item_type === 'id') ? '#fff' : '#1a1a1a';
  return `<div class="gift-card" onclick="openMarketItem(${item.id})">
    <div class="gift-card-art${artClass}">${art}
      <div class="gift-card-tag" style="background:${tagBg};color:${tagColor}">${label}</div>
    </div>
    <div class="gift-card-body">
      <div class="gift-card-name">${escHtml(displayName)}</div>
      <div class="gift-card-id">#${item.id}</div>
      <div class="gift-card-row">
        <div class="gift-card-price">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
          ${item.amount_ton} TON
        </div>
        <div class="gift-card-buy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        </div>
      </div>
    </div>
  </div>`;
}

function openMarketItem(id) {
  const deal = _marketAllListings.find(i => i.id === id);
  if (!deal) return;

  document.getElementById('sheet-deal-title').textContent = `Deal #${deal.id}`;
  document.getElementById('sheet-deal-accent').className  = `dcard-stripe blue`;

  const rows = `
    ${buildSheetGiftPreview(deal)}
    <div class="sheet-price-hero">
      <div class="sheet-price-label">${deal.role === 'seller' ? 'You Receive' : 'You Pay'}</div>
      <div class="sheet-price-val ${deal.role === 'seller' ? 'green' : ''}">${deal.role === 'seller' ? deal.seller_gets : deal.amount_ton} TON</div>
      <div class="sheet-price-sub">${deal.role === 'seller' ? `After 5% fee · Deal total ${deal.amount_ton} TON` : 'Held in escrow · Released on confirmation'}</div>
    </div>
    <div class="rlist" style="margin-bottom:0">
      <div class="rrow"><div class="rlabel">Item</div><div class="rval">${itemTypeIcon(deal.item_type)} ${escHtml(deal.gift_desc)}</div></div>
      ${deal.role === 'buyer' ? `<div class="rrow"><div class="rlabel">Seller</div><div class="rval">${escHtml(deal.other_username ? '@' + deal.other_username : '#' + deal.other_id)}</div></div>` : ''}
      <div class="rrow"><div class="rlabel">Listing</div><div class="rval"><span class="pill blue">Market</span></div></div>
      <div class="rrow"><div class="rlabel">Created</div><div class="rval">${timeAgo(deal.created_at)}</div></div>
    </div>`;
  document.getElementById('sheet-deal-rows').innerHTML = rows;

  let btns;
  if (deal.role === 'seller') {
    // البائع يرى صفقته في السوق — يمكنه إلغاء النشر طالما لم يطلبها أحد
    btns = `
      <div style="width:100%;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">Listed publicly — anyone can buy it.</div>
        <div class="btn-row">
          <button class="btn btn-danger" onclick="cancelMarketListing(${deal.id})">Remove Listing</button>
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
        </div>
      </div>`;
  } else {
    btns = `
      <div style="width:100%;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:11px;color:var(--t2);text-align:center;padding:6px 0">سيتم حجز هذا العرض لك فقط بعد إتمام الدفع.</div>
        <div class="btn-row">
          <button class="btn btn-glass" onclick="closeOv('ov-deal')">${t('close')}</button>
          <button class="btn btn-ton" onclick="claimAndPayMarketItem(${deal.id})">${t('market_buy')}</button>
        </div>
      </div>`;
  }
  document.getElementById('sheet-deal-btns').innerHTML = btns;
  document.getElementById('ov-deal').classList.add('open');
}

async function claimAndPayMarketItem(id) {
  // التحقق من المحفظة أولاً
  if (!_me?.wallet_address) { toast(t('add_wallet_first'), true); closeOv('ov-deal'); go('wallet'); return; }

  const deal = _marketAllListings.find(i => i.id === id);
  if (!deal) { toast('Deal not found', true); return; }

  const wallet = deal.escrow_wallet || window._escrowWallet || '';
  if (!wallet) { toast('No escrow wallet found', true); return; }

  const amount = deal.amount_ton;
  const comment = `deal-${deal.id}`;

  try {
    if (!window.TON_CONNECT_UI) { toast('TonConnect not loaded', true); return; }
    _initTcUI();
    await _tcUI.connectionRestored;

    if (!_tcUI.wallet) {
      try { await _tcUI.openModal(); } catch(_) {}
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 60000);
        const unsub = _tcUI.onStatusChange(w => {
          if (w) { clearTimeout(timeout); unsub(); resolve(w); }
        });
      });
    }

    const nanotons = BigInt(Math.round(amount * 1e9)).toString();
    const payloadB64 = buildCommentBoc(String(comment));

    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [{ address: wallet, amount: nanotons, payload: payloadB64 }],
    };

    toast('⏳ Waiting for wallet confirmation...');
    const result = await _tcUI.sendTransaction(tx);

    // فقط بعد إرسال المعاملة — نقوم بالـ claim
    try {
      await api('POST', `/deals/${id}/claim`);
    } catch(claimErr) {
      // إذا فات شخص آخر — الدفع حصل، البوت سيعالجه
      console.warn('[Market] Claim after payment failed:', claimErr.message);
    }

    toast('✅ Payment sent! Waiting for confirmation...');
    closeOv('ov-deal');
    _marketLoaded = false;
    await loadDeals();
    await loadMarket();
    go('deals');
  } catch(e) {
    const msg = e?.message || e?.toString?.() || 'Transaction failed';
    if (msg.includes('User rejects') || msg.includes('Reject')) {
      toast('❌ Transaction cancelled.');
    } else if (msg.includes('TON_CONNECT_SDK_ERROR')) {
      try { _tcUI = null; _initTcUI(); } catch(_) {}
      toast('⚠️ Connection lost. Please tap Pay again.', true);
    } else {
      toast('❌ ' + msg, true);
    }
  }
}

async function claimMarketItem(id) {
  if (!_me?.wallet_address) { toast(t('add_wallet_first'), true); closeOv('ov-deal'); go('wallet'); return; }
  try {
    await api('POST', `/deals/${id}/claim`);
    toast(t('deal_accepted'));
    closeOv('ov-deal');
    _marketLoaded = false;
    await loadDeals(); await loadMarket(); go('deals');
  } catch (e) { toast(e.message, true); }
}

async function cancelMarketListing(id) {
  try {
    await api('POST', `/deals/${id}/cancel`);
    toast('Listing removed');
    closeOv('ov-deal');
    _marketLoaded = false;
    await loadDeals(); await loadMarket();
  } catch (e) { toast(e.message, true); }
}


function openDisc() { document.getElementById('ov-disc').classList.add('open'); }
function closeOv(id, e) {
  if (!e || e.target === document.getElementById(id))
    document.getElementById(id).classList.remove('open');
}

// ── Toast ─────────────────────────────────────────────────────
let _t;
function toast(m, err = false) {
  const el = document.getElementById('tst');
  el.textContent = m;
  el.classList.toggle('error', err);
  el.classList.add('show');
  clearTimeout(_t);
  _t = setTimeout(() => el.classList.remove('show'), err ? 3500 : 2200);
}

// ── Utilities ─────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Splash ────────────────────────────────────────────────────
(function () {
  const KEY = 'ge_v3';
  let step  = 1;
  let channelVisited = false;
  let groupVisited   = false;

  function g(id) { return document.getElementById(id); }

  function update() {
    ['sp1', 'sp2', 'sp3', 'sp4'].forEach((id, i) => {
      const el = g(id);
      if (i + 1 === step) {
        el.classList.add('active'); el.classList.remove('prev');
      } else if (el.classList.contains('active')) {
        el.classList.remove('active'); el.classList.add('prev');
        setTimeout(() => el.classList.remove('prev'), 400);
      }
    });
    [1, 2, 3, 4].forEach(i => g('spd' + i).classList.toggle('on', i === step));
    const nb = g('sp-next'), sk = g('sp-skip');
    if (step === 3) {
      nb.textContent = t('lets_go');
      sk.style.opacity = '0'; sk.style.pointerEvents = 'none';
    } else if (step === 4) {
      nb.textContent = "I've Subscribed ✓";
      sk.style.opacity = '0'; sk.style.pointerEvents = 'none';
    } else {
      nb.textContent = t('continue_btn');
      sk.style.opacity = '1'; sk.style.pointerEvents = 'all';
    }
  }

  // Track when user clicks the channel/group links
  window.addEventListener('click', function(e) {
    const ch = e.target.closest('#sub-channel');
    const gr = e.target.closest('#sub-group');
    if (ch) {
      channelVisited = true;
      ch.classList.add('sp-sub-visited');
    }
    if (gr) {
      groupVisited = true;
      gr.classList.add('sp-sub-visited');
    }
  });

  window.spNext = function () {
    if (step < 3) { step++; update(); return; }
    if (step === 3) { step = 4; update(); return; }
    if (step === 4) {
      if (!channelVisited || !groupVisited) {
        const note = g('sp-sub-note');
        note.style.display = 'block';
        // highlight unvisited items
        if (!channelVisited) g('sub-channel').classList.add('sp-sub-warn');
        if (!groupVisited)   g('sub-group').classList.add('sp-sub-warn');
        return;
      }
      spDone();
    }
  };

  window.spDone = function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    const s = g('splash');
    s.classList.add('out');
    setTimeout(() => s.style.display = 'none', 420);
  };

  let done = false;
  try { done = !!localStorage.getItem(KEY); } catch (e) {}
  if (done) g('splash').style.display = 'none';
})();

// ── Init ──────────────────────────────────────────────────────
// Mini App: يبدأ مباشرة | Android: Firebase يتحكم
if (tg) {
  boot();
} else {
  window.addEventListener('load', () => _initFirebase());
}

// alias يستدعيه _initFirebase بعد تسجيل الدخول
function init() { boot(); }










// ── TON Connect ───────────────────────────────────────────────
let _tcUI = null;

function _initTcUI() {
  if (_tcUI) return;
  _tcUI = new window.TON_CONNECT_UI.TonConnectUI({
    manifestUrl: window.location.origin + '/tonconnect-manifest.json',
    enableAndroidBackHandler: true,
    actionsConfiguration: {
      twaReturnUrl: 'https://t.me/hamogrambot',
    },
  });
  _tcUI.onStatusChange(async wallet => {
    if (!wallet) return;
    await _saveTcWallet(window.TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address));
  });
  // استعادة الجلسة السابقة
  _tcUI.connectionRestored.then(restored => {
    if (restored && _tcUI.wallet && !_me?.wallet_address) {
      _saveTcWallet(window.TON_CONNECT_UI.toUserFriendlyAddress(_tcUI.wallet.account.address));
    }
  });
}

async function openTonConnect() {
  if (_me?.wallet_address) { toast(t('wallet_already')); return; }
  try {
    if (!window.TON_CONNECT_UI) { toast(t('tc_not_loaded'), true); return; }
    _initTcUI();
    await _tcUI.openModal();
  } catch(e) {
    let msg;
    try { msg = e?.message || e?.toString?.() || JSON.stringify(e); } catch(_) { msg = String(e); }
    console.error('TonConnect error:', e);
    toast('Error: ' + msg, true);
  }
}

async function _saveTcWallet(addr) {
  if (!addr) return;
  if (_me?.wallet_address) return; // محفظة مرتبطة بالفعل، لا نعيد المحاولة
  try {
    await api('POST', '/me/wallet', { wallet_address: addr });
    _me.wallet_address = addr;
    updateWalletChip();
    renderWalletPage();
    toast(t('wallet_connected_toast'));
    try { _tcUI?.closeModal(); } catch(_) {}
  } catch(e) {
    try { await _tcUI?.disconnect(); } catch(_) {}
    if (e.message?.includes("already linked")) {
      toast("⚠️ هذه المحفظة مرتبطة بحساب آخر. جرب محفظة مختلفة.", true);
    } else {
      toast(e.message || "Could not save wallet", true);
    }
    // لا نفصل الجلسة هنا - الفصل التلقائي كان يسبب طلبات قطع اتصال متكررة في Tonkeeper
  }
}

// ── Debug helper ─────────────────────────────────────────────
function _debugTC() {
  console.log('TON_CONNECT_UI loaded:', !!window.TON_CONNECT_UI);
  console.log('TonConnectUI class:', !!window.TON_CONNECT_UI?.TonConnectUI);
}
