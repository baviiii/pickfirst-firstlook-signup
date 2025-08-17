import { supabase } from '@/integrations/supabase/client';
import { auditService } from './auditService';

export interface SystemAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'security' | 'performance' | 'database' | 'system' | 'user';
  source: string;
  acknowledged: boolean;
  resolved: boolean;
  acknowledged_by?: string;
  resolved_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface AlertStats {
  critical: number;
  warning: number;
  info: number;
  unresolved: number;
  resolved: number;
  total: number;
}

class SystemAlertsService {
  // Real-time monitoring and alert generation
  async monitorSystemHealth(): Promise<{ error: any }> {
    try {
      // Monitor recent system alerts to detect patterns
      const { data: recentAlerts } = await supabase.from('system_alerts')
        .select('*')
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      const criticalAlerts = recentAlerts?.filter(alert => alert.severity === 'critical').length || 0;
      const warningAlerts = recentAlerts?.filter(alert => alert.severity === 'warning').length || 0;

      if (criticalAlerts > 3) {
        await this.createAlert({
          title: 'Multiple Critical Alerts',
          description: `${criticalAlerts} critical alerts generated in the last 15 minutes`,
          severity: 'critical',
          category: 'system',
          source: 'Alert Monitor',
          metadata: { criticalCount: criticalAlerts, timeWindow: '15min' }
        });
      }

      // Monitor audit log activity for suspicious patterns
      const { data: auditLogs } = await supabase.from('audit_logs')
        .select('action, table_name, user_id')
        .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      const deleteActions = auditLogs?.filter(log => log.action === 'DELETE').length || 0;
      const uniqueUsers = new Set(auditLogs?.map(log => log.user_id)).size;

      if (deleteActions > 5) {
        await this.createAlert({
          title: 'High Delete Activity',
          description: `${deleteActions} delete operations detected in the last 10 minutes`,
          severity: 'warning',
          category: 'security',
          source: 'Activity Monitor',
          metadata: { deleteCount: deleteActions, timeWindow: '10min' }
        });
      }

      // Monitor database health through table statistics
      const { data: tableStats } = await supabase.rpc('get_database_statistics');
      const largeTables = tableStats?.filter((table: any) => {
        const sizeStr = table.table_size;
        const sizeNum = parseFloat(sizeStr.replace(/[^\d.]/g, ''));
        return sizeStr.includes('GB') && sizeNum > 2;
      }).length || 0;

      if (largeTables > 2) {
        await this.createAlert({
          title: 'Large Table Growth',
          description: `${largeTables} tables have grown beyond 2GB`,
          severity: 'warning',
          category: 'database',
          source: 'Storage Monitor',
          metadata: { largeTableCount: largeTables }
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Error monitoring system health:', error);
      return { error };
    }
  }
  async getAllAlerts(options: {
    filter?: 'all' | 'unresolved' | 'critical';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: SystemAlert[]; error: any; stats: AlertStats }> {
    try {
      let query = supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.filter === 'unresolved') {
        query = query.eq('resolved', false);
      } else if (options.filter === 'critical') {
        query = query.eq('severity', 'critical');
      }

      // Apply pagination
      if (options.limit) {
        const start = options.offset || 0;
        query = query.range(start, start + options.limit - 1);
      }

      const { data: alerts, error } = await query;

      if (error) {
        return { data: [], error, stats: this.getEmptyStats() };
      }

      // Get statistics
      const stats = await this.getAlertStats();

      return { 
        data: (alerts || []) as SystemAlert[], 
        error: null, 
        stats: stats.data || this.getEmptyStats()
      };
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return { data: [], error, stats: this.getEmptyStats() };
    }
  }

  async getAlertStats(): Promise<{ data: AlertStats | null; error: any }> {
    try {
      const { data: alerts, error } = await supabase
        .from('system_alerts')
        .select('severity, resolved');

      if (error) return { data: null, error };

      const stats: AlertStats = {
        critical: 0,
        warning: 0,
        info: 0,
        unresolved: 0,
        resolved: 0,
        total: alerts?.length || 0
      };

      alerts?.forEach(alert => {
        // Count by severity
        if (alert.severity === 'critical') stats.critical++;
        else if (alert.severity === 'warning') stats.warning++;
        else if (alert.severity === 'info') stats.info++;

        // Count by status
        if (alert.resolved) stats.resolved++;
        else stats.unresolved++;
      });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async acknowledgeAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('system_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: user.user.id,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (!error) {
        await auditService.log(user.user.id, 'UPDATE', 'system_alerts', {
          recordId: alertId,
          newValues: { acknowledged: true }
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async resolveAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('system_alerts')
        .update({
          resolved: true,
          acknowledged: true,
          resolved_by: user.user.id,
          resolved_at: new Date().toISOString(),
          acknowledged_by: user.user.id,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (!error) {
        await auditService.log(user.user.id, 'UPDATE', 'system_alerts', {
          recordId: alertId,
          newValues: { resolved: true }
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async deleteAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('system_alerts')
        .delete()
        .eq('id', alertId);

      if (!error) {
        await auditService.log(user.user.id, 'DELETE', 'system_alerts', {
          recordId: alertId
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async createAlert(alert: Omit<SystemAlert, 'id' | 'created_at' | 'updated_at' | 'acknowledged' | 'resolved' | 'acknowledged_by' | 'resolved_by' | 'acknowledged_at' | 'resolved_at'>): Promise<{ data: SystemAlert | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .insert({
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          category: alert.category,
          source: alert.source,
          metadata: alert.metadata || {}
        })
        .select()
        .single();

      return { data: data as SystemAlert, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Helper function to create alerts programmatically
  async createSystemAlert(
    title: string,
    description: string,
    severity: 'critical' | 'warning' | 'info',
    category: 'security' | 'performance' | 'database' | 'system' | 'user',
    source: string,
    metadata: any = {}
  ): Promise<{ data: string | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('create_system_alert', {
        alert_title: title,
        alert_description: description,
        alert_severity: severity,
        alert_category: category,
        alert_source: source,
        alert_metadata: metadata
      });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  private getEmptyStats(): AlertStats {
    return {
      critical: 0,
      warning: 0,
      info: 0,
      unresolved: 0,
      resolved: 0,
      total: 0
    };
  }
}

export const systemAlertsService = new SystemAlertsService();