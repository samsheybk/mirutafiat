// ============================================
// MODALES DE INTERFAZ (reemplazo de alert/confirm nativos)
// ============================================

let uiDialogResolve = null;

function uiEscape(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function uiModuleColor() {
  const topnav = document.querySelector('.topnav');
  if (topnav) {
    const bg = topnav.style.background || getComputedStyle(topnav).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }
  return 'var(--color-text)';
}

const UI_DIALOG_TYPES = {
  info:    { icon: '<i class="fi fi-sr-info"></i>',      title: 'Aviso',        cls: 'type-info' },
  success: { icon: '<i class="fi fi-sr-badge-check"></i>', title: '¡Éxito!',      cls: 'type-success' },
  error:   { icon: '<i class="fi fi-sr-alarm-exclamation"></i>', title: 'Error',   cls: 'type-error' },
  warning: { icon: '<i class="fi fi-sr-exclamation"></i>', title: 'Advertencia', cls: 'type-warning' },
};

function uiDialogMarkup(type, message, buttons, renderHtml) {
  const conf = UI_DIALOG_TYPES[type] || UI_DIALOG_TYPES.info;
  return `
    <div class="modal-overlay show ui-dialog-overlay" id="uiDialogOverlay">
      <div class="modal ui-dialog">
        <div class="modal-header">
          <h3>${conf.title}</h3>
          <button class="modal-close" onclick="uiDialogDismiss(false)" title="Cerrar">&times;</button>
        </div>
        <div class="modal-body">
          <div class="ui-dialog-content">
            <div class="ui-dialog-icon ${conf.cls}">${conf.icon}</div>
            <div class="ui-dialog-message">${renderHtml ? message : uiEscape(message)}</div>
          </div>
        </div>
        <div class="modal-footer">${buttons}</div>
      </div>
    </div>
  `;
}

function uiDialogDismiss(value) {
  const overlay = document.getElementById('uiDialogOverlay');
  if (overlay) overlay.remove();
  if (uiDialogResolve) {
    uiDialogResolve(value === true);
    uiDialogResolve = null;
  }
}

function uiDialogOpen(type, message, buttons, opts) {
  document.body.insertAdjacentHTML('beforeend', uiDialogMarkup(type, message, buttons, opts && opts.html));
  const overlay = document.getElementById('uiDialogOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) uiDialogDismiss(false);
  });
}

function showAlert(message, type) {
  uiDialogOpen(type || 'info', message, `
    <button class="btn" style="background:${uiModuleColor()}" onclick="uiDialogDismiss()">Aceptar</button>
  `, { html: false });
}

function showConfirm(message, confirmText) {
  return new Promise(resolve => {
    uiDialogResolve = resolve;
    uiDialogOpen('warning', message, `
      <button class="btn btn-outline" onclick="uiDialogDismiss(false)">Cancelar</button>
      <button class="btn" style="background:${uiModuleColor()}" onclick="uiDialogDismiss(true)">${uiEscape(confirmText || 'Confirmar')}</button>
    `, { html: true });
  });
}

// ============================================
// ESTADOS DE CARGA (skeleton shimmer)
// ============================================

const SKELETON_WIDTHS = [88, 72, 60, 80, 64, 48, 90, 70];

function skeletonTableRows(cols, rows) {
  cols = cols || 6;
  rows = rows || 6;
  let out = '';
  for (let r = 0; r < rows; r++) {
    out += '<tr class="skeleton-table">';
    for (let c = 0; c < cols; c++) {
      const w = SKELETON_WIDTHS[(r * 3 + c) % SKELETON_WIDTHS.length] + '%';
      out += '<td><div class="skeleton" style="width:' + w + '"></div></td>';
    }
    out += '</tr>';
  }
  return out;
}

function tableLoadingHTML(cols, rows) {
  return skeletonTableRows(cols, rows);
}

function skeletonCards(count) {
  count = count || 6;
  let out = '';
  for (let i = 0; i < count; i++) {
    out += '<div class="skeleton-card">'
      + '<div class="skeleton skeleton-thumb"></div>'
      + '<div class="skeleton-card-body">'
      + '<div class="skeleton" style="width:85%"></div>'
      + '<div class="skeleton" style="width:60%"></div>'
      + '<div class="skeleton" style="width:42%"></div>'
      + '</div></div>';
  }
  return out;
}

