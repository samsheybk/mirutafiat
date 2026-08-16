(function () {
  'use strict';

  var page = location.pathname.split('/').pop() || 'dashboard.html';
  var inModules = location.pathname.indexOf('/modules/') !== -1;

  var CATALOG = {
    'dashboard.html': {
      title: 'Home',
      subtitle: 'Pantalla de bienvenida de la intranet: saludo personalizado y frases motivadoras para comenzar el día.',
      accent: '#0d9488',
      tools: [
        { icon: 'fi-sr-house-building', name: 'Inicio', desc: 'Bienvenida con frases motivadoras en carrusel. Usa el menú superior para navegar por los módulos de la intranet.' }
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
        { icon: 'fi-sr-users-gear', name: 'Plantilla activa', desc: 'Listado de trabajadores activos de la empresa con acceso a su ficha completa de expediente.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: candidatos en el proceso, requisiciones, trabajadores activos y estructura organizacional.' }
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
        { icon: 'fi-sr-file-edit', name: 'Actas y reuniones', desc: 'Elaboración de actas de reuniones con acuerdos, asistencia y seguimiento de compromisos.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: registros, conceptos, equipos asignados, actas y compromisos pendientes.' }
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
        { icon: 'fi-sr-briefcase', name: 'Cargos', desc: 'Catálogo de cargos con perfil del puesto, competencias y formación requerida.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: cursos, módulos, cuestionarios, preguntas y formación obligatoria.' }
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
        { icon: 'fi-sr-vest', name: 'Inventario de uniformes', desc: 'Control del stock de prendas y tallas, y registro de las entregas de uniformes a los trabajadores con fecha, cantidad y estado.' },
        { icon: 'fi-sr-square-poll-horizontal', name: 'Encuestas', desc: 'Creación y publicación de encuestas con enlace compartible, respuestas y resultados.' },
        { icon: 'fi-sr-calendar', name: 'Calendario', desc: 'Calendario mensual de eventos y actividades: selecciona un día para ver lo pautado o agregar eventos, con lista de próximos eventos ordenados por fecha. Desde el día seleccionado también se configuran los anuncios (splash) con imágenes que se muestran a todos los usuarios.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: préstamos, pólizas, ventas de vehículos, uniformes, encuestas y eventos.' }
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
        { icon: 'fi-sr-pills', name: 'Inventario de insumos', desc: 'Control de insumos y medicamentos del servicio médico.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: incidentes, inspecciones, atenciones médicas y movimientos de inventario.' }
      ]
    },
    'seguridad-fisica.html': {
      title: 'Seguridad Física',
      subtitle: 'Control de ingreso y salida de personas y vehículos, y bitácora de novedades del personal de seguridad.',
      accent: '#334155',
      tools: [
        { icon: 'fi-sr-arrow-right-to-bracket', name: 'Control de acceso', desc: 'Registro de entrada y salida de personas y vehículos por punto de control, con tipo (trabajador, visitante, proveedor, contratista), cédula, empresa, placa, motivo y responsable. Incluye búsqueda y filtros por dirección y tipo.' },
        { icon: 'fi-sr-clipboard-list-check', name: 'Libro de novedades', desc: 'Bitácora de novedades del turno: fecha, hora, turno, categoría, descripción, ubicación, acciones tomadas y estado de seguimiento (abierta, en seguimiento, cerrada).' }
      ]
    },
    'compensacion.html': {
      title: 'Compensación',
      subtitle: 'Administración de la estructura salarial, bonificaciones y beneficios económicos.',
      accent: '#7c3aed',
      tools: [
        { icon: 'fi-sr-money-check', name: 'Estructura salarial por cargo', desc: 'Estructura salarial por cargo del organigrama, con tasa BCV automática y complemento en USD.' },
        { icon: 'fi-sr-calculator', name: 'Liquidaciones', desc: 'Cálculo y registro de liquidaciones de prestaciones sociales (LOTTT): antigüedad, intereses, vacaciones, bono vacacional, utilidades y preaviso.' },
        { icon: 'fi-sr-face-viewfinder', name: 'Biometría', desc: 'Reloj de marcaje por reconocimiento facial con detección de vida (parpadeo, giro de cabeza y sonrisa) y registro de entradas/salidas.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: estructuras salariales, nómina mensual, liquidaciones, marcajes del día y perfiles biométricos.' }
      ]
    },
    'finanzas.html': {
      title: 'Finanzas',
      subtitle: 'Control de gastos, ingresos y reportes financieros de la empresa.',
      accent: '#b45309',
      tools: [
        { icon: 'fi-sr-receipt', name: 'Registro de movimientos', desc: 'Registro de gastos e ingresos con categorías, montos, conceptos y responsable.' },
        { icon: 'fi-sr-chart-histogram', name: 'Reportes financieros', desc: 'Reportes consolidados por período y categoría con resúmenes de ingresos y gastos.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: movimientos registrados y totales de gastos e ingresos.' }
      ]
    },
    'repositorio.html': {
      title: 'Repositorio',
      subtitle: 'Centro de documentos, formatos, manuales y material de apoyo de la empresa.',
      accent: '#06b6d4',
      tools: [
        { icon: 'fi-sr-folder', name: 'Documentos', desc: 'Repositorio de documentos de la empresa con búsqueda, carga y descarga.' },
        { icon: 'fi-sr-folder-tree', name: 'Categorías', desc: 'Organización de los documentos por categorías para una localización rápida.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: documentos, categorías, peso del almacenamiento y avisos pendientes.' }
      ]
    },
    'chatfiat.html': {
      title: 'Mensajería',
      subtitle: 'Correo electrónico y agenda de actividades de la empresa.',
      accent: '#4f46e5',
      tools: [
        { icon: 'fi-sr-calendar', name: 'Agenda', desc: 'Directorio de contactos: proveedores, clientes y otros, con teléfonos, correos y redes sociales.' },
        { icon: 'fi-sr-envelope', name: 'Correo electrónico', desc: 'Webmail de la empresa con bandejas, búsqueda, adjuntos y gestión de cuentas IMAP/SMTP.' }
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
        { icon: 'fi-sr-chart-pie', name: 'Estadísticas de salud', desc: 'Estadísticas y tendencias de la salud de las áreas de la empresa.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: KPIs, mediciones, OKRs, ausencias y vacantes.' }
      ]
    },
    'gestion-usuarios.html': {
      title: 'Gestión de usuarios',
      subtitle: 'Administración de los accesos a la intranet: qué módulos ve cada trabajador activo y qué herramientas puede usar por módulo.',
      accent: '#0ea5e9',
      tools: [
        { icon: 'fi-sr-users-gear', name: 'Usuarios y accesos', desc: 'Listado de trabajadores activos con su configuración de acceso, rol, estado y opciones para crear, activar o desactivar usuarios.' },
        { icon: 'fi-sr-shield-check', name: 'Permisos por módulo', desc: 'Asignación de módulos visibles y herramientas permitidas por usuario, con control por módulo y por herramienta individual.' },
        { icon: 'fi-sr-dashboard', name: 'Indicadores de gestión', desc: 'Panel con los indicadores clave del módulo: trabajadores activos y accesos configurados a la intranet.' }
      ]
    },
    'oportunidades.html': {
      title: 'Oportunidades de acción',
      subtitle: 'Propuestas de crecimiento de la intranet para cubrir nuevas áreas y necesidades de la empresa.',
      accent: '#65a30d',
      tools: [
        { icon: 'fi-sr-bullseye', name: 'Visión general', desc: 'Presentación de cómo la intranet puede crecer para apoyar nuevas áreas de la empresa.' },
        { icon: 'fi-sr-rocket', name: 'Oportunidades de crecimiento', desc: 'Catálogo de nuevas capacidades propuestas, cada una con su descripción y beneficios esperados.' },
        { icon: 'fi-sr-route', name: 'Hoja de ruta', desc: 'Fases sugeridas para implementar las oportunidades priorizadas.' },
        { icon: 'fi-sr-coins', name: 'Propuesta de costos', desc: 'Estimación de los costos de infraestructura para operar la intranet en producción.' }
      ]
    },
    'gourmet.html': {
      title: 'Gourmet',
      subtitle: 'Gestión del área gastronómica: inventario de equipos, utensilios e insumos, recetario con validación de stock y carta del menú.',
      accent: '#a16207',
      tools: [
        { icon: 'fi-sr-utensils', name: 'Inventario de equipos y utensilios', desc: 'Registro y control de los equipos y utensilios del área gourmet con su cantidad, ubicación y estado de operatividad.' },
        { icon: 'fi-sr-boxes', name: 'Inventario de insumos', desc: 'Control de existencias de insumos con unidad de medida, stock mínimo y alertas de bajo stock, agotado o vencido.' },
        { icon: 'fi-sr-books', name: 'Recetario', desc: 'Recetas con ingredientes y cantidades, con validación automática de disponibilidad de stock para preparar cada plato.' },
        { icon: 'fi-sr-restaurant', name: 'Menú del día', desc: 'Carta del día organizada por categorías (entradas, platos principales, postres, bebidas) con foto, disponible como beneficio gratuito para los trabajadores.' }
      ]
    },
    'ti.html': {
      title: 'Sistemas TI',
      subtitle: 'Gestión del área de Sistemas: inventario de equipos, licencias y consumibles, mesa de ayuda (helpdesk) con tickets asignados y gestión de proyectos de TI con tareas.',
      accent: '#0e7490',
      tools: [
        { icon: 'fi-sr-computer', name: 'Inventario TI', desc: 'Registro de equipos y activos de TI con su tipo, serial, estado y asignación a trabajadores, control de licencias de software e inventario de consumibles con entradas y salidas que capturan tu usuario automáticamente, stock mínimo y alertas de bajo stock.' },
        { icon: 'fi-sr-headset', name: 'Helpdesk', desc: 'Mesa de ayuda con tickets por categoría y prioridad, estado (abierto, en proceso, resuelto, cerrado), solicitante y técnico asignado.' },
        { icon: 'fi-sr-chart-gantt', name: 'Gestión de proyectos TI', desc: 'Proyectos con fase, avance, responsable y fechas, con tareas por proyecto y control de su estado.' }
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

  function getCatalog(key) {
    key = key || page;
    key = PARENT[key] || key;
    return CATALOG[key] || CATALOG['dashboard.html'];
  }

  function injectNavHelp() {
    var sel = document.getElementById('navSelect');
    if (!sel) return;

    var splashBtn = document.createElement('button');
    splashBtn.id = 'navSplashBtn';
    splashBtn.className = 'nav-splash-btn';
    splashBtn.type = 'button';
    splashBtn.title = 'Ver el anuncio activo';
    splashBtn.style.display = 'none';
    splashBtn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-7v16L3 13v-2z"></path><path d="M7 13v6"></path></svg><span id="navSplashCount" class="nav-splash-count"></span>';
    splashBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openSplashFromNav();
    });
    sel.parentNode.insertBefore(splashBtn, sel.nextSibling);
    refreshSplashNav();
  }

  function openHelp(key) {
    var data = getCatalog(key);

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
    closeBtn.innerHTML = '<i class="fi fi-sr-cross-small"></i>';
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

  /* ===== CARRUSEL DE SPLASH (global, todas las páginas) ===== */
  var splashItems = [];
  var splashIndex = 0;
  var splashTimer = null;

  function splashVigenteGlobal(s) {
    if (s.activo === false) return false;
    var hoy = new Date();
    var hoyISO = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    if (s.fecha_inicio && s.fecha_inicio > hoyISO) return false;
    if (s.fecha_fin && s.fecha_fin < hoyISO) return false;
    return true;
  }

  function showSplashCarousel(items, startIndex) {
    if (!items || !items.length) return;
    splashItems = items;
    splashIndex = typeof startIndex === 'number' ? startIndex : 0;
    var overlay = document.getElementById('globalSplashOverlay');
    if (!overlay) overlay = buildSplashOverlay();
    renderSplashSlide();
    overlay.classList.add('show');
    startSplashTimer();
  }

  function buildSplashOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'splash-show-overlay';
    overlay.id = 'globalSplashOverlay';
    overlay.innerHTML =
      '<div class="splash-show-content">' +
        '<button class="splash-show-close" aria-label="Cerrar"><i class="fi fi-sr-cross-small"></i></button>' +
        '<button class="splash-show-arrow left" aria-label="Anterior">&#8249;</button>' +
        '<div class="splash-show-media"><img class="splash-show-img" id="globalSplashImg" src="" alt="Splash"><div class="splash-show-dots" id="globalSplashDots"></div></div>' +
        '<div class="splash-show-panel">' +
          '<div class="splash-show-caption" id="globalSplashCaption"></div>' +
          '<div class="splash-show-count" id="globalSplashCount"></div>' +
        '</div>' +
        '<button class="splash-show-arrow right" aria-label="Siguiente">&#8250;</button>' +
      '</div>';
    overlay.querySelector('.splash-show-close').addEventListener('click', closeSplashCarousel);
    overlay.querySelector('.splash-show-arrow.left').addEventListener('click', function () { splashStep(-1); });
    overlay.querySelector('.splash-show-arrow.right').addEventListener('click', function () { splashStep(1); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSplashCarousel();
    });
    overlay.addEventListener('mouseenter', stopSplashTimer);
    overlay.addEventListener('mouseleave', startSplashTimer);
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('show')) return;
      if (e.key === 'Escape') closeSplashCarousel();
      if (e.key === 'ArrowLeft') splashStep(-1);
      if (e.key === 'ArrowRight') splashStep(1);
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function renderSplashSlide() {
    var overlay = document.getElementById('globalSplashOverlay');
    if (!overlay || !splashItems.length) return;
    var item = splashItems[splashIndex];
    var img = document.getElementById('globalSplashImg');
    var caption = document.getElementById('globalSplashCaption');
    var count = document.getElementById('globalSplashCount');
    var dots = document.getElementById('globalSplashDots');
    img.src = item.imagen_url || '';
    img.onclick = function () { showSplashDetalle(splashItems[splashIndex]); };
    caption.innerHTML = '<strong>' + mhEscape(item.titulo || '') + '</strong>' + (item.descripcion ? '<br>' + mhEscape(item.descripcion) : '');
    count.textContent = splashItems.length > 1 ? (splashIndex + 1) + ' / ' + splashItems.length : '';
    dots.innerHTML = splashItems.map(function (_, i) {
      return '<button class="splash-show-dot' + (i === splashIndex ? ' active' : '') + '" data-i="' + i + '" aria-label="Imagen ' + (i + 1) + '"></button>';
    }).join('');
    var dotBtns = dots.querySelectorAll('.splash-show-dot');
    for (var i = 0; i < dotBtns.length; i++) {
      (function (d) {
        d.addEventListener('click', function () {
          splashIndex = parseInt(d.getAttribute('data-i'), 10);
          renderSplashSlide();
          startSplashTimer();
        });
      })(dotBtns[i]);
    }
  }

  function splashStep(dir) {
    if (!splashItems.length) return;
    splashIndex = (splashIndex + dir + splashItems.length) % splashItems.length;
    renderSplashSlide();
  }

  function startSplashTimer() {
    stopSplashTimer();
    if (splashItems.length < 2) return;
    splashTimer = setInterval(function () { splashStep(1); }, 5000);
  }

  function stopSplashTimer() {
    if (splashTimer) {
      clearInterval(splashTimer);
      splashTimer = null;
    }
  }

  function closeSplashCarousel() {
    stopSplashTimer();
    var overlay = document.getElementById('globalSplashOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function mhEscape(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showSplashDetalle(item) {
    if (!item) return;
    var overlay = document.getElementById('splashDetalleOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'splash-show-overlay';
      overlay.id = 'splashDetalleOverlay';
      overlay.innerHTML =
        '<div class="splash-detail-card">' +
          '<button class="splash-show-close" aria-label="Cerrar"><i class="fi fi-sr-cross-small"></i></button>' +
          '<div class="splash-detail-img-wrap"><img id="splashDetalleImg" src="" alt=""></div>' +
          '<div class="splash-detail-texto">' +
            '<h3 id="splashDetalleTitulo"></h3>' +
            '<p id="splashDetalleDesc"></p>' +
            '<span class="splash-detail-fecha" id="splashDetalleFecha"></span>' +
          '</div>' +
        '</div>';
      overlay.querySelector('.splash-show-close').addEventListener('click', closeSplashDetalle);
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeSplashDetalle();
      });
      document.addEventListener('keydown', function (e) {
        var o = document.getElementById('splashDetalleOverlay');
        if (!o || !o.classList.contains('show')) return;
        if (e.key === 'Escape') closeSplashDetalle();
      });
      document.body.appendChild(overlay);
    }
    document.getElementById('splashDetalleImg').src = item.imagen_url || '';
    document.getElementById('splashDetalleImg').alt = item.titulo || '';
    document.getElementById('splashDetalleTitulo').textContent = item.titulo || '';
    document.getElementById('splashDetalleDesc').textContent = item.descripcion || 'Sin descripción';
    var fIni = item.fecha_inicio || '';
    var fFin = item.fecha_fin || '';
    var fechaEl = document.getElementById('splashDetalleFecha');
    fechaEl.textContent = (fIni || fFin)
      ? 'Vigente del ' + fIni + (fFin && fFin !== fIni ? ' al ' + fFin : '')
      : '';
    overlay.classList.add('show');
  }

  function closeSplashDetalle() {
    var overlay = document.getElementById('splashDetalleOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function openSplashFromNav() {
    if (typeof supabaseClient === 'undefined') {
      if (typeof showAlert === 'function') showAlert('Sesión no disponible', 'warning');
      return;
    }
    supabaseClient.from('bienestar_splash').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        if (typeof showAlert === 'function') showAlert('Error al cargar el anuncio: ' + res.error.message, 'error');
        return;
      }
      var items = (res.data || []).filter(splashVigenteGlobal);
      if (!items.length) {
        if (typeof showAlert === 'function') showAlert('No hay anuncios activos', 'warning');
        return;
      }
      showSplashCarousel(items.map(function (s) {
        return { imagen_url: s.imagen_url, titulo: s.titulo, descripcion: s.descripcion, fecha_inicio: s.fecha_inicio, fecha_fin: s.fecha_fin };
      }));
    });
  }

  function setSplashNavVisible(items) {
    var btn = document.getElementById('navSplashBtn');
    if (!btn) return;
    var vigentes = items ? items.filter(splashVigenteGlobal) : [];
    var countEl = document.getElementById('navSplashCount');
    if (countEl) {
      countEl.textContent = vigentes.length;
      countEl.style.display = vigentes.length ? '' : 'none';
    }
    btn.style.display = vigentes.length ? '' : 'none';
  }

  function refreshSplashNav() {
    if (typeof supabaseClient === 'undefined') return;
    supabaseClient.from('bienestar_splash').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) return;
      setSplashNavVisible(res.data || []);
    });
  }

  window.showSplashCarousel = showSplashCarousel;
  window.closeSplashCarousel = closeSplashCarousel;
  window.splashStep = splashStep;
  window.showSplashDetalle = showSplashDetalle;
  window.closeSplashDetalle = closeSplashDetalle;
  window.setSplashNavVisible = setSplashNavVisible;
  window.refreshSplashNav = refreshSplashNav;

  /* Tooltips de ayuda (.th-help): posición fija ajustada al viewport para
     que no sean recortados por contenedores con overflow (tablas, scroll). */
  document.addEventListener('mouseover', function (e) {
    var anchor = e.target && e.target.closest ? e.target.closest('.th-help') : null;
    if (!anchor) return;
    var tip = anchor.querySelector('.th-help-text');
    if (!tip) return;
    var rect = anchor.getBoundingClientRect();
    var tw = tip.offsetWidth || 260;
    var th = tip.offsetHeight || 120;
    var left = Math.round(rect.left + rect.width / 2 - tw / 2);
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    var top = rect.bottom + 10;
    var flip = false;
    if (top + th > window.innerHeight - 8) {
      top = rect.top - th - 10;
      flip = true;
    }
    if (top < 8) top = 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.classList.toggle('th-help-flip', flip);
    tip.style.visibility = 'visible';
    tip.style.opacity = '1';
  });
  document.addEventListener('mouseout', function (e) {
    var anchor = e.target && e.target.closest ? e.target.closest('.th-help') : null;
    if (!anchor) return;
    var tip = anchor.querySelector('.th-help-text');
    if (!tip) return;
    tip.style.visibility = 'hidden';
    tip.style.opacity = '0';
  });
  document.addEventListener('scroll', function () {
    var tips = document.querySelectorAll('.th-help-text');
    for (var i = 0; i < tips.length; i++) {
      if (tips[i].style.visibility === 'visible') {
        tips[i].style.visibility = 'hidden';
        tips[i].style.opacity = '0';
      }
    }
  }, true);

  /* Carga la campana global de alertas de compromisos (js/alertas.js)
     en todas las páginas que incluyen module-help.js. */
  function injectAlertasScript() {
    var src = (inModules ? '../js/alertas.js' : 'js/alertas.js');
    var s = document.createElement('script');
    s.src = src;
    s.async = false;
    document.body.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', injectNavHelp);
  document.addEventListener('DOMContentLoaded', injectAlertasScript);
  window.openHelp = openHelp;
})();
