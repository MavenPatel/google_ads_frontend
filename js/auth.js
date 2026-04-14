// ─── Auth Module ──────────────────────────────────────────

function showAuthPage(page) {
  document.getElementById('login-form-wrap').style.display = page === 'login' ? 'block' : 'none';
  document.getElementById('register-form-wrap').style.display = page === 'register' ? 'block' : 'none';
}

// ─── Login ────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) { showToast('Email and password required', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in...';

  const { ok, data } = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  btn.disabled = false;
  btn.innerHTML = 'Sign In';

  if (ok && data.token) {
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    showToast(`Welcome back, ${data.user.name}! 👋`, 'success');
    initApp();
  } else {
    showToast(data.message || 'Login failed', 'error');
  }
});

// ─── Register ─────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  if (!name || !email || !password) { showToast('All fields required', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  const { ok, data } = await api('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });

  btn.disabled = false;
  btn.innerHTML = 'Create Account';

  if (ok && data.token) {
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    showToast(`Account created! Welcome, ${data.user.name}! 🎉`, 'success');
    initApp();
  } else {
    showToast(data.message || 'Registration failed', 'error');
  }
});

// ─── Logout ───────────────────────────────────────────────
async function logout() {
  await api('/auth/logout', { method: 'POST' });
  Auth.clear();
  State.projects = [];
  State.currentProject = null;
  document.getElementById('login-form').reset();
  showApp('auth');
  showAuthPage('login');
  showToast('Logged out successfully', 'info');
}