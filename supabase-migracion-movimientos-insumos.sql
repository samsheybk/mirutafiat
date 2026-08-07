-- ============================================================
-- MIGRACIÓN: MOVIMIENTOS DE INVENTARIO DE INSUMOS
-- (seguridad_inventario_movimientos)
-- Registra cada entrada y salida de insumos/medicamentos del
-- módulo Seguridad y Salud Laboral. Las salidas requieren un
-- concepto: Entrega a trabajador (vincula al trabajador),
-- Vencimiento, Donación, Compra, Ajuste u Otro.
-- Las entradas (tipo = 'Entrada') permiten registrar el número
-- de lote y la fecha de vencimiento del lote que ingresa, para
-- la rotación correcta de medicamentos (FEFO).
-- Idempotente: usa CREATE TABLE IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS seguridad_inventario_movimientos (
  id BIGSERIAL PRIMARY KEY,
  insumo_id BIGINT NOT NULL REFERENCES seguridad_inventario_insumos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'Salida'
    CHECK (tipo IN ('Entrada','Salida')),
  concepto TEXT
    CHECK (concepto IN ('Entrega a trabajador','Vencimiento','Donación','Compra','Ajuste','Otro')),
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  lote TEXT,
  fecha_vencimiento DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Columnas lote / fecha_vencimiento (para rotación FEFO de medicamentos)
ALTER TABLE seguridad_inventario_movimientos ADD COLUMN IF NOT EXISTS lote TEXT;
ALTER TABLE seguridad_inventario_movimientos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Ampliar el CHECK de concepto con 'Compra' (aplicable a entradas)
ALTER TABLE seguridad_inventario_movimientos DROP CONSTRAINT IF EXISTS seguridad_inventario_movimientos_concepto_check;
ALTER TABLE seguridad_inventario_movimientos ADD CONSTRAINT seguridad_inventario_movimientos_concepto_check
  CHECK (concepto IN ('Entrega a trabajador','Vencimiento','Donación','Compra','Ajuste','Otro'));

CREATE INDEX IF NOT EXISTS idx_seg_inv_mov_insumo ON seguridad_inventario_movimientos (insumo_id);

ALTER TABLE seguridad_inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados ver movimientos inventario insumos" ON seguridad_inventario_movimientos;
CREATE POLICY "Autenticados ver movimientos inventario insumos"
  ON seguridad_inventario_movimientos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear movimientos inventario insumos" ON seguridad_inventario_movimientos;
CREATE POLICY "Autenticados crear movimientos inventario insumos"
  ON seguridad_inventario_movimientos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar movimientos inventario insumos" ON seguridad_inventario_movimientos;
CREATE POLICY "Autenticados actualizar movimientos inventario insumos"
  ON seguridad_inventario_movimientos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar movimientos inventario insumos" ON seguridad_inventario_movimientos;
CREATE POLICY "Autenticados eliminar movimientos inventario insumos"
  ON seguridad_inventario_movimientos FOR DELETE TO authenticated USING (true);
