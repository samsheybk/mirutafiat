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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mobileNavInit);
} else {
  mobileNavInit();
}
