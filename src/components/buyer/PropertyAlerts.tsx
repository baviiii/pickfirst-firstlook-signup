import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  const { isFeatureEnabled } = useSubscription();
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
    if (!profile?.id) {
      toast.error('User profile not found');
      return;
    }
    
    setUpdating(true);
    try {
      const result = await BuyerProfileService.updateBuyerPreferences(profile.id, {
        property_alerts: enabled
      });
      
      if (result.success) {
        // Update preferences state, creating default preferences if they don't exist
        setPreferences(prev => prev ? 
          { ...prev, property_alerts: enabled } : 
          { 
            id: profile.id,
            user_id: profile.id,
            email_notifications: true,
            push_notifications: false,
            marketing_emails: false,
            property_alerts: enabled,
            agent_messages: true,
            appointment_reminders: true,
            new_listings: false,
            price_changes: false,
            market_updates: false,
            personalized_property_notifications: false,
            profile_visibility: 'private' as const,
            show_email: false,
            show_phone: false,
            show_location: false,
            show_activity_status: false,
            allow_marketing: false,
            preferred_contact_method: 'email' as const,
            budget_range: undefined,
            preferred_areas: undefined,
            property_type_preferences: undefined,
            // Buyer-specific fields
            min_budget: undefined,
            max_budget: undefined,
            preferred_bedrooms: undefined,
            preferred_bathrooms: undefined,
            preferred_square_feet_min: undefined,
            preferred_square_feet_max: undefined,
            preferred_lot_size_min: undefined,
            preferred_lot_size_max: undefined,
            preferred_year_built_min: undefined,
            preferred_year_built_max: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );
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

  // Property alerts are unlimited for all users
  // Only off-market alerts require premium subscription

  return (
    <div className={`space-y-6 ${className}`}>
        {/* Alert Settings */}
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5 text-primary" />
              Property Alert Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Get notified when new on-market properties match your preferences.
              <br />
              <span className="text-primary font-medium mt-1 inline-block">
                🔐 Premium subscribers get exclusive OFF-MARKET property alerts
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-card/80 border border-border/60">
              <div className="flex items-center gap-3">
                {preferences?.property_alerts ? (
                  <Bell className="h-5 w-5 text-green-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h4 className="text-foreground font-medium">On-Market Property Alerts</h4>
                  <p className="text-sm text-muted-foreground">
                    {preferences?.property_alerts 
                      ? 'You will receive email alerts for new on-market properties matching your criteria'
                      : 'Enable to receive alerts for new on-market properties'
                    }
                  </p>
                  <p className="text-xs text-primary/80 mt-1">
                    Premium members also receive exclusive off-market alerts
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
              <div className="p-4 rounded-lg bg-card/80 border border-border">
                <h5 className="text-foreground font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Your Alert Criteria
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {preferences.min_budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Min: {formatPrice(preferences.min_budget)}</span>
                    </div>
                  )}
                  {preferences.max_budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Max: {formatPrice(preferences.max_budget)}</span>
                    </div>
                  )}
                  {preferences.preferred_bedrooms && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-4 w-4" />
                      <span>{preferences.preferred_bedrooms}+ bedrooms</span>
                    </div>
                  )}
                  {preferences.preferred_bathrooms && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-4 w-4" />
                      <span>{preferences.preferred_bathrooms}+ bathrooms</span>
                    </div>
                  )}
                  {preferences.preferred_areas && preferences.preferred_areas.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
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
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              Recent Alerts
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your recent property alert notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertHistory.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No alerts sent yet</p>
                <p className="text-sm text-muted-foreground/80 mt-2">
                  You'll receive notifications when properties match your criteria
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertHistory.map((alert) => {
                  const isOffMarket = alert.alert_type === 'off_market';
                  return (
                    <div key={alert.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-medium">
                              {isOffMarket ? 'Off-Market Property Alert' : 'Property Alert'}
                            </h4>
                            {isOffMarket && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                🔐 Premium Exclusive
                              </Badge>
                            )}
                          </div>
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
                          <span className="text-gray-400">Type:</span>
                          <p className="text-white font-medium">
                            {isOffMarket ? 'Off-Market' : 'On-Market'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <p className="text-white font-medium capitalize">
                            {alert.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Property ID:</span>
                          <p className="text-white text-xs">
                            {alert.property_id.slice(0, 8)}...
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
};

export default PropertyAlerts;
