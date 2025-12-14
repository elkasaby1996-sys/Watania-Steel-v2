# Fix RLS Infinite Recursion Issue

## Problem
The RLS policies are causing infinite recursion because the admin policy tries to check the profiles table to see if a user is admin, but it can't access the profiles table without already being admin.

## URGENT FIX - Run in Supabase SQL Editor

### Step 1: Temporarily Disable RLS
```sql
-- Disable RLS to fix the recursion issue
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

### Step 2: Create Profiles for All Users
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

-- Insert profiles for all existing users
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
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();
```

### Step 3: Create Better RLS Policies (No Recursion)
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can view and update their own profile
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Allow public read access (you can restrict this later if needed)
CREATE POLICY "Public read access" ON profiles
  FOR SELECT USING (true);
```

### Step 4: Create Trigger for New Users
```sql
-- Function to handle new user signups
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
    split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 5: Verify Everything Works
```sql
-- Check all profiles
SELECT email, role, created_at FROM profiles ORDER BY email;

-- Test specific users
SELECT email, role FROM profiles WHERE email IN (
  'ahmed@watania.com',
  'admin@test.com',
  'editor@test.com'
);
```

## Alternative: No RLS Approach (Simpler)

If you want to keep it simple for now, you can disable RLS entirely:

```sql
-- Disable RLS completely (less secure but works)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create all profiles
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
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();
```

After running these commands, refresh your app and all users should have proper roles!
