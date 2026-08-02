-- ============================================
-- FIAT Venezuela - Intranet: MÓDULO FINANZAS
-- Registro de gastos, ingresos y reportes financieros.
-- Ejecutar en el SQL Editor de Supabase.
-- Es idempotente: se puede re-ejecutar sin errores.
-- ============================================

-- ============================================
-- 11) FINANZAS: MOVIMIENTOS (GASTOS E INGRESOS)
-- ============================================

CREATE TABLE IF NOT EXISTS finanzas_movimientos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('Gasto', 'Ingreso')),
  categoria TEXT NOT NULL,
  concepto TEXT NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago TEXT CHECK (metodo_pago IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Cheque', 'Otro')),
  proveedor TEXT,
  area TEXT,
  responsable TEXT,
  comprobante_url TEXT,
  estado TEXT NOT NULL DEFAULT 'Registrado' CHECK (estado IN ('Registrado', 'Reembolsado', 'Anulado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_fecha ON finanzas_movimientos (fecha);
CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_tipo ON finanzas_movimientos (tipo);
CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_categoria ON finanzas_movimientos (categoria);

-- ============================================
-- RLS: accesible para usuarios autenticados (CRUD)
-- ============================================

ALTER TABLE finanzas_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados ver movimientos" ON finanzas_movimientos;
CREATE POLICY "Autenticados ver movimientos"
  ON finanzas_movimientos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados crear movimientos" ON finanzas_movimientos;
CREATE POLICY "Autenticados crear movimientos"
  ON finanzas_movimientos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados actualizar movimientos" ON finanzas_movimientos;
CREATE POLICY "Autenticados actualizar movimientos"
  ON finanzas_movimientos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados eliminar movimientos" ON finanzas_movimientos;
CREATE POLICY "Autenticados eliminar movimientos"
  ON finanzas_movimientos FOR DELETE TO authenticated USING (true);
