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

async function cargarInfoUsuario(user) {
  const email = String((user && user.email) || '').trim().toLowerCase();
  const res = { nombre: email.split('@')[0] || 'Usuario', email: email, rol: '', cargo: '' };
  try {
    if (window.fiatAccess && window.fiatAccess.buildState) {
      await window.fiatAccess.buildState(email);
      const st = window.fiatAccess.state;
      if (st && st.worker) {
        const n = ((st.worker.nombres || '') + ' ' + (st.worker.apellidos || '')).trim();
        if (n) res.nombre = n;
        if (st.worker.cargo_id) {
          const c = await supabaseClient
            .from('est_cargos')
            .select('titulo')
            .eq('id', st.worker.cargo_id)
            .maybeSingle();
          if (c && c.data && c.data.titulo) res.cargo = c.data.titulo;
        }
      }
      if (st && st.role) res.rol = st.role;
    }
  } catch (e) {}
  return res;
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
      errorDiv.textContent = 'Acceso restringido: solo trabajadores activos pueden ingresar.';
      errorDiv.classList.add('show');
    }
    if (params.get('msg') === 'noverif') {
      errorDiv.textContent = 'No se pudo verificar tu acceso (problema de base de datos). Revisa el esquema de Supabase o inténtalo de nuevo.';
      errorDiv.classList.add('show');
    }
    if (params.get('msg') === 'passok') {
      errorDiv.textContent = 'Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.';
      errorDiv.classList.add('show');
      errorDiv.classList.add('login-success');
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
              : 'Acceso restringido: solo trabajadores activos pueden ingresar.';
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

  const userMenuBtn = document.getElementById('userMenuBtn');
  if (userMenuBtn) {
    // Modo demo/preview: permite ver el módulo sin sesión, SOLO en localhost.
    if (typeof demoPreviewMode === 'function' && demoPreviewMode()) return;
    const session = await getSession();
    if (!session) {
      window.location.href = '/index.html';
      return;
    }

    const user = await getCurrentUser();
    const info = await cargarInfoUsuario(user);

    const nameEl = document.getElementById('userDropName');
    if (nameEl) nameEl.textContent = info.nombre;
    const emailEl = document.getElementById('userDropEmail');
    if (emailEl) emailEl.textContent = info.email;
    const metaEl = document.getElementById('userDropMeta');
    if (metaEl) {
      metaEl.innerHTML = '';
      [info.rol, info.cargo].forEach(function (v) {
        if (!v) return;
        const s = document.createElement('span');
        s.textContent = v;
        metaEl.appendChild(s);
      });
    }

    const dd = document.getElementById('userDropdown');
    function setOpen(force) {
      const open = force !== undefined ? !!force : !dd.classList.contains('open');
      dd.classList.toggle('open', open);
    }
    userMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen();
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target) && !userMenuBtn.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });

    const helpItem = document.getElementById('userDropHelp');
    if (helpItem) {
      helpItem.addEventListener('click', function () {
        setOpen(false);
        if (typeof window.openHelp === 'function') window.openHelp();
      });
    }

    const logoutItem = document.getElementById('userDropLogout');
    if (logoutItem) {
      const profileItem = document.createElement('button');
      profileItem.type = 'button';
      profileItem.className = 'user-drop-item';
      profileItem.id = 'userDropProfile';
      profileItem.textContent = 'Mi perfil';
      logoutItem.parentNode.insertBefore(profileItem, logoutItem);
      profileItem.addEventListener('click', function () {
        setOpen(false);
        const base = location.pathname.indexOf('/modules/') !== -1 ? '../perfil.html' : 'perfil.html';
        window.location.href = base;
      });

      logoutItem.addEventListener('click', async () => {
        setOpen(false);
        if (!(await showConfirm('¿Estás seguro de cerrar tu sesión?'))) return;
        await handleLogout();
        window.location.href = '/index.html';
      });
    }
  }
});
