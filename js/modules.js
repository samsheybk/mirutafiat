let currentModule = '';
let currentTable = '';
let currentFields = [];

function initModule(moduleName, tableName, fields) {
  currentModule = moduleName;
  currentTable = tableName;
  currentFields = fields;
  loadData();
  restoreTool();
}

function restoreTool() {
  const saved = localStorage.getItem('fiat_tool_' + location.pathname);
  if (saved && document.getElementById('tool-' + saved)) switchTool(saved);
}

function switchTool(name) {
  document.querySelectorAll('.panel-item').forEach(el => {
    el.classList.remove('active');
    // Reset icon color
    const icon = el.querySelector('i.fi, svg');
    if (icon) icon.style.color = '';
  });
  document.querySelectorAll('.tool-section').forEach(el => el.classList.remove('active'));
  const item = document.querySelector(`.panel-item[data-tool="${name}"]`);
  const section = document.getElementById(`tool-${name}`);
  if (item) item.classList.add('active');
  if (section) section.classList.add('active');
  document.querySelectorAll('.toolbar-content').forEach(el => {
    el.style.display = el.dataset.toolbar === name ? 'flex' : 'none';
  });
  
  // Apply module color to active panel icon
  const topnav = document.querySelector('.topnav');
  if (topnav && item) {
    const moduleColor = topnav.style.background || getComputedStyle(topnav).backgroundColor;
    const icon = item.querySelector('i.fi, svg');
    if (icon) {
      icon.style.color = moduleColor;
    }
  }
  
  localStorage.setItem('fiat_tool_' + location.pathname, name);
}

async function loadData() {
  const tbody = document.getElementById('moduleTableBody');
  if (!tbody) return;

  tbody.innerHTML = skeletonTableRows(currentFields.length + 2, 6);

  try {
    const { data, error } = await supabaseClient
      .from(currentTable)
      .select(currentFields.join(', ') || '*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#999;">No hay registros</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(row => {
      const cells = currentFields.map(f => {
        const val = row[f];
        if (f === 'estado') return `<td><span class="badge ${getBadgeClass(val)}">${val || '-'}</span></td>`;
        if (f.includes('salario') || f.includes('bonificacion')) return `<td>Bs. ${Number(val || 0).toLocaleString()}</td>`;
        if (f === 'vacantes') return `<td style="text-align:center;">${val || 0}</td>`;
        if (f === 'duracion') return `<td style="text-align:center;">${val || 0} h</td>`;
        return `<td>${val || '-'}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#dc2626;">Error al cargar datos</td></tr>';
  }
}

function getBadgeClass(estado) {
  const map = {
    'Abierto': 'badge-active',
    'Activo': 'badge-active',
    'Activa': 'badge-active',
    'Publicado': 'badge-active',
    'Publicada': 'badge-active',
    'Borrador': 'badge-pending',
    'Programado': 'badge-active',
    'En curso': 'badge-pending',
    'Pendiente': 'badge-pending',
    'En revisión': 'badge-pending',
    'En investigación': 'badge-pending',
    'Reportado': 'badge-pending',
    'Pagado': 'badge-active',
    'Completada': 'badge-active',
    'Pagada': 'badge-active',
    'Atrasada': 'badge-pending',
    'Registrado': 'badge-active',
    'Reembolsado': 'badge-pending',
    'Cancelado': 'badge-inactive',
    'Vencida': 'badge-inactive',
    'Archivada': 'badge-inactive',
    'Cerrada': 'badge-inactive',
    'Cerrado': 'badge-inactive',
    'Finalizado': 'badge-inactive',
    'Inactivo': 'badge-inactive',
    'Resuelto': 'badge-inactive',
    'Conforme': 'badge-active',
    'Disponible': 'badge-active',
    'Atendido': 'badge-active',
    'Apto': 'badge-active',
    'Borrador': 'badge-pending',
    'En curso': 'badge-pending',
    'En observación': 'badge-pending',
    'Bajo stock': 'badge-pending',
    'Por vencer': 'badge-pending',
    'Apto con restricciones': 'badge-pending',
    'Referido': 'badge-pending',
    'No conforme': 'badge-inactive',
    'Agotado': 'badge-inactive',
    'Vencido': 'badge-inactive',
    'No apto': 'badge-inactive',
    'Anulada': 'badge-inactive',
    'Anulado': 'badge-inactive',
    'Entregado': 'badge-active',
    'Devuelto': 'badge-inactive',
    'Dañado': 'badge-inactive',
  };
  return map[estado] || 'badge-pending';
}

function openModal() {
  document.getElementById('modal').classList.add('show');
  document.getElementById('moduleForm').reset();
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

async function saveModule() {
  const form = document.getElementById('moduleForm');
  const formData = new FormData(form);
  const payload = {};

  currentFields.forEach(f => {
    const el = document.getElementById(f);
    if (el) payload[f] = el.value;
  });

  if (!payload[currentFields[0]]) {
    showAlert('Completa los campos requeridos', 'warning');
    return;
  }

  try {
    const { error } = await supabaseClient.from(currentTable).insert([payload]);
    if (error) throw error;
    closeModal();
    loadData();
  } catch (err) {
    showAlert('Error al guardar: ' + err.message, 'error');
  }
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal();
  }
});
