import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, UserPlus, Shield, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useToast } from '../hooks/use-toast';
import { logger } from '@/lib/logger';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';

interface UserProfile {
  id: string;
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  full_name?: string;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'viewer' as const });
  const { user } = useAuthStore();
  const { toast } = useToast();
  const { isMobile } = useDeviceInfo();

  const isAdmin = hasPermission(user?.profile?.role, 'delete');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    try {
      logger.debug('Creating user:', newUser.email, 'with role:', newUser.role);

      // Note: supabase.auth.admin requires service role key, which we don't have in the browser
      // This is a limitation - we'll show instructions instead
      
      toast({
        title: "User Creation Method",
        description: "Please use Supabase Dashboard to create users, then assign roles here.",
        variant: "destructive"
      });

      // Alternative: Create a server function or use Supabase Dashboard
      // For now, we'll provide instructions
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully"
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;

    try {
      // Delete from auth (will cascade to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${userEmail} deleted successfully`
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case 'editor':
        return <Badge className="bg-green-100 text-green-800">Editor</Badge>;
      case 'viewer':
        return <Badge className="bg-blue-100 text-blue-800">Viewer</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{role}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">You need admin privileges to manage users.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts and role assignments
              </CardDescription>
            </div>
            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  User Creation Guide
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>How to Create New Users</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">📋 Method 1: Supabase Dashboard</h4>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Go to Supabase Dashboard → Authentication → Users</li>
                      <li>Click "Add User"</li>
                      <li>Enter email and password</li>
                      <li>Check "Auto Confirm User" ✅</li>
                      <li>Click "Create User"</li>
                      <li>Come back here to assign roles</li>
                    </ol>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">🎯 Method 2: Email Patterns (Automatic)</h4>
                    <p className="text-sm text-green-700 mb-2">Users can sign up and get roles automatically:</p>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• <code>admin@company.com</code> → Admin role</li>
                      <li>• <code>editor@company.com</code> → Editor role</li>
                      <li>• <code>manager@company.com</code> → Editor role</li>
                      <li>• <code>user@company.com</code> → Viewer role</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚡ Quick Test Users</h4>
                    <p className="text-sm text-yellow-700 mb-2">Create these in Supabase Dashboard:</p>
                    <div className="text-xs font-mono space-y-1">
                      <div>📧 <code>viewer@test.com</code> → Viewer</div>
                      <div>📧 <code>editor@test.com</code> → Editor</div>
                      <div>📧 <code>newadmin@test.com</code> → Admin</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={() => setCreateUserOpen(false)}>
                      Got it!
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {users.map((userProfile) => (
                <div key={userProfile.id} className="rounded-xl border border-border/80 p-4 space-y-2">
                  <p className="font-semibold text-base text-foreground">{userProfile.email}</p>
                  {userProfile.full_name && (
                    <p className="text-sm text-muted-foreground">{userProfile.full_name}</p>
                  )}
                  <div>{getRoleBadge(userProfile.role)}</div>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(userProfile.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={userProfile.role}
                      onValueChange={(newRole) => updateUserRole(userProfile.id, newRole)}
                    >
                      <SelectTrigger className="w-36 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Viewer
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {userProfile.email !== user?.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 text-destructive hover:text-destructive"
                        onClick={() => deleteUser(userProfile.id, userProfile.email)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{userProfile.email}</p>
                        {userProfile.full_name && (
                          <p className="text-sm text-muted-foreground">{userProfile.full_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(userProfile.role)}</TableCell>
                    <TableCell>
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={userProfile.role}
                          onValueChange={(newRole) => updateUserRole(userProfile.id, newRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Viewer
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Editor
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {userProfile.email !== user?.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(userProfile.id, userProfile.email)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
