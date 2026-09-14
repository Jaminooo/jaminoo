/* ============================================================
   Jam — prototype (HTML+JS, localStorage backend)
   Auth · Profile · Friends · Jams (chat room)
   ============================================================ */
'use strict';

/* ---------------- Storage helpers (safe on file://) ---------------- */
const LS_OK = (() => {
  try { localStorage.setItem('__jam_t', '1'); localStorage.removeItem('__jam_t'); return true; }
  catch (_) { return false; }
})();
let memSession = null;

const storage = {
  get() {
    if (LS_OK) { const raw = localStorage.getItem('jam_data_me'); if (raw) return JSON.parse(raw); }
    return seedData();
  },
  set(d) { if (LS_OK) localStorage.setItem('jam_data_me', JSON.stringify(d)); },
  getSession() {
    if (LS_OK) { const s = localStorage.getItem('jam_session_me'); return s; }
    return memSession;
  },
  setSession(id) {
    memSession = id;
    if (LS_OK) { if (id) localStorage.setItem('jam_session_me', id); else localStorage.removeItem('jam_session_me'); }
  }
};

let data = storage.get();

/* ---------------- Seed data ---------------- */
function seedData() {
  const users = [
    { id: 1001, username: 'sara', email: 'sara@jam.dev', password: null, question: 'What city were you born in?', answer: 'tehran', avatarId: 4, bio: 'sound engineer · lost in delay pedals', createdAt: Date.now() - 90 * 864e5, github: false },
    { id: 1002, username: 'kaveh', email: 'k@jam.dev', password: null, question: null, answer: null, avatarId: 7, bio: 'synthwave & city lights', createdAt: Date.now() - 80 * 864e5, github: false },
    { id: 1003, username: 'nila', email: 'n@jam.dev', password: null, question: null, answer: null, avatarId: 9, bio: 'making playlists nobody asked for', createdAt: Date.now() - 70 * 864e5, github: false },
    { id: 1004, username: 'rumi', email: 'r@jam.dev', password: null, question: null, answer: null, avatarId: 2, bio: 'night owl', createdAt: Date.now() - 60 * 864e5, github: false }
  ];
  const jams = [
    {
      id: 'J1', name: 'Lounge', desc: 'Casual hangout — everyone is welcome.', type: 'public', ownerId: 1001,
      members: [1001, 1002, 1003, 1004],
      createdAt: Date.now() - 30 * 864e5,
      nowPlaying: null,
      messages: [
        { from: 1001, text: 'hey hey, lounge is open 🛋', ts: Date.now() - 3600e3 },
        { from: 1002, text: 'perfect, I need a break from synths', ts: Date.now() - 3400e3 },
        { from: 1003, text: 'put me in the cool corner plz', ts: Date.now() - 3200e3 }
      ]
    },
    {
      id: 'J2', name: 'Synthwave Studio 🎧', desc: 'Talking music, gear and late-night vibes.', type: 'public', ownerId: 1002,
      members: [1001, 1002, 1003, 1004],
      createdAt: Date.now() - 22 * 864e5,
      nowPlaying: null,
      messages: [
        { from: 1002, text: 'drop your current loop here 👇', ts: Date.now() - 5400e3 },
        { from: 1004, text: 'this one: 128 bpm, all memory of people soon forgotten', ts: Date.now() - 5100e3 }
      ]
    },
    {
      id: 'J3', name: 'Friends Only', desc: 'Private — invite only.', type: 'private', ownerId: 1001,
      members: [1001, 1002, 1003],
      createdAt: Date.now() - 10 * 864e5,
      nowPlaying: null,
      messages: [
        { from: 1003, text: 'is this room also secretly a cult? asking for a friend', ts: Date.now() - 2000e3 }
      ]
    }
  ];
  return {
    users, jams,
    friendships: [],            // { id, a, b, from, status: 'pending'|'friends' }
    nextFid: 1,
    githubUid: null
  };
}

/* ---------------- Current user ---------------- */
function me() {
  const sid = storage.getSession();
  if (!sid) return null;
  return data.users.find(u => String(u.id) === String(sid)) || null;
}
function save() { storage.set(data); }
function userById(id) { return data.users.find(u => String(u.id) === String(id)); }

