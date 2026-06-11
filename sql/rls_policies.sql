-- RLS policies recommended template (adjust for your auth model)

-- Enable RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select/insert/update their own trips/incidents
-- Assumes use of supabase.auth and jwt.sub contains user id; adapt as needed.

-- Drivers: allow read for any authenticated user, restrict write to admin (example)
CREATE POLICY drivers_select_auth ON drivers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY drivers_insert_admin ON drivers FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY drivers_update_admin ON drivers FOR UPDATE USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Trips: allow select for authenticated users; insert allowed if user is authenticated
CREATE POLICY trips_select_auth ON trips FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY trips_insert_auth ON trips FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY trips_update_auth ON trips FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Incidents: similar rules
CREATE POLICY incidents_select_auth ON incidents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY incidents_insert_auth ON incidents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY incidents_update_auth ON incidents FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Note: replace auth.role() checks with more specific rules if you manage roles differently.
-- For admin operations, prefer using Supabase Service Role key on server-side only.
