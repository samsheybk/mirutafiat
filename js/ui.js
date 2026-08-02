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

function uiDialogMarkup(type, message, buttons) {
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
            <p class="ui-dialog-message">${uiEscape(message)}</p>
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

function uiDialogOpen(type, message, buttons) {
  document.body.insertAdjacentHTML('beforeend', uiDialogMarkup(type, message, buttons));
  const overlay = document.getElementById('uiDialogOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) uiDialogDismiss(false);
  });
}

function showAlert(message, type) {
  uiDialogOpen(type || 'info', message, `
    <button class="btn" style="background:${uiModuleColor()}" onclick="uiDialogDismiss()">Aceptar</button>
  `);
}

function showConfirm(message, confirmText) {
  return new Promise(resolve => {
    uiDialogResolve = resolve;
    uiDialogOpen('warning', message, `
      <button class="btn btn-outline" onclick="uiDialogDismiss(false)">Cancelar</button>
      <button class="btn" style="background:${uiModuleColor()}" onclick="uiDialogDismiss(true)">${uiEscape(confirmText || 'Confirmar')}</button>
    `);
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
