import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionContextType {
  subscribed: boolean;
  subscriptionTier: 'free' | 'premium';
  subscriptionEnd: string | null;
  productId: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
  refreshFeatures: () => Promise<void>;
  // Helper functions for common feature checks
  canUseFavorites: () => boolean;
  getFavoritesLimit: () => number;
  canUseAdvancedSearch: () => boolean;
  canUseMarketInsights: () => boolean;
  getPropertyComparisonLimit: () => number;
  getPropertyAlertsLimit: () => number;
  getMessageHistoryDays: () => number;
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
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium'>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (error) throw error;

      setSubscribed(data?.subscribed || false);
      setSubscriptionTier(data?.subscription_tier || 'free');
      setSubscriptionEnd(data?.subscription_end || null);
      setProductId(data?.product_id || null);
      
      // Refresh feature configs when subscription status changes
      try {
        const { data: featureData, error: featureError } = await supabase
          .from('feature_configurations')
          .select('feature_key, free_tier_enabled, premium_tier_enabled');
        
        if (!featureError && featureData) {
          const configs: {[key: string]: {free: boolean, premium: boolean}} = {};
          featureData.forEach(config => {
            configs[config.feature_key] = {
              free: config.free_tier_enabled,
              premium: config.premium_tier_enabled
            };
          });
          setFeatureConfigs(configs);
        }
      } catch (featureError) {
        console.error('Error refreshing feature configs:', featureError);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to check subscription status');
      // Default to free tier on error
      setSubscribed(false);
      setSubscriptionTier('free');
      setSubscriptionEnd(null);
      setProductId(null);
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
      console.error('Error creating checkout:', error);
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

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  // Dynamic feature gating logic
  const [featureConfigs, setFeatureConfigs] = useState<{[key: string]: {free: boolean, premium: boolean}}>({});
  
  // Fetch feature configurations
  useEffect(() => {
    const fetchFeatureConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_configurations')
          .select('feature_key, free_tier_enabled, premium_tier_enabled');
        
        if (error) throw error;
        
        const configs: {[key: string]: {free: boolean, premium: boolean}} = {};
        data?.forEach(config => {
          configs[config.feature_key] = {
            free: config.free_tier_enabled,
            premium: config.premium_tier_enabled
          };
        });
        setFeatureConfigs(configs);
      } catch (error) {
        console.error('Error fetching feature configurations:', error);
        // Fallback to default configs if fetch fails
        setFeatureConfigs({
          // === SEARCH & DISCOVERY ===
          'basic_search': { free: true, premium: true },
          'advanced_search_filters': { free: false, premium: true },
          'market_insights': { free: false, premium: true },
          
          // === PROPERTY MANAGEMENT ===
          'favorites_basic': { free: true, premium: true }, // Up to 10 favorites
          'favorites_unlimited': { free: false, premium: true }, // Unlimited favorites
          'property_comparison_basic': { free: true, premium: true }, // Compare 2 properties
          'property_comparison_unlimited': { free: false, premium: true }, // Compare unlimited
          'property_alerts_basic': { free: true, premium: true }, // 3 alerts max
          'property_alerts_unlimited': { free: false, premium: true }, // Unlimited alerts
          
          // === COMMUNICATION ===
          'agent_messaging': { free: true, premium: true },
          'message_history_30days': { free: true, premium: true },
          'message_history_unlimited': { free: false, premium: true },
          'priority_support': { free: false, premium: true },
          
          // === NOTIFICATIONS ===
          'email_notifications': { free: true, premium: true },
          'personalized_alerts': { free: false, premium: true },
          'instant_notifications': { free: false, premium: true },
          
          // === LEGACY SUPPORT (for backward compatibility) ===
          'limited_favorites': { free: true, premium: true },
          'standard_agent_contact': { free: true, premium: true },
          'property_inquiry_messaging': { free: true, premium: true },
          'unlimited_favorites': { free: false, premium: true },
          'priority_agent_connections': { free: false, premium: true },
          'email_property_alerts': { free: true, premium: true },
          'direct_messaging': { free: true, premium: true },
          'live_messaging': { free: true, premium: true },
          'message_history_access': { free: false, premium: true },
          'personalized_property_notifications': { free: false, premium: true },
          'property_comparison': { free: true, premium: true },
          'property_alerts': { free: true, premium: true }
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
          console.log('Feature configuration changed:', payload);
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
        .select('feature_key, free_tier_enabled, premium_tier_enabled');
      
      if (error) throw error;
      
      const configs: {[key: string]: {free: boolean, premium: boolean}} = {};
      data?.forEach(config => {
        configs[config.feature_key] = {
          free: config.free_tier_enabled,
          premium: config.premium_tier_enabled
        };
      });
      setFeatureConfigs(configs);
    } catch (error) {
      console.error('Error refreshing feature configurations:', error);
    }
  }, []);

  const isFeatureEnabled = (feature: string): boolean => {
    const config = featureConfigs[feature];
    if (!config) return false; // Unknown feature, default to disabled
    
    if (subscriptionTier === 'premium' && subscribed) {
      return config.premium;
    } else {
      return config.free;
    }
  };

  // Helper functions for common feature checks
  const canUseFavorites = (): boolean => {
    return isFeatureEnabled('favorites_basic') || isFeatureEnabled('favorites_unlimited');
  };

  const getFavoritesLimit = (): number => {
    if (isFeatureEnabled('favorites_unlimited')) return -1; // Unlimited
    if (isFeatureEnabled('favorites_basic')) return 10;
    return 0; // No favorites allowed
  };

  const canUseAdvancedSearch = (): boolean => {
    return isFeatureEnabled('advanced_search_filters');
  };

  const canUseMarketInsights = (): boolean => {
    return isFeatureEnabled('market_insights');
  };

  const getPropertyComparisonLimit = (): number => {
    if (isFeatureEnabled('property_comparison_unlimited')) return -1; // Unlimited
    if (isFeatureEnabled('property_comparison_basic')) return 2;
    return 0; // No comparison allowed
  };

  const getPropertyAlertsLimit = (): number => {
    if (isFeatureEnabled('property_alerts_unlimited')) return -1; // Unlimited
    if (isFeatureEnabled('property_alerts_basic')) return 3;
    return 0; // No alerts allowed
  };

  const getMessageHistoryDays = (): number => {
    if (isFeatureEnabled('message_history_unlimited')) return -1; // Unlimited
    if (isFeatureEnabled('message_history_30days')) return 30;
    return 0; // No message history
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
        checkSubscription();
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
        // Helper functions
        canUseFavorites,
        getFavoritesLimit,
        canUseAdvancedSearch,
        canUseMarketInsights,
        getPropertyComparisonLimit,
        getPropertyAlertsLimit,
        getMessageHistoryDays,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};