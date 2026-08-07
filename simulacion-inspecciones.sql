-- ============================================================
-- SIMULACIÓN: INSPECCIONES DE SEGURIDAD Y SALUD EN EL TRABAJO
-- (seguridad_inspecciones + seguridad_inspeccion_items)
-- del módulo Seguridad y Salud Laboral -> "Inspecciones".
-- Crea 4 inspecciones (2 Finalizadas, 1 En curso, 1 Borrador)
-- con items del checklist LOPCYMAT del módulo, resultados y
-- observaciones. El resultado final replica la regla del módulo:
-- "No conforme" si hay al menos un item No conforme.
-- Idempotente: no duplica inspecciones cuyo título empieza por
-- 'SIM:'.
-- ============================================================

-- 1) Encabezados de las inspecciones
WITH nuevas AS (
  INSERT INTO seguridad_inspecciones
    (titulo, tipo, area, ubicacion, inspector, participantes, fecha, hora,
     estado, resultado, recomendaciones)
  SELECT s.titulo, s.tipo, s.area, s.ubicacion, s.inspector, s.participantes,
         (CURRENT_DATE - (s.dias || ' days')::interval)::date,
         s.hora::time,
         s.estado, s.resultado, s.recomendaciones
  FROM (VALUES
    ('SIM: Inspección rutinaria de seguridad - Patio de recepción',
     'Rutinaria', 'Patio de recepción y distribución de vehículos', 'Sede principal',
     'Ing. Jorge Salas', 'Delegado de prevención, brigadistas',
     3, '08:30', 'Finalizada', 'Conforme',
     'Mantener la periodicidad mensual de las inspecciones y registrar los resultados en el formato establecido.'),
    ('SIM: Inspección planificada de condiciones - Almacén central',
     'Planificada', 'Almacén central', 'Nave 2 - área de repuestos',
     'Ing. Jorge Salas', 'Supervisor de almacén, delegado de prevención',
     10, '09:15', 'Finalizada', 'No conforme',
     'Reposición inmediata de extintores vencidos, corregir almacenamiento de combustibles e instalar señalización en el área de carga de baterías.'),
    ('SIM: Inspección especial de riesgo eléctrico - Sala de cómputo',
     'Especial', 'Sala de cómputo y tableros eléctricos', 'Edificio administrativo',
     'Ing. Mariela Rojas', 'Supervisor de mantenimiento',
     2, '10:00', 'En curso', NULL, NULL),
    ('SIM: Inspección de estacionamiento de vehículos nuevos',
     'No planificada', 'Patio de estacionamiento', 'Sector norte',
     'Ing. Jorge Salas', 'Jefe de patio',
     1, '14:00', 'Borrador', NULL, NULL)
  ) AS s(titulo, tipo, area, ubicacion, inspector, participantes, dias, hora,
         estado, resultado, recomendaciones)
  WHERE NOT EXISTS (
    SELECT 1 FROM seguridad_inspecciones x WHERE x.titulo LIKE 'SIM:%'
  )
  RETURNING id, titulo
)
SELECT * FROM nuevas;

-- 2) Items de la inspección 1 (rutinaria patio) -> Conforme
WITH insp AS (
  SELECT id, titulo FROM seguridad_inspecciones WHERE titulo LIKE 'SIM:%'
)
INSERT INTO seguridad_inspeccion_items
  (inspeccion_id, categoria, item, criterio, resultado, observacion, orden)
SELECT
  insp.id, s.categoria, s.item, s.criterio, s.resultado, s.observacion, s.orden
