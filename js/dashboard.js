async function loadModuleCounts() {
  try {
    const { count: captacionCount } = await supabaseClient
      .from('captacion_procesos')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-captacion').textContent = (captacionCount || 0) + ' procesos activos';
  } catch (_) {}

  try {
    const { count: relacionesCount } = await supabaseClient
      .from('relaciones_registros')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-relaciones').textContent = (relacionesCount || 0) + ' registros';
  } catch (_) {}

  try {
    const { count: capacitacionCount } = await supabaseClient
      .from('capacitacion_cursos')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-capacitacion').textContent = (capacitacionCount || 0) + ' cursos';
  } catch (_) {}

  try {
    const { count: bienestarCount } = await supabaseClient
      .from('bienestar_programas')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-bienestar').textContent = (bienestarCount || 0) + ' programas';
  } catch (_) {}

  try {
    const { count: seguridadCount } = await supabaseClient
      .from('seguridad_incidentes')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-seguridad').textContent = (seguridadCount || 0) + ' incidentes';
  } catch (_) {}

  try {
    const { count: compensacionCount } = await supabaseClient
      .from('compensacion_registros')
      .select('*', { count: 'exact', head: true });
    document.getElementById('count-compensacion').textContent = (compensacionCount || 0) + ' registros';
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadModuleCounts();
});
