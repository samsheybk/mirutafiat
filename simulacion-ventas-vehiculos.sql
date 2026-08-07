-- ============================================================
-- SIMULACIÓN: VENTA DE VEHÍCULOS A TRABAJADORES A CUOTAS
-- (bienestar_vehiculos_ventas + bienestar_vehiculos_pagos)
-- Crea 4 ventas de ejemplo para los primeros 4 trabajadores
-- activos y su cronograma mensual de cuotas. Los montos son en
-- USD. Las cuotas cuyo vencimiento ya pasó quedan Pagadas.
-- Requiere ejecutar antes supabase-migracion-ventas-vehiculos.sql
-- Idempotente: no duplica ventas ni cuotas existentes.
-- ============================================================

-- 1) Ventas de ejemplo (4 trabajadores activos, un vehículo cada uno)
WITH w AS (
  SELECT id, row_number() OVER (ORDER BY nombres, apellidos) AS rn
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
), ve AS (
  SELECT w.id, t.vehiculo, t.placa, t.precio, t.inicial, t.cuotas, t.meses_atras
  FROM w
  JOIN (VALUES
    (1, 'Chevrolet Spark 2020', 'AB123CD', 7200, 1200, 24, 6),
    (2, 'Toyota Corolla 2019', 'BC234DE', 15000, 3000, 36, 8),
    (3, 'Ford F-150 2018', 'CD345EF', 19800, 4800, 36, 12),
    (4, 'Hyundai Elantra 2021', 'DE456FG', 9500, 1500, 24, 3)
  ) AS t(rn, vehiculo, placa, precio, inicial, cuotas, meses_atras)
    ON w.rn = t.rn
)
INSERT INTO bienestar_vehiculos_ventas
  (trabajador_id, vehiculo, placa, precio_total, inicial, monto_financiado,
   numero_cuotas, monto_cuota, fecha_venta, estado)
SELECT
  ve.id,
  ve.vehiculo,
  ve.placa,
  ve.precio,
  ve.inicial,
  ve.precio - ve.inicial,
  ve.cuotas,
  round(((ve.precio - ve.inicial) / ve.cuotas)::numeric, 2),
  (CURRENT_DATE - (ve.meses_atras || ' months')::interval)::date,
  'Activa'
FROM ve
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_vehiculos_ventas x
  WHERE x.trabajador_id = ve.id AND x.vehiculo = ve.vehiculo
);

-- 2) Cronograma mensual de cuotas (las vencidas quedan Pagadas)
INSERT INTO bienestar_vehiculos_pagos
  (venta_id, numero_cuota, monto, fecha_programada, fecha_pagada, estado)
SELECT
  v.id,
  g.n,
  CASE WHEN g.n = v.numero_cuotas
       THEN v.monto_financiado - round((v.monto_financiado / v.numero_cuotas)::numeric, 2) * (v.numero_cuotas - 1)
       ELSE round((v.monto_financiado / v.numero_cuotas)::numeric, 2)
  END,
  (v.fecha_venta + (g.n || ' months')::interval)::date,
  CASE WHEN (v.fecha_venta + (g.n || ' months')::interval)::date <= CURRENT_DATE
       THEN (v.fecha_venta + (g.n || ' months')::interval)::date END,
  CASE WHEN (v.fecha_venta + (g.n || ' months')::interval)::date <= CURRENT_DATE
       THEN 'Pagada' ELSE 'Pendiente' END
FROM bienestar_vehiculos_ventas v
CROSS JOIN generate_series(1, v.numero_cuotas) AS g(n)
WHERE v.vehiculo IN ('Chevrolet Spark 2020','Toyota Corolla 2019','Ford F-150 2018','Hyundai Elantra 2021')
  AND NOT EXISTS (
    SELECT 1 FROM bienestar_vehiculos_pagos p
    WHERE p.venta_id = v.id AND p.numero_cuota = g.n
  );
