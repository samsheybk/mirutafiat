-- ============================================
-- FIAT Venezuela - Intranet: ESQUEMA COMPLETO DE BASE DE DATOS
-- Unifica todos los scripts del repositorio en un solo archivo.
-- Ejecutar en el SQL Editor de Supabase.
-- Es idempotente: se puede re-ejecutar sin errores.
-- ============================================

-- ============================================
-- 1) MÓDULOS BASE (dashboard y módulos simples)
-- ============================================

CREATE TABLE IF NOT EXISTS captacion_procesos (
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

CREATE TABLE IF NOT EXISTS relaciones_registros (
  id BIGSERIAL PRIMARY KEY,
  trabajador TEXT NOT NULL,
  tipo TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Activo',
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS capacitacion_cursos (
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

CREATE TABLE IF NOT EXISTS bienestar_programas (
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

CREATE TABLE IF NOT EXISTS seguridad_incidentes (
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

CREATE TABLE IF NOT EXISTS compensacion_registros (
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

-- ============================================
-- 2) ESTRUCTURA ORGANIZACIONAL
-- ============================================

CREATE TABLE IF NOT EXISTS est_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('DIRECCION', 'GERENCIA', 'DEPARTAMENTO')),
  unidad_padre_id UUID REFERENCES est_unidades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS est_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  unidad_id UUID NOT NULL REFERENCES est_unidades(id) ON DELETE RESTRICT,
  jefe_inmediato_id UUID REFERENCES est_cargos(id) ON DELETE SET NULL,
  vacantes INTEGER DEFAULT 0,
  ocupacion_fisica_sede TEXT,
  ocupacion_fisica_ciudad TEXT,
  ocupacion_fisica_estado TEXT,
  ocupacion_fisica_codigo TEXT,
  proposito_general TEXT,
  finalidades TEXT,
  responsabilidades TEXT,
  alcance_reporta_directo TEXT,
  alcance_reporta_indirecto TEXT,
  alcance_relaciones_internas TEXT,
  alcance_relaciones_externas TEXT,
  perfil_area_formacion TEXT,
  perfil_nivel_formacion TEXT,
  perfil_area_experiencia TEXT,
  perfil_tiempo_experiencia TEXT,
  perfil_sexo TEXT,
  perfil_edad TEXT,
  perfil_estado_civil TEXT,
  perfil_zona_residencia TEXT,
  perfil_vehiculo TEXT,
  perfil_otros TEXT,
  competencias_conocimientos TEXT,
  competencias_habilidades TEXT,
  autoridad TEXT,
  ambiente_riesgos TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3) ATS - CAPTACIÓN Y SELECCIÓN
-- ============================================

CREATE TABLE IF NOT EXISTS ats_candidatos (
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

CREATE TABLE IF NOT EXISTS ats_log_estados (
  id BIGSERIAL PRIMARY KEY,
  candidato_id BIGINT NOT NULL REFERENCES ats_candidatos(id) ON DELETE CASCADE,
  estado_anterior TEXT NOT NULL,
  estado_nuevo TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ats_comentarios (
  id BIGSERIAL PRIMARY KEY,
  candidato_id BIGINT NOT NULL REFERENCES ats_candidatos(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requisiciones_solicitudes (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('nuevo_cargo', 'aumento_vacantes')),
  cargo_id UUID REFERENCES est_cargos(id),
  unidad_id UUID REFERENCES est_unidades(id),
  cargo_titulo TEXT,
  vacantes_solicitadas INTEGER NOT NULL DEFAULT 1,
  justificacion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
  creado_por UUID,
  creado_por_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4) PLANTILLA ACTIVA Y PERFIL DEL TRABAJADOR
-- ============================================

CREATE TABLE IF NOT EXISTS plantilla_trabajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id BIGINT REFERENCES ats_candidatos(id),
  cedula TEXT NOT NULL,
  codigo_nomina TEXT,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  correo TEXT,
  telefono TEXT,
  direccion TEXT,
  foto_url TEXT,
  cargo_id UUID REFERENCES est_cargos(id),
  unidad_id UUID REFERENCES est_unidades(id),
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_egreso DATE,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Suspendido','Retirado')),
  fecha_nacimiento DATE,
  lugar_nacimiento TEXT,
  sexo TEXT,
  estado_civil TEXT,
  talla_camisa TEXT,
  talla_pantalon TEXT,
  talla_calzado TEXT,
  talla_franela TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trabajador_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  numero TEXT,
  fecha_emision DATE,
  fecha_vencimiento DATE,
  archivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trabajador_carga_familiar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  parentesco TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cedula TEXT,
  fecha_nacimiento DATE,
  sexo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4.1) RELACIONES LABORALES - CONCEPTOS Y EQUIPOS
-- ============================================

CREATE TABLE IF NOT EXISTS rl_conceptos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rl_equipos (
  id BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'Otro' CHECK (tipo IN ('Vehículo','Teléfono','Tablet','Laptop','Otro')),
  descripcion TEXT,
  marca TEXT,
  modelo TEXT,
  serial TEXT,
  codigo TEXT,
  estado TEXT NOT NULL DEFAULT 'Disponible' CHECK (estado IN ('Disponible','Asignado','En mantenimiento','Baja')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rl_asignaciones (
  id BIGSERIAL PRIMARY KEY,
  equipo_id BIGINT NOT NULL REFERENCES rl_equipos(id) ON DELETE CASCADE,
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_devolucion DATE,
  estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa','Devuelta')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rl_actas (
  id BIGSERIAL PRIMARY KEY,
  tema TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  participantes TEXT,
  estado TEXT NOT NULL DEFAULT 'Programada' CHECK (estado IN ('Programada','Realizada','Pendiente','Cancelada')),
  descripcion TEXT,
  acuerdos TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rl_acta_acuerdos (
  id BIGSERIAL PRIMARY KEY,
  acta_id BIGINT NOT NULL REFERENCES rl_actas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  fecha_tope DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rl_acta_acuerdos_acta_id ON rl_acta_acuerdos (acta_id);

ALTER TABLE relaciones_registros ADD COLUMN IF NOT EXISTS trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE SET NULL;
ALTER TABLE relaciones_registros ADD COLUMN IF NOT EXISTS concepto_id BIGINT REFERENCES rl_conceptos(id) ON DELETE SET NULL;

-- ============================================
-- 5) REPOSITORIO
-- ============================================

CREATE TABLE IF NOT EXISTS repo_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT DEFAULT '📁',
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repo_subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES repo_categorias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, nombre)
);

CREATE TABLE IF NOT EXISTS repo_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID NOT NULL REFERENCES repo_categorias(id) ON DELETE RESTRICT,
  subcategoria_id UUID REFERENCES repo_subcategorias(id) ON DELETE SET NULL,
  archivo_url TEXT NOT NULL,
  archivo_nombre TEXT NOT NULL,
  archivo_tipo TEXT NOT NULL,
  archivo_tamano BIGINT NOT NULL,
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  fecha_vigencia DATE,
  password_hash TEXT,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repo_notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES repo_documentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nuevo_documento', 'nueva_version')),
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repo_documentos_categoria ON repo_documentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_repo_documentos_subcategoria ON repo_documentos(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_repo_documentos_tags ON repo_documentos USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_repo_subcategorias_categoria ON repo_subcategorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_repo_notificaciones_usuario ON repo_notificaciones(usuario_id, leido);
CREATE INDEX IF NOT EXISTS idx_repo_notificaciones_documento ON repo_notificaciones(documento_id);

-- ============================================
-- 6) REPARAR ESQUEMAS EXISTENTES (idempotente)
--    Agrega columnas que se crearon después de la versión inicial.
-- ============================================

ALTER TABLE ats_candidatos ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE ats_log_estados ADD COLUMN IF NOT EXISTS changed_by_email TEXT;

ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS vacantes INTEGER DEFAULT 0;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS ocupacion_fisica_sede TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS ocupacion_fisica_ciudad TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS ocupacion_fisica_estado TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS ocupacion_fisica_codigo TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS proposito_general TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS finalidades TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS responsabilidades TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS alcance_reporta_directo TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS alcance_reporta_indirecto TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS alcance_relaciones_internas TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS alcance_relaciones_externas TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_area_formacion TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_nivel_formacion TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_area_experiencia TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_tiempo_experiencia TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_sexo TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_edad TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_estado_civil TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_zona_residencia TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_vehiculo TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS perfil_otros TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS competencias_conocimientos TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS competencias_habilidades TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS autoridad TEXT;
ALTER TABLE est_cargos ADD COLUMN IF NOT EXISTS ambiente_riesgos TEXT;

  ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS foto_url TEXT;
  ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS codigo_nomina TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS lugar_nacimiento TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS estado_civil TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS talla_camisa TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS talla_pantalon TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS talla_calzado TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS talla_franela TEXT;
ALTER TABLE plantilla_trabajadores ADD COLUMN IF NOT EXISTS conducta_civil TEXT;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE captacion_procesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE relaciones_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitacion_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensacion_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE est_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE est_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_log_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisiciones_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador_carga_familiar ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_acta_acuerdos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_notificaciones ENABLE ROW LEVEL SECURITY;

-- --- Módulos base ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer captacion" ON captacion_procesos;
CREATE POLICY "Usuarios autenticados pueden leer captacion"
  ON captacion_procesos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar captacion" ON captacion_procesos;
CREATE POLICY "Usuarios autenticados pueden insertar captacion"
  ON captacion_procesos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar captacion" ON captacion_procesos;
CREATE POLICY "Usuarios autenticados pueden actualizar captacion"
  ON captacion_procesos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer relaciones" ON relaciones_registros;
CREATE POLICY "Usuarios autenticados pueden leer relaciones"
  ON relaciones_registros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar relaciones" ON relaciones_registros;
CREATE POLICY "Usuarios autenticados pueden insertar relaciones"
  ON relaciones_registros FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar relaciones" ON relaciones_registros;
CREATE POLICY "Usuarios autenticados pueden actualizar relaciones"
  ON relaciones_registros FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar relaciones" ON relaciones_registros;
CREATE POLICY "Usuarios autenticados pueden eliminar relaciones"
  ON relaciones_registros FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver conceptos" ON rl_conceptos;
CREATE POLICY "Usuarios autenticados pueden ver conceptos"
  ON rl_conceptos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear conceptos" ON rl_conceptos;
CREATE POLICY "Usuarios autenticados pueden crear conceptos"
  ON rl_conceptos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar conceptos" ON rl_conceptos;
CREATE POLICY "Usuarios autenticados pueden actualizar conceptos"
  ON rl_conceptos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar conceptos" ON rl_conceptos;
CREATE POLICY "Usuarios autenticados pueden eliminar conceptos"
  ON rl_conceptos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver equipos" ON rl_equipos;
CREATE POLICY "Usuarios autenticados pueden ver equipos"
  ON rl_equipos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear equipos" ON rl_equipos;
CREATE POLICY "Usuarios autenticados pueden crear equipos"
  ON rl_equipos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar equipos" ON rl_equipos;
CREATE POLICY "Usuarios autenticados pueden actualizar equipos"
  ON rl_equipos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar equipos" ON rl_equipos;
CREATE POLICY "Usuarios autenticados pueden eliminar equipos"
  ON rl_equipos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver asignaciones" ON rl_asignaciones;
CREATE POLICY "Usuarios autenticados pueden ver asignaciones"
  ON rl_asignaciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear asignaciones" ON rl_asignaciones;
CREATE POLICY "Usuarios autenticados pueden crear asignaciones"
  ON rl_asignaciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar asignaciones" ON rl_asignaciones;
CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON rl_asignaciones FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar asignaciones" ON rl_asignaciones;
CREATE POLICY "Usuarios autenticados pueden eliminar asignaciones"
  ON rl_asignaciones FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver actas" ON rl_actas;
CREATE POLICY "Usuarios autenticados pueden ver actas"
  ON rl_actas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear actas" ON rl_actas;
CREATE POLICY "Usuarios autenticados pueden crear actas"
  ON rl_actas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar actas" ON rl_actas;
CREATE POLICY "Usuarios autenticados pueden actualizar actas"
  ON rl_actas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar actas" ON rl_actas;
CREATE POLICY "Usuarios autenticados pueden eliminar actas"
  ON rl_actas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver acuerdos de actas" ON rl_acta_acuerdos;
CREATE POLICY "Usuarios autenticados pueden ver acuerdos de actas"
  ON rl_acta_acuerdos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear acuerdos de actas" ON rl_acta_acuerdos;
CREATE POLICY "Usuarios autenticados pueden crear acuerdos de actas"
  ON rl_acta_acuerdos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar acuerdos de actas" ON rl_acta_acuerdos;
CREATE POLICY "Usuarios autenticados pueden actualizar acuerdos de actas"
  ON rl_acta_acuerdos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar acuerdos de actas" ON rl_acta_acuerdos;
CREATE POLICY "Usuarios autenticados pueden eliminar acuerdos de actas"
  ON rl_acta_acuerdos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer capacitacion" ON capacitacion_cursos;
CREATE POLICY "Usuarios autenticados pueden leer capacitacion"
  ON capacitacion_cursos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar capacitacion" ON capacitacion_cursos;
CREATE POLICY "Usuarios autenticados pueden insertar capacitacion"
  ON capacitacion_cursos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar capacitacion" ON capacitacion_cursos;
CREATE POLICY "Usuarios autenticados pueden actualizar capacitacion"
  ON capacitacion_cursos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer bienestar" ON bienestar_programas;
CREATE POLICY "Usuarios autenticados pueden leer bienestar"
  ON bienestar_programas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar bienestar" ON bienestar_programas;
CREATE POLICY "Usuarios autenticados pueden insertar bienestar"
  ON bienestar_programas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar bienestar" ON bienestar_programas;
CREATE POLICY "Usuarios autenticados pueden actualizar bienestar"
  ON bienestar_programas FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer seguridad" ON seguridad_incidentes;
CREATE POLICY "Usuarios autenticados pueden leer seguridad"
  ON seguridad_incidentes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar seguridad" ON seguridad_incidentes;
CREATE POLICY "Usuarios autenticados pueden insertar seguridad"
  ON seguridad_incidentes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar seguridad" ON seguridad_incidentes;
CREATE POLICY "Usuarios autenticados pueden actualizar seguridad"
  ON seguridad_incidentes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer compensacion" ON compensacion_registros;
CREATE POLICY "Usuarios autenticados pueden leer compensacion"
  ON compensacion_registros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar compensacion" ON compensacion_registros;
CREATE POLICY "Usuarios autenticados pueden insertar compensacion"
  ON compensacion_registros FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar compensacion" ON compensacion_registros;
CREATE POLICY "Usuarios autenticados pueden actualizar compensacion"
  ON compensacion_registros FOR UPDATE TO authenticated USING (true);

-- --- Estructura organizacional ---
DROP POLICY IF EXISTS "Todos pueden leer unidades" ON est_unidades;
CREATE POLICY "Todos pueden leer unidades" ON est_unidades FOR SELECT USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar unidades" ON est_unidades;
CREATE POLICY "Todos pueden insertar unidades" ON est_unidades FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar unidades" ON est_unidades;
CREATE POLICY "Todos pueden actualizar unidades" ON est_unidades FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Todos pueden eliminar unidades" ON est_unidades;
CREATE POLICY "Todos pueden eliminar unidades" ON est_unidades FOR DELETE USING (true);

DROP POLICY IF EXISTS "Todos pueden leer cargos" ON est_cargos;
CREATE POLICY "Todos pueden leer cargos" ON est_cargos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar cargos" ON est_cargos;
CREATE POLICY "Todos pueden insertar cargos" ON est_cargos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar cargos" ON est_cargos;
CREATE POLICY "Todos pueden actualizar cargos" ON est_cargos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Todos pueden eliminar cargos" ON est_cargos;
CREATE POLICY "Todos pueden eliminar cargos" ON est_cargos FOR DELETE USING (true);

-- --- ATS ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer ats" ON ats_candidatos;
CREATE POLICY "Usuarios autenticados pueden leer ats"
  ON ats_candidatos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar ats" ON ats_candidatos;
CREATE POLICY "Usuarios autenticados pueden insertar ats"
  ON ats_candidatos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar ats" ON ats_candidatos;
CREATE POLICY "Usuarios autenticados pueden actualizar ats"
  ON ats_candidatos FOR UPDATE TO authenticated USING (true);

-- Postulaciones públicas (permite insertar como anónimo desde /postulacion/)
DROP POLICY IF EXISTS "Permitir postulaciones públicas" ON ats_candidatos;
CREATE POLICY "Permitir postulaciones públicas"
  ON ats_candidatos FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer logs" ON ats_log_estados;
CREATE POLICY "Usuarios autenticados pueden leer logs"
  ON ats_log_estados FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar logs" ON ats_log_estados;
CREATE POLICY "Usuarios autenticados pueden insertar logs"
  ON ats_log_estados FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer comentarios" ON ats_comentarios;
CREATE POLICY "Usuarios autenticados pueden leer comentarios"
  ON ats_comentarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar comentarios" ON ats_comentarios;
CREATE POLICY "Usuarios autenticados pueden insertar comentarios"
  ON ats_comentarios FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo" ON requisiciones_solicitudes;
CREATE POLICY "Permitir todo" ON requisiciones_solicitudes FOR ALL USING (true) WITH CHECK (true);

-- --- Plantilla activa y perfil del trabajador ---
DROP POLICY IF EXISTS "Todos pueden leer plantilla" ON plantilla_trabajadores;
CREATE POLICY "Todos pueden leer plantilla"
  ON plantilla_trabajadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar plantilla" ON plantilla_trabajadores;
CREATE POLICY "Todos pueden insertar plantilla"
  ON plantilla_trabajadores FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar plantilla" ON plantilla_trabajadores;
CREATE POLICY "Todos pueden actualizar plantilla"
  ON plantilla_trabajadores FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden eliminar plantilla" ON plantilla_trabajadores;
CREATE POLICY "Todos pueden eliminar plantilla"
  ON plantilla_trabajadores FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Todos pueden leer documentos" ON trabajador_documentos;
CREATE POLICY "Todos pueden leer documentos"
  ON trabajador_documentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar documentos" ON trabajador_documentos;
CREATE POLICY "Todos pueden insertar documentos"
  ON trabajador_documentos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar documentos" ON trabajador_documentos;
CREATE POLICY "Todos pueden actualizar documentos"
  ON trabajador_documentos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden eliminar documentos" ON trabajador_documentos;
CREATE POLICY "Todos pueden eliminar documentos"
  ON trabajador_documentos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Todos pueden leer carga familiar" ON trabajador_carga_familiar;
CREATE POLICY "Todos pueden leer carga familiar"
  ON trabajador_carga_familiar FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar carga familiar" ON trabajador_carga_familiar;
CREATE POLICY "Todos pueden insertar carga familiar"
  ON trabajador_carga_familiar FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar carga familiar" ON trabajador_carga_familiar;
CREATE POLICY "Todos pueden actualizar carga familiar"
  ON trabajador_carga_familiar FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Todos pueden eliminar carga familiar" ON trabajador_carga_familiar;
CREATE POLICY "Todos pueden eliminar carga familiar"
  ON trabajador_carga_familiar FOR DELETE TO authenticated USING (true);

-- --- Repositorio ---
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver categorías" ON repo_categorias;
CREATE POLICY "Usuarios autenticados pueden ver categorías"
  ON repo_categorias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear categorías" ON repo_categorias;
CREATE POLICY "Usuarios autenticados pueden crear categorías"
  ON repo_categorias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar categorías" ON repo_categorias;
CREATE POLICY "Usuarios autenticados pueden actualizar categorías"
  ON repo_categorias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar categorías" ON repo_categorias;
CREATE POLICY "Usuarios autenticados pueden eliminar categorías"
  ON repo_categorias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver subcategorías" ON repo_subcategorias;
CREATE POLICY "Usuarios autenticados pueden ver subcategorías"
  ON repo_subcategorias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear subcategorías" ON repo_subcategorias;
CREATE POLICY "Usuarios autenticados pueden crear subcategorías"
  ON repo_subcategorias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar subcategorías" ON repo_subcategorias;
CREATE POLICY "Usuarios autenticados pueden actualizar subcategorías"
  ON repo_subcategorias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar subcategorías" ON repo_subcategorias;
CREATE POLICY "Usuarios autenticados pueden eliminar subcategorías"
  ON repo_subcategorias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos" ON repo_documentos;
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON repo_documentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos" ON repo_documentos;
CREATE POLICY "Usuarios autenticados pueden subir documentos"
  ON repo_documentos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar documentos" ON repo_documentos;
CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON repo_documentos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos" ON repo_documentos;
CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON repo_documentos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios pueden ver sus propias notificaciones" ON repo_notificaciones;
CREATE POLICY "Usuarios pueden ver sus propias notificaciones"
  ON repo_notificaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR usuario_id IS NULL);
DROP POLICY IF EXISTS "Usuarios pueden crear notificaciones" ON repo_notificaciones;
CREATE POLICY "Usuarios pueden crear notificaciones"
  ON repo_notificaciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propias notificaciones" ON repo_notificaciones;
CREATE POLICY "Usuarios pueden actualizar sus propias notificaciones"
  ON repo_notificaciones FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- ============================================
-- FUNCIONES Y TRIGGERS AUXILIARES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_repo_categorias_updated_at ON repo_categorias;
CREATE TRIGGER update_repo_categorias_updated_at
  BEFORE UPDATE ON repo_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repo_subcategorias_updated_at ON repo_subcategorias;
CREATE TRIGGER update_repo_subcategorias_updated_at
  BEFORE UPDATE ON repo_subcategorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_repo_documentos_updated_at ON repo_documentos;
CREATE TRIGGER update_repo_documentos_updated_at
  BEFORE UPDATE ON repo_documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rl_conceptos_updated_at ON rl_conceptos;
CREATE TRIGGER update_rl_conceptos_updated_at
  BEFORE UPDATE ON rl_conceptos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rl_equipos_updated_at ON rl_equipos;
CREATE TRIGGER update_rl_equipos_updated_at
  BEFORE UPDATE ON rl_equipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rl_asignaciones_updated_at ON rl_asignaciones;
CREATE TRIGGER update_rl_asignaciones_updated_at
  BEFORE UPDATE ON rl_asignaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rl_actas_updated_at ON rl_actas;
CREATE TRIGGER update_rl_actas_updated_at
  BEFORE UPDATE ON rl_actas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Categorías de repositorio (solo si no existen)
INSERT INTO repo_categorias (nombre, descripcion, icono, color) VALUES
  ('Formatos', 'Formatos y plantillas oficiales', '📋', '#3b82f6'),
  ('Manuales', 'Manuales de procedimientos y políticas', '📚', '#10b981'),
  ('Material de Apoyo', 'Documentos de consulta y referencia', '📖', '#f59e0b'),
  ('Normativas', 'Normas y regulaciones', '⚖️', '#ef4444')
ON CONFLICT (nombre) DO NOTHING;

-- Candidatos de ejemplo (solo si la tabla está vacía)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM ats_candidatos) = 0 THEN
    INSERT INTO ats_candidatos (cedula, nombres, apellidos, correo, telefono, direccion, cargo_interes, estado_kanban, notas) VALUES
    ('V12345678', 'JUAN CARLOS', 'PEREZ GONZALEZ', 'juan.perez@gmail.com', '04121234567', 'AV PRINCIPAL URB LA FLORESTA', 'ANALISTA DE SELECCION', 'Nuevo', 'CONTACTADO POR LINKEDIN'),
    ('V23456789', 'MARIA ISABEL', 'RODRIGUEZ LOPEZ', 'maria.rodriguez@hotmail.com', '04141234567', 'CC LOS CHAGUARAMOS', 'RECLUTADOR SENIOR', 'Contacto', 'LLAMAR MAÑANA'),
    ('V34567890', 'PEDRO JOSE', 'MARTINEZ SILVA', 'pedro.martinez@yahoo.com', '04161234567', 'URB EL PRADO', 'ESPECIALISTA EN COMPENSACION', 'Entrevista', 'SEGUNDA ENTREVISTA PENDIENTE'),
    ('V45678901', 'ANA VICTORIA', 'HERNANDEZ BLANCO', 'ana.hernandez@gmail.com', '04241234567', 'SECTOR BELLA VISTA', 'ANALISTA DE NOMINA', 'Tecnica', 'PRUEBA TECNICA PROGRAMADA'),
    ('V56789012', 'JOSE RAFAEL', 'GARCIA TORRES', 'jose.garcia@correo.com', '04261234567', 'URB LAS ACACIAS', 'COORDINADOR DE TALENTO', 'Medica', 'EXAMEN MEDICO ENVIADO'),
    ('V67890123', 'CARLOS ALBERTO', 'LOPEZ MENDOZA', 'carlos.lopez@gmail.com', '04121239876', 'AV FRANCISCO DE MIRANDA', 'GERENTE DE RH', 'Elegible', 'OFERTA ENVIADA'),
    ('V78901234', 'LAURA CAROLINA', 'DIAZ SANCHEZ', 'laura.diaz@empresa.com', '04141239876', 'URB SANTA MONICA', 'ANALISTA DE CAPACITACION', 'No elegible', 'NO CUMPLE PERFIL'),
    ('E89123456', 'JOHN WILLIAM', 'SMITH BROWN', 'john.smith@mail.com', '04161239876', 'AV PRINCIPAL LAS MERCEDES', 'CONSULTOR DE RH', 'Nuevo', 'EXTRANJERO CON PERMISO'),
    ('V90123456', 'DANIELA ANDREA', 'TORRES MEJIA', 'daniela.torres@gmail.com', '04241239876', 'SECTOR PLAZA VENEZUELA', 'RECLUTADOR JUNIOR', 'Contacto', 'POSTULACION RECIENTE'),
    ('V01234567', 'FREDDY ALONSO', 'RAMIREZ CASTILLO', 'freddy.ramirez@yahoo.com', '04261239876', 'URB BOYACA', 'ANALISTA DE SELECCION', 'Entrevista', 'PROGRAMAR ENTREVISTA'),
    ('V11111111', 'ALEJANDRO JOSE', 'SUAREZ PARRA', 'alejandro.suarez@gmail.com', '04121111111', 'AV PRINCIPAL DE CHACAO', 'PSICOLOGO ORGANIZACIONAL', 'Tecnica', 'PRUEBA PSICOMETRICA'),
    ('V22222222', 'KARINA DEL VALLE', 'MORENO RIVAS', 'karina.moreno@hotmail.com', '04141111111', 'URB LAS LOMAS', 'ESPECIALISTA EN DESARROLLO', 'Medica', 'AGENDAR CITA MEDICA'),
    ('V33333333', 'GUSTAVO ADOLFO', 'CASTRO LINARES', 'gustavo.castro@correo.com', '04161111111', 'SECTOR SANTA CECILIA', 'COORDINADOR DE NOMINA', 'Elegible', 'OFERTA EN REVISION'),
    ('V44444444', 'YENIFER COROMOTO', 'RONDON PONTE', 'yenifer.rondon@gmail.com', '04241111111', 'AV PRINCIPAL LOS RUICES', 'ANALISTA DE RH', 'No elegible', 'SALARIO FUERA DE RANGO'),
    ('E55555555', 'PAUL MICHAEL', 'JOHNSON DAVIS', 'paul.johnson@mail.com', '04261111111', 'CC MACARACUAY', 'GERENTE DE SELECCION', 'Nuevo', 'CONTACTO INICIAL POR EMAIL'),
    ('V66666666', 'ROSA EUGENIA', 'GOMEZ VARGAS', 'rosa.gomez@gmail.com', '04121112222', 'URB LOS ROSALES', 'RECLUTADOR CORPORATIVO', 'Contacto', 'ENVIAR INFORMACION'),
    ('V77777777', 'JESUS RAMON', 'SALAZAR CONTRERAS', 'jesus.salazar@empresa.com', '04141112222', 'AV PRINCIPAL DE BOSQUE', 'ANALISTA DE EVALUACION', 'Entrevista', 'PRIMERA ENTREVISTA OK'),
    ('V88888888', 'MARCO ANTONIO', 'QUINTERO ALVARADO', 'marco.quintero@yahoo.com', '04161112222', 'URB LOURDES', 'ESPECIALISTA EN CLIMA', 'Tecnica', 'PENDIENTE RETROALIMENTACION'),
    ('V99999999', 'ADRIANA PATRICIA', 'MONTILLA COLMENARES', 'adriana.montilla@gmail.com', '04241112222', 'SECTOR LOS NARANJOS', 'COORDINADOR DE CAPACITACION', 'Medica', 'RESULTADOS MEDICOS OK'),
    ('V10101010', 'OSCAR ENRIQUE', 'FERNANDEZ RUIZ', 'oscar.fernandez@correo.com', '04261112222', 'AV VICTORIA SECTOR LA TRINIDAD', 'GERENTE DE COMPENSACION', 'Elegible', 'OFERTA FIRMADA');
  END IF;
END $$;

-- ============================================
-- SUPABASE STORAGE - BUCKETS
-- ============================================

-- BUCKET "fotos-perfil" (PÚBLICO): fotos de perfil de trabajadores y candidatos.
-- Se crea con SQL para que al re-ejecutar el script quede disponible.
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-perfil', 'fotos-perfil', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Cualquiera puede ver fotos de perfil" ON storage.objects;
CREATE POLICY "Cualquiera puede ver fotos de perfil"
  ON storage.objects FOR SELECT USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Autenticados pueden subir fotos de perfil" ON storage.objects;
CREATE POLICY "Autenticados pueden subir fotos de perfil"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Autenticados pueden actualizar fotos de perfil" ON storage.objects;
CREATE POLICY "Autenticados pueden actualizar fotos de perfil"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "Autenticados pueden eliminar fotos de perfil" ON storage.objects;
CREATE POLICY "Autenticados pueden eliminar fotos de perfil"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos-perfil');

-- BUCKET "repositorio-documentos" (PRIVADO): documentos del módulo Repositorio.
-- Se crea con SQL (privado). Autenticados pueden ver/subir/actualizar/eliminar.
INSERT INTO storage.buckets (id, name, public)
VALUES ('repositorio-documentos', 'repositorio-documentos', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Autenticados pueden ver documentos del repositorio" ON storage.objects;
CREATE POLICY "Autenticados pueden ver documentos del repositorio"
  ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'repositorio-documentos');

DROP POLICY IF EXISTS "Autenticados pueden subir documentos del repositorio" ON storage.objects;
CREATE POLICY "Autenticados pueden subir documentos del repositorio"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'repositorio-documentos');

DROP POLICY IF EXISTS "Autenticados pueden actualizar documentos del repositorio" ON storage.objects;
CREATE POLICY "Autenticados pueden actualizar documentos del repositorio"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'repositorio-documentos');

DROP POLICY IF EXISTS "Autenticados pueden eliminar documentos del repositorio" ON storage.objects;
CREATE POLICY "Autenticados pueden eliminar documentos del repositorio"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'repositorio-documentos');

-- Referencia para creación manual en Supabase Dashboard > Storage (si se prefiere):
-- Nombre del bucket: repositorio-documentos
-- Público: NO (privado)

-- PASO 2: Configurar políticas del bucket en Supabase Dashboard > Storage
-- Ir a Storage > repositorio-documentos > Policies

-- Política SELECT (descargar archivos):
--   Name: "Allow authenticated users to download"
--   Operation: SELECT
--   Target roles: authenticated
--   Policy definition: true

-- Política INSERT (subir archivos):
--   Name: "Allow authenticated users to upload"
--   Operation: INSERT
--   Target roles: authenticated
--   Policy definition: true

-- Política UPDATE (actualizar archivos):
--   Name: "Allow authenticated users to update"
--   Operation: UPDATE
--   Target roles: authenticated
--   Policy definition: true

-- Política DELETE (eliminar archivos):
--   Name: "Allow authenticated users to delete"
--   Operation: DELETE
--   Target roles: authenticated
--   Policy definition: true

-- ============================================
-- CAPACITACIÓN Y DESARROLLO: CURSOS, MÓDULOS, VIDEOS Y CUESTIONARIOS
-- Nota: un módulo puede tener varios videos y varios cuestionarios;
-- también existen cuestionarios a nivel de curso (modulo_id NULL).
-- Si ya ejecutaste la versión anterior, ejecuta antes:
--   DROP TABLE IF EXISTS cap_respuestas, cap_preguntas, cap_cuestionarios, cap_videos, cap_modulos CASCADE;
--   (conserva cap_cursos)
-- ============================================

CREATE TABLE IF NOT EXISTS cap_cursos (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  estado TEXT NOT NULL DEFAULT 'Borrador',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS cap_modulos (
  id BIGSERIAL PRIMARY KEY,
  curso_id BIGINT NOT NULL REFERENCES cap_cursos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_modulos_curso ON cap_modulos(curso_id);

CREATE TABLE IF NOT EXISTS cap_videos (
  id BIGSERIAL PRIMARY KEY,
  modulo_id BIGINT NOT NULL REFERENCES cap_modulos(id) ON DELETE CASCADE,
  titulo TEXT,
  url TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_videos_modulo ON cap_videos(modulo_id);

CREATE TABLE IF NOT EXISTS cap_cuestionarios (
  id BIGSERIAL PRIMARY KEY,
  curso_id BIGINT NOT NULL REFERENCES cap_cursos(id) ON DELETE CASCADE,
  modulo_id BIGINT REFERENCES cap_modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_cuestionarios_curso ON cap_cuestionarios(curso_id);
CREATE INDEX IF NOT EXISTS idx_cap_cuestionarios_modulo ON cap_cuestionarios(modulo_id);

CREATE TABLE IF NOT EXISTS cap_preguntas (
  id BIGSERIAL PRIMARY KEY,
  cuestionario_id BIGINT NOT NULL REFERENCES cap_cuestionarios(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_preguntas_cuestionario ON cap_preguntas(cuestionario_id);

CREATE TABLE IF NOT EXISTS cap_respuestas (
  id BIGSERIAL PRIMARY KEY,
  pregunta_id BIGINT NOT NULL REFERENCES cap_preguntas(id) ON DELETE CASCADE,
  respuesta TEXT NOT NULL,
  es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_respuestas_pregunta ON cap_respuestas(pregunta_id);

ALTER TABLE cap_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_cuestionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_respuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer cursos" ON cap_cursos;
CREATE POLICY "Usuarios autenticados pueden leer cursos"
  ON cap_cursos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cursos" ON cap_cursos;
CREATE POLICY "Usuarios autenticados pueden crear cursos"
  ON cap_cursos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cursos" ON cap_cursos;
CREATE POLICY "Usuarios autenticados pueden actualizar cursos"
  ON cap_cursos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar cursos" ON cap_cursos;
CREATE POLICY "Usuarios autenticados pueden eliminar cursos"
  ON cap_cursos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver modulos" ON cap_modulos;
CREATE POLICY "Usuarios autenticados pueden ver modulos"
  ON cap_modulos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear modulos" ON cap_modulos;
CREATE POLICY "Usuarios autenticados pueden crear modulos"
  ON cap_modulos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar modulos" ON cap_modulos;
CREATE POLICY "Usuarios autenticados pueden actualizar modulos"
  ON cap_modulos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar modulos" ON cap_modulos;
CREATE POLICY "Usuarios autenticados pueden eliminar modulos"
  ON cap_modulos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver videos" ON cap_videos;
CREATE POLICY "Usuarios autenticados pueden ver videos"
  ON cap_videos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear videos" ON cap_videos;
CREATE POLICY "Usuarios autenticados pueden crear videos"
  ON cap_videos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar videos" ON cap_videos;
CREATE POLICY "Usuarios autenticados pueden actualizar videos"
  ON cap_videos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar videos" ON cap_videos;
CREATE POLICY "Usuarios autenticados pueden eliminar videos"
  ON cap_videos FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cuestionarios" ON cap_cuestionarios;
CREATE POLICY "Usuarios autenticados pueden ver cuestionarios"
  ON cap_cuestionarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cuestionarios" ON cap_cuestionarios;
CREATE POLICY "Usuarios autenticados pueden crear cuestionarios"
  ON cap_cuestionarios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cuestionarios" ON cap_cuestionarios;
CREATE POLICY "Usuarios autenticados pueden actualizar cuestionarios"
  ON cap_cuestionarios FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar cuestionarios" ON cap_cuestionarios;
CREATE POLICY "Usuarios autenticados pueden eliminar cuestionarios"
  ON cap_cuestionarios FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver preguntas" ON cap_preguntas;
CREATE POLICY "Usuarios autenticados pueden ver preguntas"
  ON cap_preguntas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear preguntas" ON cap_preguntas;
CREATE POLICY "Usuarios autenticados pueden crear preguntas"
  ON cap_preguntas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar preguntas" ON cap_preguntas;
CREATE POLICY "Usuarios autenticados pueden actualizar preguntas"
  ON cap_preguntas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar preguntas" ON cap_preguntas;
CREATE POLICY "Usuarios autenticados pueden eliminar preguntas"
  ON cap_preguntas FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver respuestas" ON cap_respuestas;
CREATE POLICY "Usuarios autenticados pueden ver respuestas"
  ON cap_respuestas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear respuestas" ON cap_respuestas;
CREATE POLICY "Usuarios autenticados pueden crear respuestas"
  ON cap_respuestas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar respuestas" ON cap_respuestas;
CREATE POLICY "Usuarios autenticados pueden actualizar respuestas"
  ON cap_respuestas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar respuestas" ON cap_respuestas;
CREATE POLICY "Usuarios autenticados pueden eliminar respuestas"
  ON cap_respuestas FOR DELETE TO authenticated USING (true);

-- ============================================
-- 8) CARGOS - COMPETENCIAS, SKILLS Y CURSOS OBLIGATORIOS
-- ============================================
-- Herramienta Cargos: configuración de cargos (est_cargos, creados en
-- captación) con competencias, skills y cursos de capacitación obligatorios.

CREATE TABLE IF NOT EXISTS car_competencias (
  id BIGSERIAL PRIMARY KEY,
  cargo_id UUID NOT NULL REFERENCES est_cargos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'competencia' CHECK (tipo IN ('competencia','skill')),
  nombre TEXT NOT NULL,
  nivel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_car_competencias_cargo ON car_competencias(cargo_id);

CREATE TABLE IF NOT EXISTS car_cursos_obligatorios (
  id BIGSERIAL PRIMARY KEY,
  cargo_id UUID NOT NULL REFERENCES est_cargos(id) ON DELETE CASCADE,
  curso_id BIGINT NOT NULL REFERENCES cap_cursos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cargo_id, curso_id)
);
CREATE INDEX IF NOT EXISTS idx_car_cursos_obligatorios_cargo ON car_cursos_obligatorios(cargo_id);

ALTER TABLE car_competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_cursos_obligatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver competencias" ON car_competencias;
CREATE POLICY "Usuarios autenticados pueden ver competencias"
  ON car_competencias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear competencias" ON car_competencias;
CREATE POLICY "Usuarios autenticados pueden crear competencias"
  ON car_competencias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar competencias" ON car_competencias;
CREATE POLICY "Usuarios autenticados pueden actualizar competencias"
  ON car_competencias FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar competencias" ON car_competencias;
CREATE POLICY "Usuarios autenticados pueden eliminar competencias"
  ON car_competencias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver cursos obligatorios" ON car_cursos_obligatorios;
CREATE POLICY "Usuarios autenticados pueden ver cursos obligatorios"
  ON car_cursos_obligatorios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear cursos obligatorios" ON car_cursos_obligatorios;
CREATE POLICY "Usuarios autenticados pueden crear cursos obligatorios"
  ON car_cursos_obligatorios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar cursos obligatorios" ON car_cursos_obligatorios;
CREATE POLICY "Usuarios autenticados pueden actualizar cursos obligatorios"
  ON car_cursos_obligatorios FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar cursos obligatorios" ON car_cursos_obligatorios;
CREATE POLICY "Usuarios autenticados pueden eliminar cursos obligatorios"
  ON car_cursos_obligatorios FOR DELETE TO authenticated USING (true);

-- ============================================
-- 9) BIENESTAR SOCIAL: PRÉSTAMOS, PÓLIZAS, HISTORIAS, ENCUESTAS Y CALENDARIO
-- ============================================
-- El módulo Bienestar Social usa además plantilla_trabajadores (herramienta
-- Plantilla). Estas tablas alimentan las herramientas Préstamos, Pólizas,
-- Historias de gente FIAT, Encuestas y Calendario.

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

CREATE TABLE IF NOT EXISTS bienestar_splash (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE bienestar_prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_historias ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienestar_splash ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver splash" ON bienestar_splash;
CREATE POLICY "Usuarios autenticados pueden ver splash"
  ON bienestar_splash FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear splash" ON bienestar_splash;
CREATE POLICY "Usuarios autenticados pueden crear splash"
  ON bienestar_splash FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar splash" ON bienestar_splash;
CREATE POLICY "Usuarios autenticados pueden actualizar splash"
  ON bienestar_splash FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar splash" ON bienestar_splash;
CREATE POLICY "Usuarios autenticados pueden eliminar splash"
  ON bienestar_splash FOR DELETE TO authenticated USING (true);

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

-- ============================================
-- 10) SEGURIDAD Y SALUD LABORAL: INSPECCIONES, SERVICIO MÉDICO E INVENTARIOS
-- ============================================
-- El módulo Seguridad y Salud Laboral usa además seguridad_incidentes (base)
-- y plantilla_trabajadores / ats_candidatos (Servicio Médico). Estas tablas
-- alimentan las herramientas Inspecciones (evaluación de campo), Servicio
-- Médico e Inventario de equipos / insumos y medicamentos.

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

-- ============================================
-- 13) GESTIÓN DE USUARIOS Y ACCESOS
-- Solo trabajadores ACTIVOS pueden ingresar. Por usuario se
-- configura qué módulos ve y qué herramientas por módulo usa.
-- ============================================

CREATE TABLE IF NOT EXISTS usuario_accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'Empleado' CHECK (rol IN ('Administrador', 'Empleado')),
  modulos JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_usuario_accesos_trabajador UNIQUE (trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_accesos_trabajador ON usuario_accesos (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_usuario_accesos_rol ON usuario_accesos (rol);
CREATE INDEX IF NOT EXISTS idx_usuario_accesos_activo ON usuario_accesos (activo);

ALTER TABLE usuario_accesos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Autenticados ver accesos" ON usuario_accesos;
CREATE POLICY "Autenticados ver accesos"
  ON usuario_accesos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear accesos" ON usuario_accesos;
CREATE POLICY "Autenticados crear accesos"
  ON usuario_accesos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar accesos" ON usuario_accesos;
CREATE POLICY "Autenticados actualizar accesos"
  ON usuario_accesos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar accesos" ON usuario_accesos;
CREATE POLICY "Autenticados eliminar accesos"
  ON usuario_accesos FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_usuario_accesos_updated_at ON usuario_accesos;
CREATE TRIGGER update_usuario_accesos_updated_at
  BEFORE UPDATE ON usuario_accesos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIN DEL ESQUEMA COMPLETO
-- ============================================
