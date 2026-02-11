-- Profiles Table Optimization
-- Date: 2026-02-11

-- Index for role filtering (Dealers/Admin lists)
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Index for name searching/sorting
CREATE INDEX IF NOT EXISTS profiles_name_idx ON public.profiles(name);
