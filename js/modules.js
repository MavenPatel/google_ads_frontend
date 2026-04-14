// ═══════════════════════════════════════════
// BUDGET MODULE
// ═══════════════════════════════════════════
async function loadBudget() {
  if (!State.currentProject) return;
  const pid = State.currentProject._id;
  const { ok, data } = await api(`/projects/${pid}/budget`);
  if (!ok) return;
  renderBudgetTable(data.entries || []);

  // Load latest for header stats
  const latestRes = await api(`/projects/${pid}/budget/latest`);
  if (latestRes.ok && latestRes.data.entry) {
    const e = latestRes.data.entry;
    document.getElementById('budget-yesterday').textContent = fmtCurrency(e.yesterdaySpend, State.currentProject.currency);
    document.getElementById('budget-today-allowed').textContent = fmtCurrency(e.todayAllowed, State.currentProject.currency);
    document.getElementById('budget-month-target').textContent = fmtCurrency(e.monthlyTarget, State.currentProject.currency);
    document.getElementById('budget-month-spent').textContent = fmtCurrency(e.monthSpentSoFar, State.currentProject.currency);
    const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round(e.monthSpentSoFar / e.monthlyTarget * 100)) : 0;
    const bar = document.getElementById('budget-progress-bar');
    bar.style.width = pct + '%';
    bar.className = 'progress-bar ' + (pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'green');
    document.getElementById('budget-progress-pct').textContent = pct + '%';
  }
}

function renderBudgetTable(entries) {
  const tbody = document.getElementById('budget-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">No budget entries</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(e => `
    <tr>
      <td class="primary">${fmtDate(e.date)}</td>
      <td>${fmtCurrency(e.yesterdaySpend, State.currentProject?.currency)}</td>
      <td>${fmtCurrency(e.monthlyTarget, State.currentProject?.currency)}</td>
      <td>${fmtCurrency(e.monthSpentSoFar, State.currentProject?.currency)}</td>
      <td><span class="text-green fw-700">${fmtCurrency(e.todayAllowed, State.currentProject?.currency)}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteBudgetEntry('${e._id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-add-budget')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/budget`, {
    method: 'POST',
    body: {
      date: document.getElementById('b-date').value,
      yesterdaySpend: parseFloat(document.getElementById('b-yesterday').value) || 0,
      monthlyTarget: parseFloat(document.getElementById('b-target').value) || 0,
      monthSpentSoFar: parseFloat(document.getElementById('b-spent').value) || 0,
      notes: document.getElementById('b-notes').value,
    },
  });
  btn.disabled = false; btn.textContent = 'Add Entry';
  if (ok) {
    showToast('Budget entry added!', 'success');
    closeModal('modal-add-budget');
    e.target.reset();
    loadBudget();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteBudgetEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/budget/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadBudget(); }
  else showToast('Delete failed', 'error');
}

// ═══════════════════════════════════════════
// CHANGELOG MODULE
// ═══════════════════════════════════════════
async function loadChangelog(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/changelog?${qs}&limit=50`);
  if (!ok) return;
  renderChangelogTable(data.entries || []);
  document.getElementById('changelog-total').textContent = `${data.total || 0} entries`;
}

function renderChangelogTable(entries) {
  const tbody = document.getElementById('changelog-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No changes logged</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(e => `
    <tr>
      <td class="primary">${fmtDate(e.date)}</td>
      <td>${statusBadge(e.type)}</td>
      <td class="primary">${e.campaign || '—'}</td>
      <td>${e.adGroup || '—'}</td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.details || '—'}</td>
      <td>${e.tags?.map(t => `<span class="badge badge-accent">${t.replace(/_/g,' ')}</span>`).join(' ') || '—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteChangeEntry('${e._id}')" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-add-change')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const selectedTags = Array.from(document.querySelectorAll('.change-tag-cb:checked')).map(cb => cb.value);

  const { ok, data } = await api(`/projects/${State.currentProject._id}/changelog`, {
    method: 'POST',
    body: {
      date: document.getElementById('cl-date').value || new Date().toISOString(),
      type: document.getElementById('cl-type').value,
      campaign: document.getElementById('cl-campaign').value.trim(),
      adGroup: document.getElementById('cl-adgroup').value.trim(),
      oldValue: document.getElementById('cl-old').value.trim(),
      newValue: document.getElementById('cl-new').value.trim(),
      details: document.getElementById('cl-details').value.trim(),
      reason: document.getElementById('cl-reason').value.trim(),
      tags: selectedTags,
    },
  });
  btn.disabled = false; btn.textContent = 'Log Change';
  if (ok) {
    showToast('Change logged!', 'success');
    closeModal('modal-add-change');
    e.target.reset();
    loadChangelog();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteChangeEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/changelog/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadChangelog(); }
  else showToast('Delete failed', 'error');
}

