-- ============================================================
-- SIMULACIÓN: PÓLIZAS DE SEGURO (bienestar_poliza_tipos +
-- bienestar_poliza_trabajadores)
-- Crea 4 tipos de póliza de ejemplo y asigna trabajadores:
--   Salud/HCM  -> todos los trabajadores activos
--   Vida       -> todos los trabajadores activos
--   Accidentes -> trabajadores activos con cédula par
--   Vehículos  -> trabajadores activos con cédula impar
-- Requiere ejecutar antes supabase-migracion-polizas-trabajadores.sql
-- Idempotente: no duplica tipos ni asignaciones existentes.
-- ============================================================

-- 1) Tipos de póliza (solo si no existen)
INSERT INTO bienestar_poliza_tipos (nombre, proveedor, cobertura, descripcion, activo)
SELECT t.nombre, t.proveedor, t.cobertura, t.descripcion, TRUE
FROM (VALUES
  ('Salud (HCM)', 'Seguros La Previsora',
   'Hospitalización, cirugía y medicina (HCM) con red de clínicas.',
   'Cobertura médica principal de los trabajadores'),
  ('Vida', 'Seguros Caracas',
   'Indemnización por fallecimiento e incapacidad total.',
   'Póliza colectiva de vida del personal'),
  ('Accidentes personales', 'Seguros La Previsora',
   'Cobertura por accidentes dentro y fuera de la jornada.',
   'Póliza anual de accidentes personales'),
  ('Vehículos', 'Seguros Caracas',
   'Responsabilidad civil, colisión y pérdida total de vehículo.',
   'Póliza de flota para vehículos de la empresa')
) AS t(nombre, proveedor, cobertura, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM bienestar_poliza_tipos x WHERE x.nombre = t.nombre);

-- 2) Asignaciones: Salud y Vida para todos los activos
INSERT INTO bienestar_poliza_trabajadores (poliza_tipo_id, trabajador_id, fecha_inicio, estado)
SELECT t.id, w.id, (CURRENT_DATE - INTERVAL '6 months')::date, 'Activa'
FROM bienestar_poliza_tipos t
JOIN plantilla_trabajadores w
  ON w.estado = 'Activo'
  AND t.nombre IN ('Salud (HCM)', 'Vida')
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_poliza_trabajadores a
  WHERE a.poliza_tipo_id = t.id AND a.trabajador_id = w.id
);

-- 3) Accidentes personales: trabajadores con cédula par
INSERT INTO bienestar_poliza_trabajadores (poliza_tipo_id, trabajador_id, fecha_inicio, estado)
SELECT t.id, w.id, (CURRENT_DATE - INTERVAL '6 months')::date, 'Activa'
FROM bienestar_poliza_tipos t
JOIN plantilla_trabajadores w
  ON w.estado = 'Activo'
  AND t.nombre = 'Accidentes personales'
  AND mod(ascii(right(w.cedula, 1)), 2) = 0
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_poliza_trabajadores a
  WHERE a.poliza_tipo_id = t.id AND a.trabajador_id = w.id
);

-- 4) Vehículos: trabajadores con cédula impar
INSERT INTO bienestar_poliza_trabajadores (poliza_tipo_id, trabajador_id, fecha_inicio, estado)
SELECT t.id, w.id, (CURRENT_DATE - INTERVAL '3 months')::date, 'Activa'
FROM bienestar_poliza_tipos t
JOIN plantilla_trabajadores w
  ON w.estado = 'Activo'
  AND t.nombre = 'Vehículos'
  AND mod(ascii(right(w.cedula, 1)), 2) = 1
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_poliza_trabajadores a
  WHERE a.poliza_tipo_id = t.id AND a.trabajador_id = w.id
);
