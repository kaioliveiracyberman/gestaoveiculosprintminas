-- Rastreamento GPS e consumo por rota.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS route_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gps_distance_km NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS gps_last_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS gps_last_lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS gps_last_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fuel_cost NUMERIC(10,2);
