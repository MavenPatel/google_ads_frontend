// ─── Projects Module ──────────────────────────────────────

async function loadProjects() {
  const { ok, data } = await api('/projects');
  if (ok) {
    State.projects = data.projects || [];
    renderProjectsPage();
    renderSidebarProjects();
  }
}

function renderSidebarProjects() {
  const container = document.getElementById('sidebar-projects-list');
  if (!container) return;
  if (!State.projects.length) {
    container.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:var(--text-muted)">No projects yet</div>`;
    return;
  }
  container.innerHTML = State.projects.map(p => `
    <div class="sidebar-project-item ${State.currentProject?._id === p._id ? 'active' : ''}"
         onclick="openProject('${p._id}')">
      <span class="sidebar-project-dot" style="background:${p.color || '#6366f1'}"></span>
      <span class="sidebar-project-name">${p.name}</span>
    </div>
  `).join('');
}

function renderProjectsPage() {
  const container = document.getElementById('projects-grid');
  if (!container) return;
  if (!State.projects.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📁</div>
        <div class="empty-title">No projects yet</div>
        <div class="empty-desc">Create your first project to start tracking your Google Ads campaigns.</div>
        <button class="btn btn-primary mt-8" onclick="openModal('modal-create-project')">+ New Project</button>
      </div>`;
    return;
  }
  container.innerHTML = State.projects.map(p => `
    <div class="project-card card" style="border-top:3px solid ${p.color || '#6366f1'}; cursor:pointer"
         onclick="openProject('${p._id}')">
      <div class="card-header">
        <div>
          <div class="card-title">${p.name}</div>
          <div class="card-subtitle">${p.description || 'No description'}</div>
        </div>
        <div class="dropdown">
          <button class="btn btn-ghost btn-icon" onclick="event.stopPropagation();toggleDropdown('proj-menu-${p._id}')">⋮</button>
          <div class="dropdown-menu" id="proj-menu-${p._id}">
            <div class="dropdown-item" onclick="event.stopPropagation();openEditProject('${p._id}')">✏️ Edit</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="event.stopPropagation();deleteProject('${p._id}')">🗑️ Delete</div>
          </div>
        </div>
      </div>
      <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
        ${statusBadge(p.status)}
        <span class="badge badge-gray">💰 ${fmtCurrency(p.monthlyBudget, p.currency)}/mo</span>
        <span class="badge badge-gray">🕐 ${p.timezone}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex" style="margin-left:4px">
          ${(p.members || []).slice(0,4).map(m => `
            <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#a78bfa);
              display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;
              border:2px solid var(--bg-card);margin-left:-8px;first:margin-left:0">
              ${avatarLetters(m.user?.name || '')}
            </div>
          `).join('')}
          ${p.members?.length > 4 ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px">+${p.members.length-4}</span>` : ''}
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${fmtDate(p.createdAt)}</span>
      </div>
    </div>
  `).join('');
}

function toggleDropdown(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m.id !== id) m.classList.remove('open'); });
  menu.classList.toggle('open');
}

function openProject(projectId) {
  State.currentProject = State.projects.find(p => p._id === projectId);
  renderSidebarProjects();
  navigateTo('project-overview');
  loadProjectOverview();
}

// ─── Project Overview ─────────────────────────────────────
async function loadProjectOverview() {
  if (!State.currentProject) return;
  const p = State.currentProject;
  document.getElementById('proj-overview-name').textContent = p.name;
  document.getElementById('proj-overview-desc').textContent = p.description || 'No description';
  document.getElementById('proj-overview-status').innerHTML = statusBadge(p.status);
  document.getElementById('proj-overview-budget').textContent = fmtCurrency(p.monthlyBudget, p.currency);
  document.getElementById('proj-overview-timezone').textContent = p.timezone;
  document.getElementById('proj-overview-currency').textContent = p.currency;

  // Members
  const membersEl = document.getElementById('proj-members-list');
  membersEl.innerHTML = (p.members || []).map(m => `
    <div class="flex items-center gap-12" style="padding:12px 0;border-bottom:1px solid var(--border)">
      <div class="user-avatar" style="width:36px;height:36px;font-size:14px">${avatarLetters(m.user?.name || '')}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${m.user?.name || 'Unknown'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${m.user?.email || ''}</div>
      </div>
      ${statusBadge(m.role)}
    </div>
  `).join('');

  // Load summary counts
  loadProjectSummaryCounts(p._id);
}

async function loadProjectSummaryCounts(projectId) {
  const [budgetRes, taskRes, changeRes] = await Promise.all([
    api(`/projects/${projectId}/budget/latest`),
    api('/tasks?status=pending'),
    api(`/projects/${projectId}/changelog?limit=5`),
  ]);

  if (budgetRes.ok && budgetRes.data.entry) {
    const e = budgetRes.data.entry;
    document.getElementById('stat-yesterday-spend').textContent = fmtCurrency(e.yesterdaySpend, State.currentProject?.currency);
    document.getElementById('stat-today-allowed').textContent = fmtCurrency(e.todayAllowed, State.currentProject?.currency);
    document.getElementById('stat-monthly-target').textContent = fmtCurrency(e.monthlyTarget, State.currentProject?.currency);
    const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round((e.monthSpentSoFar / e.monthlyTarget) * 100)) : 0;
    document.getElementById('stat-budget-progress').style.width = pct + '%';
    document.getElementById('stat-budget-pct').textContent = pct + '%';
    const barEl = document.getElementById('stat-budget-progress');
    barEl.className = 'progress-bar ' + (pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'green');
  }

  if (changeRes.ok) {
    const recentEl = document.getElementById('recent-changes-list');
    const entries = changeRes.data.entries || [];
    recentEl.innerHTML = entries.length ? entries.map(e => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">${e.type?.replace(/_/g,' ')}</div>
          <div style="font-size:12px;color:var(--text-muted)">${e.campaign || '—'} · ${fmtDate(e.date)}</div>
        </div>
        <span class="badge badge-accent" style="margin-left:auto">${e.type?.split('_')[0]}</span>
      </div>
    `).join('') : '<div class="text-muted" style="font-size:13px;padding:16px 0">No changes logged yet.</div>';
  }
}

// ─── Create Project ───────────────────────────────────────
document.getElementById('form-create-project').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating...';

  const { ok, data } = await api('/projects', {
    method: 'POST',
    body: {
      name: document.getElementById('cp-name').value.trim(),
      description: document.getElementById('cp-desc').value.trim(),
      timezone: document.getElementById('cp-timezone').value,
      monthlyBudget: parseFloat(document.getElementById('cp-budget').value) || 0,
      currency: document.getElementById('cp-currency').value,
      color: document.getElementById('cp-color').value,
    },
  });

  btn.disabled = false; btn.textContent = 'Create Project';

  if (ok) {
    showToast('Project created!', 'success');
    closeModal('modal-create-project');
    e.target.reset();
    await loadProjects();
    navigateTo('projects');
  } else {
    showToast(data.message || 'Failed to create project', 'error');
  }
});

