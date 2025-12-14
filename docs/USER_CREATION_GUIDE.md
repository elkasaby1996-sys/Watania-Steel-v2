# User Creation and Role Management Guide

## Method 1: Through the App (Admin Users Only)

### Access User Management
1. **Sign in as an admin** (like `admin@test.com` or `ahmed@watania.com`)
2. **Click "Users" in the sidebar** (only visible to admins)
3. **Click "Add User" button**

### Create New User
1. **Fill in the form:**
   - Email: `newuser@company.com`
   - Password: `SecurePassword123!`
   - Role: Select from dropdown (Viewer/Editor/Admin)
2. **Click "Create User"**
3. **User is created immediately with the specified role**

## Method 2: Supabase Dashboard (Manual)

### Create User in Auth
1. **Go to Supabase Dashboard → Authentication → Users**
2. **Click "Add User"**
3. **Fill in:**
   - Email: `newuser@company.com`
   - Password: `SecurePassword123!`
   - Auto Confirm User: ✅ (check this box)
4. **Click "Create User"**

### Assign Role in Database
1. **Go to SQL Editor**
2. **Run this command:**
```sql
-- Create profile with specific role
INSERT INTO profiles (id, email, role, full_name)
SELECT 
  au.id,
  'newuser@company.com',
  'editor',  -- Change to 'viewer', 'editor', or 'admin'
  'New User Name'
FROM auth.users au
WHERE au.email = 'newuser@company.com'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();
```

## Method 3: Automatic Role Assignment (Email Patterns)

When users sign up, roles are automatically assigned based on email patterns:

### Admin Users (Automatic)
- `ahmed@watania.com` → **Admin**
- `admin@company.com` → **Admin**
- `superadmin@test.com` → **Admin**
- Any email containing "admin" → **Admin**

### Editor Users (Automatic)
- `editor@company.com` → **Editor**
- `manager@company.com` → **Editor**
- Any email containing "editor" or "manager" → **Editor**

### Viewer Users (Default)
- `user@company.com` → **Viewer**
- `staff@company.com` → **Viewer**
- All other emails → **Viewer**

## Method 4: Bulk User Creation (SQL)

### Create Multiple Users at Once
```sql
-- Insert multiple profiles (users must exist in auth.users first)
INSERT INTO profiles (id, email, role, full_name) VALUES
-- Get user IDs and assign roles
(
  (SELECT id FROM auth.users WHERE email = 'john@company.com'),
  'john@company.com',
  'editor',
  'John Smith'
),
(
  (SELECT id FROM auth.users WHERE email = 'jane@company.com'),
  'jane@company.com',
  'viewer',
  'Jane Doe'
),
(
  (SELECT id FROM auth.users WHERE email = 'mike@company.com'),
  'mike@company.com',
  'admin',
  'Mike Johnson'
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();
```

## Method 5: Update Existing User Roles

### Change User Role via App
1. **Go to Users page** (admin only)
2. **Find the user in the table**
3. **Use the role dropdown** to change their role
4. **Role updates immediately**

### Change User Role via SQL
```sql
-- Update specific user role
UPDATE profiles 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'user@company.com';

-- Update multiple users
UPDATE profiles 
SET role = 'editor', updated_at = NOW() 
WHERE email IN ('user1@company.com', 'user2@company.com');

-- Make all managers editors
UPDATE profiles 
SET role = 'editor', updated_at = NOW() 
WHERE email ILIKE '%manager%';
```

## Role Permissions Summary

### Viewer Role
- ✅ View dashboard and orders
- ✅ View order history
- ❌ Cannot create orders
- ❌ Cannot edit orders
- ❌ Cannot delete orders
- ❌ Cannot access user management

### Editor Role
- ✅ View dashboard and orders
- ✅ View order history
- ✅ Create new orders
- ✅ Edit existing orders
- ✅ Mark orders as delivered
- ❌ Cannot delete orders
- ❌ Cannot access user management

### Admin Role
- ✅ View dashboard and orders
- ✅ View order history
- ✅ Create new orders
- ✅ Edit existing orders
- ✅ Mark orders as delivered
- ✅ Delete orders
- ✅ Access user management
- ✅ Create/edit/delete users

## Quick Test Users

Create these test users to verify the system:

### Via App (Recommended)
1. **Sign in as admin**
2. **Go to Users page**
3. **Create these users:**

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `viewer@test.com` | `Test123!` | Viewer | Test read-only access |
| `editor@test.com` | `Test123!` | Editor | Test order management |
| `manager@test.com` | `Test123!` | Editor | Test manager access |
| `newadmin@test.com` | `Test123!` | Admin | Test admin functions |

### Via Email Patterns (Automatic)
Just have users sign up with these emails and roles will be assigned automatically:
- `support@company.com` → Viewer
- `projectmanager@company.com` → Editor  
- `sysadmin@company.com` → Admin

## Troubleshooting

### User Created But No Role
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE email = 'user@company.com';

-- Create missing profile
INSERT INTO profiles (id, email, role, full_name)
SELECT id, email, 'viewer', split_part(email, '@', 1)
FROM auth.users 
WHERE email = 'user@company.com'
AND id NOT IN (SELECT id FROM profiles);
```

### User Can't Sign In
1. **Check if user is confirmed** in Supabase Auth → Users
2. **Make sure "Auto Confirm User" was checked** when creating
3. **Verify email/password** are correct

### Role Not Working
```sql
-- Verify user role
SELECT email, role FROM profiles WHERE email = 'user@company.com';

-- Update role if needed
UPDATE profiles SET role = 'admin' WHERE email = 'user@company.com';
```
