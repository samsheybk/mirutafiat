-- Ejecutar en SQL Editor de Supabase
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
