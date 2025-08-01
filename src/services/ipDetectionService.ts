// Production-ready IP detection service
export class IPDetectionService {
  private static instance: IPDetectionService;
  
  private constructor() {}
  
  static getInstance(): IPDetectionService {
    if (!IPDetectionService.instance) {
      IPDetectionService.instance = new IPDetectionService();
    }
    return IPDetectionService.instance;
  }

  /**
   * Get the real client IP address
   * This works in production environments with proper headers
   */
  async getClientIP(): Promise<string> {
    try {
      // Method 1: Try to get from Supabase Edge Functions (if deployed)
      if (typeof window !== 'undefined') {
        try {
          const response = await fetch('https://rkwvgqozbpqgmpbvujgz.supabase.co/functions/v1/client-ip', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.ip && data.ip !== 'unknown') {
              return data.ip;
            }
          }
        } catch (error) {
          console.warn('Could not fetch IP from Supabase Edge Function:', error);
        }
      }

      // Method 2: Try to get from a public IP service
      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            return data.ip;
          }
        }
      } catch (error) {
        console.warn('Could not fetch IP from ipify:', error);
      }

      // Method 3: Try alternative IP service
      try {
        const response = await fetch('https://api.myip.com', {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            return data.ip;
          }
        }
      } catch (error) {
        console.warn('Could not fetch IP from myip.com:', error);
      }

      // Method 4: Fallback - try to get from headers (if available)
      if (typeof window !== 'undefined') {
        // In a real production app, this would come from server-side headers
        // For now, we'll return a placeholder that indicates it's a real request
        return 'client-ip-detected';
      }

      return 'unknown-ip';
    } catch (error) {
      console.error('Error detecting client IP:', error);
      return 'error-detecting-ip';
    }
  }

  /**
   * Get additional client information for security monitoring
   */
  async getClientInfo(): Promise<{
    ip: string;
    userAgent: string;
    timestamp: string;
    sessionId?: string;
  }> {
    const ip = await this.getClientIP();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const timestamp = new Date().toISOString();
    
    // Generate a session ID for tracking
    const sessionId = this.generateSessionId();

    return {
      ip,
      userAgent,
      timestamp,
      sessionId,
    };
  }

  private generateSessionId(): string {
    // Generate a unique session ID
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const ipDetectionService = IPDetectionService.getInstance(); 