function containerLoadingHTML() {
  return '<div class="skeleton-panel">'
    + '<div class="skeleton skeleton-block" style="width:38%"></div>'
    + '<div class="skeleton" style="width:78%"></div>'
    + '<div class="skeleton" style="width:92%"></div>'
    + '<div class="skeleton" style="width:64%"></div>'
    + '</div>';
}

function skeletonDetailHTML() {
  return '<div class="skeleton-panel" style="margin-bottom:20px;">'
    + '<div class="skeleton skeleton-block" style="width:34%"></div>'
    + '<div class="skeleton" style="width:92%"></div>'
    + '<div class="skeleton" style="width:70%"></div>'
    + '</div>'
    + '<div class="skeleton-panel">'
    + '<div class="skeleton skeleton-block" style="width:26%"></div>'
    + '<div class="skeleton" style="width:88%"></div>'
    + '<div class="skeleton" style="width:80%"></div>'
    + '<div class="skeleton" style="width:56%"></div>'
    + '</div>';
}

function uiFadeIn(el) {
  if (!el) return;
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

// ============================================
// TABLAS A TARJETAS EN MÓVIL
// En pantallas <= 640px, las tablas con más de
// TABLE_CARDS_THRESHOLD columnas se convierten en
// tarjetas: cada fila es una tarjeta y cada celda
// muestra su etiqueta (del <th>) encima del valor.
// Se aplica también a tablas renderizadas de forma
// dinámica vía MutationObserver, sin romper la
// estructura ni los manejadores de las filas.
// ============================================

const TABLE_CARDS_THRESHOLD = 4;
let tableCardsTimer = null;
let tableCardsObserver = null;

function tableCardsLabel(th) {
  const clone = th.cloneNode(true);
  clone.querySelectorAll('.th-help-text').forEach((n) => n.remove());
  return String(clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function tableCardsApply(table) {
  const thead = table.querySelector('thead');
  const heads = thead ? Array.prototype.slice.call(thead.querySelectorAll('th')) : [];
  if (heads.length > TABLE_CARDS_THRESHOLD) table.classList.add('table-cards');
  else table.classList.remove('table-cards');
  if (!heads.length) return;

  const rows = table.querySelectorAll('tbody > tr');
  rows.forEach((tr) => {
    const cells = tr.querySelectorAll('td');
    cells.forEach((td, idx) => {
      if (td.hasAttribute('colspan')) return;
      if (idx >= heads.length) return;
      const label = tableCardsLabel(heads[idx]);
      td.setAttribute('data-label', label);
      const isAction = /accion|acción|opciones|editar|detalles/i.test(label);
      const hasCtrl = !!td.querySelector('button, input, select, textarea, a.btn, a[class*="btn"]');
      if (isAction) td.classList.add('cell-actions');
      else if (hasCtrl) td.classList.add('cell-ctrl');
      else td.classList.remove('cell-actions', 'cell-ctrl');
    });
  });
}

function tableCardsScan() {
  if (window.innerWidth > 640) return;
  document.querySelectorAll('table').forEach(tableCardsApply);
}

function tableCardsInit() {
  window.addEventListener('resize', () => {
    clearTimeout(tableCardsTimer);
    tableCardsTimer = setTimeout(() => {
      if (window.innerWidth <= 640) tableCardsScan();
    }, 200);
  });
  if (document.body && !tableCardsObserver) {
    tableCardsObserver = new MutationObserver(() => {
      clearTimeout(tableCardsTimer);
      tableCardsTimer = setTimeout(tableCardsScan, 150);
    });
    tableCardsObserver.observe(document.body, { childList: true, subtree: true });
  }
  tableCardsScan();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tableCardsInit);
} else {
  tableCardsInit();
}

// ============================================
// NAV MÓVIL: hamburguesa para desplegar módulos/usuario
// En pantallas <= 640px el topnav queda colapsado
// tras el botón hamburguesa; se inyecta el botón
// y se alterna la clase .open sobre .topnav.
// ============================================

function mobileNavInit() {
  const nav = document.querySelector('.topnav');
  if (!nav || nav.querySelector('.topnav-toggle')) return;

  const btn = document.createElement('button');
  btn.className = 'topnav-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Abrir menú');
  btn.title = 'Menú';
  btn.innerHTML = '<span></span><span></span><span></span>';
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
  });
  nav.appendChild(btn);

  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target)) {
      nav.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 640 && nav.classList.contains('open')) {
      nav.classList.remove('open');
      btn.classList.remove('open');
    }
  });
}

