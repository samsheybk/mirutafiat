-- Perfil completo del trabajador: datos personales, tallas, documentación y carga familiar

ALTER TABLE plantilla_trabajadores
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
  ADD COLUMN IF NOT EXISTS lugar_nacimiento TEXT,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS talla_camisa TEXT,
  ADD COLUMN IF NOT EXISTS talla_pantalon TEXT,
  ADD COLUMN IF NOT EXISTS talla_calzado TEXT,
  ADD COLUMN IF NOT EXISTS talla_franela TEXT;

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

ALTER TABLE trabajador_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador_carga_familiar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer documentos"
  ON trabajador_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos pueden insertar documentos"
  ON trabajador_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar documentos"
  ON trabajador_documentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos pueden eliminar documentos"
  ON trabajador_documentos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Todos pueden leer carga familiar"
  ON trabajador_carga_familiar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos pueden insertar carga familiar"
  ON trabajador_carga_familiar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar carga familiar"
  ON trabajador_carga_familiar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Todos pueden eliminar carga familiar"
  ON trabajador_carga_familiar FOR DELETE TO authenticated USING (true);
