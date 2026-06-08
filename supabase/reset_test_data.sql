-- ============================================================
-- RESET DE DATOS DE PRUEBA — GeoDataVoice
-- Ejecutar en Supabase → SQL Editor
-- Elimina datos de prueba conservando config y admin.
-- ============================================================

-- 1. NLP y audio (dependen de responses)
DELETE FROM nlp_outputs;
DELETE FROM audio_responses;

-- 2. Respuestas
DELETE FROM responses;

-- 3. Consents
DELETE FROM consents;

-- 4. Visitas GPS
DELETE FROM field_visits;

-- 5. Historial de perfil
DELETE FROM participant_profile_history;

-- 6. Participantes (panelistas + respondentes encuesta abierta)
-- IMPORTANTE: luego borra los usuarios en Supabase Auth → Authentication → Users
DELETE FROM participants;

-- 7. Encuestadores
-- IMPORTANTE: luego borra sus usuarios en Supabase Auth → Authentication → Users
DELETE FROM field_operators;

-- 8. Preguntas y encuestas
DELETE FROM questions;
DELETE FROM surveys;

-- 9. Proyectos del cliente de prueba
-- (ajusta el email del cliente de prueba si es diferente)
DELETE FROM projects
WHERE client_id IN (
  SELECT id FROM clients WHERE id NOT IN (
    SELECT id FROM clients WHERE status = 'active' AND false -- elimina todos los proyectos
  )
);
-- O para borrar todos los proyectos sin excepción:
-- DELETE FROM projects;

-- 10. Clientes de prueba (conserva si quieres mantener el cliente)
-- DELETE FROM clients;

-- ============================================================
-- LO QUE SE CONSERVA (no tocar):
--   payment_config        → tarifas configuradas
--   client_payment_config → tarifas por cliente
--   platform_config       → toggles globales
--   panel_memberships     → (ya vacío si borraste participants)
-- ============================================================

-- Verificación final
SELECT 'participants' AS tabla, COUNT(*) FROM participants
UNION ALL SELECT 'field_operators', COUNT(*) FROM field_operators
UNION ALL SELECT 'responses', COUNT(*) FROM responses
UNION ALL SELECT 'surveys', COUNT(*) FROM surveys
UNION ALL SELECT 'projects', COUNT(*) FROM projects;