// ============================================
// TOOLS MÓVIL: si hay más de 4 herramientas, la
// 5ª posición es un botón "•••" que abre un menú
// con las restantes. Solo aplica en <= 640px.
// ============================================

function mobilePanelMore() {
  var panel = document.querySelector('.module-panel');
  var btn = panel ? panel.querySelector('.panel-more-btn') : null;
  var popup = document.getElementById('panelMorePopup');
  var isMobile = window.innerWidth <= 640;

  function closePopup() {
    if (popup) popup.classList.remove('show');
  }

  function rebuild() {
    closePopup();
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    btn = null;
    popup = null;
    if (panel) panel.classList.remove('panel-more');

    if (!panel || !isMobile) return;

    var items = Array.prototype.slice.call(panel.querySelectorAll(':scope > .panel-item'));
    if (items.length <= 4) return;

    panel.classList.add('panel-more');
    items.forEach(function (el, i) {
      el.classList.toggle('panel-more-hidden', i >= 4);
    });

    btn = document.createElement('div');
    btn.className = 'panel-item panel-more-btn';
    btn.title = 'Más herramientas';
    btn.setAttribute('aria-label', 'Más herramientas');
    btn.innerHTML = '<span class="panel-more-dots">&#8226;&#8226;&#8226;</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (popup) {
        popup.querySelectorAll('.panel-more-item').forEach(function (b) {
          var on = panel.querySelector('.panel-item.active[data-tool="' + b.getAttribute('data-tool') + '"]');
          b.classList.toggle('active', !!on);
        });
        popup.classList.toggle('show');
      }
    });
    panel.appendChild(btn);

    popup = document.createElement('div');
    popup.id = 'panelMorePopup';
    popup.className = 'panel-more-popup';
    document.body.appendChild(popup);
    items.slice(4).forEach(function (el) {
      var name = el.getAttribute('data-tool');
      var label = el.getAttribute('title') || name;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'panel-more-item';
      b.textContent = label;
      b.setAttribute('data-tool', name);
      b.addEventListener('click', function () {
        var target = panel.querySelector('.panel-item[data-tool="' + name + '"]');
        if (target) target.click();
        closePopup();
      });
      popup.appendChild(b);
    });
  }

  document.addEventListener('click', function (e) {
    if (popup && popup.classList.contains('show') && !popup.contains(e.target) && !(btn && btn.contains(e.target))) {
      closePopup();
    }
  });

  window.addEventListener('resize', rebuild);
  rebuild();
}

// ============================================
// ICONOS EN BOTONES (global)
// Los botones con texto de acción se muestran
// solo con icono; el texto original queda en
// title/aria-label para accesibilidad.
// ============================================

