-- ============================================================
-- SIMULACIÓN: REGISTROS LABORALES (relaciones_registros)
-- Crea conceptos de ejemplo (si faltan) y registros laborales
-- para 8 trabajadores activos (2 a 5 registros cada uno,
-- según la longitud de su cédula).
-- Idempotente: no duplica trabajador+concepto existente.
-- ============================================================

-- 1) Conceptos de ejemplo (solo si no existen)
INSERT INTO rl_conceptos (nombre, descripcion)
SELECT c.nombre, c.descripcion
FROM (VALUES
  ('Contrato', 'Contrato de trabajo a tiempo indeterminado'),
  ('Vacaciones', 'Período de descanso anual remunerado'),
  ('Reposo médico', 'Ausencia por indicación del servicio médico'),
  ('Permiso', 'Ausencia justificada autorizada'),
  ('Novedad', 'Novedad administrativa del trabajador'),
  ('Advertencia', 'Llamada de atención disciplinaria')
) AS c(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM rl_conceptos x WHERE x.nombre = c.nombre);

-- 2) Registros laborales para 8 trabajadores activos
WITH trabajadores AS (
  SELECT id, nombres, apellidos, cedula
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
  ORDER BY nombres, apellidos
  LIMIT 8
)
INSERT INTO relaciones_registros (trabajador_id, trabajador, concepto_id, tipo, fecha, estado, descripcion)
SELECT
  t.id,
  trim(t.nombres || ' ' || t.apellidos),
  c.id,
  c.nombre,
  (CURRENT_DATE - (d.dias || ' days')::interval)::date,
  d.estado,
  d.descripcion
FROM trabajadores t
JOIN LATERAL (VALUES
  (1, 'Contrato',      380, 'Activo',    'Contrato de trabajo a tiempo indeterminado'),
  (2, 'Vacaciones',    200, 'Finalizado','Disfrute de vacaciones correspondientes al periodo 2025-2026'),
  (3, 'Reposo médico', 120, 'Finalizado','Reposo indicado por el servicio médico'),
  (4, 'Permiso',        60, 'Activo',    'Permiso personal autorizado por la gerencia'),
  (5, 'Novedad',        30, 'Activo',    'Actualización de datos personales'),
  (6, 'Advertencia',    15, 'Pendiente', 'Llamada de atención por inasistencias injustificadas')
) AS d(ord, concepto, dias, estado, descripcion)
ON d.ord <= 2 + mod(length(t.cedula), 4)
JOIN rl_conceptos c ON c.nombre = d.concepto
WHERE NOT EXISTS (
  SELECT 1 FROM relaciones_registros r
  WHERE r.trabajador_id = t.id AND r.concepto_id = c.id
);
