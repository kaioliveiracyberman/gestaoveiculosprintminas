DROP POLICY IF EXISTS "Allow anon read drivers" ON drivers;
DROP POLICY IF EXISTS "Allow anon write drivers" ON drivers;
DROP POLICY IF EXISTS "Allow anon read trips" ON trips;
DROP POLICY IF EXISTS "Allow anon write trips" ON trips;
DROP POLICY IF EXISTS "Allow anon read incidents" ON incidents;
DROP POLICY IF EXISTS "Allow anon write incidents" ON incidents;

CREATE POLICY "Allow anon read drivers" ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow anon write drivers" ON drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update drivers" ON drivers FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete drivers" ON drivers FOR DELETE USING (true);

CREATE POLICY "Allow anon read trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Allow anon write trips" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update trips" ON trips FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete trips" ON trips FOR DELETE USING (true);

CREATE POLICY "Allow anon read incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow anon write incidents" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update incidents" ON incidents FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete incidents" ON incidents FOR DELETE USING (true);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