FROM insp
JOIN (VALUES
  (0, 'Organización del Sistema de Seguridad y Salud en el Trabajo',
   'Programa de Seguridad y Salud en el Trabajo (PSST) actualizado y aprobado',
   'Art. 56 LOPCYMAT · NT-01-2008 INPSASEL', 'Conforme', NULL, 1),
  (0, 'Organización del Sistema de Seguridad y Salud en el Trabajo',
   'Comité de Seguridad y Salud Laboral (CSSL) constituido y sesionando',
   'Art. 46-49 LOPCYMAT', 'Conforme', NULL, 2),
  (0, 'Condiciones de los puestos de trabajo',
   'Pasillos, corredores y vías de circulación despejados y en buen estado',
   'Art. 59-60 LOPCYMAT · COVENIN 474', 'Conforme', NULL, 3),
  (0, 'Patio de recepción y distribución de vehículos',
   'Delimitación y señalización de rutas peatonales vs. vehiculares',
   'Art. 59-60 LOPCYMAT · señalización de tránsito', 'Conforme',
   'Pintura de demarcación reciente', 4),
  (0, 'Patio de recepción y distribución de vehículos',
   'Vehículos asegurados: freno de mano, posición neutra y llaves custodiadas',
   'Buenas prácticas de patio de vehículos', 'Conforme', NULL, 5),
  (0, 'Prevención y protección contra incendios',
   'Extintores visibles, accesibles y con fecha de recarga vigente',
   'COVENIN 1040 · Art. 59 LOPCYMAT', 'N/A', NULL, 6),
  (0, 'Equipos de protección personal',
   'Dotación de EPP según riesgo: casco, calzado, guantes, uniforme',
   'Art. 51, 60 LOPCYMAT · COVENIN 2237', 'Conforme',
   'Todo el personal de patio con EPP completo', 7),
  (0, 'Servicios de salud en el trabajo',
   'Botiquín de primeros auxilios completo y con insumos vigentes',
   'COVENIN 2237 · Art. 39 LOPCYMAT', 'Conforme', NULL, 8)
) AS s(grp, categoria, item, criterio, resultado, observacion, orden)
  ON s.grp = 0 AND insp.titulo LIKE '%Patio de recepción%'
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inspeccion_items x
  WHERE x.inspeccion_id = insp.id AND x.item = s.item
);

-- 3) Items de la inspección 2 (almacén) -> No conforme
WITH insp AS (
  SELECT id, titulo FROM seguridad_inspecciones WHERE titulo LIKE 'SIM:%'
)
INSERT INTO seguridad_inspeccion_items
  (inspeccion_id, categoria, item, criterio, resultado, observacion, orden)
SELECT
  insp.id, s.categoria, s.item, s.criterio, s.resultado, s.observacion, s.orden
FROM insp
JOIN (VALUES
  (0, 'Condiciones de los puestos de trabajo',
   'Orden y limpieza general en todas las áreas',
   'Art. 60 LOPCYMAT', 'Conforme', NULL, 1),
  (0, 'Condiciones de los puestos de trabajo',
   'Escaleras, rampas y barandas en buen estado con pasamanos',
   'COVENIN 487 · Art. 60 LOPCYMAT', 'Conforme', NULL, 2),
  (0, 'Condiciones de los puestos de trabajo',
   'Señalización de seguridad conforme a colores y rótulos',
   'COVENIN 187 · Art. 59 LOPCYMAT', 'No conforme',
   'Rótulos de altura y cargas ausentes en estanterías', 3),
  (0, 'Prevención y protección contra incendios',
   'Extintores visibles, accesibles y con fecha de recarga vigente',
   'COVENIN 1040 · Art. 59 LOPCYMAT', 'No conforme',
   'Extintores sin recarga (fecha vencida)', 4),
  (0, 'Prevención y protección contra incendios',
   'Almacenamiento de combustibles e inflamables en áreas seguras',
   'COVENIN 1041 · Art. 60 LOPCYMAT', 'No conforme',
   'Combustibles próximos a materiales combustibles', 5),
  (0, 'Equipos de protección personal',
   'Uso efectivo del EPP por parte de los trabajadores',
   'Art. 54, 60 LOPCYMAT', 'Conforme', NULL, 6),
  (0, 'Manejo manual de materiales y equipos',
   'Uso de patines, transpaletas y gatos en buen estado',
   'Art. 60 LOPCYMAT', 'Conforme',
   'Transpaletas operativas', 7),
  (0, 'Riesgos eléctricos y baterías',
   'Zona de carga y almacenamiento de baterías ventilada y señalizada',
   'Riesgo específico: distribución de vehículos', 'No conforme',
   'Área sin señalización de riesgo de baterías', 8),
  (0, 'Servicios de salud en el trabajo',
   'Registro de aptitud médica de los trabajadores',
   'COVENIN 2237 · Art. 41 LOPCYMAT', 'Conforme', NULL, 9)
) AS s(grp, categoria, item, criterio, resultado, observacion, orden)
  ON s.grp = 0 AND insp.titulo LIKE '%Almacén central%'
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inspeccion_items x
  WHERE x.inspeccion_id = insp.id AND x.item = s.item
);

