/**
 * Security headers and CSRF protection utilities
 */

export class SecurityHeaders {
  // Generate CSRF token for forms
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Validate CSRF token
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken && token.length === 64;
  }

  // Set security headers for fetch requests
  static getSecurityHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  // Check if request is from same origin
  static validateSameOrigin(request: Request): boolean {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    
    if (!origin && !referer) return false;
    
    const currentOrigin = window.location.origin;
    return origin === currentOrigin || (referer && referer.startsWith(currentOrigin));
  }

  // Sanitize headers to prevent injection
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      // Remove any control characters and validate header names
      const cleanKey = key.replace(/[^\w-]/g, '');
      const cleanValue = value.replace(/[\r\n\0]/g, '');
      
      if (cleanKey && cleanValue) {
        sanitized[cleanKey] = cleanValue;
      }
    }
    
    return sanitized;
  }

  // Rate limiting validation
  static isRateLimited(requests: number[], windowMs: number, maxRequests: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return recentRequests.length >= maxRequests;
  }

  // Generate secure session identifier
  static generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}