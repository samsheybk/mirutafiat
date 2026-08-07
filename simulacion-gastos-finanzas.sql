-- ============================================================
-- SIMULACIÓN: MOVIMIENTOS FINANCIEROS (finanzas_movimientos)
-- 1) VACÍA la tabla de movimientos.
-- 2) Inserta UN INGRESO mensual "Presupuesto disponible" al
--    inicio de cada uno de los últimos 4 meses.
-- 3) Inserta GASTOS relacionados a RRHH cada mes, por debajo
--    del presupuesto, para que el saldo sea siempre positivo.
-- Determinista (setseed). >>> AJUSTA TASA.val al BCV actual <<<
-- ============================================================

SELECT setseed(0.2026);

-- 1) Vaciar movimientos (simulación)
DELETE FROM finanzas_movimientos;

-- 2) Ingresos: presupuesto disponible al inicio de cada mes
WITH TASA AS (SELECT 100.0 AS val),
meses AS (
  SELECT gs.m,
         (date_trunc('month', CURRENT_DATE)::date - (gs.m * interval '1 month'))::date AS inicio
  FROM generate_series(1, 4) gs(m)
)
INSERT INTO finanzas_movimientos
  (tipo, categoria, concepto, descripcion, monto, moneda, tasa_cambio, monto_bs, monto_usd,
   fecha, metodo_pago, proveedor, area, responsable, estado, observaciones)
SELECT
  'Ingreso',
  'Otros ingresos',
  'Presupuesto disponible del mes',
  'Asignación mensual para la operación',
  12000,
  'USD',
  TASA.val,
  1200000,
  12000,
  m.inicio,
  'Transferencia',
  'Sede central',
  'Administración',
  NULL,
  'Registrado',
  NULL
FROM meses m, TASA;

-- 3) Gastos de RRHH por mes (por debajo del presupuesto mensual)
WITH TASA AS (SELECT 100.0 AS val),
meses AS (
  SELECT gs.m,
         (date_trunc('month', CURRENT_DATE)::date - (gs.m * interval '1 month'))::date AS inicio
  FROM generate_series(1, 4) gs(m)
),
pool_gastos AS (
  SELECT * FROM (VALUES
    (1,  'Otros gastos',             'Salarios del personal',                  NULL,                     'Transferencia', 'Bs',  480000),
    (2,  'Otros gastos',             'Prestaciones sociales',                  NULL,                     'Transferencia', 'Bs',  120000),
    (3,  'Otros gastos',             'Bono de alimentación',                   NULL,                     'Transferencia', 'Bs',   90000),
    (4,  'Otros gastos',             'Caja de ahorro (aportes patronales)',    NULL,                     'Transferencia', 'Bs',   40000),
    (5,  'Otros gastos',             'Capacitación y formación',               'Instituto de formación', 'Transferencia', 'Bs',   25000),
    (6,  'Otros gastos',             'Medicina ocupacional',                   'Clínica ocupacional',    'Transferencia', 'Bs',   18000),
    (7,  'Otros gastos',             'Reclutamiento y selección de personal',  'Bolsa de empleo',        'Transferencia', 'Bs',   12000),
    (8,  'Otros gastos',             'Bonificaciones por desempeño',           NULL,                     'Transferencia', 'Bs',   35000),
    (9,  'Otros gastos',             'Plataforma de capacitación online',      'Plataforma LMS',         'Tarjeta',       'USD', 300),
    (10, 'Suministros de seguridad', 'Uniformes y calzado laboral',            'Textilera industrial',   'Tarjeta',       'Bs',   30000),
    (11, 'Suministros de seguridad', 'EPP para trabajadores',                  'Distribuidora seguridad','Tarjeta',       'Bs',   15000),
    (12, 'Viáticos y traslados',     'Traslados del personal',                 NULL,                     'Efectivo',      'Bs',   14000),
    (13, 'Comunicaciones',           'Comunicaciones corporativas RRHH',       'Operador móvil',         'Transferencia', 'Bs',    6000)
  ) AS p(orden, categoria, concepto, proveedor, metodo, moneda, base)
)
INSERT INTO finanzas_movimientos
  (tipo, categoria, concepto, descripcion, monto, moneda, tasa_cambio, monto_bs, monto_usd,
   fecha, metodo_pago, proveedor, area, responsable, estado, observaciones)
SELECT
  'Gasto',
  p.categoria,
  p.concepto,
  NULL,
  variado AS monto,
  p.moneda,
  TASA.val,
  CASE WHEN p.moneda = 'USD' THEN round((variado * TASA.val)::numeric, 2) ELSE variado END AS monto_bs,
  CASE WHEN p.moneda = 'USD' THEN variado ELSE round((variado / TASA.val)::numeric, 2) END AS monto_usd,
  (m.inicio + ((p.orden * 2 - 1) % 26 + 1 + (random() * 2)::int))::date AS fecha,
  p.metodo,
  p.proveedor,
  'RRHH',
  (SELECT trim(w.nombres || ' ' || w.apellidos)
   FROM plantilla_trabajadores w
   WHERE w.estado = 'Activo'
   ORDER BY random()
   LIMIT 1) AS responsable,
  'Registrado',
  NULL
FROM meses m
CROSS JOIN TASA
JOIN (
  SELECT p.*, round((p.base * (0.9 + random() * 0.2))::numeric, 2) AS variado
  FROM pool_gastos p
) p ON TRUE;
