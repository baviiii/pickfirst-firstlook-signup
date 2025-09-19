import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium'>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
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
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscribed(data?.subscribed || false);
      setSubscriptionTier(data?.subscription_tier || 'free');
      setSubscriptionEnd(data?.subscription_end || null);
      setProductId(data?.product_id || null);
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
  }, [user, session]);

  const createCheckout = async (priceId: string) => {
    if (!user || !session) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
    if (!user || !session) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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

  // Feature gating logic
  const isFeatureEnabled = (feature: string): boolean => {
    const freeFeatures = [
      'basic_search',
      'limited_favorites', // up to 10
      'standard_agent_contact'
    ];

    const premiumFeatures = [
      'unlimited_favorites',
      'advanced_search_filters', 
      'priority_agent_connections',
      'email_property_alerts',
      'market_insights',
      'direct_messaging'
    ];

    if (freeFeatures.includes(feature)) {
      return true; // Available to all users
    }

    if (premiumFeatures.includes(feature)) {
      return subscribed && subscriptionTier === 'premium';
    }

    return false; // Unknown feature, default to disabled
  };

  // Check subscription when user changes or component mounts
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh subscription status every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, checkSubscription]);

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
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};