/* ---------------- Small utils ---------------- */
const $ = id => document.getElementById(id);
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function uidDisplay(id) { return 'JM-' + String(id).padStart(4, '0'); }
function timeStr(ts) { const d = new Date(ts); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(ts) { return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); }

function toast(msg, kind) {
  const w = $('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------------- Avatars ---------------- */
const AVATAR_PAL = [
  ['#7c5cff', '#4b2fd1'], ['#3b82f6', '#1d4ed8'], ['#14b8a6', '#0e7490'],
  ['#f472b6', '#db2777'], ['#f59e0b', '#d97706'], ['#22c55e', '#15803d'],
  ['#06b6d4', '#0284c7'], ['#a855f7', '#7e22ce'], ['#f97316', '#ea580c'],
  ['#0ea5e9', '#0369a1'], ['#ef4444', '#b91c1c'], ['#64748b', '#334155']
];
function avatarSVG(id, idx) {
  id = Math.max(0, (id | 0) % AVATAR_PAL.length);
  const [c1, c2] = AVATAR_PAL[id];
  const gid = 'ag' + idx;
  const face = faceSVG(id % 4);
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="64" height="64" fill="url(#${gid})"/>
    <circle cx="32" cy="26" r="11" fill="rgba(255,255,255,0.22)"/>
    <circle cx="32" cy="54" r="16" fill="rgba(255,255,255,0.14)"/>
    ${face}
  </svg>`;
}
function faceSVG(v) {
  if (v === 1) return `<rect x="21" y="23" width="22" height="7" rx="3.5" fill="#fff"/><path d="M25 42 q7 6 14 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if (v === 2) return `<circle cx="27" cy="26" r="2.6" fill="#fff"/><circle cx="37" cy="26" r="2.6" fill="#fff"/><path d="M26 36 q6 5 12 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if (v === 3) return `<path d="M24 27 q3 -4 6 0 q3 4 6 0 q3 -4 6 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M28 40 q4 4 8 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `<circle cx="27" cy="26" r="2.6" fill="#fff"/><circle cx="37" cy="26" r="2.6" fill="#fff"/><path d="M25 38 q7 7 14 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}
function avatarEl(id, size) {
  return `<span class="avatar ${size || 'avatar-40'}">${avatarSVG((userById(id) || {}).avatarId || 0, id)}</span>`;
}

/* ---------------- Screens & tabs ---------------- */
function showScreen(which) {
  $('screen-auth').hidden = which !== 'auth';
  $('screen-panel').hidden = which !== 'panel';
}
function switchAuthView(name) {
  $('view-login').hidden = name !== 'login';
  $('view-signup').hidden = name !== 'signup';
  $('view-forgot').hidden = name !== 'forgot';
  if (name === 'forgot') {
    $('forgot-step1').hidden = false;
    $('forgot-step2').hidden = true;
    $('forgot-username').value = '';
    $('forgot-answer').value = '';
    $('forgot-newpass').value = '';
    $('forgot-newpass2').value = '';
  }
}
function setActiveTab(tab) {
  for (const p of ['profile', 'friends', 'jams', 'room']) $('tab-' + p).hidden = p !== tab;
  for (const it of document.querySelectorAll('.side-item')) {
    it.classList.toggle('active', it.dataset.tab === tab || (tab === 'room' && it.dataset.tab === 'jams'));
  }
}

/* ---------------- Friend relations ---------------- */
function relation(a, b) {
  const f = data.friendships.find(x => (String(x.a) === String(a) && String(x.b) === String(b)) || (String(x.a) === String(b) && String(x.b) === String(a)));
  if (!f) return null;
  if (f.status === 'friends') return 'friends';
  return String(f.from) === String(me().id) ? 'outgoing' : 'incoming';
}
function friendsOf(uid) {
  return data.friendships.filter(f => f.status === 'friends' && (String(f.a) === String(uid) || String(f.b) === String(uid)))
    .map(f => (String(f.a) === String(uid) ? f.b : f.a));
}

/* ============================================================
   RENDER: PROFILE
   ============================================================ */
function renderProfile() {
  const u = me();
  if (!u) return;
  $('pf-username').value = u.username;
  $('pf-email').value = u.email || '';
  $('pf-bio').value = u.bio || '';
  $('pf-myid').textContent = uidDisplay(u.id);
  $('avatar-picker').innerHTML = AVATAR_PAL.map((_, i) =>
    `<button class="avatar-opt ${i === u.avatarId ? 'selected' : ''}" data-avatar-idx="${i}">${avatarSVG(i, 'p' + i)}</button>`).join('');
  renderUserChip();
}

function renderUserChip() {
  const u = me();
  $('user-chip').innerHTML = `${avatarEl(u.id, 'avatar-32')}<div><div style="font-size:13px;font-weight:500;color:var(--white)" >${esc(u.username)}</div><div style="font-size:11px;color:var(--fog);font-family:var(--font-mono)">${uidDisplay(u.id)}</div></div>`;
}

/* ============================================================
   RENDER: FRIENDS
   ============================================================ */
function updateBadges() {
  const u = me(); if (!u) return;
  const inc = data.friendships.filter(f => f.status === 'pending' && String(f.b) === String(u.id));
  $('friends-badge').hidden = inc.length === 0;
  $('friends-badge').textContent = inc.length;
}
function renderFriends() {
  const u = me(); if (!u) return;
  const friends = friendsOf(u.id);
  const incoming = data.friendships.filter(f => f.status === 'pending' && String(f.b) === String(u.id));
  const outgoing = data.friendships.filter(f => f.status === 'pending' && String(f.a) === String(u.id));

  $('friends-count').textContent = friends.length;
  $('incoming-count').textContent = incoming.length;
  $('outgoing-count').textContent = outgoing.length;

  $('friends-list').innerHTML = friends.length
    ? friends.map(id => friendRow(id, [
        iconBtn('view', 'View profile', `onclick="window.openUserProfile(${id})"`),
        iconBtn('trash', 'Remove friend', `onclick="window.declineFriend(${id})"`, true)
      ])).join('')
    : empty('No friends yet — share your ID and start a crew.');

  $('incoming-list').innerHTML = incoming.length
    ? incoming.map(f => friendRow(f.a, [
        iconBtn('check', 'Accept', `onclick="window.acceptFriend(${f.a})"`, false, true),
        iconBtn('trash', 'Decline', `onclick="window.declineFriend(${f.a})"`, true)
      ])).join('')
    : empty('No incoming requests.');

  $('outgoing-list').innerHTML = outgoing.length
    ? outgoing.map(f => friendRow(f.b, [
        iconBtn('trash', 'Cancel request', `onclick="window.declineFriend(${f.b})"`, true)
      ])).join('')
    : empty('No pending requests.');
  updateBadges();
}
function friendRow(id, actions) {
  const u = userById(id);
  return `<div class="friend-row">
    ${avatarEl(id, 'avatar-40')}
    <div class="friend-meta">
      <div class="friend-name">${esc(u.username)}${u.github ? ' <span class="badge violet">GH</span>' : ''}</div>
      <div class="friend-id">${uidDisplay(u.id)}</div>
    </div>
    <div class="friend-actions">${actions.join('')}</div>
  </div>`;
}
function iconBtn(kind, label, onclick, danger, violet) {
  const svgs = {
    view: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
  };
  const cls = 'btn-icon' + (danger ? ' danger' : '') + (violet ? ' violet' : '');
  return `<button class="${cls}" title="${label}" aria-label="${label}" ${onclick}>` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgs[kind]}</svg></button>`;
}
function empty(txt) { return `<div class="empty-state">${esc(txt)}</div>`; }

/* ---------------- Friend search ---------------- */
function renderSearch(q) {
  const box = $('friend-search-results');
  const u = me();
  const t = (q || '').trim().toLowerCase();
  if (t.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
  box.hidden = false;
  const matches = data.users.filter(x => String(x.id) !== String(u.id) && (
    x.username.toLowerCase().includes(t) ||
    (q.trim().startsWith('jm-') ? uidDisplay(x.id).toLowerCase().includes(q.trim().toLowerCase()) : false) ||
    uidDisplay(x.id).toLowerCase().includes(t)
  ));
  if (!matches.length) { box.innerHTML = empty('No users match "' + esc(q) + '".'); return; }
  box.innerHTML = '<div>Results</div>' + matches.map(x => {
    const rel = relation(u.id, x.id);
    let action;
    if (rel === 'friends') action = `<span class="badge">Friends</span>`;
    else if (rel === 'outgoing') action = `<span class="badge">Requested</span>`;
    else if (rel === 'incoming') action = iconBtn('check', 'Accept request', `onclick="window.acceptFriend(${x.id})"`, false, true);
    else action = iconBtn('plus', 'Add friend', `onclick="window.addFriend(${x.id})"`, false, true);
    return friendRow(x.id, [action]);
  }).join('');
}

/* ============================================================
   RENDER: JAMS
   ============================================================ */
function myJams() {
  const u = me();
  return data.jams.filter(j => j.members.some(m => String(m) === String(u.id)));
}
function renderJams() {
  const jams = myJams();
  $('jam-grid').innerHTML = jams.length ? jams.map(j => `
    <button class="jam-card" onclick="window.openJam('${j.id}')">
      <div class="jam-card-top">
        <span class="jam-icon">${j.type === 'private' ? '🔒' : '🔊'}</span>
        <span class="badge ${j.type === 'private' ? 'violet' : ''}">${j.type === 'private' ? 'Private' : 'Public'}</span>
      </div>
      <div class="jam-name">${esc(j.name)}</div>
      <div class="jam-desc">${esc(j.desc || '')}</div>
      <div class="jam-meta">
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${j.members.length}</span>
        <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> ${timeStr(j.messages[j.messages.length - 1] ? j.messages[j.messages.length - 1].ts : j.createdAt)}</span>
      </div>
    </button>`).join('')
    : `<div class="empty-state" style="grid-column:1/-1">No jams yet — create one and invite your friends.</div>`;
}

/* ============================================================
   RENDER: ROOM
   ============================================================ */
let currentRoom = null;
function openJam(id) {
  const j = data.jams.find(x => x.id === id);
  if (!j) return toast('Jam not found.', 'error');
  if (!j.members.some(m => String(m) === String(me().id))) return toast('You are not in that jam.', 'error');
  currentRoom = id;
  $('room-title').textContent = j.name;
  $('room-type-badge').textContent = j.type === 'private' ? '🔒 Private' : 'Public';
  $('room-type-badge').className = 'badge' + (j.type === 'private' ? ' violet' : '');
  $('room-members').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${j.members.length} members`;
  $('room-invite-area').innerHTML = `
    <button class="btn btn-ghost pill-sm" onclick="window.openInvite()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
      Invite friends
    </button>
    <span class="hint">${j.type === 'private' ? 'Private jam — only invited members can join.' : 'Public jam — anyone can be invited.'}</span>`;
  setActiveTab('room');
  renderChat();
  window.scrollTo(0, 0);
}
function renderChat() {
  const j = data.jams.find(x => x.id === currentRoom);
  if (!j) return;
  const u = me();
  if (j.nowPlaying) {
    $('music-strip-real') && ($('music-strip-real').hidden = false);
  }
  $('msg-list').innerHTML = j.messages.map(m => {
    const from = userById(m.from);
    const mine = String(m.from) === String(u.id);
    return `<div class="msg ${mine ? 'me' : ''}">
      ${avatarEl(m.from, 'avatar-32')}
      <div>
        <div class="msg-bubble">
          <div class="msg-name">${mine ? 'You' : esc((from || {}).username || '?')}</div>
          <div class="msg-text">${esc(m.text)}</div>
          <div class="msg-time">${timeStr(m.ts)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  const list = $('msg-list');
  list.scrollTop = list.scrollHeight;
}
function sendMessage() {
  const input = $('msg-input');
  const text = input.value.trim();
  if (!text) return;
  const j = data.jams.find(x => x.id === currentRoom);
  if (!j) return;
  j.messages.push({ from: me().id, text, ts: Date.now() });
  save();
  input.value = '';
  renderChat();
}

/* ---------------- Invite modal ---------------- */
function openInvite() {
  const j = data.jams.find(x => x.id === currentRoom);
  if (!j) return;
  const inRoom = j.members.map(String);
  const friends = friendsOf(me().id).filter(f => !inRoom.includes(String(f)));
  openModal('Invite friends', friends.length
    ? `<p class="hint" style="margin:-6px 0 2px;">Choose friends to bring into <strong style="color:var(--frost)">${esc(j.name)}</strong>.</p>` +
      friends.map(f => {
        const fr = userById(f);
        return `<div class="friend-row">
          ${avatarEl(f, 'avatar-40')}
          <div class="friend-meta"><div class="friend-name">${esc(fr.username)}</div><div class="friend-id">${uidDisplay(fr.id)}</div></div>
          <button class="btn-icon violet" title="Invite" onclick="window.inviteToJam(${f})"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        </div>`;
      }).join('')
    : '<p class="hint">You have no friends to invite right now. Add some first!</p>');
}
function inviteToJam(fid) {
  const j = data.jams.find(x => x.id === currentRoom);
  if (!j) return;
  if (!j.members.some(m => String(m) === String(fid))) j.members.push(fid);
  const fr = userById(fid);
  save();
  closeModal();
  renderJams();
  renderChat();
  $('room-members').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${j.members.length} members`;
  toast(esc(fr.username) + ' joined \"' + j.name + '\".', 'ok');
}

/* ============================================================
   AUTH ACTIONS
   ============================================================ */
function gotoPanel() {
  renderProfile(); renderFriends(); renderJams();
  setTabState();
  showScreen('panel');
  setActiveTab('profile');
  updateBadges();
  toast('Welcome back, ' + me().username + '!');
}
function setTabState() { /* refresh sidebar badge */ updateBadges(); }

function errNear(id, msg) {
  const field = $(id);
  field.style.borderColor = '#ff7a6e';
  field.parentElement.querySelectorAll('.err-text').forEach(e => e.remove());
  const e = document.createElement('div');
  e.className = 'err-text'; e.textContent = msg;
  field.insertAdjacentElement('afterend', e);
  setTimeout(() => { e.remove(); field.style.borderColor = ''; }, 3200);
}
function clearErrors() { document.querySelectorAll('.err-text').forEach(e => e.remove()); }

function handleLogin(e) {
  e.preventDefault(); clearErrors();
  const un = $('login-username').value.trim();
  const pw = $('login-password').value;
  const u = data.users.find(x => x.username.toLowerCase() === un.toLowerCase());
  if (!u) return errNear('login-username', 'No account with that username.');
  if (u.github) return errNear('login-username', 'This is a GitHub account — use the GitHub button.');
  if (u.password !== pw) return errNear('login-password', 'Wrong password.');
  storage.setSession(u.id); save();
  gotoPanel();
}

function handleSignup(e) {
  e.preventDefault(); clearErrors();
  const username = $('su-username').value.trim();
  const email = $('su-email').value.trim();
  const pw = $('su-password').value;
  const pw2 = $('su-password2').value;
  const q = $('su-question').value;
  const ans = $('su-answer').value.trim();

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return errNear('su-username', '3–20 chars, letters/numbers/underscore only.');
  if (data.users.some(x => x.username.toLowerCase() === username.toLowerCase())) return errNear('su-username', 'That username is taken.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return errNear('su-email', 'Enter a valid email.');
  if (pw.length < 6) return errNear('su-password', 'Password must be at least 6 characters.');
  if (pw !== pw2) return errNear('su-password2', 'Passwords do not match.');
  if (!ans) return errNear('su-answer', 'Please answer your security question.');

  const id = nextUserId();
  data.users.push({ id, username, email, password: pw, question: q, answer: ans.toLowerCase(), avatarId: Math.floor(Math.random() * AVATAR_PAL.length), bio: '', createdAt: Date.now(), github: false });
  // demo: sara sends a friend request to every new member
  data.friendships.push({ id: nextFid(), a: 1001, b: id, from: 1001, status: 'pending' });
  // new member joins the public lounges
  data.jams.find(j => j.id === 'J1').members.push(id);
  data.jams.find(j => j.id === 'J2').members.push(id);
  storage.setSession(id); save();
  gotoPanel();
  toast('Welcome to Jam, ' + username + '! 🎉');
}

function githubLogin() {
  let uid = data.githubUid;
  let u = uid ? data.users.find(x => String(x.id) === String(uid)) : null;
  if (!u) {
    let base = 'githero';
    let username = base;
    let n = 2;
    while (data.users.some(x => x.username.toLowerCase() === username.toLowerCase())) username = base + n++;
    u = { id: nextUserId(), username, email: username + '@github.demo', password: null, question: null, answer: null, avatarId: Math.floor(Math.random() * AVATAR_PAL.length), bio: 'Signed in with GitHub (demo OAuth)', createdAt: Date.now(), github: true };
    data.users.push(u);
    data.githubUid = u.id;
    data.friendships.push({ id: nextFid(), a: 1001, b: u.id, from: 1001, status: 'pending' });
    data.jams.find(j => j.id === 'J1').members.push(u.id);
    data.jams.find(j => j.id === 'J2').members.push(u.id);
    save();
  }
  storage.setSession(u.id);
  gotoPanel();
  toast('Signed in with GitHub (demo OAuth as ' + u.username + ').', 'ok');
}

function nextUserId() { return Math.max.apply(null, data.users.map(u => u.id)) + 1; }
function nextFid() { const f = (data.nextFid || 0) + 1; data.nextFid = f; return f; }

/* ---------------- Forgot password ---------------- */
let forgotUser = null;
function forgotNext() {
  clearErrors();
  const un = $('forgot-username').value.trim();
  const u = data.users.find(x => x.username.toLowerCase() === un.toLowerCase());
  if (!u) return errNear('forgot-username', 'No account with that username.');
  if (!u.question || u.github) return errNear('forgot-username', 'Account was created with GitHub — not recoverable via question.');
  forgotUser = u;
  $('forgot-question').textContent = u.question;
  $('forgot-step1').hidden = true;
  $('forgot-step2').hidden = false;
}
function forgotReset() {
  clearErrors();
  const ans = $('forgot-answer').value.trim().toLowerCase();
  const p1 = $('forgot-newpass').value;
  const p2 = $('forgot-newpass2').value;
  if (ans !== forgotUser.answer) return errNear('forgot-answer', 'That answer is not correct.');
  if (p1.length < 6) return errNear('forgot-newpass', 'Password must be at least 6 characters.');
  if (p1 !== p2) return errNear('forgot-newpass2', 'Passwords do not match.');
  forgotUser.password = p1;
  save();
  toast('Password updated. Sign in with the new one.', 'ok');
  forgotUser = null;
  switchAuthView('login');
}

/* ---------------- Profile actions ---------------- */
function saveProfile() {
  const u = me();
  const un = $('pf-username').value.trim();
  const em = $('pf-email').value.trim();
  const bio = $('pf-bio').value.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(un)) return toast('Username: 3–20 chars, letters/numbers/underscore.', 'error');
  if (data.users.some(x => x.username.toLowerCase() === un.toLowerCase() && String(x.id) !== String(u.id))) return toast('That username is taken.', 'error');
  if (em && !/^\S+@\S+\.\S+$/.test(em)) return toast('Invalid email.', 'error');
  u.username = un; u.email = em; u.bio = bio;
  save(); renderProfile();
  toast('Profile saved.');
}
function pickAvatar(i) {
  const u = me();
  u.avatarId = i;
  save(); renderProfile();
  document.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('selected', Number(b.dataset.avatarIdx) === i));
  toast('Avatar updated.');
}
function copyMyId() {
  const id = uidDisplay(me().id);
  const done = () => toast('Copied ' + id + ' — share it to add friends.', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(done).catch(() => fallbackCopy(id, done));
  else fallbackCopy(id, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch (_) { toast('Copy failed.', 'error'); }
  ta.remove();
}
function changePassword() {
  const u = me();
  if (u.github) return toast('GitHub accounts don\'t use passwords.', 'error');
  const cur = $('cp-current').value;
  const n1 = $('cp-new').value;
  const n2 = $('cp-new2').value;
  if (cur !== u.password) return toast('Current password is wrong.', 'error');
  if (n1.length < 6) return toast('New password: min 6 characters.', 'error');
  if (n1 !== n2) return toast('New passwords do not match.', 'error');
  u.password = n1; save();
  $('cp-current').value = $('cp-new').value = $('cp-new2').value = '';
  toast('Password changed.');
}

/* ---------------- Friend actions (window.* for inline handlers) ---------------- */
function addFriend(id) {
  if (!relation(me().id, id)) {
    data.friendships.push({ id: nextFid(), a: me().id, b: id, from: me().id, status: 'pending' });
    save();
    toast('Request sent to ' + userById(id).username + '.');
  }
  renderFriends(); renderSearch($('friend-search').value);
}
function acceptFriend(id) {
  const f = data.friendships.find(x => x.status === 'pending' && String(x.b) === String(me().id) && String(x.a) === String(id));
  if (f) { f.status = 'friends'; save(); toast('You and ' + userById(id).username + ' are now friends! ⚡', 'ok'); }
  renderFriends(); renderSearch($('friend-search').value);
}
function declineFriend(id) {
  data.friendships = data.friendships.filter(x => !((String(x.a) === String(id) && String(x.b) === String(me().id)) || (String(x.a) === String(me().id) && String(x.b) === String(id))));
  save();
  renderFriends(); renderSearch($('friend-search').value);
}
function openUserProfile(id) {
  const u = userById(id);
  const rel = relation(me().id, id);
  let action;
  if (rel === 'friends') action = `<button class="btn btn-ghost btn-block" onclick="window.declineFriend(${id}); closeModal();">Remove friend</button>`;
  else if (rel === 'outgoing') action = `<button class="btn btn-ghost btn-block" disabled>Request sent</button>`;
  else if (rel === 'incoming') action = `<button class="btn btn-violet btn-block" onclick="window.acceptFriend(${id}); closeModal();">Accept request</button>`;
  else action = `<button class="btn btn-violet btn-block" onclick="window.addFriend(${id}); closeModal();">Add friend</button>`;

  openModal('Profile', `
    <div style="text-align:center;">
      <div style="display:inline-flex;">${avatarEl(id, 'avatar-56')}</div>
      <h3 style="font-family:var(--font-display);font-weight:500;font-size:22px;color:var(--white);margin-top:12px;">${esc(u.username)}</h3>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--fog);margin-top:4px;">${uidDisplay(u.id)}${u.github ? ' · GitHub' : ''}</div>
      <div style="font-size:12px;color:var(--fog);margin-top:4px;">Joined ${fmtDate(u.createdAt)}</div>
      <p style="color:var(--moon);font-size:14px;margin:14px 0 20px;">${esc(u.bio || 'No bio yet.')}</p>
      ${action}
    </div>`);
}

/* ---------------- Modal ---------------- */
function openModal(title, bodyHTML) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHTML;
  $('modal-backdrop').hidden = false;
}
function closeModal() { $('modal-backdrop').hidden = true; }

/* ---------------- New jam ---------------- */
function openNewJam() {
  openModal('New jam', `
    <label class="field"><span class="field-label">Name</span>
      <input class="auth-input" id="nj-name" type="text" placeholder="e.g. Night Shift" maxlength="40" /></label>
    <label class="field"><span class="field-label">Description <span class="opt">(optional)</span></span>
      <input class="auth-input" id="nj-desc" type="text" placeholder="What's this jam about?" maxlength="120" /></label>
    <div class="field">
      <span class="field-label">Type</span>
      <div class="seg">
        <button type="button" class="seg-btn active" data-type="public">Public</button>
        <button type="button" class="seg-btn" data-type="private">Private</button>
      </div>
    </div>
    <button class="btn btn-violet btn-block" onclick="window.createJam()">Create jam</button>`);
  $('modal-body').querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
    $('modal-body').querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x === b));
  }));
  setTimeout(() => $('nj-name') && $('nj-name').focus(), 40);
}
function createJam() {
  const name = ($('nj-name') || {}).value ? $('nj-name').value.trim() : '';
  const desc = ($('nj-desc') || {}).value ? $('nj-desc').value.trim() : '';
  if (!name) return toast('Give your jam a name.', 'error');
  const type = $('modal-body').querySelector('.seg-btn.active').dataset.type;
  const jid = 'J' + (Math.max(0, ...data.jams.filter(j => j.id[0] === 'J').map(j => parseInt(j.id.slice(1), 10))) + 1);
  data.jams.push({ id: jid, name, desc, type, ownerId: me().id, members: [me().id], createdAt: Date.now(), nowPlaying: null, messages: [{ from: me().id, text: 'Jam started 🎬', ts: Date.now() }] });
  save(); closeModal(); renderJams(); openJam(jid);
}

