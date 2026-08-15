// ============================================
// CHECK AL RETIRAR UN TRABAJADOR
// Bloquea el retiro si el trabajador tiene activos asignados (rl_asignaciones 'Activa')
// o información sensible pendiente de entrega (rl_info_sensible 'Pendiente').
// ============================================

async function obtenerPendientesAlRetirar(trabajadorId) {
  var equipos = [];
  var sensibles = [];
  var sensError = null;
  try {
    var r1 = await supabaseClient
      .from('rl_asignaciones')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .eq('estado', 'Activa');
    if (!r1.error) equipos = r1.data || [];

    var r2 = await supabaseClient
      .from('rl_info_sensible')
      .select('*')
      .eq('trabajador_id', trabajadorId)
      .eq('estado', 'Pendiente');
    if (!r2.error) sensibles = r2.data || [];
    else sensError = r2.error.message;
  } catch (e) { /* noop */ }
  return { equipos: equipos, sensibles: sensibles, sensError: sensError };
}

async function alertarPendientesAlRetirar(trabajadorId) {
  var p = await obtenerPendientesAlRetirar(trabajadorId);
  if (!p.equipos.length && !p.sensibles.length) return true;

  var html = '<div style="text-align:left;font-size:13.5px;line-height:1.6;">';
  html += '<p style="margin:0 0 12px;"><b>No se puede retirar al trabajador mientras tenga pendientes:</b></p>';

  if (p.equipos.length) {
    var eqMap = {};
    var vehMap = {};
    try {
      var re = await supabaseClient.from('ti_equipos').select('*');
      if (!re.error) (re.data || []).forEach(function(e) { eqMap[e.id] = e; });
      var rv = await supabaseClient.from('rl_equipos').select('*');
      if (!rv.error) (rv.data || []).forEach(function(v) { vehMap[v.id] = v; });
    } catch (e) { /* noop */ }
    html += '<p style="margin:0 0 4px;font-weight:700;">Activos de la empresa asignados (' + p.equipos.length + '):</p><ul style="margin:0 0 12px;padding-left:18px;">';
    p.equipos.forEach(function(a) {
      var e = a.vehiculo_id ? vehMap[a.vehiculo_id] : eqMap[a.equipo_id];
      var nombre = e ? (e.descripcion || e.nombre || e.tipo || 'Equipo') + (e.marca ? ' — ' + e.marca : '') + (e.modelo ? ' ' + e.modelo : '') : ((a.vehiculo_id ? 'Vehículo #' + a.vehiculo_id : 'Equipo #' + a.equipo_id));
      html += '<li>' + nombre + ' <span style="color:#b45309;">(asignado ' + (a.fecha_asignacion || '-') + ')</span></li>';
    });
    html += '</ul>';
  }

  if (p.sensibles.length) {
    html += '<p style="margin:0 0 4px;font-weight:700;">Información sensible pendiente de entrega (' + p.sensibles.length + '):</p><ul style="margin:0 0 12px;padding-left:18px;">';
    p.sensibles.forEach(function(s) {
      html += '<li>' + (s.descripcion || 'Sin descripción') + ' <span style="color:#b45309;">(' + (s.tipo || 'Otro') + (s.usuario ? ' — usuario ' + s.usuario : '') + ')</span></li>';
    });
    html += '</ul>';
  }

  if (p.sensError) {
    html += '<p style="margin:0 0 12px;color:#dc2626;font-weight:700;">No se pudo leer la información sensible: ' + p.sensError + '</p>';
  }

  html += '<p style="margin:0;color:var(--color-text-secondary, #555);">Debes registrar la devolución de los activos y la entrega de la información sensible antes de retirar al trabajador.</p>';
  html += '</div>';

  if (typeof uiDialogOpen === 'function') {
    var color = (typeof uiModuleColor === 'function') ? uiModuleColor() : 'var(--color-text)';
    uiDialogOpen('warning', html, '<button class="btn" style="background:' + color + '" onclick="uiDialogDismiss()">Entendido</button>', { html: true });
  } else if (typeof showAlert === 'function') {
    showAlert('El trabajador tiene pendientes: devolución de activos e información sensible.', 'warning');
  }
  return false;
}

window.alertarPendientesAlRetirar = alertarPendientesAlRetirar;
window.obtenerPendientesAlRetirar = obtenerPendientesAlRetirar;
