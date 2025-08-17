import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { 
  Shield, 
  Users, 
  Key, 
  Lock, 
  UserCheck, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { securityService, SecurityUser, SecurityRole, SecurityPermission, SecurityPolicy } from '@/services/securityService';
import { useAuth } from '@/hooks/useAuth';

export const SecurityPermissions = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [roles, setRoles] = useState<SecurityRole[]>([]);
  const [permissions, setPermissions] = useState<SecurityPermission[]>([]);
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [activeTab, setActiveTab] = useState('users');

  // Load initial data
  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, policyRes] = await Promise.all([
        securityService.getAllUsers({ limit: 100 }),
        securityService.getRoles(),
        securityService.getSecurityPolicy()
      ]);

      if (!usersRes.error) setUsers(usersRes.data);
      if (!rolesRes.error) setRoles(rolesRes.data);
      if (!policyRes.error && policyRes.data) setSecurityPolicy(policyRes.data);
      
      setPermissions(securityService.getPermissions());
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => selectedRole === 'all' || user.role === selectedRole);

  const handleUserAction = async (action: string, userId: string, newValue?: any) => {
    try {
      let result;
      if (action === 'suspend' || action === 'activate') {
        const status = action === 'suspend' ? 'suspended' : 'active';
        result = await securityService.updateUserStatus(userId, status);
      } else if (action === 'role-change') {
        result = await securityService.updateUserRole(userId, newValue);
      }

      if (result && !result.error) {
        toast.success(`User ${action} successful`);
        await loadSecurityData(); // Refresh data
      } else {
        throw new Error(result?.error?.message || 'Action failed');
      }
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handlePolicyUpdate = async (updates: Partial<SecurityPolicy>) => {
    try {
      const result = await securityService.updateSecurityPolicy(updates);
      if (!result.error) {
        setSecurityPolicy(prev => prev ? { ...prev, ...updates } : null);
        toast.success('Security policy updated');
      } else {
        throw new Error(result.error?.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      toast.error('Failed to update security policy');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-pickfirst-yellow" />
          <p className="text-gray-300">Loading security data...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-500" />
            Security & Permissions
          </h1>
          <p className="text-gray-300 mt-2">Manage user roles, permissions, and security settings</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="text-gray-300 hover:text-white"
            onClick={loadSecurityData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {users.length} Total Users
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="users" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <UserCheck className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Key className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-pickfirst-yellow data-[state=active]:text-black">
            <Lock className="h-4 w-4 mr-2" />
            Security Policy
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">User Management</CardTitle>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-black/50 border-gray-600 text-white"
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40 bg-black/50 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="agent">Agents</SelectItem>
                      <SelectItem value="buyer">Buyers</SelectItem>
                      <SelectItem value="super_admin">Super Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 {filteredUsers.map(user => (
                   <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-gray-700">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                         {user.full_name?.charAt(0) || user.email.charAt(0)}
                       </div>
                       <div>
                         <div className="text-white font-medium">{user.full_name || 'No Name'}</div>
                         <div className="text-gray-400 text-sm">{user.email}</div>
                         <div className="flex gap-2 mt-1">
                           <Badge variant={user.role === 'super_admin' ? 'destructive' : user.role === 'agent' ? 'default' : 'secondary'}>
                             {user.role.replace('_', ' ').toUpperCase()}
                           </Badge>
                           <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                             {user.status.toUpperCase()}
                           </Badge>
                           {user.last_login && (
                             <Badge variant="outline" className="text-xs">
                               <Clock className="h-3 w-3 mr-1" />
                               {new Date(user.last_login).toLocaleDateString()}
                             </Badge>
                           )}
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Select onValueChange={(value) => handleUserAction('role-change', user.id, value)}>
                         <SelectTrigger className="w-32 h-8 text-xs">
                           <SelectValue placeholder="Change Role" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="buyer">Buyer</SelectItem>
                           <SelectItem value="agent">Agent</SelectItem>
                           <SelectItem value="admin">Admin</SelectItem>
                           {authUser?.id !== user.id && (
                             <SelectItem value="super_admin">Super Admin</SelectItem>
                           )}
                         </SelectContent>
                       </Select>
                       {user.status === 'active' ? (
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="text-orange-500 hover:bg-orange-500/10" 
                           onClick={() => handleUserAction('suspend', user.id)}
                           disabled={authUser?.id === user.id}
                         >
                           <AlertTriangle className="h-4 w-4" />
                         </Button>
                       ) : (
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="text-green-500 hover:bg-green-500/10" 
                           onClick={() => handleUserAction('activate', user.id)}
                         >
                           <UserCheck className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {roles.map(role => (
               <Card key={role.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-white">{role.name}</CardTitle>
                     <Badge className="bg-blue-500 text-white">{role.user_count} users</Badge>
                   </div>
                   <CardDescription className="text-gray-300">{role.description}</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     <div>
                       <Label className="text-white">Permissions:</Label>
                       <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                         {role.permissions.slice(0, 5).map((perm, index) => (
                           <Badge key={index} variant="secondary" className="text-xs">
                             {perm === '*' ? 'All' : perm.split('.').pop()}
                           </Badge>
                         ))}
                         {role.permissions.length > 5 && (
                           <Badge variant="secondary" className="text-xs">
                             +{role.permissions.length - 5} more
                           </Badge>
                         )}
                       </div>
                     </div>
                     <div className="flex gap-2 pt-2">
                       {role.is_system_role && (
                         <Badge variant="outline" className="text-xs">
                           System Role
                         </Badge>
                       )}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">System Permissions</CardTitle>
              <CardDescription className="text-gray-300">Available permissions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissions.reduce((acc, permission) => {
                  const category = permission.category;
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(permission);
                  return acc;
                }, {} as Record<string, SecurityPermission[]>)).map(([category, perms]) => (
                  <div key={category} className="p-4 rounded-lg bg-white/5 border border-gray-700">
                    <h3 className="text-white font-medium mb-3">{category}</h3>
                    <div className="space-y-2">
                      {perms.map(perm => (
                        <div key={perm.id} className="text-sm">
                          <div className="text-pickfirst-yellow font-mono">{perm.name}</div>
                          <div className="text-gray-400">{perm.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

         {/* Security Policy Tab */}
         <TabsContent value="security" className="space-y-6">
           {securityPolicy && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
                 <CardHeader>
                   <CardTitle className="text-white">Authentication Settings</CardTitle>
                   <CardDescription className="text-gray-300">Configure authentication and session policies</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <Label className="text-white">Two-Factor Authentication</Label>
                       <p className="text-sm text-gray-400">Require 2FA for all admin users</p>
                     </div>
                     <Switch
                       checked={securityPolicy.two_factor_enabled}
                       onCheckedChange={(checked) => handlePolicyUpdate({ two_factor_enabled: checked })}
                     />
                   </div>
                   <div>
                     <Label htmlFor="sessionTimeout" className="text-white">Session Timeout</Label>
                     <Select 
                       value={securityPolicy.session_timeout} 
                       onValueChange={(value) => handlePolicyUpdate({ session_timeout: value })}
                     >
                       <SelectTrigger className="bg-black/50 border-gray-600 text-white">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="1h">1 Hour</SelectItem>
                         <SelectItem value="8h">8 Hours</SelectItem>
                         <SelectItem value="24h">24 Hours</SelectItem>
                         <SelectItem value="7d">7 Days</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20">
                 <CardHeader>
                   <CardTitle className="text-white">Password Policy</CardTitle>
                   <CardDescription className="text-gray-300">Configure password requirements</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <Label htmlFor="minLength" className="text-white">Minimum Length</Label>
                     <Input
                       id="minLength"
                       type="number"
                       value={securityPolicy.password_policy.min_length}
                       onChange={(e) => handlePolicyUpdate({ 
                         password_policy: { 
                           ...securityPolicy.password_policy, 
                           min_length: parseInt(e.target.value) 
                         } 
                       })}
                       className="bg-black/50 border-gray-600 text-white"
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <Label className="text-white">Require Uppercase</Label>
                     <Switch
                       checked={securityPolicy.password_policy.require_uppercase}
                       onCheckedChange={(checked) => handlePolicyUpdate({ 
                         password_policy: { 
                           ...securityPolicy.password_policy, 
                           require_uppercase: checked 
                         } 
                       })}
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <Label className="text-white">Require Numbers</Label>
                     <Switch
                       checked={securityPolicy.password_policy.require_numbers}
                       onCheckedChange={(checked) => handlePolicyUpdate({ 
                         password_policy: { 
                           ...securityPolicy.password_policy, 
                           require_numbers: checked 
                         } 
                       })}
                     />
                   </div>
                   <div className="flex items-center justify-between">
                     <Label className="text-white">Require Special Characters</Label>
                     <Switch
                       checked={securityPolicy.password_policy.require_special_chars}
                       onCheckedChange={(checked) => handlePolicyUpdate({ 
                         password_policy: { 
                           ...securityPolicy.password_policy, 
                           require_special_chars: checked 
                         } 
                       })}
                     />
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-pickfirst-yellow/20 lg:col-span-2">
                 <CardHeader>
                   <CardTitle className="text-white">Rate Limiting</CardTitle>
                   <CardDescription className="text-gray-300">Configure API and authentication rate limits</CardDescription>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                     <Label className="text-white">API Requests/Minute</Label>
                     <Input
                       type="number"
                       value={securityPolicy.rate_limits.api_requests_per_minute}
                       onChange={(e) => handlePolicyUpdate({ 
                         rate_limits: { 
                           ...securityPolicy.rate_limits, 
                           api_requests_per_minute: parseInt(e.target.value) 
                         } 
                       })}
                       className="bg-black/50 border-gray-600 text-white"
                     />
                   </div>
                   <div>
                     <Label className="text-white">Login Attempts/Hour</Label>
                     <Input
                       type="number"
                       value={securityPolicy.rate_limits.login_attempts_per_hour}
                       onChange={(e) => handlePolicyUpdate({ 
                         rate_limits: { 
                           ...securityPolicy.rate_limits, 
                           login_attempts_per_hour: parseInt(e.target.value) 
                         } 
                       })}
                       className="bg-black/50 border-gray-600 text-white"
                     />
                   </div>
                   <div>
                     <Label className="text-white">Password Reset/Day</Label>
                     <Input
                       type="number"
                       value={securityPolicy.rate_limits.password_reset_per_day}
                       onChange={(e) => handlePolicyUpdate({ 
                         rate_limits: { 
                           ...securityPolicy.rate_limits, 
                           password_reset_per_day: parseInt(e.target.value) 
                         } 
                       })}
                       className="bg-black/50 border-gray-600 text-white"
                     />
                   </div>
                 </CardContent>
               </Card>
             </div>
           )}
         </TabsContent>
       </Tabs>
       </div>
     </ErrorBoundary>
   );
 };