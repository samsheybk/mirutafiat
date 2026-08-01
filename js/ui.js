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
// ESTADOS DE CARGA (tablas y contenedores)
// ============================================

function tableLoadingHTML(colspan) {
  return '<tr><td colspan="' + (colspan || 1) + '" style="text-align:center;padding:40px;">'
    + '<div class="spinner" style="margin:0 auto 12px;"></div>'
    + '<div style="font-size:13px;color:var(--color-text-secondary);">Cargando...</div>'
    + '</td></tr>';
}

function containerLoadingHTML() {
  return '<div class="empty-state"><div class="spinner" style="margin:0 auto 12px;"></div>'
    + '<div class="empty-state-text">Cargando...</div></div>';
}
