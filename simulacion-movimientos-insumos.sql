-- ============================================================
-- SIMULACIÓN: INVENTARIO DE INSUMOS Y MEDICAMENTOS CON MOVIMIENTOS
-- (seguridad_inventario_insumos + seguridad_inventario_movimientos)
-- del módulo Seguridad y Salud Laboral -> "Inventario de insumos
-- y medicamentos".
--
-- LÓGICA: el stock de cada insumo se calcula como la diferencia
-- entre las entradas y las salidas registradas en los movimientos.
-- Este script LIMPIA ambas tablas y las vuelve a poblar de forma
-- coherente: entradas de compra, salidas por entrega a trabajador,
-- vencimiento, donación y ajuste. Al final recalcula la cantidad
-- y el estado (Disponible / Bajo stock / Agotado / Por vencer /
-- Vencido) con la misma lógica del módulo.
-- ============================================================

-- 0) LIMPIEZA TOTAL (re-ejecutar el script no duplica datos)
DELETE FROM seguridad_inventario_movimientos;
DELETE FROM seguridad_inventario_insumos;

-- ============================================================
-- 1) INSUMOS (cantidad 0; se calculará desde los movimientos)
-- ============================================================
INSERT INTO seguridad_inventario_insumos
  (nombre, tipo, presentacion, cantidad, cantidad_minima, lote,
   fecha_vencimiento, ubicacion, estado, observaciones)
SELECT
  s.nombre, s.tipo, s.presentacion, 0, s.cantidad_minima, s.lote,
  (CURRENT_DATE + (s.dias_vencimiento || ' days')::interval)::date,
  s.ubicacion, 'Disponible', s.observaciones
FROM (VALUES
  ('Paracetamol 500 mg',          'Medicamento',  'Frasco x 30 comprimidos', 10, 'PAR24-118',  90,  'Farmacia / Botiquín central',  'Analgésico y antipirético de uso general'),
  ('Paracetamol 500 mg',          'Medicamento',  'Frasco x 30 comprimidos', 10, 'PAR24-119',  35,  'Botiquín Planta 2',            'Botiquín secundario'),
  ('Ibuprofeno 400 mg',           'Medicamento',  'Frasco x 20 comprimidos',  8, 'IBU24-220',  25,  'Farmacia / Botiquín central',  'Antiinflamatorio no esteroideo'),
  ('Amoxicilina 500 mg',          'Medicamento',  'Frasco x 20 cápsulas',     6, 'AMX23-512',  15,  'Farmacia',                     'Antibiótico, requiere indicación médica'),
  ('Diclofenaco 75 mg',           'Medicamento',  'Ampolla x 3 ml',           5, 'DIC24-033',  -3,  'Farmacia / Refrigerado',       'Lote vencido, disposición final'),
  ('Loratadina 10 mg',            'Medicamento',  'Caja x 10 comprimidos',   10, 'LOR24-091',  90,  'Farmacia',                     'Antihistamínico'),
  ('Omeprazol 20 mg',             'Medicamento',  'Frasco x 14 cápsulas',     6, 'OME24-077',  60,  'Farmacia',                     'Protector gástrico'),
  ('Solución salina 0.9%',        'Medicamento',  'Frasco x 500 ml',          4, 'SOL24-301',  40,  'Farmacia / Refrigerado',       'Se agotó por consumos'),
  ('Dipirona (Metamizol) 1 g',    'Medicamento',  'Ampolla x 2 ml',           4, 'DIP23-064', -45,  'Farmacia / Refrigerado',       'Lote vencido, pendiente de disposición'),
  ('Clorfenamina 4 mg',           'Medicamento',  'Frasco x 20 comprimidos',  6, 'CLF24-042',  75,  'Farmacia',                     'Antihistamínico'),
  ('Bicarbonato de sodio',        'Medicamento',  'Caja x 10 sobres',         5, 'BIC24-199', 160,  'Farmacia',                     'Sobres de 5 g'),
  ('Alcohol 70%',                 'Insumo médico','Galón x 1 L',              5, 'ALC24-140', 120,  'Enfermería',                   'Desinfectante de superficie'),
  ('Yodopovidona (Betadine)',     'Insumo médico','Frasco x 120 ml',          8, 'YOD24-052', 180,  'Enfermería',                   'Antiséptico para heridas'),
  ('Gasa estéril 10x10 cm',       'Insumo médico','Paquete x 10 unidades',   20, 'GAS24-388', 240,  'Enfermería',                   'Curaciones'),
  ('Venda elástica 4"',           'Insumo médico','Rollos',                   12, 'VEN24-206', 300,  'Enfermería',                   'Soporte e inmovilización'),
  ('Jeringa 5 ml',                'Insumo médico','Caja x 100 unidades',      25, 'JER24-450', 210,  'Enfermería',                   'Aplicación de medicamentos'),
  ('Guantes de examen (talla M)','Insumo médico','Caja x 100 unidades',      10, 'GUA24-197', 150,  'Enfermería',                   'Bioseguridad'),
  ('Botiquín de primeros auxilios','Botiquín',   'Caja tipo A',               6, 'BTQ24-001', 200,  'Oficina principal',            'Abierto para reposición'),
  ('Botiquín de primeros auxilios','Botiquín',   'Caja tipo A',               3, 'BTQ24-002', 200,  'Planta 1',                     'Debe reponerse'),
  ('Termómetro digital',          'Insumo médico','Unidad',                   1, 'TER24-011', NULL,  'Enfermería',                   'Verificación de temperatura')
) AS s(nombre, tipo, presentacion, cantidad_minima, lote, dias_vencimiento,
       ubicacion, observaciones);

