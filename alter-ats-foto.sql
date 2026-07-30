-- Agregar columna foto_url a la tabla ats_candidatos
ALTER TABLE ats_candidatos ADD COLUMN IF NOT EXISTS foto_url TEXT;
