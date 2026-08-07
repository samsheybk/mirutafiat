-- ============================================================
-- MIGRACIÓN: ENCUESTAS ANÓNIMAS
-- Base existente: ejecutar TODO este bloque una sola vez en el
-- SQL Editor de Supabase. Es idempotente (puede repetirse).
-- ============================================================

-- Marca anónima en encuestas (default: identificadas)
ALTER TABLE bienestar_encuestas ADD COLUMN IF NOT EXISTS anonima BOOLEAN NOT NULL DEFAULT FALSE;
