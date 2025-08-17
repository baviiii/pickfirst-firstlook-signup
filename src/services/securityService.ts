import { supabase } from '@/integrations/supabase/client';
import { auditService, AuditAction } from './auditService';
import { rateLimitService } from './rateLimitService';
import { userContextService } from './userContextService';

export interface SecurityUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  subscription_status?: string;
  subscription_tier?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
  status: 'active' | 'suspended' | 'inactive';
  permissions: string[];
}

export interface SecurityRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count: number;
  is_system_role: boolean;
}

export interface SecurityPermission {
  id: string;
  name: string;
  description: string;
  category: string;
  is_system_permission: boolean;
}

export interface SecurityPolicy {
  two_factor_enabled: boolean;
  session_timeout: string;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    max_age_days: number;
  };
  rate_limits: {
    api_requests_per_minute: number;
    login_attempts_per_hour: number;
    password_reset_per_day: number;
  };
}

class SecurityService {
  private readonly ADMIN_ROLES = ['super_admin', 'admin'];

  async checkPermission(action: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check rate limits first
      const rateCheck = await rateLimitService.checkRateLimit(user.id, action);
      if (!rateCheck.allowed) {
        await auditService.log(user.id, 'RATE_LIMIT_EXCEEDED', 'security', {
          newValues: { action, remaining: rateCheck.remaining }
        });
        return false;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile) return false;

      // Super admins have all permissions
      if (profile.role === 'super_admin') return true;

      // Check specific permissions based on role
      return this.hasRolePermission(profile.role, action);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  private hasRolePermission(role: string, action: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'users.view', 'users.edit', 'users.suspend',
        'properties.approve', 'properties.reject',
        'analytics.view', 'system.logs'
      ],
      agent: [
        'properties.create', 'properties.edit', 'properties.delete',
        'inquiries.view', 'inquiries.respond',
        'clients.manage', 'appointments.manage'
      ],
      buyer: [
        'properties.view', 'inquiries.create',
        'favorites.manage', 'profile.edit'
      ]
    };

