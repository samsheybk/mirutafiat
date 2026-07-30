-- Tabla de solicitudes de requisiciones (nuevos cargos / aumento de vacantes)
DROP TABLE IF EXISTS requisiciones_solicitudes;

CREATE TABLE requisiciones_solicitudes (
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

ALTER TABLE requisiciones_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo" ON requisiciones_solicitudes FOR ALL USING (true) WITH CHECK (true);
