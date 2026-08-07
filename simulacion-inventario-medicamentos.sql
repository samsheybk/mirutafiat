-- ============================================================
-- SIMULACIÓN: INVENTARIO DE MEDICAMENTOS E INSUMOS (OBSOLETO)
-- (seguridad_inventario_insumos) del módulo Seguridad y Salud
-- Laboral -> "Inventario de insumos y medicamentos".
--
-- ⚠️ ESTE ARCHIVO YA NO DEBE EJECUTARSE POR SEPARADO.
-- Fue reemplazado por simulacion-movimientos-insumos.sql, que
-- limpia las tablas y registra entradas/salidas de forma que el
-- stock queda calculado como el neto de los movimientos.
-- ============================================================

INSERT INTO seguridad_inventario_insumos
  (nombre, tipo, presentacion, cantidad, cantidad_minima, lote,
   fecha_vencimiento, ubicacion, estado, observaciones)
SELECT
  s.nombre, s.tipo, s.presentacion, s.cantidad, s.cantidad_minima, s.lote,
  (CURRENT_DATE + (s.dias_vencimiento || ' days')::interval)::date,
  s.ubicacion,
  CASE
    WHEN s.dias_vencimiento < 0 THEN 'Vencido'
    WHEN s.dias_vencimiento <= 30 THEN 'Por vencer'
    WHEN s.cantidad <= 0 THEN 'Agotado'
    WHEN s.cantidad_minima > 0 AND s.cantidad <= s.cantidad_minima THEN 'Bajo stock'
    ELSE 'Disponible'
  END,
  s.observaciones
FROM (VALUES
  ('Paracetamol 500 mg',        'Medicamento',  'Frasco x 30 comprimidos', 15,  10, 'PAR24-118',  -8,  'Farmacia / Botiquín central',  'Analgésico y antipirético de uso general'),
  ('Ibuprofeno 400 mg',         'Medicamento',  'Frasco x 20 comprimidos', 4,   8,  'IBU24-220',  25,  'Farmacia / Botiquín central',  'Antiinflamatorio no esteroideo'),
  ('Amoxicilina 500 mg',        'Medicamento',  'Frasco x 20 cápsulas',    6,   6,  'AMX23-512',  15,  'Farmacia',                    'Antibiótico, requiere indicación médica'),
  ('Diclofenaco 75 mg',         'Medicamento',  'Ampolla x 3 ml',          10,  5,  'DIC24-033',  -3,  'Farmacia / Refrigerado',      'Lote con fecha vencida, retirar del stock'),
  ('Loratadina 10 mg',          'Medicamento',  'Caja x 10 comprimidos',   22,  10, 'LOR24-091', 90,  'Farmacia',                    'Antihistamínico'),
  ('Omeprazol 20 mg',           'Medicamento',  'Frasco x 14 cápsulas',    12,  6,  'OME24-077', 60,  'Farmacia',                    'Protector gástrico'),
  ('Solución salina 0.9%',      'Medicamento',  'Frasco x 500 ml',         0,   4,  'SOL24-301', 40,  'Farmacia / Refrigerado',      'Sin stock, gestionar reposición'),
  ('Alcohol 70%',               'Insumo médico','Galón x 1 L',             3,   5,  'ALC24-140', 120, 'Enfermería',                  'Desinfectante de superficie'),
  ('Yodopovidona (Betadine)',   'Insumo médico','Frasco x 120 ml',         18,  8,  'YOD24-052', 180, 'Enfermería',                  'Antiséptico para heridas'),
  ('Gasa estéril 10x10 cm',     'Insumo médico','Paquete x 10 unidades',   45,  20, 'GAS24-388', 240, 'Enfermería',                  'Curaciones'),
  ('Venda elástica 4"',         'Insumo médico','Rollos',                   25,  12, 'VEN24-206', 300, 'Enfermería',                  'Soporte e inmovilización'),
  ('Jeringa 5 ml',              'Insumo médico','Caja x 100 unidades',      80,  25, 'JER24-450', 210, 'Enfermería',                  'Aplicación de medicamentos'),
  ('Guantes de examen (talla M)','Insumo médico','Caja x 100 unidades',     6,   10, 'GUA24-197', 150, 'Enfermería',                  'Bioseguridad'),
  ('Botiquín de primeros auxilios', 'Botiquín', 'Caja tipo A',             9,   6,  'BTQ24-001', 200, 'Oficina principal',           'Abrir para reposición de insumos'),
  ('Botiquín de primeros auxilios', 'Botiquín', 'Caja tipo A',             3,   3,  'BTQ24-002', 200, 'Planta 1',                    'Debe reponerse'),
  ('Termómetro digital',        'Insumo médico','Unidad',                  2,   1,  'TER24-011', NULL, 'Enfermería',                  'Verificación de temperatura'),
  ('Paracetamol 500 mg',        'Medicamento',  'Frasco x 30 comprimidos', 5,   10, 'PAR24-119', 35,  'Botiquín Planta 2',           'Botiquín secundario, vigilar vencimiento'),
  ('Dipirona (Metamizol) 1 g',  'Medicamento',  'Ampolla x 2 ml',          8,   4,  'DIP23-064', -45, 'Farmacia / Refrigerado',      'Lote vencido, pendiente de disposición'),
  ('Clorfenamina 4 mg',         'Medicamento',  'Frasco x 20 comprimidos', 14,  6,  'CLF24-042', 75,  'Farmacia',                    'Antihistamínico'),
  ('Bicarbonato de sodio',      'Insumo médico','Caja x 10 sobres',        11,  5,  'BIC24-199', 160, 'Farmacia',                    'Sobres de 5 g')
) AS s(nombre, tipo, presentacion, cantidad, cantidad_minima, lote,
       dias_vencimiento, ubicacion, observaciones)
WHERE NOT EXISTS (
  SELECT 1 FROM seguridad_inventario_insumos x
  WHERE x.nombre = s.nombre AND COALESCE(x.lote, '') = COALESCE(s.lote, '')
);
