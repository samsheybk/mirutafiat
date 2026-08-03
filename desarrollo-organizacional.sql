-- ============================================
-- FIAT Venezuela - Intranet: MÓDULO DESARROLLO ORGANIZACIONAL
-- KPIs por unidades y cargos, OKR (objetivos y resultados clave)
-- y estadísticas de salud de las áreas.
-- Ejecutar en el SQL Editor de Supabase.
-- Es idempotente: se puede re-ejecutar sin errores.
-- ============================================

-- ============================================
-- 12) DESARROLLO ORGANIZACIONAL: KPIs, RESULTADOS, OKRs Y SEGUIMIENTO
-- ============================================

CREATE TABLE IF NOT EXISTS org_kpis (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad_medida TEXT,
  tipo TEXT NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('unidad', 'cargo', 'ambos')),
  meta NUMERIC(12, 2) NOT NULL DEFAULT 100 CHECK (meta > 0),
  direccion TEXT NOT NULL DEFAULT 'mayor' CHECK (direccion IN ('mayor', 'menor')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_kpis_tipo ON org_kpis (tipo);

CREATE TABLE IF NOT EXISTS org_kpi_resultados (
  id BIGSERIAL PRIMARY KEY,
  kpi_id BIGINT NOT NULL REFERENCES org_kpis(id) ON DELETE CASCADE,
  unidad_id UUID REFERENCES est_unidades(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES est_cargos(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_kpi_resultados_kpi ON org_kpi_resultados (kpi_id);
CREATE INDEX IF NOT EXISTS idx_org_kpi_resultados_unidad ON org_kpi_resultados (unidad_id);
CREATE INDEX IF NOT EXISTS idx_org_kpi_resultados_cargo ON org_kpi_resultados (cargo_id);
CREATE INDEX IF NOT EXISTS idx_org_kpi_resultados_periodo ON org_kpi_resultados (periodo);

CREATE TABLE IF NOT EXISTS org_okrs (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo_entidad TEXT NOT NULL DEFAULT 'grupo' CHECK (tipo_entidad IN ('grupo', 'unidad', 'cargo')),
  grupo TEXT,
  unidad_id UUID REFERENCES est_unidades(id) ON DELETE SET NULL,
  cargo_id UUID REFERENCES est_cargos(id) ON DELETE SET NULL,
  responsable TEXT,
  periodo TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'En progreso' CHECK (estado IN ('En progreso', 'En riesgo', 'En espera', 'Completado', 'Cancelado')),
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_okrs_estado ON org_okrs (estado);
CREATE INDEX IF NOT EXISTS idx_org_okrs_periodo ON org_okrs (periodo);

CREATE TABLE IF NOT EXISTS org_okr_resultados_clave (
  id BIGSERIAL PRIMARY KEY,
  okr_id BIGINT NOT NULL REFERENCES org_okrs(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  valor_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valor_actual NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valor_meta NUMERIC(12, 2) NOT NULL DEFAULT 100,
  unidad TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_okr_resultados_okr ON org_okr_resultados_clave (okr_id);

CREATE TABLE IF NOT EXISTS org_okr_seguimiento (
  id BIGSERIAL PRIMARY KEY,
  okr_id BIGINT NOT NULL REFERENCES org_okrs(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  progreso INTEGER CHECK (progreso BETWEEN 0 AND 100),
  nota TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_okr_seguimiento_okr ON org_okr_seguimiento (okr_id);

-- ============================================
-- RLS: accesible para usuarios autenticados (CRUD)
-- ============================================

ALTER TABLE org_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver kpis" ON org_kpis;
CREATE POLICY "Autenticados ver kpis"
  ON org_kpis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear kpis" ON org_kpis;
CREATE POLICY "Autenticados crear kpis"
  ON org_kpis FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar kpis" ON org_kpis;
CREATE POLICY "Autenticados actualizar kpis"
  ON org_kpis FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar kpis" ON org_kpis;
CREATE POLICY "Autenticados eliminar kpis"
  ON org_kpis FOR DELETE TO authenticated USING (true);

ALTER TABLE org_kpi_resultados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver resultados kpi" ON org_kpi_resultados;
CREATE POLICY "Autenticados ver resultados kpi"
  ON org_kpi_resultados FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear resultados kpi" ON org_kpi_resultados;
CREATE POLICY "Autenticados crear resultados kpi"
  ON org_kpi_resultados FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar resultados kpi" ON org_kpi_resultados;
CREATE POLICY "Autenticados actualizar resultados kpi"
  ON org_kpi_resultados FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar resultados kpi" ON org_kpi_resultados;
CREATE POLICY "Autenticados eliminar resultados kpi"
  ON org_kpi_resultados FOR DELETE TO authenticated USING (true);

ALTER TABLE org_okrs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver okrs" ON org_okrs;
CREATE POLICY "Autenticados ver okrs"
  ON org_okrs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear okrs" ON org_okrs;
CREATE POLICY "Autenticados crear okrs"
  ON org_okrs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar okrs" ON org_okrs;
CREATE POLICY "Autenticados actualizar okrs"
  ON org_okrs FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar okrs" ON org_okrs;
CREATE POLICY "Autenticados eliminar okrs"
  ON org_okrs FOR DELETE TO authenticated USING (true);

ALTER TABLE org_okr_resultados_clave ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver resultados clave" ON org_okr_resultados_clave;
CREATE POLICY "Autenticados ver resultados clave"
  ON org_okr_resultados_clave FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear resultados clave" ON org_okr_resultados_clave;
CREATE POLICY "Autenticados crear resultados clave"
  ON org_okr_resultados_clave FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar resultados clave" ON org_okr_resultados_clave;
CREATE POLICY "Autenticados actualizar resultados clave"
  ON org_okr_resultados_clave FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar resultados clave" ON org_okr_resultados_clave;
CREATE POLICY "Autenticados eliminar resultados clave"
  ON org_okr_resultados_clave FOR DELETE TO authenticated USING (true);

ALTER TABLE org_okr_seguimiento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver seguimiento okr" ON org_okr_seguimiento;
CREATE POLICY "Autenticados ver seguimiento okr"
  ON org_okr_seguimiento FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear seguimiento okr" ON org_okr_seguimiento;
CREATE POLICY "Autenticados crear seguimiento okr"
  ON org_okr_seguimiento FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar seguimiento okr" ON org_okr_seguimiento;
CREATE POLICY "Autenticados actualizar seguimiento okr"
  ON org_okr_seguimiento FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar seguimiento okr" ON org_okr_seguimiento;
CREATE POLICY "Autenticados eliminar seguimiento okr"
  ON org_okr_seguimiento FOR DELETE TO authenticated USING (true);

-- ============================================
-- 12.1) INDICADORES DE RRHH
-- Fuentes de datos de la herramienta Análisis de KPI por unidades:
-- ausencias, vacantes cubiertas y capacitaciones completadas.
-- La rotación temprana se calcula directamente de plantilla_trabajadores.
-- ============================================

CREATE TABLE IF NOT EXISTS rh_ausencias (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL DEFAULT 'Injustificada' CHECK (tipo IN ('Justificada', 'Injustificada', 'Permiso', 'Reposo médico')),
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_rh_ausencias_trabajador ON rh_ausencias (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_rh_ausencias_fecha ON rh_ausencias (fecha);

CREATE TABLE IF NOT EXISTS rh_vacantes (
  id BIGSERIAL PRIMARY KEY,
  cargo TEXT NOT NULL,
  unidad TEXT,
  vacantes INTEGER NOT NULL DEFAULT 1,
  fecha_apertura DATE NOT NULL,
  fecha_cubierta DATE,
  estado TEXT NOT NULL DEFAULT 'Abierta' CHECK (estado IN ('Abierta', 'Cubierta', 'Cancelada')),
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_rh_vacantes_estado ON rh_vacantes (estado);
CREATE INDEX IF NOT EXISTS idx_rh_vacantes_fecha_apertura ON rh_vacantes (fecha_apertura);

CREATE TABLE IF NOT EXISTS rh_capacitaciones (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  curso_id BIGINT NOT NULL REFERENCES cap_cursos(id) ON DELETE CASCADE,
  fecha_completado DATE NOT NULL DEFAULT CURRENT_DATE,
  calificacion NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  CONSTRAINT uq_rh_capacitaciones UNIQUE (trabajador_id, curso_id)
);
CREATE INDEX IF NOT EXISTS idx_rh_capacitaciones_trabajador ON rh_capacitaciones (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_rh_capacitaciones_curso ON rh_capacitaciones (curso_id);

ALTER TABLE rh_ausencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver ausencias" ON rh_ausencias;
CREATE POLICY "Autenticados ver ausencias"
  ON rh_ausencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear ausencias" ON rh_ausencias;
CREATE POLICY "Autenticados crear ausencias"
  ON rh_ausencias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar ausencias" ON rh_ausencias;
CREATE POLICY "Autenticados actualizar ausencias"
  ON rh_ausencias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar ausencias" ON rh_ausencias;
CREATE POLICY "Autenticados eliminar ausencias"
  ON rh_ausencias FOR DELETE TO authenticated USING (true);

ALTER TABLE rh_vacantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver vacantes" ON rh_vacantes;
CREATE POLICY "Autenticados ver vacantes"
  ON rh_vacantes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear vacantes" ON rh_vacantes;
CREATE POLICY "Autenticados crear vacantes"
  ON rh_vacantes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar vacantes" ON rh_vacantes;
CREATE POLICY "Autenticados actualizar vacantes"
  ON rh_vacantes FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar vacantes" ON rh_vacantes;
CREATE POLICY "Autenticados eliminar vacantes"
  ON rh_vacantes FOR DELETE TO authenticated USING (true);

ALTER TABLE rh_capacitaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver capacitaciones rh" ON rh_capacitaciones;
CREATE POLICY "Autenticados ver capacitaciones rh"
  ON rh_capacitaciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear capacitaciones rh" ON rh_capacitaciones;
CREATE POLICY "Autenticados crear capacitaciones rh"
  ON rh_capacitaciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar capacitaciones rh" ON rh_capacitaciones;
CREATE POLICY "Autenticados actualizar capacitaciones rh"
  ON rh_capacitaciones FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar capacitaciones rh" ON rh_capacitaciones;
CREATE POLICY "Autenticados eliminar capacitaciones rh"
  ON rh_capacitaciones FOR DELETE TO authenticated USING (true);
