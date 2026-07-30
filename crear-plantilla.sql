CREATE TABLE plantilla_trabajadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id BIGINT REFERENCES ats_candidatos(id),
  cedula TEXT NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plantilla_trabajadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer plantilla"
  ON plantilla_trabajadores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Todos pueden insertar plantilla"
  ON plantilla_trabajadores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Todos pueden actualizar plantilla"
  ON plantilla_trabajadores FOR UPDATE
  TO authenticated
  USING (true);
