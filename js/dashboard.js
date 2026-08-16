(function () {
  'use strict';

  var PHRASES = [
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
    'No cuentes los días, haz que los días cuenten.',
    'El único modo de hacer un gran trabajo es amar lo que haces.',
    'Cree en ti y todo será posible.',
    'Cada día es una nueva oportunidad para mejorar.',
    'El trabajo en equipo divide la tarea y multiplica los resultados.',
    'La disciplina es el puente entre las metas y los logros.',
    'Tu actitud determina tu dirección.',
    'Pequeños pasos cada día te llevan a grandes logros.',
    'La excelencia no es un acto, sino un hábito.',
    'Juntos somos más fuertes.',
    'Haz de hoy un día que valga la pena recordar.',
    'Sueña en grande y trabaja con humildad.',
    'El que siembra con constancia, cosecha con abundancia.'
  ];

  var MODULES_META = {
    'captacion.html': { icon: 'fi-sr-users', accent: '#2563eb' },
    'relaciones-laborales.html': { icon: 'fi-sr-folder-open', accent: '#059669' },
    'capacitacion.html': { icon: 'fi-sr-graduation-cap', accent: '#ea580c' },
    'bienestar-social.html': { icon: 'fi-sr-hand-holding-usd', accent: '#db2777' },
    'seguridad-salud.html': { icon: 'fi-sr-shield', accent: '#dc2626' },
    'seguridad-fisica.html': { icon: 'fi-sr-shield-check', accent: '#334155' },
    'compensacion.html': { icon: 'fi-sr-money-check', accent: '#7c3aed' },
    'finanzas.html': { icon: 'fi-sr-receipt', accent: '#b45309' },
    'repositorio.html': { icon: 'fi-sr-folder', accent: '#06b6d4' },
    'chatfiat.html': { icon: 'fi-sr-envelope', accent: '#4f46e5' },
    'desarrollo-organizacional.html': { icon: 'fi-sr-chart-line-up', accent: '#d97706' },
    'gestion-usuarios.html': { icon: 'fi-sr-users-gear', accent: '#0ea5e9' },
    'gourmet.html': { icon: 'fi-sr-restaurant', accent: '#a16207' },
    'ti.html': { icon: 'fi-sr-computer', accent: '#0e7490' }
  };

  var idx = 0;
  var timer = null;

  function setPhrase(i, animate) {
    var total = PHRASES.length;
    idx = ((i % total) + total) % total;
    var el = document.getElementById('homePhrase');
    if (!el) return;
    el.classList.remove('show');
    setTimeout(function () {
      el.textContent = PHRASES[idx];
      el.classList.add('show');
    }, animate === false ? 0 : 300);
    var dots = document.querySelectorAll('.home-dot');
    for (var d = 0; d < dots.length; d++) {
      dots[d].classList.toggle('active', d === idx);
    }
  }

  function restart() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { setPhrase(idx + 1); }, 6500);
  }

  function buildDots() {
    var container = document.getElementById('homeDots');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < PHRASES.length; i++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'home-dot' + (n === 0 ? ' active' : '');
        b.setAttribute('aria-label', 'Frase ' + (n + 1));
        b.addEventListener('click', function () {
          setPhrase(n);
          restart();
        });
        container.appendChild(b);
      })(i);
    }
  }

  /* ===== Saludo y fecha ===== */
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function greeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días';
    if (h >= 12 && h < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  }

  function buildDate() {
    var el = document.getElementById('homeDate');
    if (!el) return;
    var d = new Date();
    el.textContent = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  /* ===== Grilla de módulos ===== */
  function accessState() {
    return (window.fiatAccess && window.fiatAccess.state) || null;
  }

  function moduleVisible(key) {
    var st = accessState();
    if (!st) return false;
    if (key === 'oportunidades.html') return false;
    if (key === 'gestion-usuarios.html') return !!st.manage;
    return window.fiatAccess.canViewModule(key);
  }

  function buildModules() {
    var grid = document.getElementById('homeModules');
    var countEl = document.getElementById('homeModulesCount');
    if (!grid) return;
    var mods = (window.FIAT_MODULES || []).filter(function (m) { return moduleVisible(m.key); });
    grid.innerHTML = '';
    mods.forEach(function (m) {
      var meta = MODULES_META[m.key] || { icon: 'fi-sr-dashboard', accent: '#0d9488' };
      var card = document.createElement('div');
      card.className = 'module-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Abrir ' + m.name);
      card.addEventListener('click', function () { navigateModule('modules/' + m.key); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateModule('modules/' + m.key); }
      });
      card.innerHTML =
        '<div class="module-card-accent" style="background:' + meta.accent + ';"></div>' +
        '<div class="module-icon"><i class="fi ' + meta.icon + '"></i></div>' +
        '<h3>' + m.name + '</h3>' +
        '<p>' + (m.tools.length + ' herramientas') + '</p>';
      grid.appendChild(card);
    });
    if (countEl) countEl.textContent = mods.length ? (mods.length + (mods.length === 1 ? ' módulo' : ' módulos') + ' disponibles') : 'Sin módulos asignados';
  }

  function refreshHome() {
    buildDate();
    buildModules();
  }

  /* ===== Nombre del trabajador ===== */
  function loadName() {
    var el = document.getElementById('homeGreeting');
    if (!el) return;

    function render(nombre) {
      var g = greeting();
      var label = nombre ? ' ' + nombre : ' bienvenido';
      el.innerHTML = g + ', <strong>' + label.trim() + '</strong>!';
    }

    var st = accessState();
    var worker = st && st.worker;
    if (worker && (worker.nombres || worker.apellidos)) {
      render(((worker.nombres || '') + ' ' + (worker.apellidos || '')).trim());
      return;
    }

    getCurrentUser()
      .then(function (user) {
        var email = String((user && user.email) || '').trim().toLowerCase();
        if (!email) throw new Error('sin sesión');
        return supabaseClient
          .from('plantilla_trabajadores')
          .select('nombres, apellidos')
          .ilike('correo', email)
          .limit(1)
          .maybeSingle();
      })
      .then(function (res) {
        var w = res && res.data;
        var nombre = ((w && (w.nombres || '')) + ' ' + (w && (w.apellidos || ''))).trim();
        render(nombre || null);
      })
      .catch(function () {
        getCurrentUser()
          .then(function (user) {
            var fallback = String((user && user.email) || '').split('@')[0];
            render(fallback || null);
          })
          .catch(function () { render(null); });
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildDots();
    setPhrase(0, false);
    restart();
    refreshHome();
    loadName();
    window.addEventListener('fiatAccessReady', function () {
      refreshHome();
      loadName();
    });
  });
})();