/* ---------------- Init / bindings ---------------- */
function bind() {
  // auth view switching
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => switchAuthView(b.dataset.goto)));

  // login / signup / forgot
  $('form-login').addEventListener('submit', handleLogin);
  $('form-signup').addEventListener('submit', handleSignup);
  $('btn-github-login').addEventListener('click', githubLogin);
  $('btn-github-signup').addEventListener('click', githubLogin);
  $('btn-forgot-next').addEventListener('click', forgotNext);
  $('btn-forgot-reset').addEventListener('click', forgotReset);

  // panel
  $('btn-logout').addEventListener('click', () => {
    storage.setSession(null); currentRoom = null;
    showScreen('auth'); switchAuthView('login');
    $('login-password').value = '';
    toast('Signed out.');
  });
  document.querySelectorAll('.side-item').forEach(it => it.addEventListener('click', () => {
    if (it.dataset.tab === 'jams') renderJams();
    setActiveTab(it.dataset.tab);
  }));

  // profile
  $('btn-save-profile').addEventListener('click', saveProfile);
  $('btn-copy-id').addEventListener('click', copyMyId);
  $('btn-change-pass').addEventListener('click', changePassword);
  $('avatar-picker').addEventListener('click', e => {
    const btn = e.target.closest('.avatar-opt');
    if (btn) pickAvatar(Number(btn.dataset.avatarIdx));
  });

  // friends
  $('friend-search').addEventListener('input', e => renderSearch(e.target.value));

  // jams / room
  $('btn-new-jam').addEventListener('click', openNewJam);
  $('btn-back-jams').addEventListener('click', () => { currentRoom = null; setActiveTab('jams'); });
  $('btn-send-msg').addEventListener('click', sendMessage);
  $('msg-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  // modal
  $('btn-close-modal').addEventListener('click', closeModal);
  $('modal-backdrop').addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // cross-tab sync (open two copies of this file to chat/friends live)
  if (LS_OK) window.addEventListener('storage', ev => {
    if (ev.key !== 'jam_data_me') return;
    data = JSON.parse(ev.newValue);
    if (me()) {
      renderProfile(); renderFriends(); renderSearch($('friend-search').value); renderJams();
      if (currentRoom) { renderChat(); const j = data.jams.find(x => x.id === currentRoom); if (j) $('room-members').textContent = j.members.length + ' members'; }
    }
  });
}

function init() {
  bind();
  if (me()) { renderProfile(); renderFriends(); renderJams(); showScreen('panel'); setActiveTab('profile'); updateBadges(); }
  else { showScreen('auth'); switchAuthView('login'); }
}

// expose inline-handler API
window.addFriend = addFriend;
window.acceptFriend = acceptFriend;
window.declineFriend = declineFriend;
window.openUserProfile = openUserProfile;
window.openJam = openJam;
window.openInvite = openInvite;
window.inviteToJam = inviteToJam;
window.createJam = createJam;
window.closeModal = closeModal;

init();