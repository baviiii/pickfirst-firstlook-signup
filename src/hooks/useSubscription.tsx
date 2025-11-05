import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'basic' | 'premium'>('free');
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
        // CLEAN, SIMPLIFIED FEATURE GATES
        setFeatureConfigs({
          // === CORE FEATURES (All Users) ===
          'browse_properties': { free: true, basic: true, premium: true },
          'basic_search': { free: true, basic: true, premium: true },
          'save_searches': { free: true, basic: true, premium: true },
          'property_alerts': { free: true, basic: true, premium: true }, // All users get alerts
          'agent_messaging': { free: true, basic: true, premium: true }, // All users can message
          
          // === LIMITED FEATURES (Free users get limited, Premium gets unlimited) ===
          'favorites': { free: true, basic: true, premium: true }, // Free: 10, Premium: unlimited
          'property_comparison': { free: true, basic: true, premium: true }, // Free: 2, Premium: unlimited
          
          // === PREMIUM ONLY FEATURES ===
          'off_market_properties': { free: false, basic: false, premium: true },
          'advanced_search': { free: false, basic: false, premium: true },
          'market_insights': { free: false, basic: false, premium: true },
          'priority_support': { free: false, basic: false, premium: true },
          'schedule_appointments': { free: false, basic: false, premium: true },
          'vendor_details': { free: false, basic: false, premium: true }
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
      // Feature refresh failed silently
    }
  }, []);

  const isFeatureEnabled = (feature: string): boolean => {
    const config = featureConfigs[feature];
    if (!config) return false; // Unknown feature, default to disabled
    
    if (subscriptionTier === 'premium' && subscribed) {
      return config.premium;
    } else if (subscriptionTier === 'basic' && subscribed) {
      return config.basic;
    } else {
      return config.free;
    }
  };

  // SIMPLIFIED HELPER FUNCTIONS
  const canUseFavorites = (): boolean => {
    return isFeatureEnabled('favorites');
  };

  const getFavoritesLimit = (): number => {
    if (subscriptionTier === 'premium') return -1; // Unlimited for premium
    return 10; // 10 for free users
  };

  const canUseAdvancedSearch = (): boolean => {
    return isFeatureEnabled('advanced_search');
  };

  const canUseMarketInsights = (): boolean => {
    return isFeatureEnabled('market_insights');
  };

  const getPropertyComparisonLimit = (): number => {
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

  const canAccessOffMarketListings = (): boolean => {
    return isFeatureEnabled('off_market_properties');
  };

  const canChatWithAgents = (): boolean => {
    return isFeatureEnabled('agent_messaging'); // All users can message
  };

  const canScheduleAppointments = (): boolean => {
    return isFeatureEnabled('schedule_appointments');
  };

  const canViewVendorDetails = (): boolean => {
    return isFeatureEnabled('vendor_details');
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
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};