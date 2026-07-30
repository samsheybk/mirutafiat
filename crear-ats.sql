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
