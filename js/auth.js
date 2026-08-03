function navigateModule(url) {
  if (url) window.location.href = url;
}

async function handleLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user;
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const session = await getSession();
    if (session) {
      window.location.href = '/dashboard.html';
      return;
    }

    const errorDiv = document.getElementById('loginError');
    const params = new URLSearchParams(window.location.search);
    if (params.get('msg') === 'noacceso') {
      errorDiv.textContent = 'Acceso restringido: solo trabajadores activos de FIAT pueden ingresar.';
      errorDiv.classList.add('show');
    }
    if (params.get('msg') === 'noverif') {
      errorDiv.textContent = 'No se pudo verificar tu acceso (problema de base de datos). Revisa el esquema de Supabase o inténtalo de nuevo.';
      errorDiv.classList.add('show');
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');

      errorDiv.classList.remove('show');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Iniciando sesión...';

      try {
        await handleLogin(email, password);
        if (window.fiatAccess) {
          const ok = await window.fiatAccess.checkActiveWorker();
          if (!ok) {
            const st = window.fiatAccess.state;
            errorDiv.textContent = (st && st.error && st.error !== 'NO_MATCH')
              ? 'No se pudo verificar tu acceso (problema de base de datos). Revisa la consola o el esquema de Supabase.'
              : 'Acceso restringido: solo trabajadores activos de FIAT pueden ingresar.';
            errorDiv.classList.add('show');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar sesión';
            return;
          }
        }
        window.location.href = '/dashboard.html';
      } catch (err) {
        errorDiv.textContent = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        errorDiv.classList.add('show');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar sesión';
      }
    });
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    const session = await getSession();
    if (!session) {
      window.location.href = '/index.html';
      return;
    }

    const user = await getCurrentUser();
    const emailEl = document.getElementById('navUserEmail');
    if (emailEl) emailEl.textContent = user.email || '';

    logoutBtn.addEventListener('click', async () => {
      if (!(await showConfirm('¿Estás seguro de cerrar tu sesión?'))) return;
      await handleLogout();
      window.location.href = '/index.html';
    });
  }
});
