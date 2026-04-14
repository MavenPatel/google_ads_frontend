// ─── Config ──────────────────────────────────────────────
//const API_BASE = 'http://localhost:5000/api/v1';
const API_BASE = 'https://hnd-backend.onrender.com/api/v1';
// ─── Token helpers ────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('hnd_token'),
  setToken: (t) => localStorage.setItem('hnd_token', t),
  getUser: () => { try { return JSON.parse(localStorage.getItem('hnd_user')) || null; } catch { return null; } },
  setUser: (u) => localStorage.setItem('hnd_user', JSON.stringify(u)),
  clear: () => { localStorage.removeItem('hnd_token'); localStorage.removeItem('hnd_user'); },
  isLoggedIn: () => !!localStorage.getItem('hnd_token'),
};

// ─── API helper ───────────────────────────────────────────
async function api(path, opts = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { Auth.clear(); showApp('auth'); }
  return { ok: res.ok, status: res.status, data };
}

// FormData upload (no Content-Type so browser sets boundary)
async function apiUpload(path, formData) {
  const token = Auth.getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${msg}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">×</span>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─── Modal helpers ────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); document.body.style.overflow = ''; }
}

// ─── App state ────────────────────────────────────────────
const State = {
  projects: [],
  currentProject: null,
  teamMembers: [],
  tasks: [],
  messages: [],
};

// ─── Nav helpers ─────────────────────────────────────────
function showApp(view) {
  document.getElementById('auth-section').style.display = view === 'auth' ? 'flex' : 'none';
  document.getElementById('app-section').style.display = view === 'app' ? 'flex' : 'none';
}

function navigateTo(pageId, projectId = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`[data-page="${pageId}"]`);
  if (nav) nav.classList.add('active');

  if (projectId) {
    State.currentProject = State.projects.find(p => p._id === projectId) || State.currentProject;
    loadProjectPage(pageId);
  } else if (pageId === 'dashboard') {
    loadDashboard();
  } else if (pageId === 'tasks') {
    loadTasks();
  } else if (pageId === 'global-chat') {
    loadGlobalChat();
  } else if (pageId === 'search') {
    // ready
  }

  // update topbar
  updateTopbar(pageId);
}

function updateTopbar(pageId) {
  const titles = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    tasks: 'My Tasks',
    'global-chat': 'Global Chat',
    search: 'Search',
    'project-overview': State.currentProject?.name || 'Project',
    'project-chat': (State.currentProject?.name || 'Project') + ' · Chat',
    'project-budget': (State.currentProject?.name || 'Project') + ' · Budget',
    'project-changelog': (State.currentProject?.name || 'Project') + ' · Change Log',
    'project-adcopy': (State.currentProject?.name || 'Project') + ' · Ad Copies',
    'project-keywords': (State.currentProject?.name || 'Project') + ' · Keywords',
    'project-searchterms': (State.currentProject?.name || 'Project') + ' · Search Terms',
    'project-landingpages': (State.currentProject?.name || 'Project') + ' · Landing Pages',
  };
  document.getElementById('topbar-title').textContent = titles[pageId] || pageId;
}

// ─── Avatar letter helper ─────────────────────────────────
function avatarLetters(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// ─── Date helpers ─────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(d) { return `${fmtDate(d)}, ${fmtTime(d)}`; }

// ─── Status badge helper ──────────────────────────────────
function statusBadge(status) {
  const map = {
    active: 'badge-green', paused: 'badge-yellow', archived: 'badge-gray',
    testing: 'badge-blue', inactive: 'badge-gray',
    pending: 'badge-yellow', in_progress: 'badge-blue', done: 'badge-green',
    low: 'badge-gray', medium: 'badge-accent', high: 'badge-yellow', urgent: 'badge-red',
    excluded: 'badge-red', added_as_keyword: 'badge-green',
    broad: 'badge-gray', phrase: 'badge-blue', exact: 'badge-accent', broad_modified: 'badge-yellow',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status?.replace(/_/g,' ') || '—'}</span>`;
}

// ─── Currency formatter ───────────────────────────────────
function fmtCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '—';
  const sym = { INR: '₹', USD: '$', AUD: 'A$' };
  return `${sym[currency] || ''}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ─── Debounce ─────────────────────────────────────────────
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ─── Close dropdowns on outside click ────────────────────
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }
});