    return rolePermissions[role]?.includes(action) || false;
  }

  async getAllUsers(options: {
    search?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: SecurityUser[]; error: any; total: number }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.ADMIN_ROLES.includes(currentUser.role)) {
        throw new Error('Insufficient permissions');
      }

      await auditService.log(currentUser.id, 'VIEW', 'users', {
        newValues: { filters: options }
      });

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options.search) {
        query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
      }

      if (options.role && options.role !== 'all') {
        query = query.eq('role', options.role);
      }

      if (options.limit) {
        const start = options.offset || 0;
        query = query.range(start, start + options.limit - 1);
      }

      const { data, error, count } = await query;
      
      if (error) return { data: [], error, total: 0 };

      const users: SecurityUser[] = (data || []).map(user => ({
        ...user,
        status: user.subscription_status === 'active' ? 'active' : 
                user.subscription_status === 'suspended' ? 'suspended' : 'inactive',
        permissions: this.getRolePermissions(user.role),
        last_login: user.updated_at
      }));

      return { data: users, error: null, total: count || 0 };
    } catch (error) {
      return { data: [], error, total: 0 };
    }
  }

  async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'inactive'): Promise<{ error: any }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.ADMIN_ROLES.includes(currentUser.role)) {
        throw new Error('Insufficient permissions');
      }

      const { data: oldUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const newStatus = status === 'active' ? 'active' : 
                       status === 'suspended' ? 'suspended' : 'inactive';

      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (!error) {
        await auditService.log(currentUser.id, 'UPDATE', 'profiles', {
          recordId: userId,
          oldValues: { subscription_status: oldUser?.subscription_status },
          newValues: { subscription_status: newStatus }
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async updateUserRole(userId: string, newRole: string): Promise<{ error: any }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.role !== 'super_admin') {
        throw new Error('Only super admins can change user roles');
      }

      const { data: oldUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (!error) {
        await auditService.log(currentUser.id, 'UPDATE', 'profiles', {
          recordId: userId,
          oldValues: { role: oldUser?.role },
          newValues: { role: newRole }
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getRoles(): Promise<{ data: SecurityRole[]; error: any }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.ADMIN_ROLES.includes(currentUser.role)) {
        throw new Error('Insufficient permissions');
      }

      // Get user counts for each role
      const { data: roleCounts } = await supabase
        .from('profiles')
        .select('role')
        .then(({ data }) => {
          const counts: Record<string, number> = {};
          data?.forEach(profile => {
            counts[profile.role] = (counts[profile.role] || 0) + 1;
          });
          return { data: counts };
        });

      const roles: SecurityRole[] = [
        {
          id: '1',
          name: 'Super Admin',
          description: 'Full system access and control',
          permissions: ['*'],
          user_count: roleCounts?.super_admin || 0,
          is_system_role: true
        },
        {
          id: '2',
          name: 'Admin',
          description: 'Administrative access with limited system control',
          permissions: this.getRolePermissions('admin'),
          user_count: roleCounts?.admin || 0,
          is_system_role: true
        },
        {
          id: '3',
          name: 'Agent',
          description: 'Property management and client interaction',
          permissions: this.getRolePermissions('agent'),
          user_count: roleCounts?.agent || 0,
          is_system_role: true
        },
        {
          id: '4',
          name: 'Buyer',
          description: 'Property viewing and inquiry submission',
          permissions: this.getRolePermissions('buyer'),
          user_count: roleCounts?.buyer || 0,
          is_system_role: true
        }
      ];

      return { data: roles, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  getPermissions(): SecurityPermission[] {
    return [
      // Properties
      { id: '1', name: 'properties.view', description: 'View property listings', category: 'Properties', is_system_permission: true },
      { id: '2', name: 'properties.create', description: 'Create new property listings', category: 'Properties', is_system_permission: true },
      { id: '3', name: 'properties.edit', description: 'Edit property listings', category: 'Properties', is_system_permission: true },
      { id: '4', name: 'properties.delete', description: 'Delete property listings', category: 'Properties', is_system_permission: true },
      { id: '5', name: 'properties.approve', description: 'Approve property listings', category: 'Properties', is_system_permission: true },
      { id: '6', name: 'properties.reject', description: 'Reject property listings', category: 'Properties', is_system_permission: true },
      
      // Inquiries
      { id: '7', name: 'inquiries.view', description: 'View property inquiries', category: 'Inquiries', is_system_permission: true },
      { id: '8', name: 'inquiries.create', description: 'Create property inquiries', category: 'Inquiries', is_system_permission: true },
      { id: '9', name: 'inquiries.respond', description: 'Respond to inquiries', category: 'Inquiries', is_system_permission: true },
      
      // Users
      { id: '10', name: 'users.view', description: 'View user accounts', category: 'Users', is_system_permission: true },
      { id: '11', name: 'users.edit', description: 'Edit user accounts', category: 'Users', is_system_permission: true },
      { id: '12', name: 'users.suspend', description: 'Suspend user accounts', category: 'Users', is_system_permission: true },
      { id: '13', name: 'users.delete', description: 'Delete user accounts', category: 'Users', is_system_permission: true },
      
      // Clients & Appointments
      { id: '14', name: 'clients.manage', description: 'Manage client relationships', category: 'Clients', is_system_permission: true },
      { id: '15', name: 'appointments.manage', description: 'Manage appointments', category: 'Appointments', is_system_permission: true },
      
      // System
      { id: '16', name: 'system.admin', description: 'System administration', category: 'System', is_system_permission: true },
      { id: '17', name: 'system.logs', description: 'View system logs', category: 'System', is_system_permission: true },
      { id: '18', name: 'analytics.view', description: 'View analytics and reports', category: 'Analytics', is_system_permission: true },
      
      // Profile
      { id: '19', name: 'profile.edit', description: 'Edit own profile', category: 'Profile', is_system_permission: true },
      { id: '20', name: 'favorites.manage', description: 'Manage property favorites', category: 'Profile', is_system_permission: true }
    ];
  }

  private getRolePermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      super_admin: ['*'],
      admin: [
        'users.view', 'users.edit', 'users.suspend',
        'properties.approve', 'properties.reject', 'properties.view',
        'analytics.view', 'system.logs', 'inquiries.view'
      ],
      agent: [
        'properties.create', 'properties.edit', 'properties.delete', 'properties.view',
        'inquiries.view', 'inquiries.respond',
        'clients.manage', 'appointments.manage',
        'profile.edit'
      ],
      buyer: [
        'properties.view', 'inquiries.create',
        'favorites.manage', 'profile.edit'
      ]
    };

    return permissions[role] || [];
  }

  async getSecurityPolicy(): Promise<{ data: SecurityPolicy | null; error: any }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.ADMIN_ROLES.includes(currentUser.role)) {
        throw new Error('Insufficient permissions');
      }

      // Return default policy - in production this would be stored in database
      const policy: SecurityPolicy = {
        two_factor_enabled: true,
        session_timeout: '24h',
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_numbers: true,
          require_special_chars: true,
          max_age_days: 90
        },
        rate_limits: {
          api_requests_per_minute: 100,
          login_attempts_per_hour: 5,
          password_reset_per_day: 3
        }
      };

      return { data: policy, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async updateSecurityPolicy(policy: Partial<SecurityPolicy>): Promise<{ error: any }> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.role !== 'super_admin') {
        throw new Error('Only super admins can update security policy');
      }

      await auditService.log(currentUser.id, 'UPDATE', 'security_policy', {
        newValues: policy
      });

      // In production, this would update the database
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  private async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile;
  }

  async getAuditLogs(options: {
    userId?: string;
    action?: AuditAction;
    tableName?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.ADMIN_ROLES.includes(currentUser.role)) {
        throw new Error('Insufficient permissions');
      }

      return await auditService.getAllAuditLogs(options);
    } catch (error) {
      return { data: [], error };
    }
  }
}

export const securityService = new SecurityService();