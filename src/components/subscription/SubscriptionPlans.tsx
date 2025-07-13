
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type SubscriptionPlan = Tables<'subscription_plans'>;

export const SubscriptionPlans = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    
    if (error) {
      toast.error('Failed to load subscription plans');
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.name === 'Free') return 'Free';
    const price = isYearly ? plan.price_yearly : plan.price_monthly;
    return `$${price}${isYearly ? '/year' : '/month'}`;
  };

  const getFeatures = (plan: SubscriptionPlan) => {
    try {
      return Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as string);
    } catch {
      return [];
    }
  };

  const handleSubscribe = (planName: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }
    toast.info(`Subscription to ${planName} plan coming soon!`);
  };

  const isCurrentPlan = (planName: string) => {
    return profile?.subscription_tier === planName.toLowerCase();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader className="h-32 bg-white/5"></CardHeader>
            <CardContent className="h-64 bg-white/5"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 pickfirst-gradient-yellow-amber-text">Choose Your Plan</h2>
        <p className="text-gray-300 mb-6">
          Select the perfect plan for your real estate needs
        </p>
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={!isYearly ? 'font-semibold text-white' : 'text-gray-400'}>Monthly</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsYearly(!isYearly)}
            className="relative h-6 w-11 rounded-full p-0 bg-white/5 border border-pickfirst-yellow/30"
          >
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-pickfirst-yellow transition-transform ${
              isYearly ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </Button>
          <span className={isYearly ? 'font-semibold text-white' : 'text-gray-400'}>
            Yearly
            <Badge variant="secondary" className="ml-2 bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30">Save 17%</Badge>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all hover:shadow-lg bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl hover:shadow-pickfirst-yellow/20 hover:scale-105 ${
              plan.name === 'Premium' ? 'border-pickfirst-yellow shadow-pickfirst-yellow/30 scale-105' : ''
            }`}
          >
            {plan.name === 'Premium' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-pickfirst-yellow text-black border-0">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
              <div className="text-3xl font-bold pickfirst-gradient-yellow-amber-text">
                {getPrice(plan)}
              </div>
              <CardDescription className="min-h-[2.5rem] text-gray-300">
                {plan.name === 'Free' && 'Perfect for getting started'}
                {plan.name === 'Basic' && 'Great for individual agents'}
                {plan.name === 'Premium' && 'Best for growing teams'}
                {plan.name === 'Pro' && 'Enterprise-level features'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3 mb-6">
                {getFeatures(plan).map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-pickfirst-yellow mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full h-12 rounded-xl font-bold transition-all duration-300 ${
                  isCurrentPlan(plan.name) 
                    ? 'bg-white/10 text-gray-400 border border-white/20' 
                    : 'pickfirst-gradient-yellow-amber text-black hover:shadow-pickfirst-yellow/25'
                }`}
                onClick={() => handleSubscribe(plan.name)}
                disabled={isCurrentPlan(plan.name)}
              >
                {isCurrentPlan(plan.name) ? 'Current Plan' : 
                 plan.name === 'Free' ? 'Get Started' : 'Subscribe'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
