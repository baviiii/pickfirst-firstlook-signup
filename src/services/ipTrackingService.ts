import { supabase } from '@/integrations/supabase/client';
import { EmailService } from './emailService';

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
  login_type: 'signin' | 'signup' | 'password_reset' | 'logout' | 'forgot_password';
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
      // First try the Supabase Edge Function using the existing client configuration
      // This uses the public anon key which is safe to expose
      const response = await supabase.functions.invoke('client-ip', {
        method: 'GET'
      });
      
      if (response.data && !response.error) {
        const data = response.data;
        
        const ipData: IPTrackingData = {
          ip: data.ip || 'unknown',
          userAgent: data.userAgent || navigator.userAgent || 'unknown',
          deviceInfo: data.deviceInfo || {
            browser: 'Unknown',
            os: 'Unknown',
            device: 'Unknown',
            isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
            isTablet: /iPad|Tablet/.test(navigator.userAgent),
            isDesktop: !/Mobile|Android|iPhone|iPad|Tablet/.test(navigator.userAgent)
          },
          locationInfo: data.locationInfo,
          referer: data.referer || document.referrer,
          origin: data.origin || window.location.origin,
          timestamp: data.timestamp || new Date().toISOString()
        };

        this.clientIPCache = ipData;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        return ipData;
      } else {
        // Client-IP function error - silently fallback
      }
    } catch (error) {
      // Fallback to alternative method
    }

    try {
      const fallbackIP = await this.getFallbackIP();
      
      const ipData: IPTrackingData = {
        ip: fallbackIP,
        userAgent: navigator.userAgent || 'unknown',
        deviceInfo: {
          browser: this.detectBrowser(),
          os: this.detectOS(),
          device: this.detectDevice(),
          isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
          isTablet: /iPad|Tablet/.test(navigator.userAgent),
          isDesktop: !/Mobile|Android|iPhone|iPad|Tablet/.test(navigator.userAgent)
        },
        locationInfo: undefined, // No location data in fallback
        referer: document.referrer || undefined,
        origin: window.location.origin || undefined,
        timestamp: new Date().toISOString()
      };

      this.clientIPCache = ipData;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return ipData;
    } catch (error) {
      // Fallback IP detection failed
    }

    // All IP detection methods failed
    return null;
  }

  /**
   * Log login activity with IP tracking
   */
  async logLoginActivity(activityData: LoginActivityData): Promise<void> {
    try {
      let clientInfo = await this.getClientInfo();
      
      // Provide fallback values if getClientInfo fails
      if (!clientInfo) {
        // Using fallback values for client info
        clientInfo = {
          ip: 'unknown',
          userAgent: navigator.userAgent || 'unknown',
          deviceInfo: {
            browser: 'Unknown',
            os: 'Unknown', 
            device: 'Unknown',
            isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
            isTablet: /iPad|Tablet/.test(navigator.userAgent),
            isDesktop: !/Mobile|Android|iPhone|iPad|Tablet/.test(navigator.userAgent)
          },
          locationInfo: undefined,
          referer: document.referrer || undefined,
          origin: window.location.origin || undefined,
          timestamp: new Date().toISOString()
        };
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
        console.error('[IPTracking] Error logging login activity:', error);
        throw error;
      }

      // Check for suspicious activity and alert super admins if needed
      // Only check for signin attempts (not logout, signup, etc.)
      if (activityData.login_type === 'signin') {
        // Wait longer to ensure the insert is committed and visible
        // Run async - don't block the login flow, but log errors properly
        if (clientInfo.ip && clientInfo.ip !== 'unknown' && clientInfo.ip !== 'invalid-format') {
          // Use longer delay to ensure database consistency
          setTimeout(() => {
            this.checkAndAlertSuspiciousActivity({
              email: activityData.email,
              ip_address: clientInfo.ip,
              success: activityData.success,
              failure_reason: activityData.failure_reason,
              location_info: clientInfo.locationInfo,
              device_info: clientInfo.deviceInfo
            }).catch(err => {
              console.error('[IPTracking] Error checking suspicious activity:', err);
            });
          }, 500); // Increased delay to 500ms for better DB consistency
        } else {
          console.warn(`[IPTracking] Skipping suspicious activity check - invalid IP: ${clientInfo?.ip || 'null'}`);
        }
      }
    } catch (error) {
      // Error logging login activity - silently fail
    }
  }

  /**
   * Check for suspicious login activity and alert super admins
   */
  private async checkAndAlertSuspiciousActivity(loginData: {
    email: string;
    ip_address: string;
    success: boolean;
    failure_reason?: string;
    location_info?: any;
    device_info?: any;
  }): Promise<void> {
    try {
      await EmailService.checkAndAlertSuspiciousLogin(loginData);
    } catch (error) {
      console.error('[IPTracking] Error in suspicious activity check:', error);
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
        // Failed to log user activity
      }
    } catch (error) {
      // Error logging user activity
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
        return [];
      }

      return data || [];
    } catch (error) {
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
        return [];
      }

      return data || [];
    } catch (error) {
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
        return false;
      }

      // Consider IP suspicious if more than 5 failed attempts in the time window
      return (data?.length || 0) > 5;
    } catch (error) {
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
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get fallback IP address from public service
   */
  private async getFallbackIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Detect browser from user agent
   */
  private detectBrowser(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    } else if (userAgent.includes('Edg')) {
      return 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      return 'Opera';
    } else if (userAgent.includes('Trident')) {
      return 'Internet Explorer';
    }
    
    return 'Unknown';
  }

  /**
   * Detect operating system from user agent
   */
  private detectOS(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows NT')) {
      return 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      return 'macOS';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    } else if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      return 'iOS';
    }
    
    return 'Unknown';
  }

  /**
   * Detect device type from user agent
   */
  private detectDevice(): string {
    const userAgent = navigator.userAgent;
    
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      return 'Mobile';
    } else if (/iPad|Tablet/.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }
}

export const ipTrackingService = IPTrackingService.getInstance();
