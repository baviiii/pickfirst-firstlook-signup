
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/layouts/AuthLayout';

const Pricing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkSubscription } = useSubscription();
  const { refetchProfile } = useAuth();
  
  // After returning from Stripe, refresh subscription and profile
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');
    if (success === 'true') {
      (async () => {
        await checkSubscription();
        await refetchProfile();
        // Optional: redirect users to dashboard after successful activation
        // navigate('/dashboard');
      })();
    }
    if (canceled === 'true') {
      // No-op: user canceled checkout
    }
  }, [location.search, checkSubscription, refetchProfile]);

  return (
    <AuthLayout>
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground hover:bg-card/80 border border-border"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SubscriptionPlans />
      </div>
    </AuthLayout>
  );
};

export default Pricing;
