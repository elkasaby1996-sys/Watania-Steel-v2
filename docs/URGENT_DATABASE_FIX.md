# URGENT: Fix User Roles Database Issue

## Problem
Users are signing up but no profiles are being created, so no roles are assigned.

## Step 1: Check Current Database State

Go to Supabase SQL Editor and run these queries:

```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check current profiles (probably empty)
SELECT * FROM profiles;

-- Check auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Check if trigger exists
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
```

## Step 2: Create/Fix Profiles Table

```sql
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## Step 3: Create the Trigger Function

```sql
-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'ahmed@watania.com' THEN 'admin'
      WHEN NEW.email ILIKE '%admin%' THEN 'admin'
      WHEN NEW.email ILIKE '%editor%' THEN 'editor'
      WHEN NEW.email ILIKE '%manager%' THEN 'editor'
      ELSE 'viewer'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 4: Fix Existing Users (CRITICAL)

```sql
-- Create profiles for all existing users who don't have them
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN au.email = 'ahmed@watania.com' THEN 'admin'
    WHEN au.email ILIKE '%admin%' THEN 'admin'
    WHEN au.email ILIKE '%editor%' THEN 'editor'
    WHEN au.email ILIKE '%manager%' THEN 'editor'
    ELSE 'viewer'
  END as role,
  split_part(au.email, '@', 1) as full_name,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Verify profiles were created
SELECT email, role, created_at FROM profiles ORDER BY created_at DESC;
```

## Step 5: Test the Setup

```sql
-- Check that all users now have profiles
SELECT 
  au.email as auth_email,
  p.email as profile_email,
  p.role,
  p.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
```

## Step 6: Manual Role Updates (if needed)

```sql
-- Update specific users to correct roles
UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'admin@test.com';
UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'ahmed@watania.com';
UPDATE profiles SET role = 'editor', updated_at = NOW() WHERE email = 'editor@test.com';
UPDATE profiles SET role = 'viewer', updated_at = NOW() WHERE email = 'viewer@test.com';

-- Verify updates
SELECT email, role FROM profiles ORDER BY email;
```
