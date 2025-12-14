# Complete User and Role Management System Setup

## Step 1: Clean Database and Set Up Proper Schema

### 1.1 Clean Everything
```sql
-- Delete all existing data
DELETE FROM profiles;
DELETE FROM orders;
DELETE FROM activities;

-- In Authentication > Users, delete all users manually or use:
-- (Be careful with this - it deletes ALL users)
DELETE FROM auth.users;
```

### 1.2 Create Proper Profiles Table
```sql
-- Drop and recreate profiles table with proper structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
```

### 1.3 Create User Management Function and Trigger
```sql
-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    -- Default role assignment based on email patterns
    CASE 
      WHEN NEW.email = 'ahmed@watania.com' THEN 'admin'
      WHEN NEW.email ILIKE '%admin%' THEN 'admin'
      WHEN NEW.email ILIKE '%editor%' THEN 'editor'
      ELSE 'viewer'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1.4 Create User Management Functions
```sql
-- Function to update user role (for admins)
CREATE OR REPLACE FUNCTION public.update_user_role(user_email TEXT, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the role is valid
  IF new_role NOT IN ('viewer', 'editor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be viewer, editor, or admin';
  END IF;
  
  -- Update the user's role
  UPDATE profiles 
  SET role = new_role, updated_at = NOW() 
  WHERE email = user_email;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id UUID, email TEXT, role TEXT, full_name TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.role, p.full_name, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 2: Create Initial Users

### 2.1 Create Admin User
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Fill in:
   - Email: `ahmed@watania.com`
   - Password: `SecurePassword123!`
   - Auto Confirm User: ✅
4. The profile will be created automatically with admin role

### 2.2 Create Test Users
Create these users to test all roles:

**Admin Users:**
- Email: `admin@company.com`, Password: `Admin123!`
- Email: `superadmin@test.com`, Password: `Admin123!`

**Editor Users:**
- Email: `editor@company.com`, Password: `Editor123!`
- Email: `manager@company.com`, Password: `Editor123!` (will need manual role update)

**Viewer Users:**
- Email: `viewer@company.com`, Password: `Viewer123!`
- Email: `staff@company.com`, Password: `Viewer123!`

### 2.3 Manual Role Updates (if needed)
```sql
-- Update specific users to different roles
SELECT public.update_user_role('manager@company.com', 'editor');
SELECT public.update_user_role('staff@company.com', 'viewer');

-- Check all users and their roles
SELECT * FROM public.get_all_users();
```

## Step 3: Verify the System

### 3.1 Test User Creation
1. Try signing up with `newuser@test.com` - should get viewer role
2. Try signing up with `newadmin@test.com` - should get admin role
3. Try signing up with `neweditor@test.com` - should get editor role

### 3.2 Test Role Permissions
For each user type, verify:

**Viewer (`viewer@company.com`):**
- ✅ Can view dashboard
- ✅ Can view orders
- ❌ Cannot create orders
- ❌ Cannot edit orders
- ❌ Cannot delete orders

**Editor (`editor@company.com`):**
- ✅ Can view dashboard
- ✅ Can view orders
- ✅ Can create orders
- ✅ Can edit orders
- ❌ Cannot delete orders

**Admin (`ahmed@watania.com`):**
- ✅ Can view dashboard
- ✅ Can view orders
- ✅ Can create orders
- ✅ Can edit orders
- ✅ Can delete orders

### 3.3 Database Verification
```sql
-- Check all profiles were created correctly
SELECT email, role, created_at FROM profiles ORDER BY created_at;

-- Check trigger is working
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test role update function
SELECT public.update_user_role('test@example.com', 'editor');
```

## Step 4: User Management Commands

### 4.1 Common Role Updates
```sql
-- Make someone an admin
SELECT public.update_user_role('user@example.com', 'admin');

-- Make someone an editor
SELECT public.update_user_role('user@example.com', 'editor');

-- Make someone a viewer
SELECT public.update_user_role('user@example.com', 'viewer');

-- View all users
SELECT * FROM public.get_all_users();
```

### 4.2 Bulk Role Updates
```sql
-- Make all users with 'manager' in email editors
UPDATE profiles 
SET role = 'editor', updated_at = NOW() 
WHERE email ILIKE '%manager%' AND role != 'admin';

-- Make all users with 'support' in email viewers
UPDATE profiles 
SET role = 'viewer', updated_at = NOW() 
WHERE email ILIKE '%support%';
```

## Step 5: Troubleshooting

### 5.1 If Profiles Aren't Created Automatically
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Manually create missing profiles
INSERT INTO profiles (id, email, role)
SELECT au.id, au.email, 
  CASE 
    WHEN au.email = 'ahmed@watania.com' THEN 'admin'
    WHEN au.email ILIKE '%admin%' THEN 'admin'
    WHEN au.email ILIKE '%editor%' THEN 'editor'
    ELSE 'viewer'
  END
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

### 5.2 If RLS Blocks Access
```sql
-- Temporarily disable RLS for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 5.3 Reset Everything
```sql
-- Nuclear option - start completely fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS profiles CASCADE;
-- Then follow setup steps again
```
