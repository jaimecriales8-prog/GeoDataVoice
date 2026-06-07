-- Encuestas abiertas (P1-27)
-- Correr en Supabase Dashboard → SQL Editor

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS es_abierta        boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug              text     UNIQUE,
  ADD COLUMN IF NOT EXISTS abierta_identidad boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS abierta_pago      boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS abierta_anonima   boolean  DEFAULT true;

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;

-- Índice para lookup por slug
CREATE UNIQUE INDEX IF NOT EXISTS surveys_slug_idx ON surveys(slug) WHERE slug IS NOT NULL;

-- Histórico del perfil socioeconómico del panelista (P1-18)
CREATE TABLE IF NOT EXISTS participant_profile_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  data           jsonb NOT NULL  -- snapshot de los campos socioeconómicos
);

CREATE INDEX IF NOT EXISTS pph_participant_idx ON participant_profile_history(participant_id, captured_at DESC);
