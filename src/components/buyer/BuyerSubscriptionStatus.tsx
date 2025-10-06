import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Crown, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const BuyerSubscriptionStatus = () => {
  const { profile } = useAuth();
  const { 
    subscribed, 
    subscriptionTier, 
    subscriptionEnd, 
    loading,
    openCustomerPortal 
  } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
            <span className="ml-3 text-gray-300">Loading subscription...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tier = profile?.subscription_tier || subscriptionTier || 'free';
  const isFree = tier === 'free' || !subscribed;

  return (
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-pickfirst-yellow" />
              Subscription Status
            </CardTitle>
            <CardDescription className="text-gray-300">
              Manage your subscription and billing
            </CardDescription>
          </div>
          {!isFree && (
            <Badge className="bg-pickfirst-yellow text-black flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-pickfirst-yellow/10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isFree ? 'bg-gray-500/20' : 'bg-pickfirst-yellow/20'}`}>
              <Crown className={`h-5 w-5 ${isFree ? 'text-gray-400' : 'text-pickfirst-yellow'}`} />
            </div>
            <div>
              <div className="text-sm text-gray-400">Current Plan</div>
              <div className="text-lg font-semibold text-white capitalize">
                {tier} {!isFree && 'Subscription'}
              </div>
            </div>
          </div>
          {!isFree && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Status</div>
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Subscription End Date (if applicable) */}
        {subscriptionEnd && !isFree && (
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-pickfirst-yellow/10">
            <Calendar className="h-5 w-5 text-pickfirst-yellow" />
            <div>
              <div className="text-sm text-gray-400">Next Billing Date</div>
              <div className="text-white font-medium">
                {format(new Date(subscriptionEnd), 'MMMM dd, yyyy')}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isFree ? (
            <Button
              onClick={() => navigate('/pricing')}
              className="flex-1 bg-pickfirst-yellow hover:bg-amber-500 text-black"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          ) : (
            <>
              <Button
                onClick={openCustomerPortal}
                className="flex-1 bg-pickfirst-yellow hover:bg-amber-500 text-black"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
              <Button
                onClick={openCustomerPortal}
                variant="outline"
                className="flex-1 text-red-400 border-red-400/40 hover:bg-red-400/10"
              >
                Cancel Subscription
              </Button>
            </>
          )}
        </div>

        {/* Info Box */}
        {isFree && (
          <div className="flex items-start gap-3 p-4 bg-pickfirst-yellow/10 rounded-lg border border-pickfirst-yellow/20">
            <AlertCircle className="h-5 w-5 text-pickfirst-yellow flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white mb-1">Unlock Premium Features</div>
              <div className="text-xs text-gray-300">
                Upgrade to access unlimited favorites, property alerts, advanced search filters, and priority support.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
