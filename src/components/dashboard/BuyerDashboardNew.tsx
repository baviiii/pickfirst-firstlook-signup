import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedPropertyRecommendations } from '@/components/buyer/PersonalizedPropertyRecommendations';
import { PropertyComparisonTool } from '@/components/property/PropertyComparisonTool';
import PropertyAlerts from '@/components/buyer/PropertyAlerts';
import { BuyerLayoutImproved as BuyerLayout } from '@/components/layouts/BuyerLayoutImproved';
import { NewUserSetupDialog } from '@/components/auth/NewUserSetupDialog';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useCardNotifications } from '@/hooks/useCardNotifications';
import { 
  MessageSquare, 
  Heart, 
  Filter, 
  Calendar, 
  Check, 
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { analyticsService, BuyerMetrics } from '@/services/analyticsService';
import { appointmentService } from '@/services/appointmentService';
import { messageService } from '@/services/messageService';
import PropertyAlertService, { PropertyAlert } from '@/services/propertyAlertService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AppointmentStatus = 'scheduled' | 'confirmed' | 'declined' | 'completed' | 'cancelled' | 'no_show';

function isValidAppointmentStatus(status: string): status is AppointmentStatus {
  return ['scheduled', 'confirmed', 'declined', 'completed', 'cancelled', 'no_show'].includes(status);
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  appointment_type?: string;
  property_address?: string;
  duration?: number;
  notes?: string;
  property?: {
    id: string;
    title: string;
    address: string;
  } | null;
  agent?: {
    id: string;
    full_name: string;
  } | null;
}

const BuyerDashboardNewComponent = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { cardCounts, hasNewNotification, clearCardNotifications } = useCardNotifications();
  
  // State management
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [metrics, setMetrics] = useState<BuyerMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // Fetch all data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listingsResult, metricsResult, appointmentsResult] = await Promise.all([
          PropertyService.getApprovedListings(),
          analyticsService.getBuyerMetrics(),
          appointmentService.getMyAppointments().then(result => ({
            ...result,
            data: (result.data || []).map(appt => ({
              ...appt,
              status: isValidAppointmentStatus(appt.status) ? appt.status : 'scheduled'
            }))
          }))
        ]);
        
        setListings(listingsResult.data || []);
        setMetrics(metricsResult.data);
        setAppointments(appointmentsResult.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoadingListings(false);
        setLoadingMetrics(false);
        setLoadingAppointments(false);
      }
    };
    
    fetchData();
  }, []);

  // Refresh appointments
  const refreshAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const { data } = await appointmentService.getMyAppointments();
      const validatedAppointments = (data || []).map(appt => ({
        ...appt,
        status: isValidAppointmentStatus(appt.status) ? appt.status : 'scheduled'
      }));
      setAppointments(validatedAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
      toast.error('Failed to refresh appointments');
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  // Handle appointment actions
  const handleConfirmAppointment = async (id: string) => {
    try {
      await appointmentService.updateAppointment(id, { status: 'confirmed' } as any);
      await refreshAppointments();
      toast.success('Appointment confirmed');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('Failed to confirm appointment');
    }
  };

  const handleDeclineAppointment = async (id: string) => {
    try {
      const result = await appointmentService.updateAppointment(id, { status: 'declined' } as any);
      if (result.error) {
        toast.error('Failed to decline appointment');
        return;
      }
      await refreshAppointments();
      toast.success('Appointment declined');
    } catch (error) {
      console.error('Error declining appointment:', error);
      toast.error('Failed to decline appointment');
    }
  };

  const getAppointmentStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: 'bg-yellow-600/20 text-yellow-800 border-yellow-600/40',
      confirmed: 'bg-green-600/20 text-green-800 border-green-600/40',
      declined: 'bg-red-600/20 text-red-800 border-red-600/40',
      completed: 'bg-purple-600/20 text-purple-800 border-purple-600/40',
      cancelled: 'bg-gray-600/20 text-gray-800 border-gray-600/40',
      no_show: 'bg-orange-600/20 text-orange-800 border-orange-600/40'
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  };

  return (
    <BuyerLayout>
      <NewUserSetupDialog />
      
      <div className="space-y-6">
        {/* Personalized Property Recommendations - Main Focus */}
        <div className="dashboard-animate-fade-scale dashboard-delay-0">
          <PersonalizedPropertyRecommendations />
        </div>
        
        {/* Upcoming Appointments */}
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-xl hover:shadow-2xl transition-all duration-300 dashboard-animate-fade-up dashboard-delay-200">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your scheduled property viewings
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                className="text-muted-foreground hover:text-foreground border-border hover:bg-muted transition-all duration-300"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-foreground font-medium">Loading appointments...</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <div className="text-foreground font-medium">No appointments scheduled yet</div>
                <div className="text-muted-foreground text-sm mt-1">Agents will schedule appointments with you here</div>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-border bg-card/80 hover:bg-card transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="uppercase text-xs bg-primary/10 text-primary border-primary/20">
                            {appt.appointment_type?.replace('_', ' ') || 'Meeting'}
                          </Badge>
                          <span className="font-semibold text-sm flex items-center gap-1 text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {appt.date} @ {appt.time}
                          </span>
                        </div>
                        {appt.property?.title && (
                          <div className="text-sm font-medium text-foreground">{appt.property.title}</div>
                        )}
                        {appt.agent && (
                          <div className="text-xs text-muted-foreground">
                            With: <span className="font-medium">{appt.agent.full_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {appt.status === 'scheduled' && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-300" 
                              onClick={() => handleConfirmAppointment(appt.id)}
                            >
                              <Check className="h-4 w-4 mr-1" /> Confirm
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-700 border-red-600/40 hover:bg-red-600/10 hover:border-red-600/60 transition-all duration-300" 
                              onClick={() => handleDeclineAppointment(appt.id)}
                            >
                              <X className="h-4 w-4 mr-1" /> Decline
                            </Button>
                          </>
                        )}
                        {appt.status && appt.status !== 'scheduled' && (
                          <Badge className={getAppointmentStatusBadge(appt.status)}>
                            {appt.status.charAt(0).toUpperCase() + appt.status.slice(1).replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Comparison Tool */}
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-xl hover:shadow-2xl transition-all duration-300 dashboard-animate-fade-scale dashboard-delay-300">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">Property Comparison Tool</CardTitle>
            <CardDescription className="text-muted-foreground">Compare properties side by side</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <PropertyComparisonTool />
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-xl hover:shadow-2xl transition-all duration-300 dashboard-animate-fade-scale dashboard-delay-400">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Property Alerts
            </CardTitle>
            <CardDescription className="text-muted-foreground">Get notified about new listings matching your criteria</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <PropertyAlerts />
          </CardContent>
        </Card>

        {/* Stats Overview - Moved to Bottom */}
        {/* Mobile Banner View */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="grid grid-cols-4 gap-1 p-2">
            {/* Inquiries */}
            <button
              onClick={() => { clearCardNotifications('inquiries'); navigate('/buyer-account-settings?tab=favorites'); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors relative"
            >
              <div className="relative">
                <MessageSquare className="h-5 w-5 text-primary" />
                {cardCounts.inquiries > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {cardCounts.inquiries > 9 ? '9+' : cardCounts.inquiries}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground mt-1">Inquiries</span>
              <span className="text-xs font-bold text-primary">{loadingMetrics ? '...' : metrics?.totalInquiries || 0}</span>
            </button>

            {/* Saved Properties */}
            <button
              onClick={() => { clearCardNotifications('favorites'); navigate('/saved-properties'); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors relative"
            >
              <div className="relative">
                <Heart className="h-5 w-5 text-primary" />
                {cardCounts.favorites > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {cardCounts.favorites > 9 ? '9+' : cardCounts.favorites}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground mt-1">Saved</span>
              <span className="text-xs font-bold text-primary">{loadingMetrics ? '...' : metrics?.totalFavorites || 0}</span>
            </button>

            {/* Saved Searches */}
            <button
              onClick={() => { clearCardNotifications('alerts'); navigate('/search-filters'); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors relative"
            >
              <div className="relative">
                <Filter className="h-5 w-5 text-primary" />
                {cardCounts.alerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {cardCounts.alerts > 9 ? '9+' : cardCounts.alerts}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground mt-1">Searches</span>
              <span className="text-xs font-bold text-primary">{loadingMetrics ? '...' : metrics?.savedSearches || 0}</span>
            </button>

            {/* Conversations */}
            <button
              onClick={() => { clearCardNotifications('messages'); navigate('/buyer-messages'); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 transition-colors relative"
            >
              <div className="relative">
                <MessageSquare className="h-5 w-5 text-primary" />
                {cardCounts.messages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {cardCounts.messages > 9 ? '9+' : cardCounts.messages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-foreground mt-1">Messages</span>
              <span className="text-xs font-bold text-primary">{loadingMetrics ? '...' : metrics?.totalConversations || 0}</span>
            </button>
          </div>
        </div>

        {/* Desktop Full Cards View */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inquiries Card */}
          <Card 
            className={`relative bg-white text-card-foreground border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 dashboard-animate-fade-up dashboard-delay-600 overflow-hidden ${
              hasNewNotification('inquiries') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('inquiries'); navigate('/buyer-account-settings?tab=favorites'); }}
          >
            {/* Yellow Overlay */}
            <div className="absolute inset-0 bg-pickfirst-yellow/5 pointer-events-none"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Inquiries Sent</p>
                  <p className="text-4xl font-bold text-foreground">{loadingMetrics ? '...' : metrics?.totalInquiries || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  <MessageSquare className="h-12 w-12 text-primary relative" />
                  {cardCounts.inquiries > 0 && (
                    <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold shadow-lg ${
                      hasNewNotification('inquiries') ? 'animate-bounce' : ''
                    }`}>
                      {cardCounts.inquiries > 99 ? '99+' : cardCounts.inquiries}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Properties Card */}
          <Card 
            className={`relative bg-white text-card-foreground border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 dashboard-animate-fade-up dashboard-delay-650 overflow-hidden ${
              hasNewNotification('favorites') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('favorites'); navigate('/saved-properties'); }}
          >
            {/* Yellow Overlay */}
            <div className="absolute inset-0 bg-pickfirst-yellow/5 pointer-events-none"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Saved Properties</p>
                  <p className="text-4xl font-bold text-foreground">{loadingMetrics ? '...' : metrics?.totalFavorites || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  <Heart className="h-12 w-12 text-primary relative" />
                  {cardCounts.favorites > 0 && (
                    <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold shadow-lg ${
                      hasNewNotification('favorites') ? 'animate-bounce' : ''
                    }`}>
                      {cardCounts.favorites > 99 ? '99+' : cardCounts.favorites}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Searches Card */}
          <Card 
            className={`relative bg-white text-card-foreground border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 dashboard-animate-fade-up dashboard-delay-700 overflow-hidden ${
              hasNewNotification('alerts') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('alerts'); navigate('/search-filters'); }}
          >
            {/* Yellow Overlay */}
            <div className="absolute inset-0 bg-pickfirst-yellow/5 pointer-events-none"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Saved Searches</p>
                  <p className="text-4xl font-bold text-foreground">{loadingMetrics ? '...' : metrics?.savedSearches || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  <Filter className="h-12 w-12 text-primary relative" />
                  {cardCounts.alerts > 0 && (
                    <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold shadow-lg ${
                      hasNewNotification('alerts') ? 'animate-bounce' : ''
                    }`}>
                      {cardCounts.alerts > 99 ? '99+' : cardCounts.alerts}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversations Card */}
          <Card 
            className={`relative bg-white text-card-foreground border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 dashboard-animate-fade-up dashboard-delay-750 overflow-hidden ${
              hasNewNotification('messages') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('messages'); navigate('/buyer-messages'); }}
          >
            {/* Yellow Overlay */}
            <div className="absolute inset-0 bg-pickfirst-yellow/5 pointer-events-none"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Conversations</p>
                  <p className="text-4xl font-bold text-foreground">{loadingMetrics ? '...' : metrics?.totalConversations || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                  <MessageSquare className="h-12 w-12 text-primary relative" />
                  {cardCounts.messages > 0 && (
                    <span className={`absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 bg-red-600 rounded-full text-xs flex items-center justify-center text-white font-bold shadow-lg ${
                      hasNewNotification('messages') ? 'animate-bounce' : ''
                    }`}>
                      {cardCounts.messages > 99 ? '99+' : cardCounts.messages}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Spacer for mobile banner */}
        <div className="md:hidden h-20"></div>
      </div>
    </BuyerLayout>
  );
};

// Export with error boundary
export const BuyerDashboardNew = withErrorBoundary(BuyerDashboardNewComponent);