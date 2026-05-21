ALTER TABLE driver_profiles
  ADD COLUMN IF NOT EXISTS rating numeric(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0;