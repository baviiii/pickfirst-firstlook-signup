import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: 'free' | 'basic' | 'premium';
  subscriptionEnd: string | null;
  productId: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
  refreshFeatures: () => Promise<void>;
  canUseFavorites: () => boolean;
  getFavoritesLimit: () => number;
  canUseAdvancedSearch: () => boolean;
  canUseMarketInsights: () => boolean;
  getPropertyComparisonLimit: () => number;
  getPropertyAlertsLimit: () => number;
  getMessageHistoryDays: () => number;
  canAccessOffMarketListings: () => boolean;
  canChatWithAgents: () => boolean;
  canScheduleAppointments: () => boolean;
  canViewVendorDetails: () => boolean;
  canAccessEarlyAccessListings: () => boolean;
  canUsePropertyInsights: () => boolean;
  canUseInvestorFilters: () => boolean;
  canUsePersonalizedAlerts: () => boolean;
  canUseInstantNotifications: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const { profile } = useAuth(); // Get profile directly from useAuth - this is the source of truth
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize subscription state from profile immediately on mount/refresh
  useEffect(() => {
    if (profile) {
      // Determine tier from profile - tier is the PRIMARY source of truth
      const tier = (profile.subscription_tier === 'premium' || profile.subscription_tier === 'basic') 
        ? profile.subscription_tier 
        : 'free' as 'free' | 'basic' | 'premium';
      
      // User is subscribed if tier is premium/basic OR subscription_status is 'active'
      // This ensures if tier is set to premium, features unlock even if status is null
      const isSubscribed = tier !== 'free' || profile.subscription_status === 'active';
      
      // Set state immediately from profile (no async wait)
      setSubscriptionTier(tier);
      setSubscribed(isSubscribed);
      setSubscriptionEnd(profile.subscription_expires_at || null);
      setProductId(profile.subscription_product_id || null);
      setLoading(false); // Stop loading once we have profile data
      
      console.log('🔔 Subscription state updated from profile:', {
        tier,
        isSubscribed,
        subscription_status: profile.subscription_status,
        subscription_tier: profile.subscription_tier,
        subscription_expires_at: profile.subscription_expires_at,
        profile_id: profile.id,
        profile_email: profile.email,
        willUnlockFeatures: tier === 'premium' || tier === 'basic'
      });
    } else if (!profile) {
      // Profile is null, reset to free
      setSubscriptionTier('free');
      setSubscribed(false);
      setSubscriptionEnd(null);
      setProductId(null);
      // Only set loading to false if we're sure there's no profile (not just waiting)
      if (loading) {
        // Wait a bit for profile to load
        const timer = setTimeout(() => {
          setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setLoading(false);
      }
    }
  }, [profile]); // Remove loading from dependencies to avoid loops

  const checkSubscription = useCallback(async () => {
    // Get current session directly from supabase
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession || !currentSession.user) {
      setSubscribed(false);
      setSubscriptionTier('free');
      setSubscriptionEnd(null);
      setProductId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, get profile directly to check current subscription status
      const { data: profileData } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_expires_at, subscription_product_id')
        .eq('id', currentSession.user.id)
        .single();

      // Then check with Stripe to sync/update if needed
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      // Use Stripe response if available, otherwise fall back to profile
      const rawTier = data?.subscription_tier || profileData?.subscription_tier || 'free';
      const tier = (rawTier === 'premium' || rawTier === 'basic') ? rawTier : 'free' as 'free' | 'basic' | 'premium';
      // Prioritize tier from profile - if tier is premium/basic, user is subscribed
      const subscribed = data?.subscribed !== undefined 
        ? data.subscribed 
        : (tier !== 'free' || profileData?.subscription_status === 'active');
      const endDate = data?.subscription_end || profileData?.subscription_expires_at || null;
      const prodId = data?.product_id || profileData?.subscription_product_id || null;

      setSubscribed(subscribed);
      setSubscriptionTier(tier);
      setSubscriptionEnd(endDate);
      setProductId(prodId);
      
      // Refresh feature configs when subscription status changes
      try {
        const { data: featureData, error: featureError } = await supabase
          .from('feature_configurations')
          .select('feature_key, free_tier_enabled, basic_tier_enabled, premium_tier_enabled');
        
        if (!featureError && featureData) {
          const configs: {[key: string]: {free: boolean, basic: boolean, premium: boolean}} = {};
          featureData.forEach(config => {
            configs[config.feature_key] = {
              free: config.free_tier_enabled,
              basic: config.basic_tier_enabled || false,
              premium: config.premium_tier_enabled
            };
          });
          setFeatureConfigs(configs);
        }
      } catch (featureError) {
        // Feature config refresh failed silently
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      // Fallback to profile on error
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_expires_at, subscription_product_id')
          .eq('id', currentSession.user.id)
          .single();
        
        if (profileData) {
          const tier = (profileData.subscription_tier === 'premium' || profileData.subscription_tier === 'basic') 
            ? profileData.subscription_tier 
            : 'free' as 'free' | 'basic' | 'premium';
          // Prioritize tier - if tier is premium/basic, user is subscribed
          const subscribed = tier !== 'free' || profileData.subscription_status === 'active';
          setSubscribed(subscribed);
          setSubscriptionTier(tier);
          setSubscriptionEnd(profileData.subscription_expires_at || null);
          setProductId(profileData.subscription_product_id || null);
        } else {
          setSubscribed(false);
          setSubscriptionTier('free');
          setSubscriptionEnd(null);
          setProductId(null);
        }
      } catch (fallbackError) {
        toast.error('Failed to check subscription status');
        setSubscribed(false);
        setSubscriptionTier('free');
        setSubscriptionEnd(null);
        setProductId(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createCheckout = async (priceId: string) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession || !currentSession.user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to create checkout session');
    }
  };

  const openCustomerPortal = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession || !currentSession.user) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) {
        console.error('Customer portal error:', error);
        if (error.message?.includes('No configuration')) {
          toast.error('Subscription management is being set up. Please contact support or try again later.');
        } else {
          toast.error('Failed to open subscription management');
        }
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('Unable to open subscription portal. Please try again.');
      }
    } catch (error) {
      console.error('Subscription portal error:', error);
      toast.error('Failed to open subscription management. Please contact support.');
    }
  };

  // Dynamic feature gating logic
  const [featureConfigs, setFeatureConfigs] = useState<{[key: string]: {free: boolean, basic: boolean, premium: boolean}}>({});
  
  // Fetch feature configurations
  useEffect(() => {
    const fetchFeatureConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_configurations')
          .select('feature_key, free_tier_enabled, basic_tier_enabled, premium_tier_enabled');
        
        if (error) throw error;
        
        const configs: {[key: string]: {free: boolean, basic: boolean, premium: boolean}} = {};
        data?.forEach(config => {
          configs[config.feature_key] = {
            free: config.free_tier_enabled,
            basic: config.basic_tier_enabled || false,
            premium: config.premium_tier_enabled
          };
        });
        setFeatureConfigs(configs);
      } catch (error) {
        // ACTUAL FEATURES FROM DATABASE - Only features that exist in feature_configurations table
        setFeatureConfigs({
          // === CORE FEATURES (All Users) ===
          'browse_properties': { free: true, basic: true, premium: true },
          'browse_listings': { free: true, basic: true, premium: true }, // Alias
          'basic_search': { free: true, basic: true, premium: true },
          'save_searches': { free: true, basic: true, premium: true },
          'property_alerts': { free: true, basic: true, premium: true },
          'agent_messaging': { free: true, basic: true, premium: true },
          
          // === LIMITED FEATURES (Free users get limited, Premium gets unlimited) ===
          'favorites': { free: true, basic: true, premium: true }, // Free: 10, Premium: unlimited
          'property_comparison': { free: true, basic: true, premium: true }, // Free: 2, Premium: unlimited
          'property_comparison_basic': { free: true, basic: true, premium: true },
          'property_comparison_unlimited': { free: false, basic: false, premium: true },
          
          // === PREMIUM ONLY FEATURES ===
          'off_market_properties': { free: false, basic: false, premium: true },
          'exclusive_offmarket': { free: false, basic: false, premium: true }, // Alias
          'advanced_search': { free: false, basic: false, premium: true },
          'advanced_search_filters': { free: false, basic: true, premium: true },
          'market_insights': { free: false, basic: true, premium: true },
          'priority_support': { free: false, basic: false, premium: true },
          'schedule_appointments': { free: false, basic: false, premium: true },
          'vendor_details': { free: false, basic: false, premium: true },
          'early_access_listings': { free: false, basic: true, premium: true },
          'property_insights': { free: false, basic: true, premium: true },
          'investor_filters': { free: false, basic: true, premium: true },
          
          // Legacy/alias features for backward compatibility
          'personalized_property_notifications': { free: false, basic: false, premium: true }, // Used in BuyerAccountSettings
          'direct_chat_agents': { free: true, basic: true, premium: true }, // Alias for agent_messaging
          'unlimited_favorites': { free: false, basic: false, premium: true } // Legacy alias
        });
      }
    };
    
    fetchFeatureConfigs();

    // Set up real-time subscription for feature configuration changes
    const subscription = supabase
      .channel('feature_configurations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_configurations'
        },
        (payload) => {
          // Refetch feature configurations when changes occur
          fetchFeatureConfigs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshFeatures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_configurations')
        .select('feature_key, free_tier_enabled, basic_tier_enabled, premium_tier_enabled');
      
      if (error) {
        console.error('Error fetching feature configs:', error);
        throw error;
      }
      
      const configs: {[key: string]: {free: boolean, basic: boolean, premium: boolean}} = {};
      data?.forEach(config => {
        configs[config.feature_key] = {
          free: config.free_tier_enabled || false,
          basic: config.basic_tier_enabled || false,
          premium: config.premium_tier_enabled || false
        };
      });
      setFeatureConfigs(configs);
    } catch (error) {
      console.error('Feature refresh failed:', error);
      // Feature refresh failed silently - use cached or default
    }
  }, []);

  const isFeatureEnabled = (feature: string): boolean => {
    const config = featureConfigs[feature];
    
    // If no config found, check tier directly as fallback for premium users
    if (!config) {
      // For premium users, allow access to premium features even if config is missing
      const userTier = subscriptionTier === 'premium' || subscriptionTier === 'basic' 
        ? subscriptionTier 
        : (profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'basic')
          ? profile.subscription_tier
          : 'free';
      
      if (userTier === 'premium' || userTier === 'basic') {
        // Comprehensive list of premium/basic feature keywords
        // This handles features that exist in DB and aliases that don't
        const isPremiumFeature = 
          feature.includes('off_market') || 
          feature.includes('vendor') || 
          feature.includes('exclusive') ||
          feature.includes('advanced') ||  // Matches both 'advanced_search' and 'advanced_search_filters'
          feature.includes('schedule') ||
          feature.includes('priority') ||
          feature.includes('insight') ||
          feature.includes('early_access') ||
          feature.includes('investor') ||
          feature.includes('unlimited') ||
          feature === 'market_insights' ||
          feature === 'property_insights' ||
          feature === 'vendor_details' ||
          feature === 'off_market_properties' ||  // Exists in DB
          feature === 'exclusive_offmarket' ||    // Alias, doesn't exist in DB
          feature === 'advanced_search' ||        // Exists in DB
          feature === 'advanced_search_filters' || // Alias, doesn't exist in DB
          feature === 'schedule_appointments' ||
          feature === 'priority_support' ||
          feature === 'early_access_listings' ||
          feature === 'property_comparison_unlimited';
        
        // Basic tier features
        const isBasicFeature = 
          feature.includes('early_access') ||
          feature.includes('insight') ||
          feature.includes('investor') ||
          feature === 'market_insights' ||
          feature === 'property_insights' ||
          feature === 'investor_filters' ||
          feature === 'early_access_listings' ||
          feature === 'advanced_search_filters';
        
        if (userTier === 'premium' && isPremiumFeature) {
          console.log(`✅ Premium feature access granted: ${feature} (config missing, but user is premium)`);
          return true;
        }
        
        if ((userTier === 'premium' || userTier === 'basic') && isBasicFeature) {
          console.log(`✅ ${userTier} feature access granted: ${feature} (config missing, but user is ${userTier})`);
          return true;
        }
      }
      console.warn(`⚠️ Feature config not found for: ${feature}`);
      return false; // Unknown feature, default to disabled
    }
    
    // FALLBACK: If subscriptionTier is still 'free' but profile shows premium, use profile directly
    // This handles race conditions where profile loads before subscription state updates
    let effectiveTier = subscriptionTier;
    if (profile && subscriptionTier === 'free') {
      const profileTier = profile.subscription_tier;
      if (profileTier === 'premium' || profileTier === 'basic') {
        effectiveTier = profileTier as 'free' | 'basic' | 'premium';
        console.log('🔄 Using profile tier as fallback:', { 
          subscriptionTier, 
          profileTier: profile.subscription_tier,
          effectiveTier 
        });
      }
    }
    
    // Check subscription tier directly - if tier is premium, user has premium access
    // subscribed flag is secondary check, but tier from profile is primary
    const enabled = effectiveTier === 'premium' 
      ? config.premium 
      : effectiveTier === 'basic' 
        ? config.basic 
        : config.free;
    
    // Debug logging for premium features
    if (feature.includes('off_market') || feature.includes('vendor') || feature.includes('advanced') || feature.includes('schedule')) {
      console.log(`🔓 Feature check: ${feature}`, {
        subscriptionTier,
        effectiveTier,
        profileTier: profile?.subscription_tier,
        enabled,
        config: { free: config.free, basic: config.basic, premium: config.premium }
      });
    }
    
    return enabled;
  };

  // SIMPLIFIED HELPER FUNCTIONS
  const canUseFavorites = (): boolean => {
    // Check both 'favorites' and 'favorites_basic' for compatibility
    return isFeatureEnabled('favorites') || isFeatureEnabled('favorites_basic');
  };

  const getFavoritesLimit = (): number => {
    if (subscriptionTier === 'premium') return -1; // Unlimited for premium
    return 10; // 10 for free users
  };

  const canUseAdvancedSearch = (): boolean => {
    // Check 'advanced_search' (exists in DB) first, then 'advanced_search_filters' as alias/fallback
    // If user is premium and either exists, grant access
    if (subscriptionTier === 'premium' || profile?.subscription_tier === 'premium') {
      // Premium users get access to advanced search features
      return isFeatureEnabled('advanced_search') || isFeatureEnabled('advanced_search_filters') || true;
    }
    return isFeatureEnabled('advanced_search') || isFeatureEnabled('advanced_search_filters');
  };

  const canUseMarketInsights = (): boolean => {
    return isFeatureEnabled('market_insights');
  };

  const getPropertyComparisonLimit = (): number => {
    // Check if unlimited comparison is enabled
    if (isFeatureEnabled('property_comparison_unlimited')) return -1; // Unlimited
    if (subscriptionTier === 'premium') return -1; // Unlimited for premium
    return 2; // 2 for free users
  };

  const getPropertyAlertsLimit = (): number => {
    // All users get property alerts, no artificial limits
    return -1; // Unlimited for everyone
  };

  const getMessageHistoryDays = (): number => {
    return subscriptionTier === 'premium' ? -1 : 30; // Premium: unlimited, Free: 30 days
  };

  const canAccessOffMarketListings = useCallback((): boolean => {
    // Primary check: off_market_properties (this is the actual feature key in database)
    // Fallback: exclusive_offmarket (alias, may not exist in DB)
    const hasOffMarket = isFeatureEnabled('off_market_properties');
    const hasExclusive = isFeatureEnabled('exclusive_offmarket');
    const hasFeature = hasOffMarket || hasExclusive;
    
    // If user is premium, grant access even if feature configs are missing
    const userTier = subscriptionTier === 'premium' || subscriptionTier === 'basic' 
      ? subscriptionTier 
      : (profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'basic')
        ? profile.subscription_tier
        : 'free';
    
    // Premium users always get access to off-market listings
    const result = hasFeature || (userTier === 'premium');
    
    console.log('🔓 canAccessOffMarketListings check:', {
      hasOffMarket,
      hasExclusive,
      hasFeature,
      subscriptionTier,
      userTier,
      profileTier: profile?.subscription_tier,
      finalResult: result
    });
    
    return result;
  }, [subscriptionTier, profile, isFeatureEnabled]);

  const canChatWithAgents = (): boolean => {
    // Check both 'agent_messaging' and 'direct_chat_agents' for compatibility
    return isFeatureEnabled('agent_messaging') || isFeatureEnabled('direct_chat_agents');
  };

  const canScheduleAppointments = (): boolean => {
    return isFeatureEnabled('schedule_appointments');
  };

  const canViewVendorDetails = (): boolean => {
    return isFeatureEnabled('vendor_details');
  };

  const canAccessEarlyAccessListings = (): boolean => {
    return isFeatureEnabled('early_access_listings');
  };

  const canUsePropertyInsights = (): boolean => {
    return isFeatureEnabled('property_insights') || isFeatureEnabled('market_insights');
  };

  const canUseInvestorFilters = (): boolean => {
    return isFeatureEnabled('investor_filters');
  };

  const canUsePersonalizedAlerts = (): boolean => {
    // Check both 'personalized_alerts' and 'personalized_property_notifications' for compatibility
    return isFeatureEnabled('personalized_alerts') || isFeatureEnabled('personalized_property_notifications');
  };

  const canUseInstantNotifications = (): boolean => {
    return isFeatureEnabled('instant_notifications');
  };


  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Delay subscription check slightly to ensure auth is fully set up
          setTimeout(() => {
            checkSubscription();
          }, 500);
        } else {
          setSubscribed(false);
          setSubscriptionTier('free');
          setSubscriptionEnd(null);
          setProductId(null);
          setLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check subscription in background, but don't block on it
        // Profile state is already set from useEffect above
        checkSubscription().catch(() => {
          // Ignore errors - profile is source of truth
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  // Auto-refresh subscription status every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        subscriptionTier,
        subscriptionEnd,
        productId,
        loading,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        isFeatureEnabled,
        refreshFeatures,
        // SIMPLIFIED HELPER FUNCTIONS
        canUseFavorites,
        getFavoritesLimit,
        canUseAdvancedSearch,
        canUseMarketInsights,
        getPropertyComparisonLimit,
        getPropertyAlertsLimit,
        getMessageHistoryDays,
        canAccessOffMarketListings,
        canChatWithAgents,
        canScheduleAppointments,
        canViewVendorDetails,
        canAccessEarlyAccessListings,
        canUsePropertyInsights,
        canUseInvestorFilters,
        canUsePersonalizedAlerts,
        canUseInstantNotifications,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};