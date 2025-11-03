import { supabase } from '@/integrations/supabase/client';
import { ipTrackingService } from './ipTrackingService';

export interface AuditLog {
  id?: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string | null; // Make nullable to handle validation errors
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'SEARCH' 
  | 'EXPORT' 
  | 'IMPORT'
  | 'INVITE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'IMAGE_UPLOAD_START'
  | 'IMAGE_UPLOAD_SUCCESS'
  | 'IMAGE_UPLOAD_FAILED'
  | 'CREATE_FAILED'
  | 'SYSTEM_ERROR'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS' 
  | 'PASSWORD_RESET_FAILED'
  | 'PASSWORD_RESET_TOKEN_INVALID'
  | 'PASSWORD_UPDATE_FAILED'
  | 'PASSWORD_UPDATE_SUCCESS'
  | 'PASSWORD_UPDATE_REQUEST'
  | 'SUSPICIOUS_ACTIVITY'
  | 'EMAIL_SENT';

class AuditService {
  private queue: AuditLog[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Set up periodic flushing
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  async log(
    userId: string,
    action: AuditAction,
    tableName: string,
    options: {
      recordId?: string;
      oldValues?: any;
      newValues?: any;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    try {
      // Skip logging if userId is 'anonymous' or invalid UUID
      // Database requires valid UUID for user_id field
      if (!userId || userId === 'anonymous' || userId === 'unknown') {
        console.debug('Skipping audit log for anonymous user:', action, tableName);
        return;
      }

      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.debug('Skipping audit log for invalid user ID format:', userId, action, tableName);
        return;
      }

      // Get real IP address and device info for enhanced security
      let realIpAddress = options.ipAddress;
      let realUserAgent = options.userAgent;

      if (!realIpAddress || realIpAddress === 'client-ip' || realIpAddress === 'unknown') {
        try {
          const clientInfo = await ipTrackingService.getClientInfo();
          if (clientInfo) {
            realIpAddress = clientInfo.ip;
            realUserAgent = clientInfo.userAgent;
          }
        } catch (error) {
          console.warn('Failed to get real IP for audit log:', error);
          // Fallback to provided values or defaults
          realIpAddress = options.ipAddress || 'ip-detection-failed';
        }
      }

      const auditLog: AuditLog = {
        user_id: userId,
        action,
        table_name: tableName,
        record_id: options.recordId,
        old_values: options.oldValues,
        new_values: options.newValues,
        ip_address: realIpAddress || 'unknown',
        user_agent: realUserAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
      };

      // Add to queue
      this.queue.push(auditLog);

      // Flush immediately if queue is getting large
      if (this.queue.length >= this.batchSize) {
        await this.flush();
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't re-queue on error to avoid infinite loops
    }
  }

  /**
   * Enhanced logging method that automatically captures real IP and device info
   */
  async logWithRealIP(
    userId: string,
    action: AuditAction,
    tableName: string,
    options: {
      recordId?: string;
      oldValues?: any;
      newValues?: any;
    } = {}
  ): Promise<void> {
    try {
      const clientInfo = await ipTrackingService.getClientInfo();
      
      await this.log(userId, action, tableName, {
        ...options,
        ipAddress: clientInfo?.ip || 'ip-detection-failed',
        userAgent: clientInfo?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')
      });
    } catch (error) {
      console.error('Error in enhanced audit logging:', error);
      // Fallback to regular logging
      await this.log(userId, action, tableName, options);
    }
  }

  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(batch);

      if (error) {
        console.error('Audit log error:', error);
        // Re-queue failed logs
        this.queue.unshift(...batch);
      }
    } catch (error) {
      console.error('Audit log flush error:', error);
      // Re-queue failed logs
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get audit logs for a user
  async getUserAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: AuditAction;
      tableName?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ data: AuditLog[]; error: any }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.action) {
        query = query.eq('action', options.action);
      }

      if (options.tableName) {
        query = query.eq('table_name', options.tableName);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get audit logs for a specific record
  async getRecordAuditLogs(
    tableName: string,
    recordId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: AuditLog[]; error: any }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get all audit logs for admin monitoring (with user details)
  async getAllAuditLogs(options: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    tableName?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<{ data: (AuditLog & { user_email?: string; user_full_name?: string })[]; error: any }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (options.action) {
        query = query.eq('action', options.action);
      }

      if (options.tableName) {
        query = query.eq('table_name', options.tableName);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        return { data: [], error };
      }

      // Transform the data to flatten the user details
      const transformedData = (data || []).map(log => ({
        ...log,
        user_email: log.profiles?.email,
        user_full_name: log.profiles?.full_name
      }));

      return { data: transformedData, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get system-wide audit statistics
  async getAuditStats(options: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  } = {}): Promise<{ data: any; error: any }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('action, table_name, created_at');

      if (options.startDate) {
        query = query.gte('created_at', options.startDate);
      }

      if (options.endDate) {
        query = query.lte('created_at', options.endDate);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      // Process statistics
      const stats = {
        totalActions: data?.length || 0,
        actionsByType: {} as Record<string, number>,
        actionsByTable: {} as Record<string, number>,
        actionsByUser: {} as Record<string, number>,
      };

      data?.forEach(log => {
        // Count by action type
        stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
        
        // Count by table
        stats.actionsByTable[log.table_name] = (stats.actionsByTable[log.table_name] || 0) + 1;
      });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get audit logs with suspicious IP activity
   */
  async getSuspiciousAuditActivity(hours: number = 24): Promise<{ data: any[]; error: any }> {
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            email,
            full_name
          )
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error };

      // Group by IP address and look for suspicious patterns
      const ipActivity: Record<string, any[]> = {};
      
      data?.forEach(log => {
        if (log.ip_address && log.ip_address !== 'unknown') {
          if (!ipActivity[log.ip_address]) {
            ipActivity[log.ip_address] = [];
          }
          ipActivity[log.ip_address].push(log);
        }
      });

      // Find suspicious IPs (multiple users from same IP, high activity, etc.)
      const suspicious = Object.entries(ipActivity)
        .filter(([ip, logs]) => {
          const uniqueUsers = new Set(logs.map(log => log.user_id)).size;
          const activityCount = logs.length;
          
          // Flag as suspicious if:
          // - More than 3 different users from same IP
          // - More than 50 actions from same IP in time period
          return uniqueUsers > 3 || activityCount > 50;
        })
        .map(([ip, logs]) => ({
          ip_address: ip,
          activity_count: logs.length,
          unique_users: new Set(logs.map(log => log.user_id)).size,
          recent_logs: logs.slice(0, 10) // Most recent 10 logs
        }));

      return { data: suspicious, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }
}

export const auditService = new AuditService();