import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  permissions: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const SecurityPermissions = () => {
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      role: 'agent',
      status: 'active',
      lastLogin: '2024-01-15T10:30:00Z',
      permissions: ['property.create', 'property.edit', 'inquiry.view']
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'buyer',
      status: 'active',
      lastLogin: '2024-01-14T15:45:00Z',
      permissions: ['property.view', 'inquiry.create']
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike@example.com',
      role: 'agent',
      status: 'suspended',
      lastLogin: '2024-01-10T09:15:00Z',
      permissions: ['property.create', 'property.edit']
    },
  ]);

  const [roles] = useState<Role[]>([
    {
      id: '1',
      name: 'Super Admin',
      description: 'Full system access and control',
      permissions: ['*'],
      userCount: 2
    },
    {
      id: '2',
      name: 'Agent',
      description: 'Property management and client interaction',
      permissions: ['property.create', 'property.edit', 'property.delete', 'inquiry.view', 'inquiry.respond'],
      userCount: 389
    },
    {
      id: '3',
      name: 'Buyer',
      description: 'Property viewing and inquiry submission',
      permissions: ['property.view', 'inquiry.create', 'favorite.manage'],
      userCount: 856
    },
  ]);

  const [permissions] = useState<Permission[]>([
    { id: '1', name: 'property.view', description: 'View property listings', category: 'Properties' },
    { id: '2', name: 'property.create', description: 'Create new property listings', category: 'Properties' },
    { id: '3', name: 'property.edit', description: 'Edit property listings', category: 'Properties' },
    { id: '4', name: 'property.delete', description: 'Delete property listings', category: 'Properties' },
    { id: '5', name: 'inquiry.view', description: 'View property inquiries', category: 'Inquiries' },
    { id: '6', name: 'inquiry.create', description: 'Create property inquiries', category: 'Inquiries' },
    { id: '7', name: 'inquiry.respond', description: 'Respond to inquiries', category: 'Inquiries' },
    { id: '8', name: 'user.manage', description: 'Manage user accounts', category: 'Users' },
    { id: '9', name: 'system.admin', description: 'System administration', category: 'System' },
    { id: '10', name: 'analytics.view', description: 'View analytics and reports', category: 'Analytics' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24h');
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90
  });

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user => selectedRole === 'all' || user.role === selectedRole);

  const handleUserAction = (action: string, userId: string) => {
    toast.success(`User ${action} successfully`);
  };

  const handleRoleAction = (action: string, roleId: string) => {
    toast.success(`Role ${action} successfully`);
  };

  return (
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
          <Button variant="outline" className="text-gray-300 hover:text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button className="bg-red-500 text-white hover:bg-red-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
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
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.name}</div>
                        <div className="text-gray-400 text-sm">{user.email}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={user.role === 'super_admin' ? 'destructive' : user.role === 'agent' ? 'default' : 'secondary'}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUserAction('viewed', user.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleUserAction('edited', user.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-500/10" onClick={() => handleUserAction('suspended', user.id)}>
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
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
                    <Badge className="bg-blue-500 text-white">{role.userCount} users</Badge>
                  </div>
                  <CardDescription className="text-gray-300">{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white">Permissions:</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {role.permissions.slice(0, 3).map((perm, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {perm === '*' ? 'All' : perm}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleRoleAction('edited', role.id)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {role.name !== 'Super Admin' && (
                        <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-500/10" onClick={() => handleRoleAction('deleted', role.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
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
                }, {} as Record<string, Permission[]>)).map(([category, perms]) => (
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
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout" className="text-white">Session Timeout</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
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
                    value={passwordPolicy.minLength}
                    onChange={(e) => setPasswordPolicy(prev => ({ ...prev, minLength: parseInt(e.target.value) }))}
                    className="bg-black/50 border-gray-600 text-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-white">Require Uppercase</Label>
                  <Switch
                    checked={passwordPolicy.requireUppercase}
                    onCheckedChange={(checked) => setPasswordPolicy(prev => ({ ...prev, requireUppercase: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-white">Require Numbers</Label>
                  <Switch
                    checked={passwordPolicy.requireNumbers}
                    onCheckedChange={(checked) => setPasswordPolicy(prev => ({ ...prev, requireNumbers: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-white">Require Special Characters</Label>
                  <Switch
                    checked={passwordPolicy.requireSpecialChars}
                    onCheckedChange={(checked) => setPasswordPolicy(prev => ({ ...prev, requireSpecialChars: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};