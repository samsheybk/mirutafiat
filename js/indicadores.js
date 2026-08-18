// ============================================
// INDICADORES DE GESTIÓN POR MÓDULO
// Agrega a cada módulo una herramienta con panel
// de indicadores (KPIs) identificada con el icono
// de dashboard. Se autoconfigura según la página.
// ============================================
(function () {
  'use strict';

  function indEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function indPad(n) { return String(n).padStart(2, '0'); }

  function indHM(hhmm) {
    var p = String(hhmm == null ? '0' : hhmm).split(':');
    return (+p[0]) * 60 + (+p[1]);
  }

  function indISO(d) {
    return d.getFullYear() + '-' + indPad(d.getMonth() + 1) + '-' + indPad(d.getDate());
  }

  var indRango = (function () {
    var h = new Date();
    var desde = new Date(h.getFullYear(), h.getMonth(), 1);
    return { desde: indISO(desde), hasta: indISO(h) };
  })();

  function indRangoBounds() {
    var desde = new Date(indRango.desde + 'T00:00:00');
    var hasta = new Date(indRango.hasta + 'T00:00:00');
    if (isNaN(desde.getTime())) desde = new Date();
    if (isNaN(hasta.getTime())) hasta = new Date();
    hasta = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate() + 1);
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }

  function indAplicarRango() {
    var d = document.getElementById('indDesde');
    var h = document.getElementById('indHasta');
    if (d && d.value) indRango.desde = d.value;
    if (h && h.value) indRango.hasta = h.value;
    if (indRango.hasta < indRango.desde) { var t = indRango.hasta; indRango.hasta = indRango.desde; indRango.desde = t; }
    if (d) d.value = indRango.desde;
    if (h) h.value = indRango.hasta;
    loadIndicadores();
  }

  async function indMarcajesRango() {
    var cfgRes = await supabaseClient.from('comp_biometria_config').select('hora_inicio, hora_fin').eq('id', 1).maybeSingle();
    if (cfgRes.error) throw cfgRes.error;
    var cfg = cfgRes.data || {};
    var rango = indRangoBounds();
    var mRes = await supabaseClient.from('comp_marcajes').select('trabajador_id, tipo, fecha_hora')
      .gte('fecha_hora', rango.desde).lt('fecha_hora', rango.hasta);
    if (mRes.error) throw mRes.error;
    var porTra = {};
    (mRes.data || []).forEach(function (m) {
      var d = new Date(m.fecha_hora);
      if (isNaN(d.getTime())) return;
      var t = d.getTime();
      var mins = d.getHours() * 60 + d.getMinutes();
      var rec = porTra[m.trabajador_id] || (porTra[m.trabajador_id] = { first: null, firstMins: null, last: null, lastMins: null });
      if (rec.first === null || t < rec.first) { rec.first = t; rec.firstMins = mins; }
      if (rec.last === null || t > rec.last) { rec.last = t; rec.lastMins = mins; }
    });
    return {
      cfg: cfg,
      hi: indHM(cfg.hora_inicio || '08:00'),
      hf: indHM(cfg.hora_fin || '17:00'),
      porTra: porTra,
      total: (mRes.data || []).length
    };
  }

  function indFormat(value, format) {
    if (value == null || value === '' || isNaN(value)) return '—';
    switch (format) {
      case 'bs':
        return 'Bs. ' + Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'usd':
        return '$ ' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'hours':
        return Math.round(Number(value) * 100) / 100 + ' h';
      case 'mb': {
        var mb = Number(value) / 1048576;
        return mb.toLocaleString('es-VE', { maximumFractionDigits: 1 }) + ' MB';
      }
      case 'percent':
        return Number(value).toLocaleString('es-VE', { maximumFractionDigits: 1 }) + ' %';
      case 'date': {
        var s = String(value);
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
          return d.getDate() + '/' + indPad(d.getMonth() + 1) + '/' + d.getFullYear();
        }
        return s;
      }
      case 'int':
        return Number(value).toLocaleString('es-VE');
      default:
        return Number(value).toLocaleString('es-VE');
    }
  }

  var CONFIG = {
    'captacion.html': null,
    'relaciones-laborales.html': {
      bg: 'bg-relaciones',
      subtitle: 'Indicadores de la vida laboral de los trabajadores y las relaciones con la empresa.',
      cards: [
        { title: 'Registros laborales', icon: 'fi-sr-clipboard-list', table: 'relaciones_registros', count: true, hint: 'Expedientes registrados' },
        { title: 'Conceptos', icon: 'fi-sr-tags', table: 'rl_conceptos', count: true, hint: 'Catálogo de conceptos' },
        { title: 'Equipos', icon: 'fi-sr-box', table: 'ti_equipos', count: true, hint: 'Catálogo de equipos (módulo TI)' },
        { title: 'Vehículos', icon: 'fi-sr-car', table: 'rl_equipos', count: true, hint: 'Catálogo de vehículos' },
        { title: 'Asignaciones activas', icon: 'fi-sr-box', table: 'rl_asignaciones', count: true, filter: { estado: 'Activa' }, hint: 'Activos y accesos en uso' },
        { title: 'Información sensible', icon: 'fi-sr-shield', table: 'rl_info_sensible', count: true, hint: 'Accesos y credenciales' },
        { title: 'Actas y reuniones', icon: 'fi-sr-file-edit', table: 'rl_actas', count: true, hint: 'Actas registradas' },
        { title: 'Acuerdos', icon: 'fi-sr-badge-check', table: 'rl_acta_acuerdos', count: true, hint: 'Compromisos de las actas' },
        { title: 'Alertas sin leer', icon: 'fi-sr-bell', table: 'rl_acta_alertas', count: true, filter: { leido: false }, hint: 'Compromisos pendientes' }
      ]
    },
    'capacitacion.html': {
      bg: 'bg-capacitacion',
      subtitle: 'Indicadores de la formación continua y el desarrollo del talento.',
      cards: [
        { title: 'Cursos', icon: 'fi-sr-graduation-cap', table: 'cap_cursos', count: true, hint: 'Catálogo de cursos' },
        { title: 'Cursos publicados', icon: 'fi-sr-book', table: 'cap_cursos', count: true, filter: { estado: 'Publicado' }, hint: 'Disponibles para los trabajadores' },
        { title: 'Módulos', icon: 'fi-sr-book', table: 'cap_modulos', count: true, hint: 'Unidades de contenido' },
        { title: 'Cuestionarios', icon: 'fi-sr-question', table: 'cap_cuestionarios', count: true, hint: 'Evaluaciones creadas' },
        { title: 'Preguntas', icon: 'fi-sr-question', table: 'cap_preguntas', count: true, hint: 'Banco de preguntas' },
        { title: 'Cargos', icon: 'fi-sr-briefcase', table: 'est_cargos', count: true, hint: 'Puestos con perfil' },
        { title: 'Competencias', icon: 'fi-sr-badge-check', table: 'car_competencias', count: true, hint: 'Competencias por cargo' },
        { title: 'Cursos obligatorios', icon: 'fi-sr-shield', table: 'car_cursos_obligatorios', count: true, hint: 'Formación exigida por cargo' }
      ]
    },
    'bienestar-social.html': {
      bg: 'bg-bienestar',
      subtitle: 'Indicadores de los programas, beneficios y actividades para los trabajadores.',
      cards: [],
      sections: [
        {
          title: 'Distribución por género',
          icon: 'fi-sr-venus-mars',
          chart: 'donut',
          calc: 'bienestar_sexo',
          desc: 'Total de hombres y mujeres en la plantilla activa.'
        },
        {
          title: 'Distribución por edades',
          icon: 'fi-sr-cake-birthday',
          chart: 'donut',
          calc: 'bienestar_edades',
          desc: 'Distribución etaria de la plantilla activa.'
        },
        {
          title: 'Padres y madres',
          icon: 'fi-sr-people',
          chart: 'donut',
          calc: 'bienestar_padres_madres',
          desc: 'Trabajadores con carga familiar registrada como padre o madre.'
        },
        {
          title: 'Headcount por unidad',
          icon: 'fi-sr-chart-pie',
          chart: 'donut',
          calc: 'bienestar_headcount',
          desc: 'Distribución de la plantilla activa por unidad organizacional.'
        }
      ]
    },
    'seguridad-salud.html': {
      bg: 'bg-seguridad',
      subtitle: 'Indicadores de riesgos, salud ocupacional e inspecciones de seguridad.',
      cards: [
        { title: 'Incidentes', icon: 'fi-sr-alarm-exclamation', table: 'seguridad_incidentes', count: true, hint: 'Reportados' },
        { title: 'Incidentes críticos', icon: 'fi-sr-alarm-exclamation', table: 'seguridad_incidentes', count: true, filter: { gravedad: 'Crítica' }, hint: 'Gravedad crítica' },
        { title: 'Inspecciones', icon: 'fi-sr-search-alt', table: 'seguridad_inspecciones', count: true, hint: 'Evaluaciones de campo' },
        { title: 'Atenciones médicas', icon: 'fi-sr-stethoscope', table: 'seguridad_servicio_medico', count: true, hint: 'Consultas registradas' },
        { title: 'Equipos de seguridad', icon: 'fi-sr-boxes', table: 'seguridad_inventario_equipos', count: true, hint: 'EPP y equipos' },
        { title: 'Insumos y medicamentos', icon: 'fi-sr-pills', table: 'seguridad_inventario_insumos', count: true, hint: 'Catálogo del servicio médico' },
        { title: 'Salidas de equipos', icon: 'fi-sr-boxes', table: 'seguridad_inventario_equipo_movimientos', count: true, filter: { tipo: 'Salida' }, hint: 'Movimientos de entrega' },
        { title: 'Salidas de insumos', icon: 'fi-sr-pills', table: 'seguridad_inventario_movimientos', count: true, filter: { tipo: 'Salida' }, hint: 'Entregas y bajas' }
      ]
    },
    'compensacion.html': {
      bg: 'bg-compensacion',
      subtitle: 'Indicadores de la estructura salarial, liquidaciones y marcaje biométrico.',
      cards: [
        { title: 'Nómina mensual (Bs.)', icon: 'fi-sr-money-check', calc: 'nomina_mensual_bs', format: 'usd', format2: 'usd', val2: true, hint: 'Nómina en USD con conversión a Bs · Complemento USD' },
        { title: 'Valor de horas extras del periodo', icon: 'fi-sr-clock', calc: 'horas_extras_periodo', format: 'bs', tip: true, hint: 'Costo de las horas extra del rango seleccionado' },
        { title: 'Llegadas tras la hora de entrada', icon: 'fi-sr-alarm-exclamation', calc: 'llegadas_tarde_rango', hint: 'Primer marcaje del día después de la hora de entrada configurada' }
      ],
      sections: [
        {
          title: 'Estructuras salariales por unidad',
          icon: 'fi-sr-chart-pie',
          chart: 'donut',
          calc: 'estructuras_por_unidad',
          desc: 'Distribución de las estructuras salariales según la unidad organizacional del cargo.'
        }
      ]
    },
    'finanzas.html': {
      bg: 'bg-finanzas',
      subtitle: 'Indicadores del control de gastos, ingresos y reportes financieros.',
      cards: [
        { title: 'Movimientos', icon: 'fi-sr-receipt', table: 'finanzas_movimientos', count: true, hint: 'Registros contables' },
        { title: 'Gastos', icon: 'fi-sr-arrow-trend-down', table: 'finanzas_movimientos', count: true, filter: { tipo: 'Gasto' }, hint: 'Registros de gasto' },
        { title: 'Ingresos', icon: 'fi-sr-arrow-trend-up', table: 'finanzas_movimientos', count: true, filter: { tipo: 'Ingreso' }, hint: 'Registros de ingreso' },
        { title: 'Total gastos (USD)', icon: 'fi-sr-arrow-trend-down', table: 'finanzas_movimientos', sum: 'monto_usd', filter: { tipo: 'Gasto' }, format: 'usd', hint: 'Suma de gastos' },
        { title: 'Total ingresos (USD)', icon: 'fi-sr-arrow-trend-up', table: 'finanzas_movimientos', sum: 'monto_usd', filter: { tipo: 'Ingreso' }, format: 'usd', hint: 'Suma de ingresos' },
        { title: 'Registrados', icon: 'fi-sr-clock', table: 'finanzas_movimientos', count: true, filter: { estado: 'Registrado' }, hint: 'Pendientes de cierre' }
      ]
    },
    'repositorio.html': {
      bg: 'bg-repositorio',
      subtitle: 'Indicadores del centro de documentos, formatos y material de apoyo.',
      cards: [
        { title: 'Documentos', icon: 'fi-sr-folder', table: 'repo_documentos', count: true, hint: 'Archivos publicados' },
        { title: 'Categorías', icon: 'fi-sr-folder-tree', table: 'repo_categorias', count: true, hint: 'Clasificación principal' },
        { title: 'Subcategorías', icon: 'fi-sr-folder-tree', table: 'repo_subcategorias', count: true, hint: 'Subdivisiones' },
        { title: 'Peso total (MB)', icon: 'fi-sr-database', table: 'repo_documentos', sum: 'archivo_tamano', format: 'mb', hint: 'Almacenamiento usado' },
        { title: 'Notificaciones sin leer', icon: 'fi-sr-bell', table: 'repo_notificaciones', count: true, filter: { leido: false }, hint: 'Avisos pendientes' },
        { title: 'Último documento', icon: 'fi-sr-file-edit', table: 'repo_documentos', latest: 'updated_at', format: 'date', hint: 'Fecha de la última actualización' }
      ]
    },
    'desarrollo-organizacional.html': {
      bg: 'bg-desarrollo',
      subtitle: 'Indicadores de gestión, objetivos y salud organizacional por unidad y cargo.',
      cards: [
        { title: 'KPIs definidos', icon: 'fi-sr-chart-line-up', table: 'org_kpis', count: true, hint: 'Indicadores configurados' },
        { title: 'Mediciones', icon: 'fi-sr-chart-pie', table: 'org_kpi_resultados', count: true, hint: 'Registros de cumplimiento' },
        { title: 'OKRs', icon: 'fi-sr-bullseye', table: 'org_okrs', count: true, hint: 'Objetivos y resultados clave' },
        { title: 'Resultados clave', icon: 'fi-sr-bullseye', table: 'org_okr_resultados_clave', count: true, hint: 'KR de los OKRs' },
        { title: 'Seguimientos', icon: 'fi-sr-chart-line-up', table: 'org_okr_seguimiento', count: true, hint: 'Avances registrados' },
        { title: 'Unidades', icon: 'fi-sr-diagram-project', table: 'est_unidades', count: true, hint: 'Estructura organizacional' },
        { title: 'Ausencias', icon: 'fi-sr-clipboard-list', table: 'rh_ausencias', count: true, hint: 'Registros de ausentismo' },
        { title: 'Vacantes', icon: 'fi-sr-briefcase', table: 'rh_vacantes', count: true, hint: 'Vacantes abiertas' },
        { title: 'Capacitaciones completadas', icon: 'fi-sr-graduation-cap', table: 'rh_capacitaciones', count: true, hint: 'Formación realizada' }
      ]
    },
    'gestion-usuarios.html': {
      bg: 'bg-usuarios',
      subtitle: 'Indicadores de los accesos y permisos de la intranet.',
      cards: [
        { title: 'Trabajadores activos', icon: 'fi-sr-users', table: 'plantilla_trabajadores', count: true, filter: { estado: 'Activo' }, hint: 'Elegibles para acceso' },
        { title: 'Accesos configurados', icon: 'fi-sr-users-gear', table: 'usuario_accesos', count: true, hint: 'Permisos registrados' },
        { title: 'Accesos activos', icon: 'fi-sr-shield-check', table: 'usuario_accesos', count: true, filter: { activo: true }, hint: 'Usuarios habilitados' }
      ]
    },
    'venta-autos.html': {
      bg: 'bg-venta-autos',
      subtitle: 'Indicadores de ventas de vehículos, concesionarios, envíos y repuestos.',
      cards: []
    }
  };

  var cfg = CONFIG[location.pathname.split('/').pop()];
  if (!cfg) return;

  var indPalette = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#db2777', '#4f46e5', '#65a30d', '#9333ea'];

  function indDonutHtml(labels, values, colors, usd, totalUsd, centerText, centerSub) {
    var total = (values || []).reduce(function (s, v) { return s + (+v || 0); }, 0);
    if (!total) return '<div class="ind-empty">Sin estructuras salariales registradas</div>';
    var R = 60, W = 22, cx = 90, cy = 90;
    var circ = 2 * Math.PI * R;
    var acc = 0;
    var segs = labels.map(function (lbl, i) {
      var f = (+values[i] || 0) / total;
      var off = -acc;
      acc += f * circ;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + colors[i % colors.length] + '" stroke-width="' + W + '" stroke-dasharray="' + (f * circ) + ' ' + circ + '" stroke-dashoffset="' + off + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"></circle>';
    }).join('');
    var legend = labels.map(function (lbl, i) {
      var f = total ? ((+values[i] || 0) / total) * 100 : 0;
      var val = indFormat(values[i], 'int') + ' (' + f.toLocaleString('es-VE', { maximumFractionDigits: 1 }) + '%)';
      if (usd && usd[i] != null) val += ' · ' + indFormat(usd[i], 'usd');
      return '<div class="ind-legend-item"><span class="ind-legend-dot" style="background:' + colors[i % colors.length] + ';"></span><span class="ind-legend-label">' + indEscape(lbl) + '</span><span class="ind-legend-val">' + val + '</span></div>';
    }).join('');
    if (usd && totalUsd != null) {
      legend += '<div class="ind-legend-total"><span>Total</span><span>' + indFormat(totalUsd, 'usd') + ' / mes</span></div>';
    }
    var cText = centerText != null ? centerText : total;
    var cSub = centerSub != null ? centerSub : 'estructuras';
    return '<div class="ind-donut">' +
      '<svg viewBox="0 0 180 180" width="150" height="150">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(--color-border)" stroke-width="' + W + '"></circle>' +
      segs +
      '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" style="font-size:22px;font-weight:700;fill:var(--color-text);">' + cText + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle" style="font-size:10px;fill:var(--color-text-secondary);">' + indEscape(cSub) + '</text>' +
      '</svg>' +
      '<div class="ind-legend">' + legend + '</div>' +
      '</div>';
  }

  // Calculadores personalizados (más de una consulta o lógica propia)
  function indEasterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month, day);
  }

  function indSumarDias(date, n) {
    var t = new Date(date.getTime());
    t.setDate(t.getDate() + n);
    return t;
  }

  function indEsFeriado(d) {
    var y = d.getFullYear();
    var easter = indEasterSunday(y);
    var feriados = [
      new Date(y, 0, 1),
      indSumarDias(easter, -48),
      indSumarDias(easter, -47),
      indSumarDias(easter, -3),
      indSumarDias(easter, -2),
      new Date(y, 3, 19),
      new Date(y, 4, 1),
      new Date(y, 5, 24),
      new Date(y, 6, 5),
      new Date(y, 6, 24),
      new Date(y, 9, 12),
      new Date(y, 11, 24),
      new Date(y, 11, 25),
      new Date(y, 11, 31)
    ];
    for (var i = 0; i < feriados.length; i++) {
      if (feriados[i].getFullYear() === y && feriados[i].getMonth() === d.getMonth() && feriados[i].getDate() === d.getDate()) return true;
    }
    return false;
  }

  function indHorasExtra(lista, cfg) {
    var sorted = lista.slice().sort(function (a, b) { return new Date(a.fecha_hora) - new Date(b.fecha_hora); });
    var pairs = [];
    var openIn = null;
    sorted.forEach(function (m) {
      var d = new Date(m.fecha_hora);
      if (isNaN(d.getTime())) return;
      if (m.tipo === 'Entrada') {
        if (!openIn) openIn = d;
      } else if (m.tipo === 'Salida' && openIn) {
        pairs.push({ in: openIn, out: d });
        openIn = null;
      }
    });
    if (openIn) pairs.push({ in: openIn, out: openIn });
    var hi = indHM(cfg.hora_inicio || '08:00');
    var hf = indHM(cfg.hora_fin || '17:00');
    var dias = {};
    pairs.forEach(function (pr) {
      var tIn = pr.in.getTime(), tOut = pr.out.getTime();
      if (tOut <= tIn) return;
      var day = new Date(pr.in); day.setHours(0, 0, 0, 0);
      var lastDay = new Date(pr.out); lastDay.setHours(0, 0, 0, 0);
      while (day <= lastDay) {
        var ds = day.getTime(), de = ds + 86400000;
        var s0 = Math.max(tIn, ds), s1 = Math.min(tOut, de);
        if (s1 > s0) {
          var key = day.getFullYear() + '-' + indPad(day.getMonth() + 1) + '-' + indPad(day.getDate());
          var dacc = dias[key] || (dias[key] = { normal: 0, weekend: 0, festivo: 0 });
          var mins = (s1 - s0) / 60000;
          if (indEsFeriado(day)) {
            dacc.festivo += mins;
          } else if (day.getDay() === 0 || day.getDay() === 6) {
            dacc.weekend += mins;
          } else {
            var ws = ds + hi * 60000, we = ds + hf * 60000;
            var norm = (Math.min(s1, we) - Math.max(s0, ws)) / 60000;
            if (norm < 0) norm = 0;
            dacc.normal += mins - norm;
          }
        }
        day = new Date(ds + 86400000);
      }
    });
    return Object.keys(dias).map(function (k) { return dias[k]; });
  }

  var CALCULATORS = {
    _mockMode: false,
    _mockData: {
      bienestar_sexo: function () {
        return { labels: ['Masculino', 'Femenino'], values: [42, 28], colors: ['#2563eb', '#e11d48'], centerText: 70, centerSub: 'trabajadores' };
      },
      bienestar_edades: function () {
        return { labels: ['18-25', '26-35', '36-45', '46-55', '56+'], values: [8, 22, 20, 14, 6], colors: ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'], centerText: 34, centerSub: 'edad promedio' };
      },
      bienestar_padres_madres: function () {
        return { labels: ['Padres', 'Madres'], values: [18, 15], colors: ['#0891b2', '#db2777'], centerText: 33, centerSub: 'familiares' };
      },
      bienestar_headcount: function () {
        return { labels: ['Recursos Humanos', 'Soporte', 'Producción', 'Administración', 'Ventas'], values: [18, 14, 16, 12, 10], colors: ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626'], centerText: 70, centerSub: 'trabajadores' };
      }
    },
    estructuras_suma: async function () {
      var eRes = await supabaseClient.from('comp_estructura_salarial').select('estado, parte_bs, parte_usd, tasa_bcv, sueldo_base_bs, sueldo_base_usd, complemento_usd');
      if (eRes.error) throw eRes.error;
      var activos = (eRes.data || []).filter(function (e) { return e.estado === 'Activo'; });
      var s = { pbs: 0, pusd: 0, pbsBs: 0, totalBs: 0 };
      activos.forEach(function (e) {
        var bs = e.parte_bs != null ? (+e.parte_bs || 0) : (+e.sueldo_base_bs || 0);
        var usd = e.parte_usd != null ? (+e.parte_usd || 0) : ((+e.sueldo_base_usd || 0) + (+e.complemento_usd || 0));
        var t = +e.tasa_bcv || 0;
        s.pbs += bs;
        s.pusd += usd;
        s.pbsBs += bs * t;
        s.totalBs += (bs + usd) * t;
      });
      return s;
    },
    nomina_mensual_bs: async function () {
      var s = await CALCULATORS.estructuras_suma();
      var tasa = s.pbs ? s.pbsBs / s.pbs : 0;
      return {
        value: s.pbs,
        value2: s.pusd,
        val1Sub: 'En Bs: ' + indFormat(s.pbsBs, 'bs'),
        hint: 'Tasa aplicada: ' + indFormat(tasa, 'bs') + '/USD'
      };
    },
    estructuras_por_unidad: async function () {
      var eRes = await supabaseClient.from('comp_estructura_salarial').select('cargo_id, estado, parte_bs, parte_usd, tasa_bcv, sueldo_base_bs, sueldo_base_usd, complemento_usd');
      if (eRes.error) throw eRes.error;
      var cRes = await supabaseClient.from('est_cargos').select('id, unidad_id');
      if (cRes.error) throw cRes.error;
      var uRes = await supabaseClient.from('est_unidades').select('id, nombre');
      if (uRes.error) throw uRes.error;
      var unidadDeCargo = {};
      (cRes.data || []).forEach(function (c) { unidadDeCargo[c.id] = c.unidad_id; });
      var nombres = {};
      (uRes.data || []).forEach(function (u) { nombres[u.id] = u.nombre; });
      var activos = (eRes.data || []).filter(function (e) { return e.estado === 'Activo'; });
      var porU = {};
      activos.forEach(function (e) {
        var uid = unidadDeCargo[e.cargo_id];
        var key = uid != null ? uid : 'sin-unidad';
        var rec = porU[key] || (porU[key] = { n: 0, usd: 0 });
        rec.n++;
        var pbs = e.parte_bs != null ? (+e.parte_bs || 0) : (+e.sueldo_base_bs || 0);
        var pusd = e.parte_usd != null ? (+e.parte_usd || 0) : ((+e.sueldo_base_usd || 0) + (+e.complemento_usd || 0));
        rec.usd += pbs + pusd;
      });
      var orden = Object.keys(porU).sort(function (a, b) { return porU[b].n - porU[a].n; });
      var totalUsd = orden.reduce(function (s, k) { return s + porU[k].usd; }, 0);
      return {
        labels: orden.map(function (k) { return k === 'sin-unidad' ? 'Sin unidad' : (nombres[k] || 'Unidad sin nombre'); }),
        values: orden.map(function (k) { return porU[k].n; }),
        usd: orden.map(function (k) { return Math.round(porU[k].usd * 100) / 100; }),
        totalUsd: Math.round(totalUsd * 100) / 100,
        colors: indPalette
      };
    },
    cobertura_plantilla: async function () {
      var a = await supabaseClient.from('plantilla_trabajadores').select('id', { count: 'exact', head: true }).eq('estado', 'Activo');
      if (a.error) throw a.error;
      var c = await supabaseClient.from('est_cargos').select('vacantes');
      if (c.error) throw c.error;
      var plazas = (c.data || []).reduce(function (s, r) { return s + (+r.vacantes || 0); }, 0);
      var pct = plazas ? (a.count / plazas) * 100 : 0;
      return { value: pct, hint: a.count + ' trabajadores activos / ' + plazas + ' plazas configuradas' };
    },
    horas_extras_periodo: async function () {
      var cfgRes = await supabaseClient.from('comp_biometria_config').select('hora_inicio, hora_fin, factor_hora_extra, factor_feriado_fin_semana').eq('id', 1).maybeSingle();
      if (cfgRes.error) throw cfgRes.error;
      var cfg = cfgRes.data || {};
      var fExtra = +cfg.factor_hora_extra || 1.5;
      var fFeriado = +cfg.factor_feriado_fin_semana || 1.8;
      var rango = indRangoBounds();
      var mRes = await supabaseClient.from('comp_marcajes').select('trabajador_id, tipo, fecha_hora')
        .gte('fecha_hora', rango.desde).lt('fecha_hora', rango.hasta);
      if (mRes.error) throw mRes.error;
      var porW = {};
      (mRes.data || []).forEach(function (m) {
        (porW[m.trabajador_id] = porW[m.trabajador_id] || []).push(m);
      });
      var eRes = await supabaseClient.from('comp_estructura_salarial').select('cargo_id, parte_bs, sueldo_base_bs');
      if (eRes.error) throw eRes.error;
      var horaPorCargo = {};
      (eRes.data || []).forEach(function (e) {
        var pbs = e.parte_bs != null ? (+e.parte_bs || 0) : (+e.sueldo_base_bs || 0);
        horaPorCargo[e.cargo_id] = (pbs / 30) / 8;
      });
      var tRes = await supabaseClient.from('plantilla_trabajadores').select('id, cargo_id');
      if (tRes.error) throw tRes.error;
      var cargoDeTra = {};
      (tRes.data || []).forEach(function (t) { cargoDeTra[t.id] = t.cargo_id; });
      var tot = { normal: 0, weekend: 0, festivo: 0 };
      var val = { normal: 0, weekend: 0, festivo: 0 };
      var umbral = 4 * 60;
      Object.keys(porW).forEach(function (id) {
        var hora = horaPorCargo[cargoDeTra[id]] || 0;
        indHorasExtra(porW[id], cfg).forEach(function (d) {
          if ((d.normal + d.weekend + d.festivo) < umbral) return;
          tot.normal += d.normal;
          tot.weekend += d.weekend;
          tot.festivo += d.festivo;
          val.normal += (d.normal / 60) * hora * fExtra;
          val.weekend += (d.weekend / 60) * hora * fFeriado;
          val.festivo += (d.festivo / 60) * hora * fFeriado;
        });
      });
      var totBs = val.normal + val.weekend + val.festivo;
      var fmtH = function (m) { return Math.round((m / 60) * 100) / 100 + ' h'; };
      var fmtBs = function (v) { return indFormat(v, 'bs'); };
      return {
        value: Math.round(totBs * 100) / 100,
        hint: 'Costo de las horas extra del rango ' + indRango.desde + ' → ' + indRango.hasta,
        tip: 'Valor/hora = (parte en Bs ÷ 30) ÷ 8 · ' + fExtra + '× horas normales · ' + fFeriado + '× fin de semana/festivos · solo se pagan días con ≥ 4 h extra',
        subs: [
          { label: 'Normales', value: fmtH(tot.normal) + ' · ' + fmtBs(val.normal) },
          { label: 'Fin de semana', value: fmtH(tot.weekend) + ' · ' + fmtBs(val.weekend) },
          { label: 'Festivos', value: fmtH(tot.festivo) + ' · ' + fmtBs(val.festivo) }
        ]
      };
    },
    marcajes_rango: async function () {
      var raw = await indMarcajesRango();
      return { value: raw.total, hint: 'Marcajes de ' + Object.keys(raw.porTra).length + ' trabajador(es) en el rango ' + indRango.desde + ' → ' + indRango.hasta };
    },
    llegadas_tarde_rango: async function () {
      var raw = await indMarcajesRango();
      var n = 0;
      Object.keys(raw.porTra).forEach(function (id) { if (raw.porTra[id].firstMins > raw.hi) n++; });
      return { value: n, hint: 'Primer marcaje después de las ' + (raw.cfg.hora_inicio || '08:00') + ' en el rango ' + indRango.desde + ' → ' + indRango.hasta };
    },
    salidas_tarde_rango: async function () {
      var raw = await indMarcajesRango();
      var n = 0;
      Object.keys(raw.porTra).forEach(function (id) { if (raw.porTra[id].lastMins > raw.hf) n++; });
      return { value: n, hint: 'Último marcaje después de las ' + (raw.cfg.hora_fin || '17:00') + ' en el rango ' + indRango.desde + ' → ' + indRango.hasta };
    },
    abandono_por_cargo: async function () {
      var tRes = await supabaseClient.from('plantilla_trabajadores').select('id, cargo_id, fecha_ingreso, fecha_egreso');
      if (tRes.error) throw tRes.error;
      var cRes = await supabaseClient.from('est_cargos').select('id, titulo');
      if (cRes.error) throw cRes.error;
      var nombres = {};
      (cRes.data || []).forEach(function (c) { nombres[c.id] = c.titulo; });
      var porCargo = {};
      (tRes.data || []).forEach(function (t) {
        if (!t.fecha_egreso || !t.fecha_ingreso) return;
        var ini = new Date(t.fecha_ingreso);
        var fin = new Date(t.fecha_egreso);
        if (isNaN(ini.getTime()) || isNaN(fin.getTime())) return;
        var dias = Math.round((fin.getTime() - ini.getTime()) / 86400000);
        if (dias < 0) return;
        var key = t.cargo_id || '';
        if (!porCargo[key]) porCargo[key] = { total: 0, n: 0 };
        porCargo[key].total += dias;
        porCargo[key].n += 1;
      });
      var rows = Object.keys(porCargo).map(function (key) {
        var d = porCargo[key];
        return {
          cargo: nombres[key] || 'Cargo sin asignar',
          n: d.n,
          promedio: d.total / d.n
        };
      }).sort(function (x, y) { return x.promedio - y.promedio; });
      return {
        headers: ['Cargo', 'Egresos', 'Promedio de días'],
        emptyText: 'No hay egresos con fechas de ingreso y egreso para calcular el promedio.',
        rows: rows.map(function (r) {
          return { cells: [
            indEscape(r.cargo),
            String(r.n),
            '<strong>' + r.promedio.toLocaleString('es-VE', { maximumFractionDigits: 1 }) + '</strong>'
          ] };
        })
      };
    },
    bienestar_sexo: async function () {
      var res = await supabaseClient.from('plantilla_trabajadores').select('sexo', { count: 'exact', head: false }).eq('estado', 'Activo');
      if (res.error) throw res.error;
      var m = 0, f = 0;
      (res.data || []).forEach(function (t) {
        if (t.sexo === 'Masculino') m++;
        else if (t.sexo === 'Femenino') f++;
      });
      var total = m + f;
      return {
        labels: ['Masculino', 'Femenino'],
        values: [m, f],
        colors: ['#2563eb', '#e11d48'],
        centerText: total,
        centerSub: 'trabajadores'
      };
    },
    bienestar_edades: async function () {
      var res = await supabaseClient.from('plantilla_trabajadores').select('fecha_nacimiento').eq('estado', 'Activo');
      if (res.error) throw res.error;
      var ranges = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
      var sumAge = 0, countAge = 0;
      var now = Date.now();
      (res.data || []).forEach(function (t) {
        if (!t.fecha_nacimiento) return;
        var bd = new Date(t.fecha_nacimiento);
        if (isNaN(bd.getTime())) return;
        var age = Math.floor((now - bd.getTime()) / (365.25 * 86400000));
        if (age < 18) return;
        sumAge += age;
        countAge++;
        if (age <= 25) ranges['18-25']++;
        else if (age <= 35) ranges['26-35']++;
        else if (age <= 45) ranges['36-45']++;
        else if (age <= 55) ranges['46-55']++;
        else ranges['56+']++;
      });
      var avg = countAge ? Math.round(sumAge / countAge) : '—';
      return {
        labels: Object.keys(ranges),
        values: Object.values(ranges),
        colors: ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed'],
        centerText: avg,
        centerSub: 'edad promedio'
      };
    },
    bienestar_padres_madres: async function () {
      var res = await supabaseClient.from('trabajador_carga_familiar').select('parentesco');
      if (res.error) throw res.error;
      var padres = 0, madres = 0;
      (res.data || []).forEach(function (c) {
        if (c.parentesco === 'Padre') padres++;
        else if (c.parentesco === 'Madre') madres++;
      });
      var total = padres + madres;
      return {
        labels: ['Padres', 'Madres'],
        values: [padres, madres],
        colors: ['#0891b2', '#db2777'],
        centerText: total,
        centerSub: 'familiares'
      };
    },
    bienestar_headcount: async function () {
      var tRes = await supabaseClient.from('plantilla_trabajadores').select('unidad_id').eq('estado', 'Activo');
      if (tRes.error) throw tRes.error;
      var uRes = await supabaseClient.from('est_unidades').select('id, nombre');
      if (uRes.error) throw uRes.error;
      var nombres = {};
      (uRes.data || []).forEach(function (u) { nombres[u.id] = u.nombre; });
      var porUnidad = {};
      (tRes.data || []).forEach(function (t) {
        var key = t.unidad_id || 'Sin unidad';
        porUnidad[key] = (porUnidad[key] || 0) + 1;
      });
      var items = Object.keys(porUnidad).map(function (k) {
        return { nombre: nombres[k] || 'Sin unidad', n: porUnidad[k] };
      }).sort(function (a, b) { return b.n - a.n; });
      var total = items.reduce(function (s, it) { return s + it.n; }, 0);
      var palette = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#db2777', '#4f46e5', '#65a30d', '#ea580c'];
      return {
        labels: items.map(function (it) { return it.nombre; }),
        values: items.map(function (it) { return it.n; }),
        colors: items.map(function (_, i) { return palette[i % palette.length]; }),
        centerText: total,
        centerSub: 'trabajadores'
      };
    }
  };

  var panelEl = document.querySelector('.module-panel');
  var contentEl = document.querySelector('.module-content');
  if (!panelEl || !contentEl) return;

  // 1) Botón del panel con icono de dashboard
  var panelItem = document.createElement('div');
  panelItem.className = 'panel-item';
  panelItem.setAttribute('data-tool', 'indicadores');
  panelItem.setAttribute('onclick', "switchTool('indicadores')");
  panelItem.title = 'Indicadores de gestión';
  panelItem.innerHTML =
    '<span class="panel-item-indicator ' + cfg.bg + '"></span>' +
    '<i class="fi fi-sr-dashboard" style="font-size:24px;pointer-events:none;"></i>' +
    '<span class="panel-item-label">Indicadores</span>';
  panelEl.appendChild(panelItem);

  // 2) Encabezado en la barra de herramientas (si existe)
  var topbarEl = document.querySelector('.topbar');
  if (topbarEl) {
    var tb = document.createElement('div');
    tb.className = 'toolbar-content';
    tb.setAttribute('data-toolbar', 'indicadores');
    tb.style.cssText = 'display:none;align-items:center;gap:10px;width:100%;flex-wrap:wrap;';
    tb.innerHTML =
      '<input type="date" class="form-input" id="indDesde" value="' + indRango.desde + '" style="height:36px;max-width:160px;" onchange="indAplicarRango()" title="Inicio del rango de análisis">' +
      '<input type="date" class="form-input" id="indHasta" value="' + indRango.hasta + '" style="height:36px;max-width:160px;" onchange="indAplicarRango()" title="Fin del rango de análisis">' +
      '<label class="ind-mock-toggle" title="Simular datos de ejemplo para previsualizar los gráficos">' +
        '<input type="checkbox" id="indMockToggle" onchange="indToggleMock(this.checked)">' +
        '<span class="ind-mock-slider"></span>' +
        '<span class="ind-mock-text">Simular</span>' +
      '</label>';
    topbarEl.appendChild(tb);
  }

  // 3) Sección de indicadores
  var section = document.createElement('div');
  section.className = 'tool-section';
  section.id = 'tool-indicadores';
  section.innerHTML =
    '<div class="ind-grid" id="indGrid"></div>' +
    (cfg.sections || []).map(function (sec, i) {
      return '<div class="ind-section" id="indSec-' + i + '">' +
        '<div class="ind-section-head"><i class="fi ' + (sec.icon || 'fi-sr-chart-simple') + '"></i><h3>' + indEscape(sec.title) + '</h3></div>' +
        '<p class="ind-subtitle">' + indEscape(sec.desc || '') + '</p>' +
        (sec.chart === 'donut'
          ? '<div id="indChart-' + i + '"><div class="skeleton" style="width:60%;height:180px;"></div></div>'
          : '<div class="tabla-scroll"><table class="data-table">' +
            '<thead id="indSecHead-' + i + '"></thead>' +
            '<tbody id="indSecBody-' + i + '"><tr><td><div class="skeleton" style="width:80%;"></div></td></tr></tbody>' +
            '</table></div>') +
      '</div>';
    }).join('');
  contentEl.appendChild(section);

  var grid = section.querySelector('#indGrid');
  grid.innerHTML = cfg.cards.map(function (card, i) {
    var head = '<div class="ind-card-head"><i class="fi ' + (card.icon || 'fi-sr-chart-simple') + '"></i><span>' + indEscape(card.title) + '</span>' + (card.tip ? '<span class="th-help"><span class="th-help-text"></span><span class="th-help-icon">?</span></span>' : '') + '</div>';
    var vals = card.val2
      ? '<div class="ind-value-row">' +
        '<div class="ind-value" id="indVal-' + i + '">—</div>' +
        '<div class="ind-val1-sub" id="indVal1Sub-' + i + '"></div>' +
        '<div class="ind-divider"></div>' +
        '<div class="ind-value-col"><div class="ind-value" id="indVal2-' + i + '">—</div><div class="ind-val2-label">Complemento USD</div></div>' +
        '</div>'
      : '<div class="ind-value" id="indVal-' + i + '">—</div>';
    return '<div class="ind-card">' + head + vals +
      '<div class="ind-hint" id="indHint-' + i + '">' + indEscape(card.hint || 'Consultando...') + '</div>' +
    '</div>';
  }).join('');

  // 4) Carga de valores
  function applyFilters(q, card) {
    var f = card.filter || {};
    return Object.keys(f).reduce(function (acc, field) {
      var v = f[field];
      if (v === 'today') {
        var d = new Date();
        var today = d.getFullYear() + '-' + indPad(d.getMonth() + 1) + '-' + indPad(d.getDate());
        var t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        var tomo = t.getFullYear() + '-' + indPad(t.getMonth() + 1) + '-' + indPad(t.getDate());
        return acc.gte(field, today).lt(field, tomo);
      }
      if (typeof v === 'string' && v.indexOf('gt:') === 0) return acc.gt(field, v.slice(3));
      if (typeof v === 'string' && v.indexOf('lt:') === 0) return acc.lt(field, v.slice(3));
      return acc.eq(field, v);
    }, q);
  }

  async function loadCard(card, i) {
    var valEl = document.getElementById('indVal-' + i);
    var hintEl = document.getElementById('indHint-' + i);
    try {
      if (typeof supabaseClient === 'undefined') throw new Error('supabaseClient no disponible');
      var value, outHint;
      if (card.calc) {
        var fn = CALCULATORS[card.calc];
        if (typeof fn !== 'function') throw new Error('Calculador no definido: ' + card.calc);
        var out = await fn();
        value = out.value;
        outHint = out.hint;
      } else if (card.count && !card.sum && !card.latest) {
        var q0 = applyFilters(supabaseClient.from(card.table).select('id', { count: 'exact', head: true }), card);
        var res0 = await q0;
        if (res0.error) throw res0.error;
        value = res0.count;
      } else if (card.sum) {
        var q1 = applyFilters(supabaseClient.from(card.table).select(card.sum), card);
        var res1 = await q1;
        if (res1.error) throw res1.error;
        value = (res1.data || []).reduce(function (s, r) { return s + (+r[card.sum] || 0); }, 0);
      } else if (card.latest) {
        var q2 = applyFilters(supabaseClient.from(card.table).select(card.latest).order(card.latest, { ascending: false }).limit(1), card);
        var res2 = await q2;
        if (res2.error) throw res2.error;
        value = (res2.data && res2.data[0]) ? res2.data[0][card.latest] : null;
      }
      valEl.textContent = indFormat(value, card.format || 'int');
      if (card.val2 && out && out.value2 != null) {
        var val2El = document.getElementById('indVal2-' + i);
        if (val2El) val2El.textContent = indFormat(out.value2, card.format2 || card.format || 'int');
      }
      if (card.val2 && out && out.val1Sub) {
        var sub1El = document.getElementById('indVal1Sub-' + i);
        if (sub1El) sub1El.textContent = out.val1Sub;
      }
      if (card.tip && out && out.tip) {
        var tipEl = valEl.closest('.ind-card') && valEl.closest('.ind-card').querySelector('.th-help-text');
        if (tipEl) tipEl.textContent = out.tip;
      }
      if (outHint) {
        if (out && out.subs && out.subs.length) {
          hintEl.innerHTML = '<span>' + indEscape(outHint) + '</span>' + out.subs.map(function (s) {
            return '<span class="ind-sub"><span>' + indEscape(s.label) + '</span><strong>' + indEscape(s.value) + '</strong></span>';
          }).join('');
        } else {
          hintEl.textContent = outHint;
        }
      }
      else if (card.latest && value == null) hintEl.textContent = 'Sin registros';
    } catch (e) {
      valEl.textContent = '—';
      hintEl.textContent = 'No disponible';
      if (window.console) console.warn('Indicador "' + card.title + '": ' + (e.message || e));
    }
  }

  function loadSection(sec, i) {
    var fn = CALCULATORS[sec.calc];
    if (typeof fn !== 'function') {
      var emptyEl = document.getElementById('indChart-' + i) || document.getElementById('indSecBody-' + i);
      if (emptyEl) emptyEl.innerHTML = '<div class="ind-empty">No disponible</div>';
      return;
    }
    var promise;
    if (CALCULATORS._mockMode && CALCULATORS._mockData[sec.calc]) {
      promise = Promise.resolve(CALCULATORS._mockData[sec.calc]());
    } else {
      promise = fn();
    }
    promise.then(function (res) {
      if (sec.chart === 'donut') {
        var chartEl = document.getElementById('indChart-' + i);
        if (chartEl) {
          chartEl.innerHTML = (res && res.labels) ? indDonutHtml(res.labels, res.values, res.colors, res.usd, res.totalUsd, res.centerText, res.centerSub) : '<div class="ind-empty">Sin datos</div>';
        }
        return;
      }
      var headEl = document.getElementById('indSecHead-' + i);
      var bodyEl = document.getElementById('indSecBody-' + i);
      if (!headEl || !bodyEl) return;
      if (!res || !res.headers || !res.rows) {
        bodyEl.innerHTML = '<tr><td style="padding:30px;color:#999;">Sin datos</td></tr>';
        return;
      }
      headEl.innerHTML = '<tr>' + res.headers.map(function (h) { return '<th>' + indEscape(h) + '</th>'; }).join('') + '</tr>';
      if (!res.rows.length) {
        bodyEl.innerHTML = '<tr><td colspan="' + res.headers.length + '" style="text-align:center;padding:30px;color:#999;">' + indEscape(res.emptyText || 'Sin registros') + '</td></tr>';
        return;
      }
      bodyEl.innerHTML = res.rows.map(function (r) {
        return '<tr>' + r.cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('');
    }).catch(function (e) {
      var errEl = document.getElementById('indChart-' + i) || document.getElementById('indSecBody-' + i);
      if (errEl) errEl.innerHTML = '<div class="ind-empty">No disponible</div>';
      if (window.console) console.warn('Indicador "' + sec.title + '": ' + (e.message || e));
    });
  }

  function loadIndicadores() {
    cfg.cards.forEach(loadCard);
    (cfg.sections || []).forEach(loadSection);
  }

  function indToggleMock(checked) {
    CALCULATORS._mockMode = !!checked;
    loadIndicadores();
  }

  // 5) Recargar al activar la herramienta
  var hooked = false;
  function hookSwitchTool() {
    if (hooked) return;
    hooked = true;
    var orig = window.switchTool;
    if (typeof orig !== 'function') return;
    window.switchTool = function (name) {
      if (name === 'indicadores') loadIndicadores();
      if (typeof orig === 'function') orig(name);
    };
  }

  loadIndicadores();
  hookSwitchTool();
  window.indAplicarRango = indAplicarRango;
  window.indToggleMock = indToggleMock;
  document.addEventListener('DOMContentLoaded', hookSwitchTool);

  var saved = localStorage.getItem('fiat_tool_' + location.pathname);
  if (saved === 'indicadores' && document.getElementById('tool-indicadores')) {
    switchTool('indicadores');
  }
})();
