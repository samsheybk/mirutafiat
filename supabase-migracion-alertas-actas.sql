-- ============================================================
-- MIGRACIÓN: ALERTAS DE COMPROMISOS DE ACTAS (campana global)
-- Base existente: ejecutar TODO este bloque una sola vez en el
-- SQL Editor de Supabase. Es idempotente (puede repetirse).
-- ============================================================

-- 1) Vincular participantes de actas por ID de trabajador
ALTER TABLE rl_actas ADD COLUMN IF NOT EXISTS participantes_ids UUID[] DEFAULT '{}';

-- 2) Tabla de alertas
CREATE TABLE IF NOT EXISTS rl_acta_alertas (
  id BIGSERIAL PRIMARY KEY,
  acta_id BIGINT NOT NULL REFERENCES rl_actas(id) ON DELETE CASCADE,
  acuerdo_id BIGINT REFERENCES rl_acta_acuerdos(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('acuerdo_creado', 'acuerdo_por_vencer', 'acuerdo_vencido')),
  mensaje TEXT NOT NULL,
  fecha_tope DATE,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rl_acta_alertas_trabajador ON rl_acta_alertas (trabajador_id, leido);
CREATE INDEX IF NOT EXISTS idx_rl_acta_alertas_acta ON rl_acta_alertas (acta_id);

-- 3) RLS: cada trabajador ve/actualiza SOLO sus propias alertas
ALTER TABLE rl_acta_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trabajadores ven sus alertas de actas" ON rl_acta_alertas;
CREATE POLICY "Trabajadores ven sus alertas de actas"
  ON rl_acta_alertas FOR SELECT TO authenticated
  USING (
    trabajador_id IN (
      SELECT id FROM plantilla_trabajadores
      WHERE estado = 'Activo' AND lower(correo) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Autenticados crean alertas de actas" ON rl_acta_alertas;
CREATE POLICY "Autenticados crean alertas de actas"
  ON rl_acta_alertas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Trabajadores actualizan sus alertas de actas" ON rl_acta_alertas;
CREATE POLICY "Trabajadores actualizan sus alertas de actas"
  ON rl_acta_alertas FOR UPDATE TO authenticated
  USING (
    trabajador_id IN (
      SELECT id FROM plantilla_trabajadores
      WHERE estado = 'Activo' AND lower(correo) = lower(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Autenticados eliminan alertas de actas" ON rl_acta_alertas;
CREATE POLICY "Autenticados eliminan alertas de actas"
  ON rl_acta_alertas FOR DELETE TO authenticated USING (true);

-- 4) Función que genera recordatorios por fecha tope (la invoca la campana)
CREATE OR REPLACE FUNCTION generar_alertas_actas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compromisos por vencer (hoy o dentro de los próximos 3 días)
  INSERT INTO rl_acta_alertas (acta_id, acuerdo_id, trabajador_id, tipo, mensaje, fecha_tope)
  SELECT a.id, ac.id, t.id, 'acuerdo_por_vencer',
         'Compromiso por vencer en la acta "' || COALESCE(a.tema, '') || '": "' || ac.descripcion || '" (tope: ' || to_char(ac.fecha_tope, 'DD/MM/YYYY') || ')',
         ac.fecha_tope
  FROM rl_acta_acuerdos ac
  JOIN rl_actas a ON a.id = ac.acta_id
  CROSS JOIN LATERAL unnest(COALESCE(a.participantes_ids, '{}')) AS t(id)
  WHERE ac.fecha_tope IS NOT NULL
    AND ac.fecha_tope <= CURRENT_DATE + 3
    AND NOT EXISTS (
      SELECT 1 FROM rl_acta_alertas al
      WHERE al.acuerdo_id = ac.id AND al.trabajador_id = t.id
        AND al.tipo IN ('acuerdo_por_vencer', 'acuerdo_vencido')
    );

  -- Compromisos vencidos
  INSERT INTO rl_acta_alertas (acta_id, acuerdo_id, trabajador_id, tipo, mensaje, fecha_tope)
  SELECT a.id, ac.id, t.id, 'acuerdo_vencido',
         'Compromiso VENCIDO en la acta "' || COALESCE(a.tema, '') || '": "' || ac.descripcion || '" (el tope era: ' || to_char(ac.fecha_tope, 'DD/MM/YYYY') || ')',
         ac.fecha_tope
  FROM rl_acta_acuerdos ac
  JOIN rl_actas a ON a.id = ac.acta_id
  CROSS JOIN LATERAL unnest(COALESCE(a.participantes_ids, '{}')) AS t(id)
  WHERE ac.fecha_tope IS NOT NULL
    AND ac.fecha_tope < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM rl_acta_alertas al
      WHERE al.acuerdo_id = ac.id AND al.trabajador_id = t.id
        AND al.tipo = 'acuerdo_vencido'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION generar_alertas_actas() TO authenticated;
