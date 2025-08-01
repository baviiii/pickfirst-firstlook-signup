import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id?: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
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
  | 'IMPORT';

class AuditService {
  private queue: AuditLog[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    // Set up periodic flushing
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
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
    const auditLog: AuditLog = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: options.recordId,
      old_values: options.oldValues,
      new_values: options.newValues,
      ip_address: options.ipAddress || this.getClientIP(),
      user_agent: options.userAgent || navigator.userAgent,
    };

    // Add to queue
    this.queue.push(auditLog);

    // Flush immediately if queue is getting large
    if (this.queue.length >= this.batchSize) {
      await this.flush();
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

  private getClientIP(): string {
    // In a real app, this would come from the server
    // For now, we'll use a placeholder
    return 'client-ip-placeholder';
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
}

export const auditService = new AuditService(); 