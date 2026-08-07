-- ============================================================
-- SIMULACIÓN: INVENTARIO DE EQUIPOS DE SEGURIDAD
-- (seguridad_inventario_equipos) del módulo Seguridad y Salud
-- Laboral -> "Inventario de equipos".
-- Incluye EPP, equipos de detección/extinción, señalización,
-- rescate y ergonómicos, con estado calculado con la misma
-- lógica del módulo (Vencido / Agotado / Bajo stock / Disponible)
-- y estados manuales como "En reparación".
-- Idempotente: no duplica filas con el mismo código.
-- ============================================================

INSERT INTO seguridad_inventario_equipos
  (nombre, tipo, marca, modelo, serial, codigo, cantidad, cantidad_minima,
   ubicacion, fecha_vencimiento, estado, observaciones)
SELECT
  s.nombre, s.tipo, s.marca, s.modelo, s.serial, s.codigo, s.cantidad, s.cantidad_minima,
  s.ubicacion,
  CASE WHEN s.dias_vencimiento IS NOT NULL
    THEN (CURRENT_DATE + (s.dias_vencimiento || ' days')::interval)::date
    ELSE NULL END,
  CASE
    WHEN s.manual_estado IS NOT NULL THEN s.manual_estado
    WHEN s.dias_vencimiento IS NOT NULL AND s.dias_vencimiento < 0 THEN 'Vencido'
    WHEN s.cantidad <= 0 THEN 'Agotado'
    WHEN s.cantidad_minima > 0 AND s.cantidad <= s.cantidad_minima THEN 'Bajo stock'
    ELSE 'Disponible'
  END,
  s.observaciones
FROM (VALUES
  ('Casco de seguridad',        'EPP',                          '3M',     'H-700',     '3M-H700-1187',   'EQ-001', 25,  10, 'Almacén central', NULL,   NULL,     'Con barbiquejo, norma COVENIN'),
  ('Casco con pantalla facial', 'EPP',                          '3M',     'V-GARD',    '3M-VG-0452',     'EQ-002', 3,   4,  'Almacén central', 90,    NULL,     'Stock mínimo, gestionar compra'),
  ('Gafas de seguridad',        'EPP',                          'UVEX',   'S3970',     'UVX-S3970-221',  'EQ-003', 42,  15, 'Almacén central', NULL,   NULL,     'Anti-impacto, anti-rayadura'),
  ('Arnés de seguridad',        'EPP',                          '3M',     'LWS',       '3M-LWS-0077',    'EQ-004', 12,  6,  'Almacén central', NULL,   NULL,     'Trabajos en altura, inspección mensual'),
  ('Arnés de seguridad',        'EPP',                          '3M',     'LWS',       '3M-LWS-0078',    'EQ-005', 1,   1,  'Almacén central', NULL,   'En reparación', 'Devolver a servicio tras revisión'),
  ('Botas dieléctricas',        'EPP',                          'BATA',   'COMFORT',   'BTA-DIE-0310',   'EQ-006', 8,   5,  'Almacén central', NULL,   NULL,     'Uso en áreas eléctricas'),
  ('Guantes dieléctricos 12 kV','EPP',                          'HONEYWELL','G500',    'HWL-G500-0082',  'EQ-007', 6,   4,  'Almacén central', 60,    NULL,     'Prueba dieléctrica anual'),
  ('Guantes de cuero',          'EPP',                          'MAPRO',  'M-250',     'MPR-M250-055',   'EQ-008', 0,   8,  'Almacén central', NULL,   NULL,     'Agotado, reposición urgente'),
  ('Mascarilla respiratoria N95','EPP',                         '3M',     '8210',      '3M-8210-996',    'EQ-009', 15,  15, 'Almacén central', NULL,   NULL,     'Último lote bajo mínimos'),
  ('Extintor ABC 12 kg',        'Detección y extinción de incendios', 'ABC', 'PQS-12', 'ABC-PQS-119',  'EQ-101', 18,  12, 'Distribuidos en planta', 30, NULL, 'Carga vigente, recarga a los 30 días'),
  ('Extintor CO2 5 kg',         'Detección y extinción de incendios', 'ABC', 'CO2-5',  'ABC-CO2-082',   'EQ-102', 4,   4,  'Sala de cómputo', 15,   NULL,     'Por vencer, recarga programada'),
  ('Extintor CO2 5 kg',         'Detección y extinción de incendios', 'ABC', 'CO2-5',  'ABC-CO2-083',   'EQ-103', 1,   2,  'Cuarto eléctrico', NULL, NULL,     'Retirar: recarga pendiente'),
  ('Detector de humo',          'Detección y extinción de incendios', 'SENSOR', 'SD-200', 'SNR-SD200-14', 'EQ-104', 20,  15, 'Todas las áreas', 120,   NULL,     'Prueba de batería semestral'),
  ('Manguera contra incendios', 'Detección y extinción de incendios', 'POLEMON', 'M-45',  'PLM-M45-003',  'EQ-105', 9,   6,  'Gabinetes de emergencia', NULL, NULL, 'Boquilla y racor en buen estado'),
  ('Señal de salida (fotoluminiscente)', 'Señalización',          'FIREX',  'EXIT-L',   'FRX-EXIT-221',   'EQ-201', 34,  20, 'Rutas de evacuación', NULL, NULL, 'Señalización vertical'),
  ('Señal de extintor',         'Señalización',                  'FIREX',  'EXT-S',    'FRX-EXT-067',    'EQ-202', 18,  12, 'Junto a extintores', NULL, NULL, 'Señalización vertical'),
  ('Cono de seguridad',         'Señalización',                  'GENÉRICO','C-50',     'GNR-C50-043',    'EQ-203', 12,  8,  'Áreas de trabajo', NULL,  NULL,     'Delimitación de áreas'),
  ('Camilla rígida',            'Rescate y emergencias',         'FERNOR', 'KED-SP',    'FRN-KED-001',    'EQ-301', 2,   1,  'Enfermería',      NULL,   NULL,     'Primeros auxilios'),
  ('Inmovilizador cervical',    'Rescate y emergencias',         'FERNOR', 'NEC-K',     'FRN-NEC-007',    'EQ-302', 4,   2,  'Enfermería',      NULL,   NULL,     'Kit de inmovilización'),
  ('Botiquín de emergencia',    'Rescate y emergencias',         'GENÉRICO','BE-1',     'GNR-BE1-118',    'EQ-303', 0,   3,  'Planta principal', NULL,  NULL,     'Agotado, reponer'),
  ('Tabla de rescate',          'Rescate y emergencias',         'FERNOR', 'TR-2',      'FRN-TR2-005',    'EQ-304', 2,   1,  'Enfermería',      NULL,   NULL,     'Rescate de espacios confinados'),
  ('Soporte lumbar (ergonómico)','Ergonómicos',                  'ERGOTEC','SL-01',     'ERT-SL01-023',   'EQ-401', 15,  10, 'Puestos de trabajo', NULL, NULL, 'Apoyo lumbar ajustable'),
  ('Reposamuñecas (ergonómico)', 'Ergonómicos',                  'ERGOTEC','RM-02',     'ERT-RM02-018',   'EQ-402', 22,  15, 'Puestos de trabajo', NULL, NULL, 'Para teclados')
) AS s(nombre, tipo, marca, modelo, serial, codigo, cantidad, cantidad_minima,
       ubicacion, dias_vencimiento, manual_estado, observaciones)
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inventario_equipos x
  WHERE COALESCE(x.codigo, '') = COALESCE(s.codigo, '')
);