// ─── Edit Project ─────────────────────────────────────────
function openEditProject(projectId) {
  const p = State.projects.find(x => x._id === projectId);
  if (!p) return;
  document.getElementById('ep-id').value = p._id;
  document.getElementById('ep-name').value = p.name;
  document.getElementById('ep-desc').value = p.description || '';
  document.getElementById('ep-timezone').value = p.timezone;
  document.getElementById('ep-budget').value = p.monthlyBudget;
  document.getElementById('ep-currency').value = p.currency;
  document.getElementById('ep-status').value = p.status;
  openModal('modal-edit-project');
}

document.getElementById('form-edit-project').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ep-id').value;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { ok, data } = await api(`/projects/${id}`, {
    method: 'PUT',
    body: {
      name: document.getElementById('ep-name').value.trim(),
      description: document.getElementById('ep-desc').value.trim(),
      timezone: document.getElementById('ep-timezone').value,
      monthlyBudget: parseFloat(document.getElementById('ep-budget').value) || 0,
      currency: document.getElementById('ep-currency').value,
      status: document.getElementById('ep-status').value,
    },
  });

  btn.disabled = false; btn.textContent = 'Save Changes';
  if (ok) {
    showToast('Project updated!', 'success');
    closeModal('modal-edit-project');
    await loadProjects();
  } else {
    showToast(data.message || 'Update failed', 'error');
  }
});

// ─── Delete Project ───────────────────────────────────────
async function deleteProject(projectId) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const { ok, data } = await api(`/projects/${projectId}`, { method: 'DELETE' });
  if (ok) {
    showToast('Project deleted', 'info');
    if (State.currentProject?._id === projectId) State.currentProject = null;
    await loadProjects();
    navigateTo('projects');
  } else {
    showToast(data.message || 'Delete failed', 'error');
  }
}

// ─── Add Member ───────────────────────────────────────────
async function loadTeamForSelect() {
  const { ok, data } = await api('/auth/team');
  if (ok) {
    State.teamMembers = data.users || [];
    const sel = document.getElementById('member-user-select');
    if (sel) {
      sel.innerHTML = '<option value="">Select team member</option>' +
        State.teamMembers.map(u => `<option value="${u._id}">${u.name} (${u.email})</option>`).join('');
    }
  }
}

document.getElementById('form-add-member')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const userId = document.getElementById('member-user-select').value;
  const role = document.getElementById('member-role').value;
  if (!userId) { showToast('Select a team member', 'error'); return; }

  const { ok, data } = await api(`/projects/${State.currentProject._id}/members`, {
    method: 'POST', body: { userId, role },
  });
  if (ok) {
    showToast('Member added!', 'success');
    closeModal('modal-add-member');
    State.currentProject = data.project;
    State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
    loadProjectOverview();
    renderSidebarProjects();
  } else {
    showToast(data.message || 'Failed', 'error');
  }
});