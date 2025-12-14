# Manual SQL Fix for All Users

Since the automatic fix has permission issues, here's the manual SQL approach:

## Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run these commands one by one:

## Step 2: Create Profiles Table (if needed)
```sql
-- Create profiles table
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
```

## Step 3: Create RLS Policies
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create new policies
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

## Step 4: Create Helper Function
```sql
-- Function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, user_email TEXT, user_role TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    user_role,
    split_part(user_email, '@', 1),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 5: Create Profiles for Existing Users
```sql
-- Create profiles for all existing users
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
```

## Step 6: Set Up Trigger for New Users
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

## Step 7: Verify Everything Works
```sql
-- Check all profiles
SELECT email, role, created_at FROM profiles ORDER BY created_at DESC;

-- Check specific users
SELECT email, role FROM profiles WHERE email IN (
  'ahmed@watania.com',
  'admin@test.com',
  'editor@test.com',
  'viewer@test.com'
);
```

## Step 8: Manual Role Updates (if needed)
```sql
-- Update specific users
UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'admin@test.com';
UPDATE profiles SET role = 'editor', updated_at = NOW() WHERE email = 'editor@test.com';
UPDATE profiles SET role = 'viewer', updated_at = NOW() WHERE email = 'viewer@test.com';
```

After running these commands, refresh your app and all users should have proper roles!
