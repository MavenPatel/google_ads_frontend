// ═══════════════════════════════════════════
// CHAT MODULE
// ═══════════════════════════════════════════
let chatScrollBottom = true;

async function loadProjectChat() {
  if (!State.currentProject) return;
  const { ok, data } = await api(`/projects/${State.currentProject._id}/chat?limit=80`);
  if (!ok) return;
  State.messages = data.messages || [];
  renderMessages('chat-messages-list', State.messages, State.currentProject._id);
  scrollChatToBottom('chat-messages-list');
}

async function loadGlobalChat() {
  const { ok, data } = await api('/chat/global?limit=80');
  if (!ok) return;
  renderMessages('global-chat-list', data.messages || [], null);
  scrollChatToBottom('global-chat-list');
}

function renderMessages(containerId, messages, projectId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const me = Auth.getUser();

  if (!messages.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No messages yet</div><div class="empty-desc">Be the first to say something!</div></div>`;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isOwn = msg.sender?._id === me?._id || msg.sender === me?._id;
    const senderName = msg.sender?.name || 'Unknown';
    if (msg.isDeleted) {
      return `<div class="msg-group"><div class="msg-bubble" style="font-style:italic;color:var(--text-muted);opacity:0.6">🗑️ Message deleted</div></div>`;
    }
    return `
      <div class="msg-group" id="msg-${msg._id}">
        ${!isOwn ? `<div class="msg-sender">
          <div class="msg-avatar">${avatarLetters(senderName)}</div>
          <span class="msg-name">${senderName}</span>
          <span class="msg-time">${fmtTime(msg.createdAt)}</span>
        </div>` : ''}
        <div style="display:flex;${isOwn ? 'justify-content:flex-end' : ''}">
          <div class="msg-bubble ${isOwn ? 'own' : ''}">
            ${msg.replyTo ? `<div style="padding:6px 10px;background:var(--bg-hover);border-left:2px solid var(--accent);border-radius:4px;margin-bottom:8px;font-size:12px;color:var(--text-muted)">↩ Reply to message</div>` : ''}
            ${msg.messageType === 'image' ? `<img src="http://localhost:5000${msg.fileUrl}" style="max-width:200px;border-radius:8px;margin-bottom:4px">` : ''}
            ${msg.messageType === 'file' ? `<a href="http://localhost:5000${msg.fileUrl}" target="_blank" style="color:var(--accent)">📎 ${msg.fileName || 'File'}</a>` : ''}
            ${msg.content ? `<span>${msg.content}</span>` : ''}
            ${msg.tags?.length ? msg.tags.map(t => `<span class="msg-tag">${t.replace(/_/g,' ')}</span>`).join('') : ''}
            ${isOwn ? `<div style="text-align:right;margin-top:4px"><span style="font-size:10px;color:var(--text-muted)">${fmtTime(msg.createdAt)}</span></div>` : ''}
          </div>
        </div>
        ${(msg.reactions?.length) ? `<div class="msg-reactions ${isOwn ? '' : ''}">
          ${msg.reactions.map(r => `<button class="msg-reaction-btn">${r.emoji} ${r.users.length}</button>`).join('')}
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function scrollChatToBottom(containerId) {
  const el = document.getElementById(containerId);
  if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
}

// Project chat send
const chatTextarea = document.getElementById('chat-input');
if (chatTextarea) {
  chatTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendProjectMessage(); }
  });
  chatTextarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
}

async function sendProjectMessage() {
  if (!State.currentProject) return;
  const ta = document.getElementById('chat-input');
  const content = ta.value.trim();
  if (!content) return;

  const selectedTags = Array.from(document.querySelectorAll('.chat-tag-select .chat-tag.selected')).map(t => t.dataset.tag);

  ta.value = '';
  ta.style.height = 'auto';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/chat`, {
    method: 'POST',
    body: { content, messageType: 'text', tags: selectedTags },
  });
  if (ok) {
    State.messages.push(data.message);
    renderMessages('chat-messages-list', State.messages, State.currentProject._id);
    scrollChatToBottom('chat-messages-list');
    document.querySelectorAll('.chat-tag').forEach(t => t.classList.remove('selected'));
  } else showToast('Failed to send', 'error');
}

// Global chat send
const globalTextarea = document.getElementById('global-chat-input');
if (globalTextarea) {
  globalTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGlobalMessage(); }
  });
}

async function sendGlobalMessage() {
  const ta = document.getElementById('global-chat-input');
  const content = ta.value.trim();
  if (!content) return;
  ta.value = '';

  const { ok, data } = await api('/chat/global', {
    method: 'POST',
    body: { content },
  });
  if (ok) {
    loadGlobalChat();
  } else showToast('Failed to send', 'error');
}

// File upload in chat
async function uploadChatFile(file) {
  if (!State.currentProject || !file) return;
  const fd = new FormData();
  fd.append('file', file);
  const { ok, data } = await apiUpload(`/projects/${State.currentProject._id}/chat/upload`, fd);
  if (ok) {
    showToast('File sent!', 'success');
    loadProjectChat();
  } else showToast('Upload failed', 'error');
}

// Tag toggle in chat
document.querySelectorAll('.chat-tag').forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('selected'));
});

// Pinned messages
async function loadPinnedMessages() {
  if (!State.currentProject) return;
  const { ok, data } = await api(`/projects/${State.currentProject._id}/chat/pinned`);
  if (!ok) return;
  const container = document.getElementById('pinned-messages-list');
  if (!container) return;
  container.innerHTML = (data.messages || []).length
    ? data.messages.map(m => `<div class="card card-sm mb-16"><div class="fw-700 mb-16">${m.sender?.name}</div><div style="font-size:13px">${m.content}</div><div style="font-size:11px;color:var(--text-muted);margin-top:6px">${fmtDateTime(m.createdAt)}</div></div>`).join('')
    : '<div class="empty-state"><div class="empty-icon">📌</div><div class="empty-title">No pinned messages</div></div>';
  openModal('modal-pinned');
}

