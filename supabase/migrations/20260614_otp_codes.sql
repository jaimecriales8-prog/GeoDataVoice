-- Tabla para OTP de verificacion de celular via WhatsApp
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Solo el propio participante puede leer sus OTPs (via service role en API)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON otp_codes USING (false);

-- Indice para busqueda rapida
CREATE INDEX IF NOT EXISTS otp_codes_participant_idx ON otp_codes(participant_id, used, expires_at);
