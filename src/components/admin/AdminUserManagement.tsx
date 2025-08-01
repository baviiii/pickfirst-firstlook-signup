import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Shield, User, Activity, Loader2 } from 'lucide-react';
import { auditService } from '@/services/auditService';
import { rateLimitService } from '@/services/rateLimitService';
import { withErrorBoundary } from '@/components/ui/error-boundary';

const AdminUserManagementComponent = () => {
  const [users, setUsers] = useState<Tables<'profiles'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Get current user for rate limiting
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Authentication required');
          return;
        }

        // Rate limiting check
        const rateLimit = await rateLimitService.checkRateLimit(user.id, 'admin:users:view');
        if (!rateLimit.allowed) {
          toast.error('Rate limit exceeded. Please try again later.');
          return;
        }

        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) {
          toast.error('Failed to fetch users');
        } else {
          setUsers(data || []);
          
          // Audit logging
          await auditService.log(user.id, 'VIEW', 'profiles', {
            recordId: 'all',
            newValues: { count: data?.length || 0 }
          });
        }
      } catch (error) {
        toast.error('Failed to fetch users');
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setDeletingUser(id);
    try {
      // Get current user for rate limiting and audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      // Rate limiting check
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'admin:users:delete');
      if (!rateLimit.allowed) {
        toast.error('Rate limit exceeded. Please try again later.');
        return;
      }

      // Get user data before deletion for audit
      const userToDelete = users.find(u => u.id === id);
      
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        toast.error(error.message || 'Failed to delete user');
      } else {
        toast.success('User deleted successfully.');
        setUsers(users => users.filter(u => u.id !== id));
        
        // Audit logging
        await auditService.log(user.id, 'DELETE', 'profiles', {
          recordId: id,
          oldValues: userToDelete
        });
      }
    } catch (error) {
      toast.error('Failed to delete user');
      console.error('Error deleting user:', error);
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-black/70 backdrop-blur border-b border-pickfirst-yellow/20 flex items-center px-4 py-3 gap-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-white hover:text-pickfirst-yellow">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text ml-2">All Users</h1>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {loading ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardContent className="py-12 text-center text-gray-300 text-lg">Loading users...</CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardContent className="py-12 text-center text-gray-400 text-lg">
              <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p>No users found.</p>
              <p className="text-sm text-gray-500 mt-2">All user activities are being monitored and logged.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => (
              <Card key={user.id} className="bg-white/5 border border-pickfirst-yellow/10 flex flex-col h-full">
                <CardHeader className="pb-2 border-b border-white/10 flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg bg-pickfirst-yellow/10">
                    <User className="h-6 w-6 text-pickfirst-yellow" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-pickfirst-yellow mb-1">{user.full_name || 'No Name'}</CardTitle>
                    <CardDescription className="text-gray-300">{user.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        user.role === 'super_admin' ? 'bg-red-500 text-white' :
                        user.role === 'agent' ? 'bg-pickfirst-amber text-black' :
                        'bg-pickfirst-yellow text-black'
                      }>
                        {user.role === 'super_admin' && <Shield className="h-4 w-4 mr-1 inline" />}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-500 border-red-500 hover:bg-red-500/10 flex items-center" 
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingUser === user.id}
                    >
                      {deletingUser === user.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      {deletingUser === user.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export with error boundary
export const AdminUserManagement = withErrorBoundary(AdminUserManagementComponent); 