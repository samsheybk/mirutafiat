-- ============================================================
-- SIMULACIÓN: INVENTARIO DE UNIFORMES (bienestar_uniforme_stock
-- + bienestar_uniforme_entregas + bienestar_uniforme_entrega_items)
-- Crea un catálogo de stock (prenda + talla + cantidad) y 3
-- entregas de ejemplo a los primeros 3 trabajadores activos,
-- referenciando los artículos del stock.
-- El stock simulado representa la existencia actual; las entregas
-- son históricas (no descuentan de nuevo el stock).
-- Idempotente: no duplica prendas ni entregas existentes.
-- ============================================================

-- 1) Stock de prendas por talla
INSERT INTO bienestar_uniforme_stock (prenda, talla, cantidad, observaciones)
SELECT s.prenda, s.talla, s.cantidad, s.observaciones
FROM (VALUES
  ('Camisa manga corta', 'S',  12, 'Unisex, blanco'),
  ('Camisa manga corta', 'M',  25, 'Unisex, blanco'),
  ('Camisa manga corta', 'L',  30, 'Unisex, blanco'),
  ('Camisa manga corta', 'XL', 18, 'Unisex, blanco'),
  ('Camisa manga corta', 'XXL', 8, 'Unisex, blanco'),
  ('Camisa manga larga', 'S',   6, 'Gris perla'),
  ('Camisa manga larga', 'M',  14, 'Gris perla'),
  ('Camisa manga larga', 'L',  20, 'Gris perla'),
  ('Camisa manga larga', 'XL', 12, 'Gris perla'),
  ('Polo', 'S',   8, NULL),
  ('Polo', 'M',  16, NULL),
  ('Polo', 'L',  22, NULL),
  ('Polo', 'XL', 10, NULL),
  ('Pantalón', 'S',  10, 'Corte recto'),
  ('Pantalón', 'M',  20, 'Corte recto'),
  ('Pantalón', 'L',  26, 'Corte recto'),
  ('Pantalón', 'XL', 14, 'Corte recto'),
  ('Pantalón', '32',  6, 'Corte recto'),
  ('Pantalón', '34',  9, 'Corte recto'),
  ('Jean', 'M',  15, NULL),
  ('Jean', 'L',  18, NULL),
  ('Jean', 'XL', 10, NULL),
  ('Overol', 'M',   4, NULL),
  ('Overol', 'L',   6, NULL),
  ('Overol', 'XL',  3, NULL),
  ('Chaleco reflectivo', 'M',   5, 'Uso obligatorio en planta'),
  ('Chaleco reflectivo', 'L',   8, 'Uso obligatorio en planta'),
  ('Chaleco reflectivo', 'XL',  4, 'Uso obligatorio en planta'),
  ('Botas de seguridad', '38',  6, NULL),
  ('Botas de seguridad', '40', 12, NULL),
  ('Botas de seguridad', '42', 10, NULL),
  ('Botas de seguridad', '44',  4, NULL),
  ('Casco de seguridad', 'Única', 15, NULL),
  ('Gorra', 'Única', 20, NULL),
  ('Guantes de seguridad', 'M', 12, NULL),
  ('Guantes de seguridad', 'L', 18, NULL),
  ('Lentes de seguridad', 'Única', 25, NULL)
) AS s(prenda, talla, cantidad, observaciones)
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_uniforme_stock x
  WHERE x.prenda = s.prenda AND x.talla = s.talla
);

-- 2) Entregas de ejemplo (encabezados) a los primeros 3 trabajadores activos
WITH w AS (
  SELECT id, row_number() OVER (ORDER BY nombres, apellidos) AS rn
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
), ent AS (
  SELECT w.id AS trabajador_id, (CURRENT_DATE - (d.dias || ' days')::interval)::date AS fecha
  FROM w
  JOIN (VALUES (1, 5), (2, 20), (3, 45)) AS d(rn, dias) ON w.rn = d.rn
)
INSERT INTO bienestar_uniforme_entregas (trabajador_id, fecha, estado, observaciones)
SELECT ent.trabajador_id, ent.fecha, 'Entregado', 'Simulación stock de uniformes'
FROM ent
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_uniforme_entregas x
  WHERE x.trabajador_id = ent.trabajador_id AND x.observaciones LIKE 'Simulación%'
);

-- 3) Artículos de cada entrega (vinculados al stock)
WITH w AS (
  SELECT id, row_number() OVER (ORDER BY nombres, apellidos) AS rn
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
), it AS (
  SELECT w.id AS trabajador_id, t.prenda, t.talla, t.cantidad
  FROM w
  JOIN (VALUES
    (1, 'Camisa manga corta', 'M',  2),
    (1, 'Pantalón',           'M',  2),
    (1, 'Botas de seguridad', '42', 1),
    (2, 'Camisa manga larga', 'L',  2),
    (2, 'Jean',               'L',  2),
    (2, 'Casco de seguridad', 'Única', 1),
    (3, 'Polo',               'XL', 3),
    (3, 'Gorra',              'Única', 1)
  ) AS t(rn, prenda, talla, cantidad)
    ON w.rn = t.rn
)
INSERT INTO bienestar_uniforme_entrega_items (entrega_id, stock_id, prenda, talla, cantidad)
SELECT e.id, s.id, it.prenda, it.talla, it.cantidad
FROM it
JOIN bienestar_uniforme_entregas e
  ON e.trabajador_id = it.trabajador_id AND e.observaciones LIKE 'Simulación%'
JOIN bienestar_uniforme_stock s
  ON s.prenda = it.prenda AND s.talla = it.talla
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_uniforme_entrega_items x
  WHERE x.entrega_id = e.id AND x.prenda = it.prenda AND x.talla = it.talla
);
