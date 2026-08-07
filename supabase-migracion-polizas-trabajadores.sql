-- ============================================================
-- MIGRACIÓN: PÓLIZAS DE SEGURO POR TIPOS Y ASIGNACIÓN A TRABAJADORES
-- Base existente: ejecutar TODO este bloque una sola vez en el
-- SQL Editor de Supabase. Es idempotente (puede repetirse).
-- ============================================================

-- 1) Catálogo de tipos de póliza
CREATE TABLE IF NOT EXISTS bienestar_poliza_tipos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  proveedor TEXT,
  cobertura TEXT,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Asignación de trabajadores a cada tipo de póliza
CREATE TABLE IF NOT EXISTS bienestar_poliza_trabajadores (
  id BIGSERIAL PRIMARY KEY,
  poliza_tipo_id BIGINT NOT NULL REFERENCES bienestar_poliza_tipos(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa','Vencida','Cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_bienestar_poliza_tipo_trabajador UNIQUE (poliza_tipo_id, trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_poliza_trabajadores_tipo ON bienestar_poliza_trabajadores (poliza_tipo_id);
CREATE INDEX IF NOT EXISTS idx_poliza_trabajadores_trabajador ON bienestar_poliza_trabajadores (trabajador_id);

-- 3) RLS: todos los autenticados pueden gestionar tipos y asignaciones
ALTER TABLE bienestar_poliza_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_poliza_trabajadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver tipos de poliza" ON bienestar_poliza_tipos;
CREATE POLICY "Usuarios autenticados pueden ver tipos de poliza"
  ON bienestar_poliza_tipos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear tipos de poliza" ON bienestar_poliza_tipos;
CREATE POLICY "Usuarios autenticados pueden crear tipos de poliza"
  ON bienestar_poliza_tipos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar tipos de poliza" ON bienestar_poliza_tipos;
CREATE POLICY "Usuarios autenticados pueden actualizar tipos de poliza"
  ON bienestar_poliza_tipos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar tipos de poliza" ON bienestar_poliza_tipos;
CREATE POLICY "Usuarios autenticados pueden eliminar tipos de poliza"
  ON bienestar_poliza_tipos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver asignaciones de poliza" ON bienestar_poliza_trabajadores;
CREATE POLICY "Usuarios autenticados pueden ver asignaciones de poliza"
  ON bienestar_poliza_trabajadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear asignaciones de poliza" ON bienestar_poliza_trabajadores;
CREATE POLICY "Usuarios autenticados pueden crear asignaciones de poliza"
  ON bienestar_poliza_trabajadores FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar asignaciones de poliza" ON bienestar_poliza_trabajadores;
CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones de poliza"
  ON bienestar_poliza_trabajadores FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar asignaciones de poliza" ON bienestar_poliza_trabajadores;
CREATE POLICY "Usuarios autenticados pueden eliminar asignaciones de poliza"
  ON bienestar_poliza_trabajadores FOR DELETE TO authenticated USING (true);
