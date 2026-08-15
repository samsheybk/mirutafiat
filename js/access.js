/* ============================================================
   FIAT Intranet - Control de acceso (js/access.js)
   - Solo trabajadores ACTIVOS (plantilla_trabajadores) ingresan.
   - Cada usuario puede ver solo los módulos configurados y usar
     solo las herramientas permitidas por módulo.
   - Rol "Administrador": acceso total + gestión de usuarios.
   - Gestión de usuarios es EXCLUSIVA del rol "Administrador".
   - Un trabajador sin fila en usuario_accesos ve todo (config. inicial)
     PERO no gestiona usuarios.
   - USUARIO MAESTRO: los correos en SUPERADMIN_EMAILS no necesitan estar
     en plantilla_trabajadores; siempre tienen acceso total y gestionan.
   ============================================================ */
(function () {
  'use strict';

  var SUPERADMIN_EMAILS = ['developer@prueba.dev'];

  window.FIAT_MODULES = [
    { key: 'captacion.html', name: 'Captación y Selección', tools: [
      { key: 'ats', name: 'ATS' },
      { key: 'estructura', name: 'Estructura organizacional' },
      { key: 'psicologia', name: 'Psicología' },
      { key: 'requisiciones', name: 'Requisiciones de personal' },
      { key: 'plantilla', name: 'Plantilla activa' }
    ]},
    { key: 'relaciones-laborales.html', name: 'Relaciones Laborales', tools: [
      { key: 'registros', name: 'Registros laborales' },
      { key: 'conceptos', name: 'Conceptos' },
      { key: 'equipos', name: 'Asignación de equipos' },
      { key: 'plantilla', name: 'Plantilla activa' },
      { key: 'actas', name: 'Actas y reuniones' }
    ]},
    { key: 'capacitacion.html', name: 'Capacitación y Desarrollo', tools: [
      { key: 'cursos', name: 'Cursos' },
      { key: 'talleres', name: 'Talleres' },
      { key: 'evaluaciones', name: 'Evaluaciones' },
      { key: 'planes', name: 'Planes de formación' },
      { key: 'cargos', name: 'Cargos' }
    ]},
    { key: 'bienestar-social.html', name: 'Bienestar Social', tools: [
      { key: 'plantilla', name: 'Plantilla de trabajadores' },
      { key: 'prestamos', name: 'Préstamos' },
      { key: 'polizas', name: 'Pólizas' },
      { key: 'uniformes', name: 'Inventario de uniformes' },
      { key: 'encuestas', name: 'Encuestas' },
      { key: 'calendario', name: 'Calendario' }
    ]},
    { key: 'seguridad-salud.html', name: 'Seguridad y Salud Laboral', tools: [
      { key: 'incidentes', name: 'Incidentes' },
      { key: 'inspecciones', name: 'Inspecciones' },
      { key: 'servicio-medico', name: 'Servicio Médico' },
      { key: 'inv-equipos', name: 'Inventario de equipos' },
      { key: 'inv-insumos', name: 'Inventario de insumos' }
    ]},
    { key: 'compensacion.html', name: 'Compensación', tools: [
      { key: 'salarial', name: 'Estructura salarial por cargo' },
      { key: 'liquidaciones', name: 'Liquidaciones' },
      { key: 'reportes', name: 'Reportes' },
      { key: 'biometria', name: 'Biometría' }
    ]},
    { key: 'finanzas.html', name: 'Finanzas', tools: [
      { key: 'movimientos', name: 'Registro de movimientos' },
      { key: 'reportes', name: 'Reportes financieros' }
    ]},
    { key: 'repositorio.html', name: 'Repositorio', tools: [
      { key: 'documentos', name: 'Documentos' },
      { key: 'categorias', name: 'Categorías' }
    ]},
    { key: 'chatfiat.html', name: 'Mensajería', tools: [
      { key: 'inicio', name: 'Inicio' },
      { key: 'mensajes', name: 'Mensajes' }
    ]},
    { key: 'desarrollo-organizacional.html', name: 'Desarrollo organizacional', tools: [
      { key: 'analisis-kpi', name: 'Análisis de KPI por unidades' },
      { key: 'rendimiento-kpi', name: 'Rendimiento según KPI' },
      { key: 'okr', name: 'OKR' },
      { key: 'estadisticas', name: 'Estadísticas de salud' }
    ]},
    { key: 'oportunidades.html', name: 'Oportunidades de acción', tools: [
      { key: 'vision', name: 'Visión general' },
      { key: 'oportunidades', name: 'Oportunidades de crecimiento' },
      { key: 'roadmap', name: 'Hoja de ruta' },
      { key: 'costos', name: 'Propuesta de costos' }
    ]},
    { key: 'gestion-usuarios.html', name: 'Gestión de usuarios', tools: [
      { key: 'usuarios', name: 'Usuarios y accesos' },
      { key: 'accesos', name: 'Permisos por módulo' }
    ]}
  ];

  var PARENT = {
    'trabajador.html': 'captacion.html',
    'trabajador-nuevo.html': 'captacion.html',
    'acta.html': 'relaciones-laborales.html',
    'cargo.html': 'capacitacion.html',
    'curso.html': 'capacitacion.html',
    'ver-curso.html': 'capacitacion.html',
    'inspeccion.html': 'seguridad-salud.html'
  };

  function pageOf(url) { return (url || '').split('/').pop(); }
  function currentPage() { return pageOf(location.pathname); }
  function inModules() { return location.pathname.indexOf('/modules/') !== -1; }
  function baseModule(page) {
    if ((page === 'trabajador.html' || page === 'trabajador-nuevo.html') && location.search) {
      var mod = new URLSearchParams(location.search).get('modulo');
      if (mod) return mod;
    }
    return PARENT[page] || page;
  }

  var state = { allow: true, role: 'Empleado', modulos: null, hasRow: false, worker: null, isAdmin: false, manage: false, ready: false };

  function canViewModule(page) {
    if (!state.allow) return false;
    if (baseModule(page) === 'gestion-usuarios.html') return state.manage;
    if (state.isAdmin) return true;
    if (!state.hasRow || !state.modulos) return true;
    return Object.prototype.hasOwnProperty.call(state.modulos, baseModule(page));
  }

  function canUseTool(page, tool) {
    if (!state.allow) return false;
    if (state.isAdmin) return true;
    if (!state.hasRow || !state.modulos) return true;
    var tools = state.modulos[baseModule(page)];
    if (tools === undefined) return false;
    if (Array.isArray(tools) && tools.indexOf('*') !== -1) return true;
    if (Array.isArray(tools) && tools.indexOf(tool) !== -1) return true;
    if (tool === 'agenda' && Array.isArray(tools) && tools.indexOf('inicio') !== -1) return true;
    return false;
  }

  async function buildState(email) {
    state = { allow: true, role: 'Empleado', modulos: null, hasRow: false, worker: null, isAdmin: false, manage: false, error: null, ready: false };
    try {
      var emailNorm = (email || '').trim().toLowerCase();
      if (SUPERADMIN_EMAILS.indexOf(emailNorm) !== -1) {
        state.role = 'Administrador';
        state.isAdmin = true;
        state.manage = true;
        state.ready = true;
        return;
      }
      var wRes = await supabaseClient
        .from('plantilla_trabajadores')
        .select('*')
        .ilike('correo', emailNorm)
        .limit(1)
        .maybeSingle();
      if (wRes.error) throw wRes.error;
      if (!wRes.data || wRes.data.estado !== 'Activo') { state.allow = false; state.error = 'NO_MATCH'; return; }
      state.worker = wRes.data;

      var aRes = { data: null };
      try {
        aRes = await supabaseClient
          .from('usuario_accesos')
          .select('*')
          .eq('trabajador_id', state.worker.id)
          .maybeSingle();
      } catch (e) { aRes = { data: null }; }

      var acc = aRes.data || null;
      state.hasRow = !!acc;
      if (acc && acc.activo === false) { state.allow = false; state.error = 'NO_MATCH'; return; }
      state.role = acc ? acc.rol : 'Empleado';
      state.modulos = acc && acc.modulos ? acc.modulos : null;
      state.isAdmin = state.role === 'Administrador';
      state.manage = state.isAdmin;
      state.ready = true;
    } catch (err) {
      console.error('[access.buildState]', err && err.message ? err.message : err);
      state = { allow: false, role: 'Empleado', modulos: null, hasRow: false, worker: null, isAdmin: false, manage: false, error: err && err.message ? err.message : 'Error desconocido' };
    }
  }

  function applyNav() {
    var sel = document.getElementById('navSelect');
    if (!sel) return;
    Array.prototype.slice.call(sel.options).forEach(function (opt) {
      var base = pageOf(opt.value);
      if (!base || base === 'dashboard.html') return;
      if (base === 'gestion-usuarios.html') { opt.style.display = state.manage ? '' : 'none'; return; }
      if (!canViewModule(base)) opt.style.display = 'none';
    });
    var perfilExists = Array.prototype.some.call(sel.options, function (o) { return pageOf(o.value) === 'perfil.html'; });
    if (!perfilExists) {
      var pOpt = document.createElement('option');
      pOpt.value = (inModules() ? '../' : '') + 'perfil.html';
      pOpt.textContent = 'Mi perfil';
      sel.appendChild(pOpt);
      if (currentPage() === 'perfil.html') pOpt.selected = true;
    }
    if (state.manage) {
      var exists = Array.prototype.some.call(sel.options, function (o) { return pageOf(o.value) === 'gestion-usuarios.html'; });
      if (!exists) {
        var opt = document.createElement('option');
        opt.value = (inModules() ? '' : 'modules/') + 'gestion-usuarios.html';
        opt.textContent = 'Gestión de usuarios';
        sel.appendChild(opt);
        if (currentPage() === 'gestion-usuarios.html') opt.selected = true;
      }
    }
  }

  function applyDashboard() {
    document.querySelectorAll('.module-card').forEach(function (card) {
      var onclick = card.getAttribute('onclick') || '';
      var m = onclick.match(/['"]([^'"]+)['"]/);
      var base = m ? pageOf(m[1]) : '';
      if (base === 'gestion-usuarios.html') { card.style.display = state.manage ? '' : 'none'; return; }
      if (base && !canViewModule(base)) card.style.display = 'none';
    });
  }

  function guardCurrentPage() {
    var cur = currentPage();
    if (!cur || cur === 'dashboard.html' || cur === 'index.html' || cur === 'perfil.html') return;
    var dash = inModules() ? '../dashboard.html' : 'dashboard.html';
    if (cur === 'gestion-usuarios.html') { if (!state.manage) location.href = dash; return; }
    if (!canViewModule(cur)) location.href = dash;
  }

  function applyPanelTools() {
    if (typeof switchTool !== 'function') return;
    var items = document.querySelectorAll('.panel-item');
    if (!items.length) return;
    items.forEach(function (el) {
      var tool = el.getAttribute('data-tool');
      if (tool && !canUseTool(currentPage(), tool)) el.style.display = 'none';
    });
    var active = document.querySelector('.panel-item.active');
    if (active && active.style.display === 'none') {
      var first = Array.prototype.slice.call(items).find(function (el) { return el.style.display !== 'none'; });
      if (first && first.getAttribute('data-tool')) switchTool(first.getAttribute('data-tool'));
    }
  }

  async function init() {
    if (document.getElementById('loginForm')) return;
    // Modo demo/preview: ver todos los módulos y herramientas sin sesión (solo localhost).
    if (typeof demoPreviewMode === 'function' && demoPreviewMode()) {
      state.isAdmin = true;
      state.manage = true;
      state.role = 'Administrador';
      applyNav();
      applyPanelTools();
      return;
    }
    var session = await getSession().catch(function () { return null; });
    if (!session) { location.href = '/index.html'; return; }
    var user = await getCurrentUser().catch(function () { return null; });
    if (!user) { location.href = '/index.html'; return; }
    await buildState(user.email);
    if (!state.allow) {
      try { await handleLogout(); } catch (e) {}
      location.href = '/index.html?msg=' + (state.error && state.error !== 'NO_MATCH' ? 'noverif' : 'noacceso');
      return;
    }
    applyNav();
    applyDashboard();
    guardCurrentPage();
    applyPanelTools();
  }

  window.fiatAccess = {
    get state() { return state; },
    canViewModule: canViewModule,
    canUseTool: canUseTool,
    buildState: buildState,
    checkActiveWorker: async function () {
      var user = await getCurrentUser().catch(function () { return null; });
      if (!user) { state.allow = false; return false; }
      await buildState(user.email);
      if (state.allow) return true;
      try { await handleLogout(); } catch (e) {}
      return false;
    }
  };

  var _origNavigate = window.navigateModule;
  window.navigateModule = function (url) {
    if (!url) return;
    var base = pageOf(url);
    if (base && base !== 'dashboard.html' && base !== 'index.html' && base !== 'perfil.html') {
      var dash = inModules() ? '../dashboard.html' : 'dashboard.html';
      if (base === 'gestion-usuarios.html') {
        if (!state.manage) { location.href = dash; return; }
      } else if (!canViewModule(base)) {
        location.href = dash;
        return;
      }
    }
    if (typeof _origNavigate === 'function') _origNavigate(url);
  };

  document.addEventListener('DOMContentLoaded', init);
})();
