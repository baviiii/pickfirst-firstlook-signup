import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface CalendarIntegration {
  id: string;
  provider: 'google' | 'outlook' | 'apple';
  calendar_name: string;
  is_active: boolean;
  created_at: string;
}

const providerConfig = {
  google: {
    name: 'Google Calendar',
    color: 'bg-blue-500',
    icon: '📅',
    description: 'Sync appointments with your Google Calendar'
  },
  outlook: {
    name: 'Outlook Calendar',
    color: 'bg-blue-600',
    icon: '📧',
    description: 'Sync appointments with your Outlook Calendar'
  },
  apple: {
    name: 'Apple Calendar',
    color: 'bg-gray-600',
    icon: '🍎',
    description: 'Download ICS files for Apple Calendar'
  }
};

export const CalendarIntegration = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('id, provider, calendar_name, is_active, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching calendar integrations:', error);
      toast.error('Failed to load calendar integrations');
    } finally {
      setLoading(false);
    }
  };

  const connectCalendar = async (provider: 'google' | 'outlook' | 'apple') => {
    if (!user) return;

    setConnecting(provider);
    try {
      if (provider === 'apple') {
        // For Apple Calendar, we'll just show instructions
        toast.info('Apple Calendar integration will generate downloadable ICS files for your appointments');
        setConnecting(null);
        return;
      }

      // For Google and Outlook, redirect to OAuth flow
      const { data, error } = await supabase.functions.invoke(`${provider}-oauth`, {
        body: {
          userId: user.id,
          redirectUrl: window.location.origin + '/dashboard'
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error(`Error connecting ${provider} calendar:`, error);
      toast.error(`Failed to connect ${provider} calendar`);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectCalendar = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast.success('Calendar disconnected successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    }
  };

  const toggleIntegration = async (integrationId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ is_active: !isActive })
        .eq('id', integrationId);

      if (error) throw error;

      toast.success(`Calendar ${!isActive ? 'enabled' : 'disabled'} successfully`);
      fetchIntegrations();
    } catch (error) {
      console.error('Error toggling calendar integration:', error);
      toast.error('Failed to update calendar settings');
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardHeader>
          <CardTitle className="text-white">Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-300">Loading calendar integrations...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-pickfirst-yellow" />
            Calendar Integration
          </CardTitle>
          <CardDescription className="text-gray-300">
            Connect your calendar to automatically sync appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-medium">Connected Calendars</h3>
              {integrations.map((integration) => {
                const config = providerConfig[integration.provider];
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-white text-lg`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="text-white font-medium">{config.name}</div>
                        <div className="text-sm text-gray-400">{integration.calendar_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={integration.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}
                      >
                        {integration.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleIntegration(integration.id, integration.is_active)}
                        className="text-gray-300 border-white/20 hover:bg-white/5"
                      >
                        {integration.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectCalendar(integration.id)}
                        className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available Integrations */}
          <div className="space-y-3">
            <h3 className="text-white font-medium">Available Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(providerConfig).map(([provider, config]) => {
                const isConnected = integrations.some(i => i.provider === provider);
                const isConnecting = connecting === provider;
                
                return (
                  <div
                    key={provider}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center text-white text-sm`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="text-white font-medium text-sm">{config.name}</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{config.description}</p>
                    <Button
                      onClick={() => connectCalendar(provider as any)}
                      disabled={isConnected || isConnecting}
                      className="w-full bg-pickfirst-yellow text-black hover:bg-pickfirst-amber text-xs"
                      size="sm"
                    >
                      {isConnecting ? (
                        'Connecting...'
                      ) : isConnected ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 rounded-lg bg-pickfirst-yellow/10 border border-pickfirst-yellow/20">
            <h4 className="text-pickfirst-yellow font-medium mb-2">How it works:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Connect your calendar to automatically sync new appointments</li>
              <li>• Appointments will appear in your calendar with all details</li>
              <li>• Both you and your clients will receive email confirmations</li>
              <li>• You can enable/disable integrations at any time</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};
