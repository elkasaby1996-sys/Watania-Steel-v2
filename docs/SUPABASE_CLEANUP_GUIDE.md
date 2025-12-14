# Supabase Database Cleanup and Fresh Setup Guide

## Step 1: Clean Up Existing Data

### 1.1 Delete All Profiles
Go to your Supabase dashboard → Table Editor → `profiles` table:
```sql
-- Delete all existing profiles
DELETE FROM profiles;
```

### 1.2 Delete All Users
Go to your Supabase dashboard → Authentication → Users:
- Select all users and delete them manually, OR
- Use the SQL Editor:
```sql
-- This will cascade delete users and their auth data
-- Run this in the SQL Editor with caution
DELETE FROM auth.users;
```

### 1.3 Clean Up Orders and Activities (Optional)
If you want to start completely fresh:
```sql
-- Delete all orders
DELETE FROM orders;

-- Delete all activities  
DELETE FROM activities;
```

## Step 2: Set Up Proper Database Schema

### 2.1 Update Profiles Table
Run this in your Supabase SQL Editor:

```sql
-- Drop existing profiles table if needed
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with proper structure
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin policy to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 2.2 Create Profile Trigger
```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'ahmed@watania.com' THEN 'admin'
      WHEN NEW.email LIKE '%admin%' THEN 'admin'
      WHEN NEW.email LIKE '%editor%' THEN 'editor'
      ELSE 'viewer'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 3: Create Initial Admin User

### 3.1 Method 1: Through the App
1. Start your app (`npm run dev`)
2. Go to the signup tab
3. Create account with email: `ahmed@watania.com`
4. The trigger will automatically assign admin role

### 3.2 Method 2: Manually in Supabase
1. Go to Authentication → Users → Add User
2. Create user with:
   - Email: `ahmed@watania.com`
   - Password: `your_secure_password`
   - Auto Confirm User: ✅
3. The profile will be created automatically with admin role

### 3.3 Method 3: SQL Insert (if trigger doesn't work)
```sql
-- First create the auth user (do this in Auth → Users in dashboard)
-- Then manually insert profile:
INSERT INTO profiles (id, email, role, full_name)
VALUES (
  'USER_UUID_FROM_AUTH_USERS_TABLE',
  'ahmed@watania.com', 
  'admin',
  'Ahmed Admin'
);
```

## Step 4: Test the Setup

### 4.1 Create Test Users
Create these test accounts to verify role assignment:

1. **Admin User**: `admin@test.com` → Should get 'admin' role
2. **Editor User**: `editor@test.com` → Should get 'editor' role  
3. **Regular User**: `user@test.com` → Should get 'viewer' role
4. **Main Admin**: `ahmed@watania.com` → Should get 'admin' role

### 4.2 Verify Roles
Check that profiles are created correctly:
```sql
SELECT id, email, role, created_at FROM profiles ORDER BY created_at;
```

## Step 5: Update Role Assignments (If Needed)

If you need to change a user's role later:
```sql
-- Make someone an admin
UPDATE profiles 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'user@example.com';

-- Make someone an editor
UPDATE profiles 
SET role = 'editor', updated_at = NOW() 
WHERE email = 'user@example.com';

-- Make someone a viewer
UPDATE profiles 
SET role = 'viewer', updated_at = NOW() 
WHERE email = 'user@example.com';
```

## Step 6: Verify App Functionality

After cleanup and setup:

1. ✅ Sign up new users
2. ✅ Check role assignment works automatically
3. ✅ Test permissions (viewers can't create, editors can create/edit, admins can delete)
4. ✅ Verify UI shows/hides buttons based on roles
5. ✅ Test order creation, editing, and deletion

## Troubleshooting

### If Profiles Aren't Created Automatically:
1. Check if the trigger exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

2. Check if the function exists:
```sql
SELECT * FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

3. Manually create profile if needed:
```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'admin' 
FROM auth.users 
WHERE email = 'ahmed@watania.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.users.id);
```

### If RLS Policies Block Access:
Temporarily disable RLS for testing:
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable after testing:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## Security Notes

- The trigger automatically assigns roles based on email patterns
- `ahmed@watania.com` always gets admin role
- Emails containing 'admin' get admin role
- Emails containing 'editor' get editor role
- All others get viewer role
- You can manually update roles in the Supabase dashboard later
