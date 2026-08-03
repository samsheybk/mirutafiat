-- ============================================
-- FIAT Venezuela - Intranet: MÓDULO GESTIÓN DE USUARIOS
-- Acceso a la intranet: solo trabajadores ACTIVOS
-- (plantilla_trabajadores.estado = 'Activo') pueden ingresar.
-- Configuración por usuario: qué módulos puede ver y
-- qué herramientas por módulo puede utilizar.
-- Ejecutar en el SQL Editor de Supabase.
-- Es idempotente: se puede re-ejecutar sin errores.
-- ============================================

-- ============================================
-- 13) GESTIÓN DE USUARIOS Y ACCESOS
-- ============================================

CREATE TABLE IF NOT EXISTS usuario_accesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id UUID NOT NULL REFERENCES plantilla_trabajadores(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'Empleado' CHECK (rol IN ('Administrador', 'Empleado')),
  modulos JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_usuario_accesos_trabajador UNIQUE (trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_accesos_trabajador ON usuario_accesos (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_usuario_accesos_rol ON usuario_accesos (rol);
CREATE INDEX IF NOT EXISTS idx_usuario_accesos_activo ON usuario_accesos (activo);

-- CÓMO SE INTERPRETA "modulos" (JSONB):
--   {"captacion.html": ["ats", "estructura"], "finanzas.html": ["*"], ...}
--   * Si la clave del archivo del módulo existe -> el usuario PUEDE VER ese módulo.
--   * valor ["*"]                    -> puede usar TODAS las herramientas.
--   * valor ["ats", "estructura"]    -> solo esas herramientas.
--   * valor []                       -> ve el módulo pero sin herramientas.
--   * Si el trabajador activo NO tiene fila aquí -> acceso completo (configuración inicial).

ALTER TABLE usuario_accesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados ver accesos" ON usuario_accesos;
CREATE POLICY "Autenticados ver accesos"
  ON usuario_accesos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados crear accesos" ON usuario_accesos;
CREATE POLICY "Autenticados crear accesos"
  ON usuario_accesos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Autenticados actualizar accesos" ON usuario_accesos;
CREATE POLICY "Autenticados actualizar accesos"
  ON usuario_accesos FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Autenticados eliminar accesos" ON usuario_accesos;
CREATE POLICY "Autenticados eliminar accesos"
  ON usuario_accesos FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_usuario_accesos_updated_at ON usuario_accesos;
CREATE TRIGGER update_usuario_accesos_updated_at
  BEFORE UPDATE ON usuario_accesos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USUARIO MAESTRO (admin@fiat.com.ve)
-- No va en plantilla_trabajadores: es el dueño de
-- la intranet y NO necesita fila en esta tabla.
-- Su acceso total + gestión de usuarios se concede
-- en js/access.js mediante SUPERADMIN_EMAILS.
-- Para promover a un trabajador a "Administrador"
-- (con fila en plantilla), usa el propio módulo de
-- Gestión de usuarios poniendo su rol en Administrador.
-- ============================================

-- ============================================
-- NOTAS DE PUESTA EN MARCHA
-- ============================================
-- 1) Los usuarios se identifican por el correo de su cuenta de Supabase Auth,
--    que debe coincidir con "correo" del trabajador en plantilla_trabajadores.
--    EXCEPCIÓN: los correos en SUPERADMIN_EMAILS (js/access.js) entran sin
--    estar en la plantilla, con rol Administrador y acceso total.
-- 2) Sin fila en usuario_accesos: acceso completo a los MÓDULOS NORMALES
--    (útil para la configuración inicial). Este acceso NO incluye el módulo
--    de Gestión de usuarios: gestionar usuarios es EXCLUSIVO del rol
--    "Administrador". Para restringir a un usuario, créalo en el módulo
--    Gestión de usuarios y configura sus módulos/herramientas.
-- 3) El rol "Administrador" (en una fila de usuario_accesos o como usuario
--    maestro) ve todos los módulos y puede gestionar usuarios.
--    "Empleado" solo ve lo configurado en "modulos" y nunca gestiona usuarios.
-- 4) Para desactivar el acceso de un trabajador sin sacarlo de la plantilla,
--    pon "activo = false" en su fila (el login se deniega).
-- ============================================
