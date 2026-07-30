-- Ejecutar en SQL Editor de Supabase
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