const UI_ICON_EXACT = {
  'cerrar sesion': 'fi-sr-sign-out-alt',
  'detalles del modulo': 'fi-sr-info',
  'crear y abrir recorrido': 'fi-sr-route',
  'personal activo': 'fi-sr-users-alt',
  'movimientos': 'fi-sr-exchange-alt',
  'entrada': 'fi-sr-arrow-down-to-square',
  'salida': 'fi-sr-arrow-up-from-square',
  'ingreso': 'fi-sr-arrow-down-to-square',
  'equipos': 'fi-sr-computer',
  'licencias': 'fi-sr-license',
  'inventario': 'fi-sr-boxes',
  'stock': 'fi-sr-box',
  'ventas': 'fi-sr-chart-line-up',
  'whatsapp': 'fi-sr-comment',
  'correo': 'fi-sr-envelope',
  'cronograma': 'fi-sr-calendar-lines',
  'carpetas': 'fi-sr-folder',
  'documentacion': 'fi-sr-document',
  'configuracion': 'fi-sr-settings',
  'configurar cuenta': 'fi-sr-settings',
  'entregas': 'fi-sr-box-open',
  'consumibles': 'fi-sr-package',
  'asignaciones': 'fi-sr-clipboard-list',
  'carga familiar': 'fi-sr-users',
  'accesos': 'fi-sr-key',
  'perfiles': 'fi-sr-user',
  'cuentas': 'fi-sr-credit-card',
  'solicitudes': 'fi-sr-inbox',
  'historial': 'fi-sr-clock',
  'historico': 'fi-sr-clock',
  'datos': 'fi-sr-database',
  'detallado': 'fi-sr-list',
  'consolidado': 'fi-sr-chart-histogram',
  'horas por trabajador': 'fi-sr-clock',
  'vacantes pendientes': 'fi-sr-briefcase',
  'solo usd': 'fi-sr-dollar',
  'solo bs': 'fi-sr-money-bill-simple',
  'completa bs usd': 'fi-sr-coins',
  'si continuar': 'fi-sr-check',
  'tabla': 'fi-sr-table',
  'cuadricula': 'fi-sr-grid',
  'lista': 'fi-sr-list',
  'kanban': 'fi-sr-square-kanban',
  'exportar excel': 'fi-sr-file-excel',
  'exportar pdf': 'fi-sr-file-pdf',
  'importar csv': 'fi-sr-file-csv',
  'descargar plantilla excel': 'fi-sr-file-excel',
  'descargar pdf': 'fi-sr-file-pdf',
  'adjuntar contrato firmado': 'fi-sr-paperclip-vertical',
  'enrolar trabajador': 'fi-sr-fingerprint',
  'registrar huella': 'fi-sr-fingerprint',
  'seleccionar trabajadores': 'fi-sr-list-check',
  'seleccionar cursos': 'fi-sr-list-check',
  'aplicar seleccion': 'fi-sr-check-double',
  'aplicar a toda la estructura': 'fi-sr-check-double',
  'seleccionar foto': 'fi-sr-picture',
  'capturar frente': 'fi-sr-face-viewfinder',
  'ver como trabajador': 'fi-sr-eye',
  'ver stock': 'fi-sr-eye',
  'calcular liquidacion': 'fi-sr-calculator',
  'consultar tasa bcv': 'fi-sr-calculator',
  'probar conexion': 'fi-sr-link',
  'probar notificacion': 'fi-sr-bell',
  'cambiar estado': 'fi-sr-exchange-alt',
  'cambiar foto de perfil': 'fi-sr-camera',
  'confirmar ingreso': 'fi-sr-check',
  'confirmar descarte': 'fi-sr-check',
  'confirmar rechazo': 'fi-sr-check',
  'finalizar evaluacion': 'fi-sr-check-circle',
  'redactar': 'fi-sr-pen-fancy',
  'restablecer valores': 'fi-sr-rotate-left',
  'volver a plantilla': 'fi-sr-arrow-left',
  'volver a cursos': 'fi-sr-arrow-left',
  'contrato firmado': 'fi-sr-file-signature',
  'informacion sensible': 'fi-sr-shield-exclamation',
  'catalogo de equipos y vehiculos': 'fi-sr-car',
};

