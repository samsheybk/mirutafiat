-- Tabla de unidades organizacionales
CREATE TABLE est_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('DIRECCION', 'GERENCIA', 'DEPARTAMENTO')),
  unidad_padre_id UUID REFERENCES est_unidades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de cargos de la estructura
CREATE TABLE est_cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  unidad_id UUID NOT NULL REFERENCES est_unidades(id) ON DELETE RESTRICT,
  jefe_inmediato_id UUID REFERENCES est_cargos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE est_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE est_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer unidades" ON est_unidades FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar unidades" ON est_unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar unidades" ON est_unidades FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar unidades" ON est_unidades FOR DELETE USING (true);

CREATE POLICY "Todos pueden leer cargos" ON est_cargos FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar cargos" ON est_cargos FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar cargos" ON est_cargos FOR UPDATE USING (true);
CREATE POLICY "Todos pueden eliminar cargos" ON est_cargos FOR DELETE USING (true);
