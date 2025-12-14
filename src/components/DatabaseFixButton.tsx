import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Database, RefreshCw, CheckCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../hooks/use-toast';

export function DatabaseFixButton() {
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { user, refreshProfile } = useAuthStore();
  const { toast } = useToast();

  const fixCurrentUser = async () => {
    setFixing(true);
    setResults([]);
    
    try {
      if (!user?.id || !user?.email) {
        setResults(prev => [...prev, `❌ No current user found`]);
        return;
      }

      setResults(prev => [...prev, `🔍 Fixing profile for current user: ${user.email}`]);

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        setResults(prev => [...prev, `❌ Error checking existing profile: ${checkError.message}`]);
        return;
      }

      if (existingProfile) {
        setResults(prev => [...prev, `ℹ️ Profile already exists with role: ${existingProfile.role}`]);
        await refreshProfile();
        setResults(prev => [...prev, `🔄 Refreshed profile from database`]);
        
        toast({
          title: "Profile Found",
          description: `Your profile exists with role: ${existingProfile.role}`,
        });
        return;
      }

      // Determine role based on email
      let role: 'viewer' | 'editor' | 'admin' = 'viewer';
      if (user.email === 'ahmed@watania.com') {
        role = 'admin';
      } else if (user.email.toLowerCase().includes('admin')) {
        role = 'admin';
      } else if (user.email.toLowerCase().includes('editor') || user.email.toLowerCase().includes('manager')) {
        role = 'editor';
      }

      setResults(prev => [...prev, `📋 Assigning role: ${role} based on email pattern`]);

      // Create the profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          role: role,
          full_name: user.email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        setResults(prev => [...prev, `❌ Failed to create profile: ${insertError.message}`]);
        
        // Try alternative approach - disable RLS temporarily
        setResults(prev => [...prev, `🔄 Trying alternative approach...`]);
        
        // This might work if RLS is blocking the insert
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          user_id: user.id,
          user_email: user.email,
          user_role: role
        });

        if (rpcError) {
          setResults(prev => [...prev, `❌ Alternative approach failed: ${rpcError.message}`]);
          setResults(prev => [...prev, `💡 Please run the SQL commands manually in Supabase dashboard`]);
        } else {
          setResults(prev => [...prev, `✅ Profile created via RPC function`]);
        }
      } else {
        setResults(prev => [...prev, `✅ Profile created successfully: ${newProfile.email} → ${newProfile.role}`]);
      }

      // Refresh the profile in the app
      await refreshProfile();
      setResults(prev => [...prev, `🔄 Profile refreshed in application`]);

      toast({
        title: "Profile Created",
        description: `Your profile has been created with ${role} role`,
      });

    } catch (error) {
      console.error('Profile fix error:', error);
      setResults(prev => [...prev, `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      
      toast({
        title: "Profile Fix Failed",
        description: "Please try the manual SQL approach in the documentation",
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Database Fix Required
        </CardTitle>
        <CardDescription className="text-orange-700">
          RLS policy recursion detected! Please run the SQL fix in Supabase dashboard to resolve this issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-semibold text-red-800 text-sm mb-1">🚨 RLS Policy Issue Detected</h4>
            <p className="text-xs text-red-700">
              The database has infinite recursion in RLS policies. The app fix won't work until this is resolved.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-blue-800 text-sm mb-2">📋 Quick Fix Steps:</h4>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to Supabase Dashboard → SQL Editor</li>
              <li>Run: <code className="bg-blue-100 px-1 rounded">ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;</code></li>
              <li>Run: <code className="bg-blue-100 px-1 rounded">ALTER TABLE orders DISABLE ROW LEVEL SECURITY;</code></li>
              <li>Check <code>docs/FIX_ORDERS_RLS.md</code> for order table fix</li>
              <li>Refresh this page after running the SQL</li>
            </ol>
          </div>
          
          <Button 
            onClick={fixCurrentUser} 
            disabled={fixing}
            className="w-full"
            variant="outline"
          >
            {fixing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Trying Fix...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Try App Fix (May Fail)
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg p-4 border max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Fix Results:
            </h4>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
            
            {results.some(r => r.includes('manually')) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800 font-medium">
                  📖 Manual Fix Required
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Check <code>docs/MANUAL_SQL_FIX.md</code> for complete SQL commands to run in Supabase dashboard.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