// ═══════════════════════════════════════════
// TASKS MODULE
// ═══════════════════════════════════════════
async function loadTasks() {
  const { ok, data } = await api('/tasks/my');
  if (!ok) return;
  renderTasksBoard(data.tasks || []);
}

function renderTasksBoard(tasks) {
  const groups = { pending: [], in_progress: [], done: [] };
  tasks.forEach(t => { if (groups[t.status]) groups[t.status].push(t); });

  ['pending', 'in_progress', 'done'].forEach(status => {
    const col = document.getElementById(`tasks-col-${status.replace('_','-')}`);
    if (!col) return;
    const countEl = document.getElementById(`tasks-count-${status.replace('_','-')}`);
    if (countEl) countEl.textContent = groups[status].length;
    col.innerHTML = groups[status].length ? groups[status].map(t => renderTaskCard(t)).join('') : `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No tasks</div>`;
  });
}

function renderTaskCard(t) {
  const priorityClass = `priority-${t.priority}`;
  return `
    <div class="task-card card card-sm" style="margin-bottom:10px;cursor:pointer" onclick="openEditTask('${t._id}')">
      <div class="flex items-center justify-between mb-16">
        <span class="badge ${priorityClass}">${t.priority}</span>
        ${t.project ? `<span style="font-size:11px;color:var(--text-muted)">${t.project.name || ''}</span>` : ''}
      </div>
      <div style="font-size:14px;font-weight:600;margin-bottom:8px">${t.title}</div>
      ${t.description ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${t.description.substring(0,80)}${t.description.length>80?'...':''}</div>` : ''}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-8">
          ${t.assignedTo ? `<div class="user-avatar" style="width:22px;height:22px;font-size:9px">${avatarLetters(t.assignedTo.name || '')}</div>` : ''}
          ${t.dueDate ? `<span style="font-size:11px;color:${new Date(t.dueDate) < new Date() ? 'var(--red)' : 'var(--text-muted)'}">${fmtDate(t.dueDate)}</span>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();deleteTask('${t._id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

document.getElementById('form-create-task')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating...';

  const projectId = document.getElementById('task-project').value;
  const assignedTo = document.getElementById('task-assigned').value;

  const { ok, data } = await api('/tasks', {
    method: 'POST',
    body: {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-desc').value.trim(),
      priority: document.getElementById('task-priority').value,
      status: document.getElementById('task-status').value,
      dueDate: document.getElementById('task-due').value || null,
      assignedTo: assignedTo || null,
      projectId: projectId || null,
    },
  });
  btn.disabled = false; btn.textContent = 'Create Task';
  if (ok) {
    showToast('Task created!', 'success');
    closeModal('modal-create-task');
    e.target.reset();
    loadTasks();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  const { ok } = await api(`/tasks/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Task deleted', 'info'); loadTasks(); }
}

async function populateTaskProjectSelect() {
  const sel = document.getElementById('task-project');
  const selAssigned = document.getElementById('task-assigned');
  if (sel) {
    sel.innerHTML = '<option value="">No project (personal)</option>' +
      State.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
  }
  if (selAssigned && State.teamMembers.length) {
    selAssigned.innerHTML = '<option value="">Unassigned</option>' +
      State.teamMembers.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
  }
}

// ═══════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════
async function runSearch(q) {
  if (!q || q.length < 2) return;
  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

  const projectFilter = State.currentProject ? `&projectId=${State.currentProject._id}` : '';
  const { ok, data } = await api(`/search?q=${encodeURIComponent(q)}${projectFilter}`);
  if (!ok) { resultsEl.innerHTML = '<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Search failed</div></div>'; return; }

  const { results, totalResults, query } = data;
  if (!totalResults) {
    resultsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No results for "${query}"</div></div>`;
    return;
  }

  let html = `<div style="margin-bottom:16px;color:var(--text-muted);font-size:13px">${totalResults} results for "<strong style="color:var(--text-primary)">${query}</strong>"</div>`;

  const sections = [
    { key: 'keywords', icon: '🔑', label: 'Keywords' },
    { key: 'searchTerms', icon: '🔍', label: 'Search Terms' },
    { key: 'adCopies', icon: '📝', label: 'Ad Copies' },
    { key: 'changeLogs', icon: '📋', label: 'Change Logs' },
    { key: 'messages', icon: '💬', label: 'Messages' },
    { key: 'landingPages', icon: '🌐', label: 'Landing Pages' },
  ];

  sections.forEach(({ key, icon, label }) => {
    const items = results[key] || [];
    if (!items.length) return;
    html += `<div class="card mb-16">
      <div class="card-header"><div class="card-title">${icon} ${label} <span class="badge badge-accent">${items.length}</span></div></div>
      <div class="table-wrapper"><table class="table"><tbody>
        ${items.map(item => `<tr><td class="primary">${item.term || item.keyword || item.campaign || item.content?.substring(0,60) || item.title || '—'}</td><td>${statusBadge(item.status || item.action || item.matchType || '')}</td><td style="font-size:11px;color:var(--text-muted)">${item.project?.name || ''}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  });

  resultsEl.innerHTML = html;
}

const searchInput = document.getElementById('search-query');
if (searchInput) {
  searchInput.addEventListener('input', debounce((e) => runSearch(e.target.value.trim()), 400));
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(e.target.value.trim()); });
}