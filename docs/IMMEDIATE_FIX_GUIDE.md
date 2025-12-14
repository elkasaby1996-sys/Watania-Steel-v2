# Immediate Fix for ahmed@watania.com Profile Issue

## Step 1: Check Current Database State

First, let's see what's in your database. Go to Supabase SQL Editor and run:

```sql
-- Check if profiles table exists and what's in it
SELECT * FROM profiles;

-- Check auth users
SELECT id, email, created_at FROM auth.users;

-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

## Step 2: Quick Fix - Manually Create Profile

If the profile doesn't exist, create it manually:

```sql
-- Get the user ID for ahmed@watania.com
SELECT id, email FROM auth.users WHERE email = 'ahmed@watania.com';

-- Insert profile manually (replace USER_ID_HERE with actual ID from above)
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual user ID
  'ahmed@watania.com',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
```

## Step 3: Set Up Database Trigger (If Missing)

Run this in Supabase SQL Editor:

```sql
-- Create or replace the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'ahmed@watania.com' THEN 'admin'
      WHEN NEW.email ILIKE '%admin%' THEN 'admin'
      WHEN NEW.email ILIKE '%editor%' THEN 'editor'
      ELSE 'viewer'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 4: Verify Fix

After running the manual insert, check:

```sql
-- Verify profile was created
SELECT * FROM profiles WHERE email = 'ahmed@watania.com';
```

You should see:
- id: (user UUID)
- email: ahmed@watania.com
- role: admin
- created_at: (timestamp)
- updated_at: (timestamp)
