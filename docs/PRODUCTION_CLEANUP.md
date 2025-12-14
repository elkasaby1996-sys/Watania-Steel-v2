# Production Cleanup Guide

## Database Cleanup (Run in Supabase SQL Editor)

### 1. Clean Up Tables and Policies
```sql
-- Clean up profiles table
DROP POLICY IF EXISTS "Public read access" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;

-- Create proper RLS policies for profiles
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

-- Ensure orders table has proper policies
CREATE POLICY IF NOT EXISTS "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Clean up any test data
DELETE FROM orders WHERE id LIKE 'TEST-%';
DELETE FROM activities WHERE message LIKE '%TEST%';
```

### 2. Verify Database Structure
```sql
-- Check profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check orders table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Verify all users have profiles
SELECT 
  au.email,
  p.role,
  CASE WHEN p.id IS NULL THEN 'Missing Profile' ELSE 'Has Profile' END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at;
```

## Files to Delete

### Temporary Fix Documentation
- `docs/URGENT_DATABASE_FIX.md`
- `docs/IMMEDIATE_FIX_GUIDE.md`
- `docs/FIX_RLS_RECURSION.md`
- `docs/FIX_ORDERS_RLS.md`
- `docs/MANUAL_SQL_FIX.md`
- `docs/COMPLETE_USER_SETUP.md`

### Temporary Components
- `src/components/DatabaseFixButton.tsx`
- `src/components/OrderCreationError.tsx`

## Code Cleanup Tasks

### Remove Debug Code
- Remove debug logging in production
- Remove temporary fix buttons
- Clean up error handling
- Remove development-only features

### Optimize Imports
- Ensure all imports are used
- Remove unused dependencies
- Clean up component exports

### Final Documentation
- Keep only essential documentation
- Update README with final setup instructions
- Create deployment guide
