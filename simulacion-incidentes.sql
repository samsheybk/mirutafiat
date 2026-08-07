-- ============================================================
-- SIMULACIÓN: INCIDENTES DE SEGURIDAD Y SALUD EN EL TRABAJO
-- (seguridad_incidentes) del módulo Seguridad y Salud Laboral
-- -> "Incidentes".
-- Registra accidentes, incidentes y condiciones inseguras con
-- ubicación, fecha relativa a hoy, gravedad y estado, replicando
-- los valores que maneja el módulo.
-- Idempotente: no duplica filas cuya descripción empieza por
-- 'SIM:' en la misma ubicación y fecha.
-- ============================================================

INSERT INTO seguridad_incidentes (tipo, ubicacion, fecha, gravedad, estado, descripcion)
SELECT
  s.tipo, s.ubicacion,
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  s.gravedad, s.estado,
  'SIM: ' || s.descripcion
FROM (VALUES
  ('Accidente',           'Patio de recepción y distribución de vehículos',
   2, 'Media',   'Resuelto',
   'Trabajador sufrió caída leve al descender de una plataforma de inspección. Atención médica en sitio, sin lesión de consideración. Se corrigió el acceso a la plataforma.'),
  ('Incidente',           'Patio de estacionamiento de vehículos nuevos',
   5, 'Baja',    'En investigación',
   'Choque leve entre vehículo de traslado y estructura de estacionamiento durante maniobra. Sin lesionados, daños menores al parachoques. Se revisa protocolo de maniobras.'),
  ('Condición insegura',  'Almacén central',
   8, 'Media',   'Resuelto',
   'Extintores con fecha de recarga vencida y almacenamiento de combustibles próximo a materiales combustibles detectados en inspección. Se ordenó recarga inmediata y reubicación de inflamables.'),
  ('Accidente',           'Sala de cómputo',
   12, 'Baja',   'Resuelto',
   'Trabajador se cortó con el filo de un mueble en reparación. Curaciones en el servicio médico. Se solicitó lijado y recubrimiento del borde.'),
  ('Incidente',           'Patio de recepción y distribución de vehículos',
   15, 'Alta',   'En investigación',
   'Rodamiento de vehículo sin custodia de llaves durante descarga. Potencial de atropello. Se inició investigación con delegados de prevención y se suspendió la actividad hasta corregir el procedimiento.'),
  ('Condición insegura',  'Área de carga de baterías',
   20, 'Crítica', 'En investigación',
   'Zona de carga de baterías sin señalización y sin material neutralizante disponible. Riesgo de contacto con ácido. Se señalizó el área y se gestiona la dotación del kit neutralizante.'),
  ('Incidente',           'Oficinas administrativas',
   25, 'Baja',    'Reportado',
   'Cortocircuito menor en toma de corriente de oficina sin puesta a tierra. No hubo lesionados. Se reportó al supervisor de mantenimiento para corrección.'),
  ('Condición insegura',  'Rutas de evacuación',
   30, 'Media',   'Resuelto',
   'Salida de emergencia bloqueada por material de empaque. Se despejó el paso y se instruyó al personal de almacén sobre el mantenimiento de vías libres.'),
  ('Accidente',           'Patio de recepción y distribución de vehículos',
   45, 'Media',   'Resuelto',
   'Esfuerzo lumbar por levantamiento manual de pieza de repuesto sin uso de ayudas mecánicas. Atención en servicio médico y refuerzo de técnicas de levantamiento.'),
  ('Incidente',           'Almacén central',
   60, 'Baja',    'Resuelto',
   'Caída de caja desde estantería sin derrame. Se revisó el apilado y se reordenó la estantería. Capacitación sobre almacenamiento seguro.'),
  ('Condición insegura',  'Sala de cómputo',
   90, 'Media',   'Resuelto',
   'Cables y extensiones improvisadas en rack de servidores detectados en inspección eléctrica. Se reemplazaron por canalizaciones y tomas con puesta a tierra.'),
  ('Incidente',           'Oficinas administrativas',
   120, 'Baja',   'Resuelto',
   'Resbalón en pasillo húmedo por limpieza sin señalización. Sin lesiones. Se implementó señalización temporal durante tareas de limpieza.')
) AS s(tipo, ubicacion, dias, gravedad, estado, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_incidentes x
  WHERE x.tipo = s.tipo
    AND x.ubicacion = s.ubicacion
    AND x.fecha = (CURRENT_DATE - (s.dias || ' days')::interval)::date
    AND x.descripcion LIKE 'SIM:%'
);
