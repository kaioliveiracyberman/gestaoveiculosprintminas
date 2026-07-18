-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versão.
-- Mantém o estado de chamados que bloqueiam veículos em todos os dispositivos.

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS blocks_vehicle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'resolved',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS plate text,
  ADD COLUMN IF NOT EXISTS renavam text;

ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open', 'resolved'));

CREATE INDEX IF NOT EXISTS incidents_open_vehicle_idx
  ON incidents (vehicle)
  WHERE blocks_vehicle = true AND status = 'open';

-- Histórico de alterações de registros de viagem.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS change_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client text;
