import { supabase } from '@/integrations/supabase/client';

export interface UserContext {
  id: string;
  email: string;
  full_name: string;
  role: string;
  subscription_tier?: string;
  subscription_status?: string;
  created_at: string;
  last_login?: string;
  session_id?: string;
}

export class UserContextService {
  private static instance: UserContextService;
  private userCache: Map<string, UserContext> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UserContextService {
    if (!UserContextService.instance) {
      UserContextService.instance = new UserContextService();
    }
    return UserContextService.instance;
  }

  /**
   * Get comprehensive user context for audit logging
   */
  async getUserContext(userId: string): Promise<UserContext | null> {
    try {
      // Check cache first
      const cached = this.getCachedUser(userId);
      if (cached) {
        return cached;
      }

      // Fetch from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          subscription_tier,
          subscription_status,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single();

      if (error || !profile) {
        console.warn('Could not fetch user profile for audit context:', error);
        return null;
      }

      // Create user context
      const userContext: UserContext = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        subscription_tier: profile.subscription_tier,
        subscription_status: profile.subscription_status,
        created_at: profile.created_at,
        last_login: profile.updated_at,
        session_id: this.generateSessionId(),
      };

      // Cache the result
      this.cacheUser(userId, userContext);

      return userContext;
    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  }

  /**
   * Get current authenticated user context
   */
  async getCurrentUserContext(): Promise<UserContext | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      return await this.getUserContext(user.id);
    } catch (error) {
      console.error('Error getting current user context:', error);
      return null;
    }
  }

  /**
   * Get user context for audit logging with additional metadata
   */
  async getAuditUserContext(userId: string): Promise<{
    user: UserContext | null;
    metadata: {
      timestamp: string;
      session_id: string;
      user_agent: string;
      ip_address?: string;
    };
  }> {
    const user = await this.getUserContext(userId);
    const metadata = {
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ip_address: undefined, // Will be set by IP detection service
    };

    return { user, metadata };
  }

  /**
   * Clear user cache (useful for testing or when user data changes)
   */
  clearUserCache(userId?: string): void {
    if (userId) {
      this.userCache.delete(userId);
      this.cacheExpiry.delete(userId);
    } else {
      this.userCache.clear();
      this.cacheExpiry.clear();
    }
  }

  private getCachedUser(userId: string): UserContext | null {
    const expiry = this.cacheExpiry.get(userId);
    if (expiry && Date.now() < expiry) {
      return this.userCache.get(userId) || null;
    }
    
    // Clear expired cache
    this.userCache.delete(userId);
    this.cacheExpiry.delete(userId);
    return null;
  }

  private cacheUser(userId: string, userContext: UserContext): void {
    this.userCache.set(userId, userContext);
    this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const userContextService = UserContextService.getInstance(); 