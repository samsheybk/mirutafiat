-- ============================================
-- MÓDULO REPOSITORIO - ESTRUCTURA DE BASE DE DATOS
-- ============================================

-- Tabla de categorías
CREATE TABLE repo_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT DEFAULT '📁',
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de subcategorías
CREATE TABLE repo_subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES repo_categorias(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, nombre)
);

-- Tabla de documentos
CREATE TABLE repo_documentos (
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

-- Tabla de notificaciones
CREATE TABLE repo_notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES repo_documentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nuevo_documento', 'nueva_version')),
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

CREATE INDEX idx_repo_documentos_categoria ON repo_documentos(categoria_id);
CREATE INDEX idx_repo_documentos_subcategoria ON repo_documentos(subcategoria_id);
CREATE INDEX idx_repo_documentos_tags ON repo_documentos USING GIN(tags);
CREATE INDEX idx_repo_subcategorias_categoria ON repo_subcategorias(categoria_id);
CREATE INDEX idx_repo_notificaciones_usuario ON repo_notificaciones(usuario_id, leido);
CREATE INDEX idx_repo_notificaciones_documento ON repo_notificaciones(documento_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE repo_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas para repo_categorias
CREATE POLICY "Usuarios autenticados pueden ver categorías"
  ON repo_categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear categorías"
  ON repo_categorias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar categorías"
  ON repo_categorias FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar categorías"
  ON repo_categorias FOR DELETE TO authenticated USING (true);

-- Políticas para repo_subcategorias
CREATE POLICY "Usuarios autenticados pueden ver subcategorías"
  ON repo_subcategorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear subcategorías"
  ON repo_subcategorias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar subcategorías"
  ON repo_subcategorias FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar subcategorías"
  ON repo_subcategorias FOR DELETE TO authenticated USING (true);

-- Políticas para repo_documentos
CREATE POLICY "Usuarios autenticados pueden ver documentos"
  ON repo_documentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden subir documentos"
  ON repo_documentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar documentos"
  ON repo_documentos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar documentos"
  ON repo_documentos FOR DELETE TO authenticated USING (true);

-- Políticas para repo_notificaciones
CREATE POLICY "Usuarios pueden ver sus propias notificaciones"
  ON repo_notificaciones FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR usuario_id IS NULL);

CREATE POLICY "Usuarios pueden crear notificaciones"
  ON repo_notificaciones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar sus propias notificaciones"
  ON repo_notificaciones FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_repo_categorias_updated_at
  BEFORE UPDATE ON repo_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repo_subcategorias_updated_at
  BEFORE UPDATE ON repo_subcategorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repo_documentos_updated_at
  BEFORE UPDATE ON repo_documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (OPCIONAL)
-- ============================================

-- Insertar categorías de ejemplo
INSERT INTO repo_categorias (nombre, descripcion, icono, color) VALUES
  ('Formatos', 'Formatos y plantillas oficiales', '📋', '#3b82f6'),
  ('Manuales', 'Manuales de procedimientos y políticas', '📚', '#10b981'),
  ('Material de Apoyo', 'Documentos de consulta y referencia', '📖', '#f59e0b'),
  ('Normativas', 'Normas y regulaciones', '⚖️', '#ef4444')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- INSTRUCCIONES PARA SUPABASE STORAGE
-- ============================================

-- PASO 1: Crear bucket en Supabase Dashboard
-- Nombre del bucket: repositorio-documentos
-- Público: NO (privado)

-- PASO 2: Configurar políticas del bucket en Supabase Dashboard
-- Ir a Storage > repositorio-documentos > Policies

-- Política SELECT (descargar archivos):
-- Name: "Allow authenticated users to download"
-- Operation: SELECT
-- Target roles: authenticated
-- Policy definition: true

-- Política INSERT (subir archivos):
-- Name: "Allow authenticated users to upload"
-- Operation: INSERT
-- Target roles: authenticated
-- Policy definition: true

-- Política UPDATE (actualizar archivos):
-- Name: "Allow authenticated users to update"
-- Operation: UPDATE
-- Target roles: authenticated
-- Policy definition: true

-- Política DELETE (eliminar archivos):
-- Name: "Allow authenticated users to delete"
-- Operation: DELETE
-- Target roles: authenticated
-- Policy definition: true

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
