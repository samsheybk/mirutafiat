-- Ejecutar en SQL Editor de Supabase
ALTER TABLE ats_log_estados ADD COLUMN IF NOT EXISTS changed_by_email TEXT;