// ═══════════════════════════════════════════
// AD COPY MODULE
// ═══════════════════════════════════════════
async function loadAdCopy(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy?${qs}`);
  if (!ok) return;
  renderAdCopyCards(data.adCopies || []);
}

function renderAdCopyCards(adCopies) {
  const container = document.getElementById('adcopy-grid');
  if (!adCopies.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📝</div><div class="empty-title">No ad copies</div><div class="empty-desc">Create your first ad copy to start tracking versions.</div></div>`;
    return;
  }
  container.innerHTML = adCopies.map(a => `
    <div class="card" style="border-left:3px solid var(--accent)">
      <div class="card-header">
        <div>
          <div class="card-title" style="font-size:14px">${a.campaign}</div>
          <div class="card-subtitle">${a.adGroup} · ${a.adType} · ${a.version}</div>
        </div>
        <div class="flex gap-8 items-center">
          ${statusBadge(a.status)}
          <div class="dropdown">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleDropdown('ac-menu-${a._id}')">⋮</button>
            <div class="dropdown-menu" id="ac-menu-${a._id}">
              <div class="dropdown-item" onclick="viewAdCopyHistory('${a._id}')">📜 History</div>
              <div class="dropdown-item" onclick="openUpdateAdCopy('${a._id}')">✏️ New Version</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item danger" onclick="deleteAdCopy('${a._id}')">🗑️ Delete</div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Headlines</div>
        ${(a.headlines || []).slice(0,3).map(h => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text-primary)">${h.text}${h.pinPosition ? ` <span class="badge badge-blue">Pin ${h.pinPosition}</span>` : ''}</div>`).join('')}
        ${a.headlines?.length > 3 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">+${a.headlines.length-3} more</div>` : ''}
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Descriptions</div>
        ${(a.descriptions || []).map(d => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text-secondary)">${d.text}</div>`).join('')}
      </div>
      <div class="flex items-center justify-between" style="margin-top:12px">
        <span style="font-size:11px;color:var(--text-muted)">By ${a.createdBy?.name || '—'}</span>
        ${a.previousVersion ? `<span class="badge badge-gray">Updated from ${a.previousVersion.version || 'prev'}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function addHeadlineField() {
  const wrap = document.getElementById('ac-headlines-wrap');
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-8 mb-16';
  div.innerHTML = `
    <input class="form-input" placeholder="Headline ${idx+1} (max 30 chars)" maxlength="30" name="headline" required style="flex:1">
    <input class="form-input" type="number" placeholder="Pin" min="1" max="3" name="headline-pin" style="width:70px">
    <button type="button" class="btn btn-ghost btn-icon" onclick="this.parentElement.remove()">×</button>
  `;
  wrap.appendChild(div);
}

function addDescField() {
  const wrap = document.getElementById('ac-descs-wrap');
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-8 mb-16';
  div.innerHTML = `
    <input class="form-input" placeholder="Description ${idx+1} (max 90 chars)" maxlength="90" name="description" required style="flex:1">
    <button type="button" class="btn btn-ghost btn-icon" onclick="this.parentElement.remove()">×</button>
  `;
  wrap.appendChild(div);
}

document.getElementById('form-add-adcopy')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const headlines = Array.from(document.querySelectorAll('#ac-headlines-wrap [name=headline]')).map((inp, i) => {
    const pin = document.querySelectorAll('#ac-headlines-wrap [name=headline-pin]')[i]?.value;
    return { text: inp.value.trim(), pinPosition: pin ? parseInt(pin) : null };
  }).filter(h => h.text);

  const descriptions = Array.from(document.querySelectorAll('#ac-descs-wrap [name=description]')).map(inp => ({
    text: inp.value.trim(), pinPosition: null
  })).filter(d => d.text);

  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy`, {
    method: 'POST',
    body: {
      campaign: document.getElementById('ac-campaign').value.trim(),
      adGroup: document.getElementById('ac-adgroup').value.trim(),
      adType: document.getElementById('ac-adtype').value,
      version: document.getElementById('ac-version').value.trim() || 'V1',
      headlines,
      descriptions,
      status: document.getElementById('ac-status').value,
      notes: document.getElementById('ac-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Save Ad Copy';
  if (ok) {
    showToast('Ad copy saved!', 'success');
    closeModal('modal-add-adcopy');
    e.target.reset();
    document.getElementById('ac-headlines-wrap').innerHTML = '';
    document.getElementById('ac-descs-wrap').innerHTML = '';
    addHeadlineField(); addHeadlineField(); addHeadlineField();
    addDescField(); addDescField();
    loadAdCopy();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteAdCopy(id) {
  if (!confirm('Delete this ad copy?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/adcopy/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadAdCopy(); }
}

async function viewAdCopyHistory(id) {
  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy/${id}/history`);
  if (!ok) return;
  const list = document.getElementById('adcopy-history-list');
  list.innerHTML = (data.history || []).map(h => `
    <div class="card card-sm mb-16">
      <div class="flex items-center justify-between mb-16">
        <span class="fw-700">${h.version} — ${h.adType}</span>
        ${statusBadge(h.status)}
        <span style="font-size:11px;color:var(--text-muted)">${fmtDate(h.createdAt)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">By ${h.createdBy?.name || '—'}</div>
    </div>
  `).join('') || '<div class="text-muted" style="padding:16px">No history</div>';
  openModal('modal-adcopy-history');
}

// ═══════════════════════════════════════════
// KEYWORDS MODULE
// ═══════════════════════════════════════════
async function loadKeywords(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/keywords?${qs}`);
  if (!ok) return;
  renderKeywordsTable(data.keywords || []);
}

function renderKeywordsTable(keywords) {
  const tbody = document.getElementById('keywords-tbody');
  if (!keywords.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔑</div><div class="empty-title">No keywords yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = keywords.map(k => `
    <tr>
      <td class="primary">${k.keyword}</td>
      <td>${statusBadge(k.matchType)}</td>
      <td>${k.campaign}</td>
      <td>${k.adGroup}</td>
      <td>${statusBadge(k.status)}</td>
      <td>${k.bidAmount ? fmtCurrency(k.bidAmount, State.currentProject?.currency) : '—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteKeyword('${k._id}')" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-add-keyword')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Adding...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/keywords`, {
    method: 'POST',
    body: {
      campaign: document.getElementById('kw-campaign').value.trim(),
      adGroup: document.getElementById('kw-adgroup').value.trim(),
      keyword: document.getElementById('kw-keyword').value.trim(),
      matchType: document.getElementById('kw-matchtype').value,
      status: document.getElementById('kw-status').value,
      bidAmount: parseFloat(document.getElementById('kw-bid').value) || null,
      notes: document.getElementById('kw-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Add Keyword';
  if (ok) {
    showToast('Keyword added!', 'success');
    closeModal('modal-add-keyword');
    e.target.reset();
    loadKeywords();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteKeyword(id) {
  if (!confirm('Delete this keyword?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/keywords/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadKeywords(); }
}

// ═══════════════════════════════════════════
// SEARCH TERMS MODULE
// ═══════════════════════════════════════════
async function loadSearchTerms(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams({ ...filters, limit: 100 }).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/searchterms?${qs}`);
  if (!ok) return;
  renderSearchTermsTable(data.terms || []);
  document.getElementById('st-total').textContent = `${data.total || 0} terms`;
}

function renderSearchTermsTable(terms) {
  const tbody = document.getElementById('searchterms-tbody');
  if (!terms.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No search terms logged</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = terms.map(t => `
    <tr>
      <td class="primary">${t.term}</td>
      <td>${statusBadge(t.action)}</td>
      <td>${statusBadge(t.matchType)}</td>
      <td>${t.campaign}</td>
      <td>${t.adGroup || '—'}</td>
      <td>${fmtDate(t.dateActioned)}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteSearchTerm('${t._id}')" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

// Duplicate check on input
const stTermInput = document.getElementById('st-term');
if (stTermInput) {
  stTermInput.addEventListener('input', debounce(async (e) => {
    const term = e.target.value.trim();
    const indicator = document.getElementById('st-dup-indicator');
    if (!term || !State.currentProject) { indicator.innerHTML = ''; return; }
    const { ok, data } = await api(`/projects/${State.currentProject._id}/searchterms/check?term=${encodeURIComponent(term)}`);
    if (ok && data.isDuplicate) {
      indicator.innerHTML = `<div class="form-error">⚠️ Already excluded on ${fmtDate(data.existingEntry?.dateActioned)}</div>`;
    } else {
      indicator.innerHTML = '';
    }
  }, 500));
}

document.getElementById('form-add-searchterm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Adding...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/searchterms`, {
    method: 'POST',
    body: {
      term: document.getElementById('st-term').value.trim(),
      action: document.getElementById('st-action').value,
      matchType: document.getElementById('st-matchtype').value,
      campaign: document.getElementById('st-campaign').value.trim(),
      adGroup: document.getElementById('st-adgroup').value.trim(),
      reason: document.getElementById('st-reason').value.trim(),
      dateActioned: document.getElementById('st-date').value || new Date().toISOString(),
    },
  });
  btn.disabled = false; btn.textContent = 'Add Term';
  if (ok) {
    if (data.isDuplicate) {
      showToast(data.message, 'warning');
    } else {
      showToast('Search term added!', 'success');
      closeModal('modal-add-searchterm');
      e.target.reset();
      document.getElementById('st-dup-indicator').innerHTML = '';
      loadSearchTerms();
    }
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteSearchTerm(id) {
  if (!confirm('Delete this search term?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/searchterms/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadSearchTerms(); }
}

// ═══════════════════════════════════════════
// LANDING PAGES MODULE
// ═══════════════════════════════════════════
async function loadLandingPages(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/landingpages?${qs}`);
  if (!ok) return;
  renderLandingPagesTable(data.pages || []);
}

function renderLandingPagesTable(pages) {
  const tbody = document.getElementById('landing-tbody');
  if (!pages.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🌐</div><div class="empty-title">No landing pages yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = pages.map(p => `
    <tr>
      <td class="primary">${p.title}</td>
      <td><a href="${p.url}" target="_blank" style="color:var(--accent);font-size:12px;max-width:200px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.url}</a></td>
      <td>${p.campaign || '—'}</td>
      <td><span class="badge badge-gray">${p.version}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${fmtDate(p.updatedAt)}</td>
      <td>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteLandingPage('${p._id}')" title="Delete">🗑️</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-add-landing')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Adding...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/landingpages`, {
    method: 'POST',
    body: {
      url: document.getElementById('lp-url').value.trim(),
      title: document.getElementById('lp-title').value.trim(),
      campaign: document.getElementById('lp-campaign').value.trim(),
      version: document.getElementById('lp-version').value.trim() || 'V1',
      status: document.getElementById('lp-status').value,
      notes: document.getElementById('lp-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Add Page';
  if (ok) {
    showToast('Landing page added!', 'success');
    closeModal('modal-add-landing');
    e.target.reset();
    loadLandingPages();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteLandingPage(id) {
  if (!confirm('Delete this landing page?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/landingpages/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadLandingPages(); }
}