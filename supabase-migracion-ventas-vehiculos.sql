-- ============================================================
-- MIGRACIÓN: VENTA DE VEHÍCULOS A TRABAJADORES A CUOTAS
-- Base existente: ejecutar TODO este bloque una sola vez en el
-- SQL Editor de Supabase. Es idempotente (puede repetirse).
-- ============================================================

-- 1) Venta de vehículo a un trabajador (cabeza de contrato)
CREATE TABLE IF NOT EXISTS bienestar_vehiculos_ventas (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  vehiculo TEXT NOT NULL,
  placa TEXT,
  precio_total NUMERIC(12,2) NOT NULL,
  inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_financiado NUMERIC(12,2) NOT NULL,
  numero_cuotas INTEGER NOT NULL DEFAULT 1,
  monto_cuota NUMERIC(12,2) NOT NULL,
  fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa','Completada','Cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- 2) Cronograma de cuotas de cada venta
CREATE TABLE IF NOT EXISTS bienestar_vehiculos_pagos (
  id BIGSERIAL PRIMARY KEY,
  venta_id BIGINT NOT NULL REFERENCES bienestar_vehiculos_ventas(id) ON DELETE CASCADE,
  numero_cuota INTEGER NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  fecha_programada DATE NOT NULL,
  fecha_pagada DATE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Pagada','Atrasada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_vehiculos_pago_cuota UNIQUE (venta_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_pagos_venta ON bienestar_vehiculos_pagos (venta_id);

-- 3) RLS: todos los autenticados gestionan ventas y pagos
ALTER TABLE bienestar_vehiculos_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_vehiculos_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver ventas de vehiculos" ON bienestar_vehiculos_ventas;
CREATE POLICY "Usuarios autenticados pueden ver ventas de vehiculos"
  ON bienestar_vehiculos_ventas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear ventas de vehiculos" ON bienestar_vehiculos_ventas;
CREATE POLICY "Usuarios autenticados pueden crear ventas de vehiculos"
  ON bienestar_vehiculos_ventas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ventas de vehiculos" ON bienestar_vehiculos_ventas;
CREATE POLICY "Usuarios autenticados pueden actualizar ventas de vehiculos"
  ON bienestar_vehiculos_ventas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar ventas de vehiculos" ON bienestar_vehiculos_ventas;
CREATE POLICY "Usuarios autenticados pueden eliminar ventas de vehiculos"
  ON bienestar_vehiculos_ventas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver pagos de vehiculos" ON bienestar_vehiculos_pagos;
CREATE POLICY "Usuarios autenticados pueden ver pagos de vehiculos"
  ON bienestar_vehiculos_pagos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear pagos de vehiculos" ON bienestar_vehiculos_pagos;
CREATE POLICY "Usuarios autenticados pueden crear pagos de vehiculos"
  ON bienestar_vehiculos_pagos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar pagos de vehiculos" ON bienestar_vehiculos_pagos;
CREATE POLICY "Usuarios autenticados pueden actualizar pagos de vehiculos"
  ON bienestar_vehiculos_pagos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar pagos de vehiculos" ON bienestar_vehiculos_pagos;
CREATE POLICY "Usuarios autenticados pueden eliminar pagos de vehiculos"
  ON bienestar_vehiculos_pagos FOR DELETE TO authenticated USING (true);