-- ============================================================
-- 2) ENTRADAS (compras) - fechas anteriores a las salidas
--    Se registran lote y fecha de vencimiento para rotación FEFO
-- ============================================================
WITH ins AS (
  SELECT id, nombre, COALESCE(lote, '') AS lote, fecha_vencimiento
  FROM seguridad_inventario_insumos
)
INSERT INTO seguridad_inventario_movimientos
  (insumo_id, tipo, concepto, trabajador_id, cantidad, fecha,
   lote, fecha_vencimiento, observaciones)
SELECT
  ins.id, 'Entrada', 'Compra', NULL, s.cantidad,
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  ins.lote, ins.fecha_vencimiento,
  'SIM: Compra de reposición'
FROM ins
JOIN (VALUES
  ('Paracetamol 500 mg',           'PAR24-118', 30,  60),
  ('Paracetamol 500 mg',           'PAR24-119', 15,  50),
  ('Ibuprofeno 400 mg',            'IBU24-220', 20,  50),
  ('Amoxicilina 500 mg',           'AMX23-512', 20,  40),
  ('Diclofenaco 75 mg',            'DIC24-033', 15,  60),
  ('Loratadina 10 mg',             'LOR24-091', 30,  55),
  ('Omeprazol 20 mg',              'OME24-077', 14,  45),
  ('Solución salina 0.9%',         'SOL24-301', 12,  50),
  ('Dipirona (Metamizol) 1 g',     'DIP23-064', 10,  80),
  ('Clorfenamina 4 mg',            'CLF24-042', 20,  50),
  ('Bicarbonato de sodio',         'BIC24-199', 20,  60),
  ('Alcohol 70%',                  'ALC24-140',  8,  70),
  ('Yodopovidona (Betadine)',      'YOD24-052', 24,  90),
  ('Gasa estéril 10x10 cm',        'GAS24-388', 60, 120),
  ('Venda elástica 4"',            'VEN24-206', 40, 100),
  ('Jeringa 5 ml',                 'JER24-450', 100,  80),
  ('Guantes de examen (talla M)', 'GUA24-197', 100,  60),
  ('Botiquín de primeros auxilios', 'BTQ24-001', 12,  90),
  ('Botiquín de primeros auxilios', 'BTQ24-002',  6,  90),
  ('Termómetro digital',           'TER24-011',  3,  60)
) AS s(nombre, lote, cantidad, dias)
  ON ins.nombre = s.nombre AND ins.lote = s.lote;

-- ============================================================
-- 3) SALIDAS POR ENTREGA A TRABAJADOR
-- ============================================================
WITH w AS (
  SELECT id AS trabajador_id, row_number() OVER (ORDER BY apellidos, nombres) AS rn
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
), ins AS (
  SELECT id, nombre, COALESCE(lote, '') AS lote, fecha_vencimiento
  FROM seguridad_inventario_insumos
)
INSERT INTO seguridad_inventario_movimientos
  (insumo_id, tipo, concepto, trabajador_id, cantidad, fecha,
   lote, fecha_vencimiento, observaciones)
SELECT
  ins.id, 'Salida', 'Entrega a trabajador', w.trabajador_id, s.cantidad,
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  ins.lote, ins.fecha_vencimiento,
  'SIM: Entrega por consulta médica'
