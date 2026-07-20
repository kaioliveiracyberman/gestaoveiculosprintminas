-- Documentos de motoristas e cadastro de veículos.
-- Execute uma única vez no SQL Editor do Supabase.
-- Os documentos ficam protegidos: somente usuários autenticados podem lê-los.

CREATE TABLE IF NOT EXISTS driver_documents (
  id BIGINT PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  file_data TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS driver_documents_authenticated_access ON driver_documents;
CREATE POLICY driver_documents_authenticated_access ON driver_documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  plate TEXT,
  renavam TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  has_document BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicles_authenticated_access ON vehicles;
CREATE POLICY vehicles_authenticated_access ON vehicles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id BIGINT PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  file_data TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vehicle_documents_authenticated_access ON vehicle_documents;
CREATE POLICY vehicle_documents_authenticated_access ON vehicle_documents
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
