-- Fix Supabase linter errors:
-- - policy_exists_rls_disabled
-- - rls_disabled_in_public
--
-- Existing profiles policies are already present in production.
-- This migration enables RLS so those policies are enforced.

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

