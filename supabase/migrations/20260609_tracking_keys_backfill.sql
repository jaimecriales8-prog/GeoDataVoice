-- Backfill tracking_key en preguntas existentes
-- Paso 1: asignar tracking_key = id a las que no tienen
UPDATE questions
SET tracking_key = id::text
WHERE tracking_key IS NULL;

-- Paso 2: unificar tracking_key entre preguntas con mismo texto dentro del mismo proyecto
-- (misma pregunta replicada en distintas olas → mismo tracking_key)
WITH grupos AS (
  SELECT
    q.id,
    MIN(q.tracking_key) OVER (
      PARTITION BY s.project_id, lower(trim(q.text))
    ) AS canonical_key
  FROM questions q
  JOIN surveys s ON s.id = q.survey_id
)
UPDATE questions q
SET tracking_key = g.canonical_key
FROM grupos g
WHERE q.id = g.id
  AND q.tracking_key IS DISTINCT FROM g.canonical_key;