const UI_ICON_RULES = [
  [/^x+$/, 'fi-sr-x'],
  [/cerrar sesion/, 'fi-sr-sign-out-alt'],
  [/adjuntar/, 'fi-sr-paperclip-vertical'],
  [/registrar (entrada|ingreso)$|^entrada$|^ingreso$/, 'fi-sr-arrow-down-to-square'],
  [/registrar salida$|^salida$/, 'fi-sr-arrow-up-from-square'],
  [/eliminar|borrar|descartar/, 'fi-sr-trash'],
  [/devolver/, 'fi-sr-undo'],
  [/quitar/, 'fi-sr-minus'],
  [/restaurar|restablecer/, 'fi-sr-trash-restore'],
  [/limpiar/, 'fi-sr-broom'],
  [/editar|corregir|modificar/, 'fi-sr-pencil'],
  [/imprimir/, 'fi-sr-print'],
  [/importar/, 'fi-sr-file-import'],
  [/exportar|descargar/, 'fi-sr-file-export'],
  [/subir/, 'fi-sr-upload'],
  [/copiar/, 'fi-sr-copy'],
  [/enviar/, 'fi-sr-paper-plane'],
  [/responder/, 'fi-sr-reply-all'],
  [/cancelar/, 'fi-sr-x'],
  [/pagar|pago/, 'fi-sr-credit-card'],
  [/guardar/, 'fi-sr-disk'],
  [/registrar/, 'fi-sr-plus'],
  [/nuev[oa]|agregar|crear|añadir/, 'fi-sr-plus'],
  [/incidente/, 'fi-sr-alarm-exclamation'],
  [/cambiar estado/, 'fi-sr-exchange-alt'],
  [/cambiar foto|capturar/, 'fi-sr-camera'],
  [/seleccionar/, 'fi-sr-list-check'],
  [/aplicar/, 'fi-sr-check-double'],
  [/confirmar|aceptar|finalizar/, 'fi-sr-check'],
  [/reintentar|actualizar|repetir/, 'fi-sr-rotate-right'],
  [/calcular|consultar/, 'fi-sr-calculator'],
  [/probar/, 'fi-sr-link'],
  [/enrolar|huella/, 'fi-sr-fingerprint'],
  [/ver/, 'fi-sr-eye'],
  [/volver|anterior/, 'fi-sr-arrow-left'],
  [/siguiente/, 'fi-sr-arrow-right'],
  [/configurar|configuracion/, 'fi-sr-settings'],
  [/cerrar/, 'fi-sr-circle-xmark'],
];

