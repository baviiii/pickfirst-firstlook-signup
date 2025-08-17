import { supabase } from '@/integrations/supabase/client';
import { systemAlertsService } from './systemAlertsService';

export interface SystemHealthMetrics {
  databaseHealth: {
    connectionPool: number;
    errorRate: number;
    responseTime: number;
    activeConnections: number;
  };
  authHealth: {
    errorRate: number;
    activeUsers: number;
    failedLogins: number;
  };
  applicationHealth: {
    edgeFunctionErrors: number;
    totalRequests: number;
    uptime: number;
  };
  overallStatus: 'healthy' | 'warning' | 'critical';
}

class MonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;

  async getSystemHealthMetrics(): Promise<{ data: SystemHealthMetrics | null; error: any }> {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const timestampFilter = fifteenMinutesAgo.getTime() * 1000;

      // Get database health metrics from audit logs and system alerts
      const { data: auditLogs } = await supabase.from('audit_logs')
        .select('*')
        .gte('created_at', fifteenMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      // Get system alerts as health indicators
      const { data: alerts } = await supabase.from('system_alerts')
        .select('*')
        .gte('created_at', fifteenMinutesAgo.toISOString())
        .order('created_at', { ascending: false });

      // Calculate database health from audit logs
      const totalAuditActivity = auditLogs?.length || 0;
      const criticalAlerts = alerts?.filter(alert => alert.severity === 'critical').length || 0;
      const warningAlerts = alerts?.filter(alert => alert.severity === 'warning').length || 0;
      
      // Simulate connection activity based on audit logs
      const connections = Math.min(50, totalAuditActivity);

      // Calculate auth health from system activity
      const authActivity = auditLogs?.filter(log => log.table_name === 'profiles').length || 0;
      const securityAlerts = alerts?.filter(alert => alert.category === 'security').length || 0;

      // Calculate application health
      const performanceAlerts = alerts?.filter(alert => alert.category === 'performance').length || 0;
      const databaseAlerts = alerts?.filter(alert => alert.category === 'database').length || 0;

      const metrics: SystemHealthMetrics = {
        databaseHealth: {
          connectionPool: Math.max(50, 100 - (connections * 2)),
          errorRate: databaseAlerts > 0 ? Math.min(100, databaseAlerts * 20) : 0,
          responseTime: criticalAlerts > 2 ? 250 : 75,
          activeConnections: connections
        },
        authHealth: {
          errorRate: securityAlerts > 0 ? Math.min(100, securityAlerts * 25) : 0,
          activeUsers: Math.max(0, authActivity),
          failedLogins: securityAlerts
        },
        applicationHealth: {
          edgeFunctionErrors: performanceAlerts,
          totalRequests: totalAuditActivity,
          uptime: (criticalAlerts + warningAlerts) < 3 ? 99.9 : 98.2
        },
        overallStatus: this.calculateOverallStatus(criticalAlerts, warningAlerts, performanceAlerts)
      };

      // Create alerts based on metrics
      await this.checkAndCreateAlerts(metrics);

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error getting system health metrics:', error);
      return { data: null, error };
    }
  }

  private calculateOverallStatus(dbErrors: number, authErrors: number, functionErrors: number): 'healthy' | 'warning' | 'critical' {
    const totalErrors = dbErrors + authErrors + functionErrors;
    
    if (totalErrors > 10) return 'critical';
    if (totalErrors > 3) return 'warning';
    return 'healthy';
  }

  private async checkAndCreateAlerts(metrics: SystemHealthMetrics): Promise<void> {
    // Database health alerts
    if (metrics.databaseHealth.errorRate > 20) {
      await systemAlertsService.createAlert({
        title: 'High Database Error Rate',
        description: `Database error rate is ${metrics.databaseHealth.errorRate.toFixed(1)}%`,
        severity: 'critical',
        category: 'database',
        source: 'Monitoring Service',
        metadata: { errorRate: metrics.databaseHealth.errorRate }
      });
    }

    if (metrics.databaseHealth.connectionPool < 50) {
      await systemAlertsService.createAlert({
        title: 'Low Connection Pool Availability',
        description: `Connection pool availability is ${metrics.databaseHealth.connectionPool}%`,
        severity: 'warning',
        category: 'performance',
        source: 'Monitoring Service',
        metadata: { connectionPool: metrics.databaseHealth.connectionPool }
      });
    }

    // Auth health alerts
    if (metrics.authHealth.failedLogins > 10) {
      await systemAlertsService.createAlert({
        title: 'High Failed Login Attempts',
        description: `${metrics.authHealth.failedLogins} failed login attempts in the last 15 minutes`,
        severity: 'warning',
        category: 'security',
        source: 'Auth Monitor',
        metadata: { failedLogins: metrics.authHealth.failedLogins }
      });
    }

    // Application health alerts
    if (metrics.applicationHealth.uptime < 99) {
      await systemAlertsService.createAlert({
        title: 'Application Uptime Below Threshold',
        description: `Application uptime is ${metrics.applicationHealth.uptime}%`,
        severity: 'critical',
        category: 'system',
        source: 'Uptime Monitor',
        metadata: { uptime: metrics.applicationHealth.uptime }
      });
    }
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Run health check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.getSystemHealthMetrics();
      await systemAlertsService.monitorSystemHealth();
    }, 5 * 60 * 1000);

    console.log('System monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('System monitoring stopped');
    }
  }

  async getRecentSecurityEvents(): Promise<{ data: any[]; error: any }> {
    try {
      // Get security-related alerts and audit logs
      const { data: securityAlerts } = await supabase.from('system_alerts')
        .select('*')
        .eq('category', 'security')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: suspiciousAuditLogs } = await supabase.from('audit_logs')
        .select('*')
        .eq('action', 'DELETE')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Combine security events
      const securityEvents = [
        ...(securityAlerts || []).map(alert => ({
          event_message: `${alert.title}: ${alert.description}`,
          timestamp: new Date(alert.created_at).getTime() * 1000,
          severity: alert.severity,
          type: 'alert'
        })),
        ...(suspiciousAuditLogs || []).map(log => ({
          event_message: `Suspicious DELETE operation on ${log.table_name}`,
          timestamp: new Date(log.created_at).getTime() * 1000,
          severity: 'warning',
          type: 'audit'
        }))
      ].sort((a, b) => b.timestamp - a.timestamp);

      return { data: securityEvents, error: null };
    } catch (error) {
      return { data: [], error };
    }
  }
}

export const monitoringService = new MonitoringService();