// ─── App Init ─────────────────────────────────────────────
async function initApp() {
  showApp('app');

  // Load user info
  const user = Auth.getUser();
  if (user) {
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-role-display').textContent = user.role;
    document.getElementById('user-avatar-display').textContent = avatarLetters(user.name);
  }

  // Load projects
  await loadProjects();

  // Load team members
  const { ok, data } = await api('/auth/team');
  if (ok) State.teamMembers = data.users || [];

  navigateTo('dashboard');
  loadDashboard();
}

// ─── Dashboard ────────────────────────────────────────────
async function loadDashboard() {
  const user = Auth.getUser();
  document.getElementById('dashboard-greeting').textContent =
    `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0] || 'there'}! 👋`;
  document.getElementById('dashboard-proj-count').textContent = State.projects.length;

  // Load my tasks
  const { ok, data } = await api('/tasks/my');
  if (ok) {
    const tasks = data.tasks || [];
    document.getElementById('dashboard-tasks-count').textContent = tasks.length;
    renderDashboardTasks(tasks.slice(0, 5));
    const urgent = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    document.getElementById('dashboard-urgent-count').textContent = urgent;
  }
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function renderDashboardTasks(tasks) {
  const el = document.getElementById('dashboard-recent-tasks');
  if (!el) return;
  el.innerHTML = tasks.length ? tasks.map(t => `
    <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <span class="badge ${`priority-${t.priority}`}">${t.priority}</span>
      <span style="flex:1;font-size:13px;font-weight:500">${t.title}</span>
      ${statusBadge(t.status)}
      ${t.dueDate ? `<span style="font-size:11px;color:${new Date(t.dueDate)<new Date()?'var(--red)':'var(--text-muted)'}">${fmtDate(t.dueDate)}</span>` : ''}
    </div>
  `).join('') : '<div class="text-muted" style="padding:16px;font-size:13px">No pending tasks 🎉</div>';
}

// ─── Load Project Page ────────────────────────────────────
function loadProjectPage(pageId) {
  if (!State.currentProject) return;
  if (pageId === 'project-overview') loadProjectOverview();
  else if (pageId === 'project-chat') loadProjectChat();
  else if (pageId === 'project-budget') loadBudget();
  else if (pageId === 'project-changelog') loadChangelog();
  else if (pageId === 'project-adcopy') { loadAdCopy(); initAdCopyForm(); }
  else if (pageId === 'project-keywords') loadKeywords();
  else if (pageId === 'project-searchterms') loadSearchTerms();
  else if (pageId === 'project-landingpages') loadLandingPages();
}

function initAdCopyForm() {
  const hw = document.getElementById('ac-headlines-wrap');
  const dw = document.getElementById('ac-descs-wrap');
  if (!hw || hw.children.length) return;
  addHeadlineField(); addHeadlineField(); addHeadlineField();
  addDescField(); addDescField();
}

// ─── Project sub-nav ──────────────────────────────────────
function openProjectTab(pageId) {
  if (!State.currentProject) { showToast('Please select a project first', 'warning'); return; }
  navigateTo(pageId, State.currentProject._id);
}

// ─── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    initApp();
  } else {
    showApp('auth');
    showAuthPage('login');
  }
});