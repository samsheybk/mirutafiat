-- ============================================
-- FIAT Venezuela - Intranet: MÓDULO SEGURIDAD Y SALUD LABORAL
-- Tablas para las herramientas: Inspecciones (evaluación de campo),
-- Servicio Médico e Inventarios (equipos de seguridad / insumos y medicamentos).
-- La herramienta Incidentes usa la tabla seguridad_incidentes (ya existente).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ============================================

-- ------------------------------------------------------------
-- 1) INSPECCIONES: instrumento de recolección de datos tipo
--    evaluación de campo (recorrido por las instalaciones).
--    Alineado a LOPCYMAT y a su Reglamento (RLOPCYMAT), a la
--    NT-01-2008 del INPSASEL y a las normas COVENIN aplicables
--    a la recepción y distribución de vehículos automotores.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS seguridad_inspecciones (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Planificada'
    CHECK (tipo IN ('Planificada','No planificada','Rutinaria','Especial')),
  area TEXT NOT NULL,
  ubicacion TEXT,
  inspector TEXT NOT NULL,
  participantes TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME,
  estado TEXT NOT NULL DEFAULT 'Borrador'
    CHECK (estado IN ('Borrador','En curso','Finalizada','Anulada')),
  resultado TEXT CHECK (resultado IN ('Conforme','No conforme')),
  recomendaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS seguridad_inspeccion_items (
  id BIGSERIAL PRIMARY KEY,
  inspeccion_id BIGINT NOT NULL REFERENCES seguridad_inspecciones(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  item TEXT NOT NULL,
  criterio TEXT,
  resultado TEXT CHECK (resultado IN ('Conforme','No conforme','N/A')),
  observacion TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seg_inspeccion_items_inspeccion
  ON seguridad_inspeccion_items (inspeccion_id);

-- ------------------------------------------------------------
-- 2) SERVICIO MÉDICO: registro de pacientes atendidos por la
--    unidad. Los pacientes pueden ser trabajadores activos
--    (plantilla_trabajadores) o candidatos en procesos de
--    captación (ats_candidatos).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS seguridad_servicio_medico (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME,
  tipo_paciente TEXT NOT NULL DEFAULT 'Trabajador'
    CHECK (tipo_paciente IN ('Trabajador','Candidato')),
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE SET NULL,
  candidato_id BIGINT REFERENCES ats_candidatos(id) ON DELETE SET NULL,
  cedula TEXT,
  nombre TEXT,
  cargo TEXT,
  unidad TEXT,
  tipo_atencion TEXT NOT NULL DEFAULT 'Consulta'
    CHECK (tipo_atencion IN ('Consulta','Emergencia','Curativo / Curas',
      'Entrega de medicamento','Examen ocupacional','Evaluación de seguimiento',
      'Vacunación','Otro')),
  motivo TEXT,
  diagnostico TEXT,
  tratamiento TEXT,
  apreciacion TEXT
    CHECK (apreciacion IN ('Apto','Apto con restricciones','No apto','En observación')),
  referido BOOLEAN NOT NULL DEFAULT FALSE,
  referido_a TEXT,
  atiende TEXT,
  estado TEXT NOT NULL DEFAULT 'Atendido'
    CHECK (estado IN ('Atendido','En observación','Referido','Cerrado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- ------------------------------------------------------------
-- 3) INVENTARIO DE EQUIPOS DE SEGURIDAD (EPP, extinción,
--    señalización, rescate y emergencias, ergonómicos...)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS seguridad_inventario_equipos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'EPP'
    CHECK (tipo IN ('EPP','Detección y extinción de incendios','Señalización',
      'Rescate y emergencias','Ergonómicos','Otro')),
  marca TEXT,
  modelo TEXT,
  serial TEXT,
  codigo TEXT,
  cantidad INTEGER NOT NULL DEFAULT 0,
  cantidad_minima INTEGER NOT NULL DEFAULT 0,
  ubicacion TEXT,
  fecha_vencimiento DATE,
  estado TEXT NOT NULL DEFAULT 'Disponible'
    CHECK (estado IN ('Disponible','Bajo stock','Agotado','Vencido','En reparación')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- ------------------------------------------------------------
-- 4) INVENTARIO DE INSUMOS Y MEDICAMENTOS (servicio médico,
--    botiquines y enfermería)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS seguridad_inventario_insumos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Insumo médico'
    CHECK (tipo IN ('Medicamento','Insumo médico','Botiquín','Otro')),
  presentacion TEXT,
  cantidad INTEGER NOT NULL DEFAULT 0,
  cantidad_minima INTEGER NOT NULL DEFAULT 0,
  lote TEXT,
  fecha_vencimiento DATE,
  ubicacion TEXT,
  estado TEXT NOT NULL DEFAULT 'Disponible'
    CHECK (estado IN ('Disponible','Bajo stock','Agotado','Vencido','Por vencer')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- ============================================
-- ROW LEVEL SECURITY (todos autenticados: CRUD)
-- ============================================

ALTER TABLE seguridad_inspecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_inspeccion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_servicio_medico ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_inventario_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_inventario_insumos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados ver inspecciones" ON seguridad_inspecciones;
CREATE POLICY "Autenticados ver inspecciones"
  ON seguridad_inspecciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear inspecciones" ON seguridad_inspecciones;
CREATE POLICY "Autenticados crear inspecciones"
  ON seguridad_inspecciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar inspecciones" ON seguridad_inspecciones;
CREATE POLICY "Autenticados actualizar inspecciones"
  ON seguridad_inspecciones FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar inspecciones" ON seguridad_inspecciones;
CREATE POLICY "Autenticados eliminar inspecciones"
  ON seguridad_inspecciones FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados ver items de inspeccion" ON seguridad_inspeccion_items;
CREATE POLICY "Autenticados ver items de inspeccion"
  ON seguridad_inspeccion_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear items de inspeccion" ON seguridad_inspeccion_items;
CREATE POLICY "Autenticados crear items de inspeccion"
  ON seguridad_inspeccion_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar items de inspeccion" ON seguridad_inspeccion_items;
CREATE POLICY "Autenticados actualizar items de inspeccion"
  ON seguridad_inspeccion_items FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar items de inspeccion" ON seguridad_inspeccion_items;
CREATE POLICY "Autenticados eliminar items de inspeccion"
  ON seguridad_inspeccion_items FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados ver servicio medico" ON seguridad_servicio_medico;
CREATE POLICY "Autenticados ver servicio medico"
  ON seguridad_servicio_medico FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear servicio medico" ON seguridad_servicio_medico;
CREATE POLICY "Autenticados crear servicio medico"
  ON seguridad_servicio_medico FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar servicio medico" ON seguridad_servicio_medico;
CREATE POLICY "Autenticados actualizar servicio medico"
  ON seguridad_servicio_medico FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar servicio medico" ON seguridad_servicio_medico;
CREATE POLICY "Autenticados eliminar servicio medico"
  ON seguridad_servicio_medico FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados ver inventario equipos" ON seguridad_inventario_equipos;
CREATE POLICY "Autenticados ver inventario equipos"
  ON seguridad_inventario_equipos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear inventario equipos" ON seguridad_inventario_equipos;
CREATE POLICY "Autenticados crear inventario equipos"
  ON seguridad_inventario_equipos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar inventario equipos" ON seguridad_inventario_equipos;
CREATE POLICY "Autenticados actualizar inventario equipos"
  ON seguridad_inventario_equipos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar inventario equipos" ON seguridad_inventario_equipos;
CREATE POLICY "Autenticados eliminar inventario equipos"
  ON seguridad_inventario_equipos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados ver inventario insumos" ON seguridad_inventario_insumos;
CREATE POLICY "Autenticados ver inventario insumos"
  ON seguridad_inventario_insumos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear inventario insumos" ON seguridad_inventario_insumos;
CREATE POLICY "Autenticados crear inventario insumos"
  ON seguridad_inventario_insumos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar inventario insumos" ON seguridad_inventario_insumos;
CREATE POLICY "Autenticados actualizar inventario insumos"
  ON seguridad_inventario_insumos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar inventario insumos" ON seguridad_inventario_insumos;
CREATE POLICY "Autenticados eliminar inventario insumos"
  ON seguridad_inventario_insumos FOR DELETE TO authenticated USING (true);

-- ============================================
-- FIN DEL MÓDULO SEGURIDAD Y SALUD LABORAL
-- ============================================
