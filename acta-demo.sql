-- ============================================
-- ACTA DE REUNIÓN DEMO
-- Tema: Implementación de la nueva plataforma
--       integral para la gestión de las y los trabajadores
-- ============================================

WITH nueva_acta AS (
  INSERT INTO rl_actas (tema, fecha, participantes, estado, descripcion)
  VALUES (
    'Implementación de la nueva plataforma integral para la gestión de las y los trabajadores',
    CURRENT_DATE,
    'MARÍA GÓMEZ, JOSÉ RODRÍGUEZ, CARMEN PÉREZ, LUIS MARTÍNEZ, ANA DÍAZ, PEDRO SÁNCHEZ',
    'Realizada',
    '<div>Reunión de trabajo convocada para coordinar la puesta en marcha de la nueva plataforma integral que centralizará la gestión del personal en todas sus etapas.</div><div><br></div><ul><li><strong>Alcance del proyecto:</strong> la plataforma abarcará captación, plantilla, relaciones laborales, capacitación, bienestar, seguridad, compensación y repositorio documental.</li><li><strong>Cronograma:</strong> se presentó el plan de implementación por fases, con una duración estimada de <strong>6 semanas</strong>.</li><li><strong>Responsables:</strong> se designaron los responsables técnicos y funcionales de cada módulo.</li><li><strong>Migración de datos:</strong> se definió que la migración se hará desde las plantillas vigentes y los archivos del repositorio actual.</li></ul>'
  )
  RETURNING id
)
INSERT INTO rl_acta_acuerdos (acta_id, descripcion, fecha_tope)
SELECT nueva_acta.id, ac.descripcion, ac.fecha_tope
FROM nueva_acta, (VALUES
  ('Programar sesiones de capacitación para el equipo de Relaciones Laborales antes del inicio de la fase piloto.', CURRENT_DATE + INTERVAL '5 days'),
  ('Entregar la lista de trabajadores con la información completa de cada módulo.', CURRENT_DATE + INTERVAL '7 days'),
  ('Definir los perfiles y permisos de acceso por rol dentro de la plataforma.', CURRENT_DATE + INTERVAL '10 days'),
  ('Elaborar un plan de comunicación interno para informar a las y los trabajadores sobre la nueva herramienta.', CURRENT_DATE + INTERVAL '12 days'),
  ('Realizar una reunión de seguimiento para evaluar el avance de la fase 1.', CURRENT_DATE + INTERVAL '15 days')
) AS ac(descripcion, fecha_tope);
