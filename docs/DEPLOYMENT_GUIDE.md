# Deployment Guide - Order Tracking System

## 🚀 Production Deployment Steps

### **1. Database Setup (Supabase)**

#### Create Tables
Run these SQL commands in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table with all fields
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed', 'delayed', 'delivered')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tons DECIMAL(8,2) NOT NULL DEFAULT 0,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  delivery_number TEXT,
  company TEXT,
  site TEXT,
  driver_name TEXT,
  phone_number TEXT,
  delivered_at TIMESTAMPTZ,
  signed_delivery_note BOOLEAN DEFAULT FALSE,
  order_type TEXT DEFAULT 'straight-bar' CHECK (order_type IN ('straight-bar', 'cut-and-bend')),
  breakdown_8mm DECIMAL(8,2) DEFAULT 0,
  breakdown_10mm DECIMAL(8,2) DEFAULT 0,
  breakdown_12mm DECIMAL(8,2) DEFAULT 0,
  breakdown_14mm DECIMAL(8,2) DEFAULT 0,
  breakdown_16mm DECIMAL(8,2) DEFAULT 0,
  breakdown_18mm DECIMAL(8,2) DEFAULT 0,
  breakdown_20mm DECIMAL(8,2) DEFAULT 0,
  breakdown_25mm DECIMAL(8,2) DEFAULT 0,
  breakdown_32mm DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activities table
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_driver_name ON orders(driver_name);
CREATE INDEX idx_drivers_name ON drivers(name);
CREATE INDEX idx_drivers_active ON drivers(is_active);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

CREATE POLICY "Authenticated users can view drivers" ON drivers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Editors can manage drivers" ON drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Authenticated users can view orders" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Editors can manage orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Authenticated users can view activities" ON activities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create activities" ON activities
  FOR INSERT WITH CHECK (true);
```

#### Create Profile Trigger
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

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **2. Environment Configuration**

Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Build and Deploy**

#### For Vercel:
```bash
npm run build
vercel --prod
```

#### For Netlify:
```bash
npm run build
netlify deploy --prod --dir=dist
```

#### For Traditional Hosting:
```bash
npm run build
# Upload dist/ folder to your web server
```

### **4. Initial Admin Setup**

1. **Create Admin User**:
   - Go to your deployed app
   - Sign up with email: `ahmed@watania.com`
   - This will automatically get admin role

2. **Add Sample Drivers**:
```sql
INSERT INTO drivers (id, name, phone_number, is_active) VALUES
('DRV-001', 'Ahmed Hassan', '+20 100 123 4567', true),
('DRV-002', 'Mohamed Ali', '+20 101 234 5678', true),
('DRV-003', 'Omar Khaled', '+20 102 345 6789', true);
```

### **5. Production Checklist**

- ✅ Database tables created
- ✅ RLS policies enabled
- ✅ Indexes created for performance
- ✅ Environment variables configured
- ✅ Admin user created
- ✅ Sample data added
- ✅ SSL certificate enabled
- ✅ Domain configured
- ✅ Backup strategy in place

### **6. Monitoring & Maintenance**

#### Database Monitoring
- Monitor Supabase dashboard for performance
- Set up alerts for high usage
- Regular database backups

#### Application Monitoring
- Monitor error rates
- Track user activity
- Performance monitoring

#### Regular Maintenance
- Update dependencies monthly
- Review and optimize database queries
- Clean up old activities/logs
- User access review

### **7. Scaling Considerations**

#### Database Optimization
- Add more indexes as data grows
- Consider partitioning for large tables
- Optimize queries for performance

#### Application Scaling
- Use CDN for static assets
- Implement caching strategies
- Consider server-side rendering for SEO

### **8. Security Best Practices**

- ✅ RLS policies enabled
- ✅ Input validation implemented
- ✅ Role-based access control
- ✅ HTTPS enforced
- ✅ Regular security updates
- ✅ User session management

## 🎯 Post-Deployment

After successful deployment:

1. **Test all features** with different user roles
2. **Create additional users** for your team
3. **Import existing data** if migrating from another system
4. **Train users** on the new system
5. **Set up monitoring** and alerts
6. **Plan regular maintenance** schedule

Your Order Tracking System is now ready for production use! 🚀
