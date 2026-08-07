-- ============================================================
-- SIMULACIÓN: SERVICIO MÉDICO (seguridad_servicio_medico)
-- del módulo Seguridad y Salud Laboral -> "Servicio médico".
-- Registra atenciones médicas a trabajadores activos (realmente
-- vinculadas a plantilla_trabajadores) y a candidatos de ATS,
-- con fechas relativas a hoy y todos los tipos de atención,
-- apreciaciones y estados que maneja el módulo.
-- Idempotente: no duplica atenciones marcadas con motivo 'SIM:'.
-- ============================================================

-- 1) Atenciones a trabajadores activos
WITH t AS (
  SELECT p.id AS trabajador_id,
         concat(p.nombres, ' ', p.apellidos) AS nombre,
         p.cedula,
         c.titulo AS cargo,
         u.nombre AS unidad,
         row_number() OVER (ORDER BY p.fecha_ingreso DESC, p.nombres) AS rn
  FROM plantilla_trabajadores p
  LEFT JOIN est_cargos c ON c.id = p.cargo_id
  LEFT JOIN est_unidades u ON u.id = p.unidad_id
  WHERE p.estado = 'Activo'
)
INSERT INTO seguridad_servicio_medico
  (fecha, hora, tipo_paciente, trabajador_id, cedula, nombre, cargo, unidad,
   tipo_atencion, motivo, diagnostico, tratamiento, apreciacion,
   referido, referido_a, atiende, estado)
SELECT
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  s.hora::time,
  'Trabajador',
  t.trabajador_id, t.cedula, t.nombre, t.cargo, t.unidad,
  s.tipo_atencion, 'SIM: ' || s.motivo, s.diagnostico, s.tratamiento, s.apreciacion,
  s.referido, s.referido_a, s.atiende, s.estado
FROM t
JOIN (VALUES
  (1, 0,  '08:15', 'Consulta',                  'Cefalea leve',                    'Migraña tensional',                       'Analgésico y reposo',                  'Apto',                 FALSE, NULL,                        'Dra. Mendoza',    'Atendido'),
  (1, 2,  '14:30', 'Entrega de medicamento',    'Reposición de tratamiento',        'Control de tensión arterial',             'Antihipertensivo x 30 días',           'Apto',                 FALSE, NULL,                        'Dra. Mendoza',    'Atendido'),
  (2, 0,  '10:00', 'Curativo / Curas',          'Corte superficial en antebrazo',   'Herida contusa superficial',              'Curaciones cada 48 h',                 'Apto con restricciones', FALSE, NULL,   'Lic. Ramírez',    'Atendido'),
  (2, 7,  '09:00', 'Evaluación de seguimiento', 'Control de curación',              'Evolución favorable de herida',           'Continúa curaciones',                  'Apto con restricciones', FALSE, NULL,   'Lic. Ramírez',    'Atendido'),
  (3, 1,  '16:00', 'Emergencia',                'Dolor abdominal agudo',            'Presuntivo apendicitis',                  'Referido a observación',               NULL,                   TRUE, 'Clínica El Ávila', 'Dra. Mendoza', 'Referido'),
  (4, 0,  '08:45', 'Examen ocupacional',        'Ingreso del trabajador',           'Sin hallazgos patológicos',               'Evaluación integral normal',           'Apto',                 FALSE, NULL,                        'Dra. Mendoza',    'Cerrado'),
  (5, 0,  '11:20', 'Examen ocupacional',        'Evaluación periódica anual',        'Déficit auditivo leve bilateral',         'Referido a otorrinolaringología',      'Apto con restricciones', TRUE, 'Centro Audiológico C.A.', 'Dra. Mendoza', 'Referido'),
  (6, 3,  '09:40', 'Consulta',                  'Dolor lumbar por esfuerzo',         'Lumbalgia mecánica',                      'Antiinflamatorio + fisioterapia',      'En observación',       FALSE, NULL,                        'Lic. Ramírez',    'En observación'),
  (7, 5,  '15:10', 'Vacunación',                'Esquema de vacunación',            'Aplicación antigripal',                   'Observación 15 min post-vacuna',       'Apto',                 FALSE, NULL,                        'Lic. Ramírez',    'Atendido'),
  (8, 4,  '10:30', 'Otro',                      'Inducción en primeros auxilios',    'Trabajador sin hallazgos',                'Taller de RCP y DEA',                  'Apto',                 FALSE, NULL,                        'Ing. Seguridad',  'Cerrado')
) AS s(rn, dias, hora, tipo_atencion, motivo, diagnostico, tratamiento,
       apreciacion, referido, referido_a, atiende, estado)
  ON t.rn = s.rn
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_servicio_medico x
  WHERE x.tipo_paciente = 'Trabajador'
    AND x.trabajador_id = t.trabajador_id
    AND x.motivo LIKE 'SIM:%'
);

-- 2) Atenciones a candidatos del ATS
WITH c AS (
  SELECT id AS candidato_id,
         concat(nombres, ' ', apellidos) AS nombre,
         cedula,
         cargo_interes AS cargo,
         row_number() OVER (ORDER BY created_at, id) AS rn
  FROM ats_candidatos
  WHERE estado_kanban NOT IN ('Seleccionado')
)
INSERT INTO seguridad_servicio_medico
  (fecha, hora, tipo_paciente, candidato_id, cedula, nombre, cargo, unidad,
   tipo_atencion, motivo, diagnostico, tratamiento, apreciacion,
   referido, referido_a, atiende, estado)
SELECT
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  s.hora::time,
  'Candidato',
  c.candidato_id, c.cedula, c.nombre, c.cargo, 'Candidato en captación',
  s.tipo_atencion, 'SIM: ' || s.motivo, s.diagnostico, s.tratamiento, s.apreciacion,
  s.referido, s.referido_a, s.atiende, s.estado
FROM c
JOIN (VALUES
  (1, 1, '08:00', 'Examen ocupacional', 'Pre-ingreso del candidato', 'Sin hallazgos patológicos', 'Evaluación integral normal', 'Apto',   FALSE, NULL,                        'Dra. Mendoza', 'Atendido'),
  (2, 2, '09:30', 'Examen ocupacional', 'Pre-ingreso del candidato', 'Defecto visual no corregido', 'Referido a oftalmología',   'No apto', TRUE, 'Centro Oftalmológico',     'Dra. Mendoza', 'Referido'),
  (3, 6, '14:00', 'Consulta',           'Malestar general',          'Cuadro gripal leve',          'Sintomáticos y reposo',     'Apto',   FALSE, NULL,                        'Lic. Ramírez', 'Atendido')
) AS s(rn, dias, hora, tipo_atencion, motivo, diagnostico, tratamiento,
       apreciacion, referido, referido_a, atiende, estado)
  ON c.rn = s.rn
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_servicio_medico x
  WHERE x.tipo_paciente = 'Candidato'
    AND x.candidato_id = c.candidato_id
    AND x.motivo LIKE 'SIM:%'
);
