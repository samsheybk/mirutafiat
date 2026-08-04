(function () {
  'use strict';

  var page = location.pathname.split('/').pop() || 'dashboard.html';
  var inModules = location.pathname.indexOf('/modules/') !== -1;

  var CATALOG = {
    'dashboard.html': {
      title: 'Dashboard',
      subtitle: 'Panel de control de la intranet: acceso rápido a todos los módulos con contadores en tiempo real de cada área.',
      accent: '#0f172a',
      tools: [
        { icon: 'fi-sr-house-building', name: 'Panel general', desc: 'Resumen de la intranet con acceso directo a cada módulo: procesos de captación, plantilla activa, cursos, incidentes, movimientos financieros y más.' }
      ]
    },
    'perfil.html': {
      title: 'Mi perfil',
      subtitle: 'Tu ficha personal en la intranet: datos del trabajador, unidad y cargo, y configuración de tu acceso a los módulos.',
      accent: '#0d9488',
      tools: [
        { icon: 'fi-sr-id-badge', name: 'Información personal', desc: 'Datos de tu ficha de trabajador: cédula, correo, teléfono, fecha de ingreso y ubicación en la estructura organizacional.' },
        { icon: 'fi-sr-laptop', name: 'Acceso a la intranet', desc: 'Tu rol y los módulos a los que tienes acceso según tu configuración de usuario.' }
      ]
    },
    'captacion.html': {
      title: 'Captación y Selección',
      subtitle: 'Gestión integral del proceso de reclutamiento y selección de personal.',
      accent: '#2563eb',
      tools: [
        { icon: 'fi-sr-users', name: 'ATS', desc: 'Seguimiento de candidatos por etapa del proceso (reclutamiento, entrevista, selección) con vista de tabla y tablero Kanban, filtros por estatus y gestión de requisiciones.' },
        { icon: 'fi-sr-diagram-project', name: 'Estructura organizacional', desc: 'Mapa jerárquico de la empresa por unidades y departamentos, con edición de cargos y puestos de trabajo.' },
        { icon: 'fi-sr-heart', name: 'Psicología', desc: 'Registro de evaluaciones psicológicas de los candidatos y seguimiento de sus resultados por proceso de selección.' },
        { icon: 'fi-sr-file-chart-line', name: 'Requisiciones de personal', desc: 'Solicitudes de nuevo personal por unidad, con estado de aprobación y vinculación al proceso de selección.' },
        { icon: 'fi-sr-users-gear', name: 'Plantilla activa', desc: 'Listado de trabajadores activos de la empresa con acceso a su ficha completa de expediente.' }
      ]
    },
    'relaciones-laborales.html': {
      title: 'Relaciones Laborales',
      subtitle: 'Administración de la vida laboral de los trabajadores y sus relaciones con la empresa.',
      accent: '#059669',
      tools: [
        { icon: 'fi-sr-folder-open', name: 'Registros laborales', desc: 'Expedientes de relaciones laborales de cada trabajador: novedades, contratos y situaciones administrativas.' },
        { icon: 'fi-sr-tags', name: 'Conceptos', desc: 'Catálogo de conceptos utilizados en la gestión de nómina y en los movimientos laborales.' },
        { icon: 'fi-sr-boxes', name: 'Asignación de equipos', desc: 'Registro de equipos, herramientas o activos asignados a cada trabajador de la empresa.' },
        { icon: 'fi-sr-users-gear', name: 'Plantilla activa', desc: 'Listado de trabajadores activos con acceso a la ficha de expediente laboral.' },
        { icon: 'fi-sr-file-edit', name: 'Actas y reuniones', desc: 'Elaboración de actas de reuniones con acuerdos, asistencia y seguimiento de compromisos.' }
      ]
    },
    'capacitacion.html': {
      title: 'Capacitación y Desarrollo',
      subtitle: 'Formación continua, evaluación de competencias y desarrollo del talento.',
      accent: '#ea580c',
      tools: [
        { icon: 'fi-sr-graduation-cap', name: 'Cursos', desc: 'Catálogo de cursos internos con contenidos, horarios, instructores y registro de participantes.' },
        { icon: 'fi-sr-hammer', name: 'Talleres', desc: 'Programación y registro de talleres prácticos de formación para los trabajadores.' },
        { icon: 'fi-sr-test', name: 'Evaluaciones', desc: 'Aplicación y registro de evaluaciones de conocimiento y competencias por curso o cargo.' },
        { icon: 'fi-sr-book', name: 'Planes de formación', desc: 'Planes anuales o trimestrales de capacitación por unidad o cargo, con control de avance.' },
        { icon: 'fi-sr-briefcase', name: 'Cargos', desc: 'Catálogo de cargos con perfil del puesto, competencias y formación requerida.' }
      ]
    },
    'bienestar-social.html': {
      title: 'Bienestar Social',
      subtitle: 'Programas, beneficios y actividades que mejoran la calidad de vida de los trabajadores.',
      accent: '#db2777',
      tools: [
        { icon: 'fi-sr-users', name: 'Plantilla de trabajadores', desc: 'Listado de trabajadores para la gestión de beneficios, tallas y programas sociales.' },
        { icon: 'fi-sr-hand-holding-usd', name: 'Préstamos', desc: 'Solicitud y seguimiento de préstamos a trabajadores con control de saldo y cuotas.' },
        { icon: 'fi-sr-shield', name: 'Pólizas', desc: 'Registro de pólizas de seguros de los trabajadores con vigencias y coberturas.' },
        { icon: 'fi-sr-circle-book-open', name: 'Historias de gente', desc: 'Muro de historias, logros y reconocimientos de los trabajadores de la empresa.' },
        { icon: 'fi-sr-square-poll-horizontal', name: 'Encuestas', desc: 'Creación y publicación de encuestas con enlace compartible, respuestas y resultados.' },
        { icon: 'fi-sr-calendar', name: 'Calendario', desc: 'Calendario de eventos y actividades sociales de la empresa.' }
      ]
    },
    'seguridad-salud.html': {
      title: 'Seguridad y Salud Laboral',
      subtitle: 'Gestión de riesgos, salud ocupacional e inspecciones de seguridad en las áreas.',
      accent: '#dc2626',
      tools: [
        { icon: 'fi-sr-alarm-exclamation', name: 'Incidentes', desc: 'Reporte de incidentes de seguridad con análisis, nivel de gravedad y medidas correctivas.' },
        { icon: 'fi-sr-search-alt', name: 'Inspecciones', desc: 'Evaluaciones de campo para detectar condiciones de riesgo en las áreas de trabajo.' },
        { icon: 'fi-sr-stethoscope', name: 'Servicio Médico', desc: 'Atenciones del servicio médico: consultas, atenciones y control de salud ocupacional.' },
        { icon: 'fi-sr-boxes', name: 'Inventario de equipos', desc: 'Control de equipos de seguridad (EPP, extintores, entre otros) con stock y estado.' },
        { icon: 'fi-sr-pills', name: 'Inventario de insumos', desc: 'Control de insumos y medicamentos del servicio médico.' }
      ]
    },
    'compensacion.html': {
      title: 'Compensación',
      subtitle: 'Administración de la estructura salarial, bonificaciones y beneficios económicos.',
      accent: '#7c3aed',
      tools: [
        { icon: 'fi-sr-money-check', name: 'Estructura salarial', desc: 'Definición de rangos y estructura salarial por cargo y unidad de la empresa.' },
        { icon: 'fi-sr-badge-dollar', name: 'Bonificaciones', desc: 'Registro de bonificaciones y pagos adicionales por trabajador.' },
        { icon: 'fi-sr-hand-holding-usd', name: 'Beneficios económicos', desc: 'Gestión de beneficios económicos y apoyos otorgados a los trabajadores.' },
        { icon: 'fi-sr-receipt', name: 'Reportes', desc: 'Reportes consolidados de compensación, bonificaciones y beneficios.' }
      ]
    },
    'finanzas.html': {
      title: 'Finanzas',
      subtitle: 'Control de gastos, ingresos y reportes financieros de la empresa.',
      accent: '#b45309',
      tools: [
        { icon: 'fi-sr-receipt', name: 'Registro de movimientos', desc: 'Registro de gastos e ingresos con categorías, montos, conceptos y responsable.' },
        { icon: 'fi-sr-chart-histogram', name: 'Reportes financieros', desc: 'Reportes consolidados por período y categoría con resúmenes de ingresos y gastos.' }
      ]
    },
    'repositorio.html': {
      title: 'Repositorio',
      subtitle: 'Centro de documentos, formatos, manuales y material de apoyo de la empresa.',
      accent: '#06b6d4',
      tools: [
        { icon: 'fi-sr-folder', name: 'Documentos', desc: 'Repositorio de documentos de la empresa con búsqueda, carga y descarga.' },
        { icon: 'fi-sr-folder-tree', name: 'Categorías', desc: 'Organización de los documentos por categorías para una localización rápida.' }
      ]
    },
    'chatfiat.html': {
      title: 'Mensajería',
      subtitle: 'La red social interna para comunicar y conectar a los trabajadores.',
      accent: '#4f46e5',
      tools: [
        { icon: 'fi-sr-house-building', name: 'Inicio', desc: 'Página principal de la red social interna: noticias y publicaciones de la comunidad.' },
        { icon: 'fi-sr-envelope', name: 'Mensajes', desc: 'Mensajería interna entre los trabajadores de la empresa.' }
      ]
    },
    'desarrollo-organizacional.html': {
      title: 'Desarrollo organizacional',
      subtitle: 'Indicadores de gestión, objetivos y salud organizacional por unidad y cargo.',
      accent: '#d97706',
      tools: [
        { icon: 'fi-sr-chart-line-up', name: 'Análisis de KPI por unidades', desc: 'Indicadores clave por unidad para medir la salud y el desempeño organizacional, e indicadores de RRHH: rotación temprana, absentismo, tiempo de cobertura de vacantes y cobertura de capacitación obligatoria.' },
        { icon: 'fi-sr-chart-user', name: 'Rendimiento según KPI', desc: 'Rendimiento de los cargos de acuerdo con los indicadores definidos para cada puesto.' },
        { icon: 'fi-sr-bullseye', name: 'OKR', desc: 'Objetivos y Resultados Clave con seguimiento del avance por trimestre.' },
        { icon: 'fi-sr-chart-pie', name: 'Estadísticas de salud', desc: 'Estadísticas y tendencias de la salud de las áreas de la empresa.' }
      ]
    },
    'gestion-usuarios.html': {
      title: 'Gestión de usuarios',
      subtitle: 'Administración de los accesos a la intranet: qué módulos ve cada trabajador activo y qué herramientas puede usar por módulo.',
      accent: '#0ea5e9',
      tools: [
        { icon: 'fi-sr-users-gear', name: 'Usuarios y accesos', desc: 'Listado de trabajadores activos con su configuración de acceso, rol, estado y opciones para crear, activar o desactivar usuarios.' },
        { icon: 'fi-sr-shield-check', name: 'Permisos por módulo', desc: 'Asignación de módulos visibles y herramientas permitidas por usuario, con control por módulo y por herramienta individual.' }
      ]
    },
    'oportunidades.html': {
      title: 'Oportunidades de acción',
      subtitle: 'Propuestas de crecimiento de la intranet para cubrir nuevas áreas y necesidades de la empresa.',
      accent: '#65a30d',
      tools: [
        { icon: 'fi-sr-bullseye', name: 'Visión general', desc: 'Presentación de cómo la intranet puede crecer para apoyar nuevas áreas de la empresa.' },
        { icon: 'fi-sr-rocket', name: 'Oportunidades de crecimiento', desc: 'Catálogo de nuevas capacidades propuestas, cada una con su descripción y beneficios esperados.' },
        { icon: 'fi-sr-route', name: 'Hoja de ruta', desc: 'Fases sugeridas para implementar las oportunidades priorizadas.' }
      ]
    }
  };

  var PARENT = {
    'trabajador.html': 'captacion.html',
    'trabajador-nuevo.html': 'captacion.html',
    'acta.html': 'relaciones-laborales.html',
    'cargo.html': 'capacitacion.html',
    'curso.html': 'capacitacion.html',
    'inspeccion.html': 'seguridad-salud.html'
  };

  function getCatalog() {
    var key = PARENT[page] || page;
    return CATALOG[key] || CATALOG['dashboard.html'];
  }

  function injectNavHelp() {
    var sel = document.getElementById('navSelect');
    if (!sel) return;

    var btn = document.createElement('button');
    btn.id = 'navHelpBtn';
    btn.className = 'nav-help-btn';
    btn.type = 'button';
    btn.title = 'Ver presentación del módulo';
    btn.innerHTML = '?';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openHelp();
    });
    sel.parentNode.insertBefore(btn, sel.nextSibling);

    var opt = document.createElement('option');
    opt.value = (inModules ? '' : 'modules/') + 'oportunidades.html';
    opt.textContent = 'Oportunidades de acción';
    sel.appendChild(opt);
    if (page === 'oportunidades.html') opt.selected = true;
  }

  function openHelp() {
    var data = getCatalog();

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay help-overlay';
    overlay.id = 'helpModal';

    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '640px';
    modal.style.setProperty('--module-help-accent', data.accent);

    var header = document.createElement('div');
    header.className = 'modal-header';
    var h3 = document.createElement('h3');
    h3.textContent = data.title;
    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', closeHelp);
    header.appendChild(h3);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'modal-body';

    var sub = document.createElement('p');
    sub.className = 'help-module-sub';
    sub.textContent = data.subtitle;
    body.appendChild(sub);

    var intro = document.createElement('div');
    intro.className = 'help-tools-title';
    intro.innerHTML = '<i class="fi fi-sr-list-check"></i> Herramientas del módulo y sus funciones';
    body.appendChild(intro);

    data.tools.forEach(function (tool) {
      var card = document.createElement('div');
      card.className = 'help-tool';
      card.innerHTML = '<div class="help-tool-icon"><i class="fi ' + tool.icon + '"></i></div>' +
        '<div class="help-tool-body"><h4>' + tool.name + '</h4><p>' + tool.desc + '</p></div>';
      body.appendChild(card);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeHelp();
    });
    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      overlay.classList.add('show');
      document.addEventListener('keydown', onHelpKey);
    });
  }

  function onHelpKey(e) {
    if (e.key === 'Escape') closeHelp();
  }

  function closeHelp() {
    var overlay = document.getElementById('helpModal');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(function () { overlay.remove(); }, 120);
    }
    document.removeEventListener('keydown', onHelpKey);
  }

  document.addEventListener('DOMContentLoaded', injectNavHelp);
})();