FROM (VALUES
  (1, 'Paracetamol 500 mg',           'PAR24-118', 10, 30),
  (2, 'Ibuprofeno 400 mg',            'IBU24-220',  4, 20),
  (1, 'Ibuprofeno 400 mg',            'IBU24-220',  6,  8),
  (3, 'Amoxicilina 500 mg',           'AMX23-512',  8, 25),
  (3, 'Amoxicilina 500 mg',           'AMX23-512',  6, 12),
  (4, 'Loratadina 10 mg',             'LOR24-091',  8, 15),
  (1, 'Omeprazol 20 mg',              'OME24-077',  2,  7),
  (5, 'Solución salina 0.9%',         'SOL24-301', 12, 10),
  (2, 'Clorfenamina 4 mg',            'CLF24-042',  6, 10),
  (3, 'Bicarbonato de sodio',         'BIC24-199',  9, 20),
  (4, 'Paracetamol 500 mg',           'PAR24-119', 10, 15),
  (2, 'Alcohol 70%',                  'ALC24-140',  4,  5),
  (1, 'Yodopovidona (Betadine)',      'YOD24-052',  6, 30),
  (5, 'Gasa estéril 10x10 cm',        'GAS24-388', 15, 40),
  (2, 'Venda elástica 4"',            'VEN24-206', 15, 25),
  (4, 'Jeringa 5 ml',                 'JER24-450', 20, 10),
  (1, 'Guantes de examen (talla M)', 'GUA24-197', 40, 30)
) AS s(rn, nombre, lote, cantidad, dias)
JOIN w ON w.rn = s.rn
JOIN ins ON ins.nombre = s.nombre AND ins.lote = s.lote;

-- ============================================================
-- 4) SALIDAS SIN TRABAJADOR (vencimiento / donación / ajuste)
-- ============================================================
WITH ins AS (
  SELECT id, nombre, COALESCE(lote, '') AS lote, fecha_vencimiento
  FROM seguridad_inventario_insumos
)
INSERT INTO seguridad_inventario_movimientos
  (insumo_id, tipo, concepto, trabajador_id, cantidad, fecha,
   lote, fecha_vencimiento, observaciones)
SELECT
  ins.id, 'Salida', s.concepto, NULL, s.cantidad,
  (CURRENT_DATE - (s.dias || ' days')::interval)::date,
  ins.lote, ins.fecha_vencimiento,
  'SIM: ' || s.observaciones
FROM ins
JOIN (VALUES
  ('Diclofenaco 75 mg',            'DIC24-033', 'Vencimiento', 15,  5, 'Lote vencido, disposición final'),
  ('Dipirona (Metamizol) 1 g',     'DIP23-064', 'Vencimiento', 10, 50, 'Lote vencido, disposición final'),
  ('Alcohol 70%',                  'ALC24-140', 'Donación',     1, 20, 'Donación a centro comunitario'),
  ('Guantes de examen (talla M)', 'GUA24-197', 'Donación',    60,  5, 'Donación a centro de salud'),
  ('Botiquín de primeros auxilios', 'BTQ24-001', 'Ajuste',      3, 30, 'Reposición de insumos en botiquín'),
  ('Botiquín de primeros auxilios', 'BTQ24-002', 'Ajuste',      3, 20, 'Reposición de insumos en botiquín'),
  ('Termómetro digital',           'TER24-011', 'Ajuste',       1, 30, 'Unidad descartada por daño')
) AS s(nombre, lote, concepto, cantidad, dias, observaciones)
  ON ins.nombre = s.nombre AND ins.lote = s.lote;

-- ============================================================
-- 5) RECÁLCULO DE STOCK Y ESTADO (neto de los movimientos)
-- ============================================================
WITH netos AS (
  SELECT insumo_id,
         COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN cantidad ELSE 0 END), 0)  AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'Salida'  THEN cantidad ELSE 0 END), 0)  AS salidas
  FROM seguridad_inventario_movimientos
  GROUP BY insumo_id
)
UPDATE seguridad_inventario_insumos i
SET cantidad = n.entradas - n.salidas,
    estado = CASE
      WHEN i.fecha_vencimiento IS NOT NULL AND i.fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
      WHEN i.fecha_vencimiento IS NOT NULL
           AND (i.fecha_vencimiento - CURRENT_DATE) <= 30 THEN 'Por vencer'
      WHEN (n.entradas - n.salidas) <= 0 THEN 'Agotado'
      WHEN i.cantidad_minima > 0 AND (n.entradas - n.salidas) <= i.cantidad_minima THEN 'Bajo stock'
      ELSE 'Disponible'
    END
FROM netos n
WHERE i.id = n.insumo_id;

-- ============================================================
-- 6) VERIFICACIÓN: stock calculado vs. movimientos
-- ============================================================
SELECT i.nombre, i.lote, i.cantidad AS stock,
       (SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN cantidad ELSE 0 END), 0)
        FROM seguridad_inventario_movimientos m WHERE m.insumo_id = i.id) AS entradas,
       (SELECT COALESCE(SUM(CASE WHEN tipo = 'Salida' THEN cantidad ELSE 0 END), 0)
        FROM seguridad_inventario_movimientos m WHERE m.insumo_id = i.id) AS salidas,
       i.estado
FROM seguridad_inventario_insumos i
ORDER BY i.tipo, i.nombre, i.lote;
