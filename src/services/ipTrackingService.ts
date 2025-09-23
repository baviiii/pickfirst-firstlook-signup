import { supabase } from '@/integrations/supabase/client';

export interface IPTrackingData {
  ip: string;
  userAgent: string;
  deviceInfo: {
    browser: string;
    os: string;
    device: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  };
  locationInfo?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    timezone: string;
    isp: string;
  };
  referer?: string;
  origin?: string;
  timestamp: string;
}

export interface LoginActivityData {
  user_id?: string;
  email: string;
  login_type: 'signin' | 'signup' | 'password_reset' | 'logout';
  success: boolean;
  failure_reason?: string;
  session_id?: string;
}

class IPTrackingService {
  private static instance: IPTrackingService;
  private clientIPCache: IPTrackingData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): IPTrackingService {
    if (!IPTrackingService.instance) {
      IPTrackingService.instance = new IPTrackingService();
    }
    return IPTrackingService.instance;
  }

  /**
   * Get client IP and device information
   */
  async getClientInfo(): Promise<IPTrackingData | null> {
    // Return cached data if still valid
    if (this.clientIPCache && Date.now() < this.cacheExpiry) {
      return this.clientIPCache;
    }

    try {
      const response = await fetch('/functions/v1/client-ip', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        const ipData: IPTrackingData = {
          ip: data.ip || 'unknown',
          userAgent: data.userAgent || 'unknown',
          deviceInfo: data.deviceInfo || {
            browser: 'Unknown',
            os: 'Unknown',
            device: 'Unknown',
            isMobile: false,
            isTablet: false,
            isDesktop: false
          },
          locationInfo: data.locationInfo,
          referer: data.referer,
          origin: data.origin,
          timestamp: data.timestamp || new Date().toISOString()
        };

        // Cache the result
        this.clientIPCache = ipData;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;

        return ipData;
      }
    } catch (error) {
      console.error('Failed to get client IP info:', error);
    }

    return null;
  }

  /**
   * Log login activity with IP tracking
   */
  async logLoginActivity(activityData: LoginActivityData): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      
      if (!clientInfo) {
        console.warn('Could not get client IP info for login activity');
        return;
      }

      const { error } = await supabase
        .from('login_history')
        .insert({
          user_id: activityData.user_id || null,
          email: activityData.email,
          ip_address: clientInfo.ip,
          user_agent: clientInfo.userAgent,
          device_info: clientInfo.deviceInfo,
          location_info: clientInfo.locationInfo || {},
          login_type: activityData.login_type,
          success: activityData.success,
          failure_reason: activityData.failure_reason || null,
          session_id: activityData.session_id || null,
          referer: clientInfo.referer || null,
          origin: clientInfo.origin || null
        });

      if (error) {
        console.error('Failed to log login activity:', error);
      }
    } catch (error) {
      console.error('Error logging login activity:', error);
    }
  }

  /**
   * Enhanced activity logging that includes real IP addresses
   */
  async logUserActivity(
    action: string,
    tableName: string,
    userId?: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      const clientInfo = await this.getClientInfo();
      
      // Get the current activity logging table name (assuming it exists)
      const activityData = {
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: clientInfo?.ip || 'unknown',
        user_agent: clientInfo?.userAgent || 'unknown',
        created_at: new Date().toISOString()
      };

      // Log to your existing activity table (adjust table name as needed)
      const { error } = await supabase
        .from('audit_logs') // or whatever your activity table is called
        .insert(activityData);

      if (error) {
        console.error('Failed to log user activity:', error);
      }
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }

  /**
   * Get login history for a user
   */
  async getUserLoginHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get login history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting login history:', error);
      return [];
    }
  }

  /**
   * Get suspicious login attempts
   */
  async getSuspiciousLogins(hours: number = 24): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_logins')
        .select('*')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get suspicious logins:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting suspicious logins:', error);
      return [];
    }
  }

  /**
   * Check if IP is suspicious (multiple failed attempts)
   */
  async isIPSuspicious(ip: string, hours: number = 1): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('id')
        .eq('ip_address', ip)
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Failed to check IP suspicion:', error);
        return false;
      }

      // Consider IP suspicious if more than 5 failed attempts in the time window
      return (data?.length || 0) > 5;
    } catch (error) {
      console.error('Error checking IP suspicion:', error);
      return false;
    }
  }

  /**
   * Get user's recent login locations
   */
  async getUserLoginLocations(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('location_info, ip_address, created_at, success')
        .eq('user_id', userId)
        .not('location_info', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get login locations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting login locations:', error);
      return [];
    }
  }
}

export const ipTrackingService = IPTrackingService.getInstance();
