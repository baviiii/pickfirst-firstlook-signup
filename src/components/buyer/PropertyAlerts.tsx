import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FeatureGate } from '@/components/ui/FeatureGate';
import { Bell, BellOff, Settings, Mail, MapPin, Home, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import BuyerProfileService, { BuyerPreferences } from '@/services/buyerProfileService';
import PropertyAlertService, { PropertyAlert } from '@/services/propertyAlertService';
import { toast } from 'sonner';

interface PropertyAlertsProps {
  className?: string;
}

const PropertyAlerts: React.FC<PropertyAlertsProps> = ({ className }) => {
  const { profile } = useAuth();
  const { getPropertyAlertsLimit } = useSubscription();
  const [preferences, setPreferences] = useState<BuyerPreferences | null>(null);
  const [alertHistory, setAlertHistory] = useState<PropertyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const [prefs, history] = await Promise.all([
        BuyerProfileService.getBuyerPreferences(profile.id),
        PropertyAlertService.getBuyerAlertHistory(profile.id, 10)
      ]);
      
      setPreferences(prefs);
      setAlertHistory(history);
    } catch (error) {
      console.error('Error loading property alerts data:', error);
      toast.error('Failed to load property alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlerts = async (enabled: boolean) => {
    if (!profile?.id || !preferences) return;
    
    setUpdating(true);
    try {
      const result = await BuyerProfileService.updateBuyerPreferences(profile.id, {
        property_alerts: enabled
      });
      
      if (result.success) {
        setPreferences(prev => prev ? { ...prev, property_alerts: enabled } : null);
        toast.success(enabled ? 'Property alerts enabled' : 'Property alerts disabled');
      } else {
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating property alerts:', error);
      toast.error('Failed to update property alerts');
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500';
      case 'delivered': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Property Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertsLimit = getPropertyAlertsLimit();

  return (
    <FeatureGate feature="property_alerts_basic">
      <div className={`space-y-6 ${className}`}>
        {/* Alert Settings */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Property Alert Settings
            </CardTitle>
            <CardDescription className="text-gray-300">
              Get notified when new properties match your preferences
              {alertsLimit !== -1 && (
                <span className="ml-2 text-yellow-400">
                  (Limit: {alertsLimit} alerts)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50">
              <div className="flex items-center gap-3">
                {preferences?.property_alerts ? (
                  <Bell className="h-5 w-5 text-green-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h4 className="text-white font-medium">Property Alerts</h4>
                  <p className="text-sm text-gray-400">
                    {preferences?.property_alerts 
                      ? 'You will receive email notifications for matching properties'
                      : 'Enable to receive notifications for new matching properties'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.property_alerts || false}
                onCheckedChange={handleToggleAlerts}
                disabled={updating}
              />
            </div>

            {/* Current Preferences Summary */}
            {preferences?.property_alerts && (
              <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Your Alert Criteria
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {preferences.min_budget && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="h-4 w-4" />
                      <span>Min: {formatPrice(preferences.min_budget)}</span>
                    </div>
                  )}
                  {preferences.max_budget && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <DollarSign className="h-4 w-4" />
                      <span>Max: {formatPrice(preferences.max_budget)}</span>
                    </div>
                  )}
                  {preferences.preferred_bedrooms && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Home className="h-4 w-4" />
                      <span>{preferences.preferred_bedrooms}+ bedrooms</span>
                    </div>
                  )}
                  {preferences.preferred_bathrooms && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Home className="h-4 w-4" />
                      <span>{preferences.preferred_bathrooms}+ bathrooms</span>
                    </div>
                  )}
                  {preferences.preferred_areas && preferences.preferred_areas.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="h-4 w-4" />
                      <span>{preferences.preferred_areas.join(', ')}</span>
                    </div>
                  )}
                  {preferences.property_type_preferences && preferences.property_type_preferences.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Home className="h-4 w-4" />
                      <span>{preferences.property_type_preferences.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert History */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recent Alerts
            </CardTitle>
            <CardDescription className="text-gray-300">
              Your recent property alert notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertHistory.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No alerts sent yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  You'll receive notifications when properties match your criteria
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertHistory.map((alert) => (
                  <div key={alert.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                         <h4 className="text-white font-medium">
                           Property Alert
                         </h4>
                         <p className="text-sm text-gray-400 mt-1">
                           {formatDate(alert.sent_at)}
                         </p>
                       </div>
                       <Badge className={`${getStatusColor(alert.status)} text-white`}>
                         {alert.status}
                       </Badge>
                     </div>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                       <div>
                         <span className="text-gray-400">Status:</span>
                         <p className="text-white font-medium capitalize">
                           {alert.status}
                         </p>
                       </div>
                       <div>
                         <span className="text-gray-400">Property ID:</span>
                         <p className="text-white">
                           {alert.property_id}
                         </p>
                       </div>
                       <div>
                         <span className="text-gray-400">Template:</span>
                         <p className="text-white capitalize">
                           {alert.email_template}
                         </p>
                       </div>
                       <div>
                         <span className="text-gray-400">Sent:</span>
                         <p className="text-white">
                           {formatDate(alert.sent_at)}
                         </p>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
};

export default PropertyAlerts;