-- 4) Items de la inspección 3 (riesgo eléctrico, En curso)
WITH insp AS (
  SELECT id, titulo FROM seguridad_inspecciones WHERE titulo LIKE 'SIM:%'
)
INSERT INTO seguridad_inspeccion_items
  (inspeccion_id, categoria, item, criterio, resultado, observacion, orden)
SELECT
  insp.id, s.categoria, s.item, s.criterio, s.resultado, s.observacion, s.orden
FROM insp
JOIN (VALUES
  (0, 'Condiciones de los puestos de trabajo',
   'Iluminación adecuada en puestos de trabajo y vías de circulación',
   'COVENIN 3149 · Art. 60 LOPCYMAT', 'Conforme', NULL, 1),
  (0, 'Riesgos eléctricos y baterías',
   'Tableros eléctricos cerrados, rotulados y con tapas',
   'COVENIN 2004 · Art. 60 LOPCYMAT', 'Conforme', NULL, 2),
  (0, 'Riesgos eléctricos y baterías',
   'Cables y extensiones en buen estado, sin empalmes improvisados',
   'COVENIN 2004', 'No conforme',
   'Extensión improvisada en rack de servidores', 3),
  (0, 'Riesgos eléctricos y baterías',
   'Tomas de corriente con puesta a tierra en oficinas y taller',
   'COVENIN 2004', 'Conforme', NULL, 4),
  (0, 'Prevención y protección contra incendios',
   'Sistema de detección y alarma de incendios operativo',
   'COVENIN 810 · NFPA 72', 'Conforme', NULL, 5),
  (0, 'Equipos de protección personal',
   'Chalecos reflectantes en patio y zonas de circulación vehicular',
   'COVENIN 2237', 'N/A', 'Área cerrada, sin circulación vehicular', 6)
) AS s(grp, categoria, item, criterio, resultado, observacion, orden)
  ON s.grp = 0 AND insp.titulo LIKE '%Riesgo eléctrico%'
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inspeccion_items x
  WHERE x.inspeccion_id = insp.id AND x.item = s.item
);

-- 5) Items de la inspección 4 (estacionamiento, Borrador: sin resultados aún)
WITH insp AS (
  SELECT id, titulo FROM seguridad_inspecciones WHERE titulo LIKE 'SIM:%'
)
INSERT INTO seguridad_inspeccion_items
  (inspeccion_id, categoria, item, criterio, resultado, observacion, orden)
SELECT
  insp.id, s.categoria, s.item, s.criterio, NULL, NULL, s.orden
FROM insp
JOIN (VALUES
  (0, 'Patio de recepción y distribución de vehículos',
   'Estacionamiento de vehículos nuevos demarcado, ordenado y estable',
   'Buenas prácticas de operaciones controladas', 1),
  (0, 'Patio de recepción y distribución de vehículos',
   'Límites de velocidad y sentido de circulación señalizados',
   'COVENIN 187 · normativa de tránsito', 2),
  (0, 'Patio de recepción y distribución de vehículos',
   'Superficie del patio sin baches, derrames de aceite o combustible',
   'Art. 60 LOPCYMAT · manejo de sustancias peligrosas', 3),
  (0, 'Patio de recepción y distribución de vehículos',
   'Espejos convexos y/o controles en cruces ciegos y esquinas',
   'Art. 59-60 LOPCYMAT', 4)
) AS s(grp, categoria, item, criterio, orden)
  ON s.grp = 0 AND insp.titulo LIKE '%Estacionamiento de vehículos nuevos%'
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inspeccion_items x
  WHERE x.inspeccion_id = insp.id AND x.item = s.item
);
