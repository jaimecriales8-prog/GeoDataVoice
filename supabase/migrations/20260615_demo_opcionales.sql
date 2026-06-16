ALTER TABLE surveys ADD COLUMN IF NOT EXISTS demo_opcionales jsonb DEFAULT '{}'::jsonb;
