interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (userId: string, action: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Set up default rate limits
    this.setupDefaultLimits();
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private setupDefaultLimits() {
    // Client management rate limits
    this.configs.set('client:search', { maxRequests: 10, windowMs: 60000 }); // 10 searches per minute
    this.configs.set('client:create', { maxRequests: 5, windowMs: 60000 }); // 5 creates per minute
    this.configs.set('client:delete', { maxRequests: 3, windowMs: 60000 }); // 3 deletes per minute
    
    // Property management rate limits
    this.configs.set('property:create', { maxRequests: 3, windowMs: 60000 }); // 3 property creates per minute
    this.configs.set('property:view', { maxRequests: 20, windowMs: 60000 }); // 20 property views per minute
    this.configs.set('property:delete', { maxRequests: 2, windowMs: 60000 }); // 2 property deletes per minute
    this.configs.set('property:update', { maxRequests: 5, windowMs: 60000 }); // 5 property updates per minute
    this.configs.set('property:upload', { maxRequests: 10, windowMs: 60000 }); // 10 image uploads per minute
    
    // Admin rate limits
    this.configs.set('admin:users:view', { maxRequests: 10, windowMs: 60000 }); // 10 user views per minute
    this.configs.set('admin:users:delete', { maxRequests: 5, windowMs: 60000 }); // 5 user deletes per minute
    this.configs.set('admin:properties:approve', { maxRequests: 10, windowMs: 60000 }); // 10 property approvals per minute
    
    // General API rate limits
    this.configs.set('api:general', { maxRequests: 100, windowMs: 60000 }); // 100 requests per minute
    this.configs.set('api:auth', { maxRequests: 5, windowMs: 300000 }); // 5 auth attempts per 5 minutes
    
    // Password reset rate limits (security critical)
    this.configs.set('password_reset', { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }); // 3 attempts per day
    this.configs.set('password_update', { maxRequests: 5, windowMs: 60 * 60 * 1000 }); // 5 updates per hour
    
    // Database operation limits
    this.configs.set('db:read', { maxRequests: 200, windowMs: 60000 }); // 200 reads per minute
    this.configs.set('db:write', { maxRequests: 50, windowMs: 60000 }); // 50 writes per minute
  }

  private generateKey(userId: string, action: string): string {
    return `${userId}:${action}`;
  }

  async checkRateLimit(userId: string, action: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = this.configs.get(action) || this.configs.get('api:general')!;
    const key = this.generateKey(userId, action);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = this.limits.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  // Get current usage for a user/action
  getCurrentUsage(userId: string, action: string): { count: number; limit: number; resetTime: number } {
    const config = this.configs.get(action) || this.configs.get('api:general')!;
    const key = this.generateKey(userId, action);
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return { count: 0, limit: config.maxRequests, resetTime: now + config.windowMs };
    }

    return {
      count: entry.count,
      limit: config.maxRequests,
      resetTime: entry.resetTime
    };
  }
}

export const rateLimitService = new RateLimitService(); 