function uiNormText(t) {
  return String(t || '')
    .replace(/[\u00d7\u2715\u2716]/g, 'x')
    .replace(/[\u00ab\u00bb\u2039\u203a\u25c0\u25b6]/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uiBtnLabel(btn) {
  return String(btn.textContent || '').replace(/\s+/g, ' ').trim();
}

function uiIconFor(text) {
  const norm = uiNormText(text);
  if (!norm) return null;
  if (UI_ICON_EXACT[norm]) return UI_ICON_EXACT[norm];
  for (let i = 0; i < UI_ICON_RULES.length; i++) {
    if (UI_ICON_RULES[i][0].test(norm)) return UI_ICON_RULES[i][1];
  }
  return null;
}

function uiIconButtons() {
  document.querySelectorAll('button').forEach((btn) => {
    if (btn.dataset.uiIcon === '1') return;
    if (btn.classList.contains('topnav-toggle')) {
      btn.dataset.uiIcon = '1';
      return;
    }
    if (btn.closest('.rich-toolbar') || btn.classList.contains('filter-toggle-btn')) {
      btn.dataset.uiIcon = '1';
      return;
    }

    const label = uiBtnLabel(btn);
    if (!label) return;

    const textSpan = '<span class="btn-text">' + uiEscape(label) + '</span>';
    const existingIcon = btn.querySelector('i.fi');

    if (existingIcon) {
      Array.from(btn.childNodes).forEach((n) => {
        if (n !== existingIcon && !(n.nodeType === 3 && n.textContent.trim() === '')) {
          btn.removeChild(n);
        }
      });
      if (!btn.hasAttribute('title')) btn.title = label;
      if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', label);
      btn.classList.add('ui-icon-btn');
      btn.insertAdjacentHTML('beforeend', textSpan);
      btn.dataset.uiIcon = '1';
      return;
    }

    const icon = uiIconFor(label);
    if (!icon) return;
    if (!btn.hasAttribute('title')) btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = '<i class="fi ' + icon + '" style="pointer-events:none;line-height:1;"></i>' + textSpan;
    btn.classList.add('ui-icon-btn');
    btn.dataset.uiIcon = '1';
  });
}

// ============================================
// FILTROS COLAPSABLES (global)
// Los controles de búsqueda/filtro de cada
// toolbar se ocultan tras un botón de filtro
// con icono; al hacer clic se despliegan.
// ============================================

function uiIsFilterControl(el) {
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = String(el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'date' || type === 'checkbox' || type === 'radio' || type === 'search') return true;
    const ph = String(el.getAttribute('placeholder') || '');
    if (/buscar|filtrar|filtro|busca/i.test(ph)) return true;
    const handlers = ['oninput', 'onkeyup', 'onkeydown', 'onchange']
      .map((a) => String(el.getAttribute(a) || ''))
      .join(' ');
    if (/filtr|filter|buscar|render|search/i.test(handlers)) return true;
    const id = String(el.getAttribute('id') || '');
    return /buscar|filtr|search|busq|filtro/i.test(id);
  }
  if (tag === 'SELECT') return true;
  if (tag === 'BUTTON') {
    return /buscar|filtrar|limpiar/i.test(el.textContent || '');
  }
  if (tag === 'DIV' && el.classList.contains('form-group')) {
    const hasFilter = el.querySelector('input, select');
    const hasAction = el.querySelector('button, a[class*="btn"]');
    return !!hasFilter && !hasAction;
  }
  return false;
}

function uiFilterCollapse() {
  document.querySelectorAll('.toolbar-content, .gu-filters, .mail-toolbar').forEach((container) => {
    if (container.dataset.uiFilters === '1') return;
    container.dataset.uiFilters = '1';

    const panel = document.createElement('div');
    panel.className = 'filter-collapse';
    let moved = 0;

    Array.from(container.children).forEach((child) => {
      if (uiIsFilterControl(child)) {
        panel.appendChild(child);
        moved++;
      } else if (child.classList && child.classList.contains('mail-toolbar')) {
        Array.from(child.children).forEach((gc) => {
          if (gc.tagName === 'INPUT' || gc.tagName === 'SELECT') {
            panel.appendChild(gc);
            moved++;
          }
        });
      }
    });

    if (!moved) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-outline ui-icon-btn filter-toggle-btn';
    toggle.title = 'Filtros';
    toggle.setAttribute('aria-label', 'Filtros');
    toggle.innerHTML = '<i class="fi fi-sr-filter" style="pointer-events:none;line-height:1;"></i>';

    const updateActive = function () {
      const has = Array.prototype.some.call(panel.querySelectorAll('input, select'), (el) => {
        return el.value && String(el.value).trim() !== '';
      });
      toggle.classList.toggle('has-value', has);
    };
    panel.addEventListener('input', updateActive);
    panel.addEventListener('change', updateActive);
    updateActive();

    toggle.addEventListener('click', function () {
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('active', open);
    });

    container.insertBefore(toggle, container.firstChild);
    container.appendChild(panel);
  });
}

// ============================================
// SCAN GLOBAL: aplica iconos y filtros a
// contenido estático y dinámico (MutationObserver)
// ============================================

let uiGlobalTimer = null;

function uiGlobalScan() {
  clearTimeout(uiGlobalTimer);
  uiGlobalTimer = setTimeout(() => {
    uiFilterCollapse();
    uiIconButtons();
  }, 80);
}

function uiGlobalInit() {
  uiGlobalScan();
  if (document.body && !document.body.__uiGlobalObserver) {
    document.body.__uiGlobalObserver = new MutationObserver(uiGlobalScan);
    document.body.__uiGlobalObserver.observe(document.body, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mobileNavInit();
    mobilePanelMore();
    uiGlobalInit();
  });
} else {
  mobileNavInit();
  mobilePanelMore();
  uiGlobalInit();
}

// ============================================
// CACHE DE CONSULTAS (datos maestros)
// cachedGet evita repetir la misma consulta a
// datos maestros (unidades, cargos) durante la
// ventana TTL. cachedGetInvalidate limpia la
// caché tras una escritura para ver los cambios
// de inmediato en los demás módulos/herramientas.
// ============================================

const uiCacheStore = {};
const UI_CACHE_TTL_MS = 30000;

async function cachedGet(key, loader) {
  const now = Date.now();
  const hit = uiCacheStore[key];
  if (hit && now - hit.ts < UI_CACHE_TTL_MS) return hit.data;
  const res = await loader();
  uiCacheStore[key] = { ts: now, data: res };
  return res;
}

function cachedGetInvalidate(prefix) {
  const keys = Object.keys(uiCacheStore);
  for (let i = 0; i < keys.length; i++) {
    if (!prefix || keys[i].indexOf(prefix) === 0) delete uiCacheStore[keys[i]];
  }
}
