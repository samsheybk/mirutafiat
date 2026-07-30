-- ============================================
-- FIAT Venezuela - Intranet Database Schema
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- Tabla: Captación y Selección de Personal
CREATE TABLE captacion_procesos (
  id BIGSERIAL PRIMARY KEY,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  vacantes INTEGER NOT NULL DEFAULT 1,
  fecha_inicio DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Abierto',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE captacion_procesos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer captacion"
  ON captacion_procesos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar captacion"
  ON captacion_procesos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar captacion"
  ON captacion_procesos FOR UPDATE TO authenticated USING (true);

-- Tabla: Relaciones Laborales
CREATE TABLE relaciones_registros (
  id BIGSERIAL PRIMARY KEY,
  trabajador TEXT NOT NULL,
  tipo TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Activo',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE relaciones_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer relaciones"
  ON relaciones_registros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar relaciones"
  ON relaciones_registros FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar relaciones"
  ON relaciones_registros FOR UPDATE TO authenticated USING (true);

-- Tabla: Capacitación y Desarrollo
CREATE TABLE capacitacion_cursos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  instructor TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  duracion INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Programado',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE capacitacion_cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer capacitacion"
  ON capacitacion_cursos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar capacitacion"
  ON capacitacion_cursos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar capacitacion"
  ON capacitacion_cursos FOR UPDATE TO authenticated USING (true);

-- Tabla: Bienestar Social
CREATE TABLE bienestar_programas (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  responsable TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  estado TEXT NOT NULL DEFAULT 'Activo',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE bienestar_programas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer bienestar"
  ON bienestar_programas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar bienestar"
  ON bienestar_programas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar bienestar"
  ON bienestar_programas FOR UPDATE TO authenticated USING (true);

-- Tabla: Seguridad y Salud Laboral
CREATE TABLE seguridad_incidentes (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  ubicacion TEXT NOT NULL,
  fecha DATE NOT NULL,
  gravedad TEXT NOT NULL DEFAULT 'Baja',
  estado TEXT NOT NULL DEFAULT 'Reportado',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE seguridad_incidentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer seguridad"
  ON seguridad_incidentes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar seguridad"
  ON seguridad_incidentes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar seguridad"
  ON seguridad_incidentes FOR UPDATE TO authenticated USING (true);

-- Tabla: Compensación
CREATE TABLE compensacion_registros (
  id BIGSERIAL PRIMARY KEY,
  trabajador TEXT NOT NULL,
  cargo TEXT NOT NULL,
  salario_base NUMERIC(12,2) NOT NULL,
  bonificacion NUMERIC(12,2) DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Activo',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE compensacion_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer compensacion"
  ON compensacion_registros FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar compensacion"
  ON compensacion_registros FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar compensacion"
  ON compensacion_registros FOR UPDATE TO authenticated USING (true);

-- Tabla: ATS Candidatos (para kanban de Captación)
CREATE TABLE ats_candidatos (
  id BIGSERIAL PRIMARY KEY,
  cedula TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  correo TEXT,
  telefono TEXT,
  direccion TEXT,
  foto_url TEXT,
  cargo_interes TEXT NOT NULL,
  estado_kanban TEXT NOT NULL DEFAULT 'Nuevo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE ats_candidatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ats"
  ON ats_candidatos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar ats"
  ON ats_candidatos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ats"
  ON ats_candidatos FOR UPDATE TO authenticated USING (true);

-- Tabla: Log de cambios de estado en ATS
CREATE TABLE ats_log_estados (
  id BIGSERIAL PRIMARY KEY,
  candidato_id BIGINT NOT NULL REFERENCES ats_candidatos(id) ON DELETE CASCADE,
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ats_log_estados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer logs"
  ON ats_log_estados FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar logs"
  ON ats_log_estados FOR INSERT TO authenticated WITH CHECK (true);

-- Tabla: Comentarios de candidatos
CREATE TABLE ats_comentarios (
  id BIGSERIAL PRIMARY KEY,
  candidato_id BIGINT NOT NULL REFERENCES ats_candidatos(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ats_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer comentarios"
  ON ats_comentarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar comentarios"
  ON ats_comentarios FOR INSERT TO authenticated WITH CHECK (true);
