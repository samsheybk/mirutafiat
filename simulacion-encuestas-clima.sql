-- ============================================================
-- SIMULACIÓN: ENCUESTAS DE CLIMA LABORAL
-- (bienestar_encuestas + bienestar_encuesta_preguntas +
--  bienestar_encuesta_respuestas)
-- Crea 3 encuestas de ejemplo: una Activa, una Cerrada y una
-- Pendiente, cada una con sus preguntas y opciones. Las dos
-- primeras incluyen respuestas de los primeros 10 trabajadores
-- activos (la encuesta Cerrada queda con resultados).
-- Idempotente: no duplica encuestas, preguntas ni respuestas.
-- ============================================================

-- 1) Encuestas (una de ellas es anónima)
INSERT INTO bienestar_encuestas (titulo, descripcion, fecha_inicio, fecha_fin, estado, anonima)
SELECT t.titulo, t.descripcion, t.fecha_inicio, t.fecha_fin, t.estado, t.anonima
FROM (VALUES
  ('Encuesta de Clima Laboral',
   'Encuesta anual para medir la percepción del ambiente de trabajo y la satisfacción del personal.',
   (CURRENT_DATE - INTERVAL '15 days')::date,
   (CURRENT_DATE + INTERVAL '15 days')::date,
   'Activa', FALSE),
  ('Encuesta de Satisfacción y Bienestar',
   'Evaluación de las actividades y beneficios de bienestar social del último trimestre.',
   (CURRENT_DATE - INTERVAL '90 days')::date,
   (CURRENT_DATE - INTERVAL '30 days')::date,
   'Cerrada', FALSE),
  ('Encuesta de Liderazgo y Comunicación',
   'Sondeo anónimo sobre la retroalimentación de supervisores y la transparencia en la toma de decisiones.',
   (CURRENT_DATE + INTERVAL '7 days')::date,
   (CURRENT_DATE + INTERVAL '37 days')::date,
   'Pendiente', TRUE)
) AS t(titulo, descripcion, fecha_inicio, fecha_fin, estado, anonima)
WHERE NOT EXISTS (SELECT 1 FROM bienestar_encuestas x WHERE x.titulo = t.titulo);

-- 2) Preguntas y opciones de cada encuesta
INSERT INTO bienestar_encuesta_preguntas (encuesta_id, pregunta, opciones, orden)
SELECT e.id, q.pregunta, q.opciones, q.orden
FROM (VALUES
  ('Encuesta de Clima Laboral',
   '¿Cómo evalúas el ambiente de trabajo en tu área?',
   '["Excelente","Bueno","Regular","Malo"]'::jsonb, 1),
  ('Encuesta de Clima Laboral',
   '¿Te sientes valorado/a por la empresa?',
   '["Siempre","Casi siempre","A veces","Nunca"]'::jsonb, 2),
  ('Encuesta de Clima Laboral',
   '¿Estás satisfecho/a con la comunicación interna?',
   '["Muy satisfecho","Satisfecho","Neutral","Insatisfecho"]'::jsonb, 3),
  ('Encuesta de Clima Laboral',
   '¿Recomendarías a esta empresa como un buen lugar para trabajar?',
   '["Sí, definitivamente","Sí, probablemente","No estoy seguro/a","No"]'::jsonb, 4),
  ('Encuesta de Satisfacción y Bienestar',
   '¿Cómo calificas las actividades de bienestar realizadas?',
   '["Excelente","Buenas","Regulares","Malas"]'::jsonb, 1),
  ('Encuesta de Satisfacción y Bienestar',
   '¿Utilizas los beneficios sociales que ofrece la empresa?',
   '["Siempre","Casi siempre","A veces","Nunca"]'::jsonb, 2),
  ('Encuesta de Satisfacción y Bienestar',
   '¿Cómo evalúas la carga laboral en tu puesto?',
   '["Muy adecuada","Adecuada","Excesiva","Insuficiente"]'::jsonb, 3),
  ('Encuesta de Liderazgo y Comunicación',
   '¿Recibes retroalimentación oportuna de tu supervisor?',
   '["Siempre","Casi siempre","A veces","Nunca"]'::jsonb, 1),
  ('Encuesta de Liderazgo y Comunicación',
   '¿Consideras que la toma de decisiones es transparente?',
   '["Sí, casi siempre","Sí, a veces","No","No sé"]'::jsonb, 2)
) AS q(titulo, pregunta, opciones, orden)
JOIN bienestar_encuestas e ON e.titulo = q.titulo
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_encuesta_preguntas x
  JOIN bienestar_encuestas xe ON xe.id = x.encuesta_id
  WHERE xe.titulo = q.titulo AND x.pregunta = q.pregunta
);

-- 3) Respuestas de los primeros 10 trabajadores activos
--    (solo en las encuestas de Clima Laboral y Satisfacción)
WITH w AS (
  SELECT cedula, trim(nombres || ' ' || apellidos) AS nombre,
         row_number() OVER (ORDER BY nombres, apellidos) AS rn
  FROM plantilla_trabajadores
  WHERE estado = 'Activo'
), resp_candidates AS (
  SELECT e.id AS encuesta_id, p.id AS pregunta_id, p.orden,
         array_agg(op.opcion ORDER BY op.idx) AS opciones
  FROM bienestar_encuesta_preguntas p
  JOIN bienestar_encuestas e ON e.id = p.encuesta_id
  CROSS JOIN LATERAL jsonb_array_elements_text(p.opciones) WITH ORDINALITY AS op(opcion, idx)
  WHERE e.titulo IN ('Encuesta de Clima Laboral', 'Encuesta de Satisfacción y Bienestar')
  GROUP BY e.id, p.id, p.orden
)
INSERT INTO bienestar_encuesta_respuestas (encuesta_id, pregunta_id, cedula, nombre, opcion)
SELECT rc.encuesta_id, rc.pregunta_id, w.cedula, w.nombre,
       rc.opciones[mod(w.rn * 3 + rc.orden, cardinality(rc.opciones)) + 1]
FROM resp_candidates rc
JOIN w ON w.rn <= 10
WHERE NOT EXISTS (
  SELECT 1 FROM bienestar_encuesta_respuestas x
  WHERE x.encuesta_id = rc.encuesta_id
    AND x.pregunta_id = rc.pregunta_id
    AND x.cedula = w.cedula
);
