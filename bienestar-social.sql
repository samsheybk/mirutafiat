-- ============================================
-- FIAT Venezuela - Intranet: MÓDULO BIENESTAR SOCIAL
-- Tablas para las herramientas: Préstamos, Pólizas, Historias,
-- Encuestas y Calendario. (La plantilla usa plantilla_trabajadores).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ============================================

CREATE TABLE IF NOT EXISTS bienestar_prestamos (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE SET NULL,
  monto NUMERIC(12,2) NOT NULL,
  cuotas INTEGER NOT NULL DEFAULT 1,
  cuota_actual INTEGER NOT NULL DEFAULT 1,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Pagado','Cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS bienestar_polizas (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  proveedor TEXT,
  tipo TEXT,
  cobertura TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa','Vencida','Cancelada')),
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS bienestar_historias (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  autor TEXT,
  foto_url TEXT,
  contenido TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'Publicada' CHECK (estado IN ('Publicada','Borrador','Archivada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS bienestar_encuestas (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa','Pendiente','Cerrada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS bienestar_calendario (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  lugar TEXT,
  tipo TEXT NOT NULL DEFAULT 'Actividad',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE bienestar_prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_historias ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_calendario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver prestamos" ON bienestar_prestamos;
CREATE POLICY "Usuarios autenticados pueden ver prestamos"
  ON bienestar_prestamos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear prestamos" ON bienestar_prestamos;
CREATE POLICY "Usuarios autenticados pueden crear prestamos"
  ON bienestar_prestamos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar prestamos" ON bienestar_prestamos;
CREATE POLICY "Usuarios autenticados pueden actualizar prestamos"
  ON bienestar_prestamos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar prestamos" ON bienestar_prestamos;
CREATE POLICY "Usuarios autenticados pueden eliminar prestamos"
  ON bienestar_prestamos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver polizas" ON bienestar_polizas;
CREATE POLICY "Usuarios autenticados pueden ver polizas"
  ON bienestar_polizas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear polizas" ON bienestar_polizas;
CREATE POLICY "Usuarios autenticados pueden crear polizas"
  ON bienestar_polizas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar polizas" ON bienestar_polizas;
CREATE POLICY "Usuarios autenticados pueden actualizar polizas"
  ON bienestar_polizas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar polizas" ON bienestar_polizas;
CREATE POLICY "Usuarios autenticados pueden eliminar polizas"
  ON bienestar_polizas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver historias" ON bienestar_historias;
CREATE POLICY "Usuarios autenticados pueden ver historias"
  ON bienestar_historias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear historias" ON bienestar_historias;
CREATE POLICY "Usuarios autenticados pueden crear historias"
  ON bienestar_historias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar historias" ON bienestar_historias;
CREATE POLICY "Usuarios autenticados pueden actualizar historias"
  ON bienestar_historias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar historias" ON bienestar_historias;
CREATE POLICY "Usuarios autenticados pueden eliminar historias"
  ON bienestar_historias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver encuestas" ON bienestar_encuestas;
CREATE POLICY "Usuarios autenticados pueden ver encuestas"
  ON bienestar_encuestas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear encuestas" ON bienestar_encuestas;
CREATE POLICY "Usuarios autenticados pueden crear encuestas"
  ON bienestar_encuestas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar encuestas" ON bienestar_encuestas;
CREATE POLICY "Usuarios autenticados pueden actualizar encuestas"
  ON bienestar_encuestas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar encuestas" ON bienestar_encuestas;
CREATE POLICY "Usuarios autenticados pueden eliminar encuestas"
  ON bienestar_encuestas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver calendario" ON bienestar_calendario;
CREATE POLICY "Usuarios autenticados pueden ver calendario"
  ON bienestar_calendario FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear calendario" ON bienestar_calendario;
CREATE POLICY "Usuarios autenticados pueden crear calendario"
  ON bienestar_calendario FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar calendario" ON bienestar_calendario;
CREATE POLICY "Usuarios autenticados pueden actualizar calendario"
  ON bienestar_calendario FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar calendario" ON bienestar_calendario;
CREATE POLICY "Usuarios autenticados pueden eliminar calendario"
  ON bienestar_calendario FOR DELETE TO authenticated USING (true);

-- ============================================
-- ENCUESTAS: preguntas y respuestas de trabajadores
-- ============================================

CREATE TABLE IF NOT EXISTS bienestar_encuesta_preguntas (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES bienestar_encuestas(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bienestar_encuesta_respuestas (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES bienestar_encuestas(id) ON DELETE CASCADE,
  pregunta_id BIGINT NOT NULL REFERENCES bienestar_encuesta_preguntas(id) ON DELETE CASCADE,
  cedula TEXT,
  nombre TEXT,
  opcion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bienestar_encuesta_respuestas
  ON bienestar_encuesta_respuestas (encuesta_id, cedula, pregunta_id);

ALTER TABLE bienestar_encuesta_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_encuesta_respuestas ENABLE ROW LEVEL SECURITY;

-- Público (trabajadores sin sesión): solo encuestas ACTIVAS y sus preguntas
DROP POLICY IF EXISTS "Público puede ver encuestas activas" ON bienestar_encuestas;
CREATE POLICY "Público puede ver encuestas activas"
  ON bienestar_encuestas FOR SELECT TO anon USING (estado = 'Activa');

DROP POLICY IF EXISTS "Público puede ver preguntas de encuestas activas" ON bienestar_encuesta_preguntas;
CREATE POLICY "Público puede ver preguntas de encuestas activas"
  ON bienestar_encuesta_preguntas FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM bienestar_encuestas e WHERE e.id = encuesta_id AND e.estado = 'Activa'));

-- Público: puede enviar respuestas, pero NO leer las respuestas de otros
DROP POLICY IF EXISTS "Público puede responder encuestas" ON bienestar_encuesta_respuestas;
CREATE POLICY "Público puede responder encuestas"
  ON bienestar_encuesta_respuestas FOR INSERT TO anon WITH CHECK (true);

-- Administración (autenticados): CRUD de preguntas y lectura/borrado de respuestas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver preguntas" ON bienestar_encuesta_preguntas;
CREATE POLICY "Usuarios autenticados pueden ver preguntas"
  ON bienestar_encuesta_preguntas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear preguntas" ON bienestar_encuesta_preguntas;
CREATE POLICY "Usuarios autenticados pueden crear preguntas"
  ON bienestar_encuesta_preguntas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar preguntas" ON bienestar_encuesta_preguntas;
CREATE POLICY "Usuarios autenticados pueden actualizar preguntas"
  ON bienestar_encuesta_preguntas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar preguntas" ON bienestar_encuesta_preguntas;
CREATE POLICY "Usuarios autenticados pueden eliminar preguntas"
  ON bienestar_encuesta_preguntas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver respuestas" ON bienestar_encuesta_respuestas;
CREATE POLICY "Usuarios autenticados pueden ver respuestas"
  ON bienestar_encuesta_respuestas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar respuestas" ON bienestar_encuesta_respuestas;
CREATE POLICY "Usuarios autenticados pueden eliminar respuestas"
  ON bienestar_encuesta_respuestas FOR DELETE TO authenticated USING (true);
