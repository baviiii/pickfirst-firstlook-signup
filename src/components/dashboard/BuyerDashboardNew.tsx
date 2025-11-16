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
        {/* Stats Overview - Elegant Beige/Yellow System Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Inquiries Card */}
          <Card 
            className={`bg-gradient-to-br from-yellow-600/15 via-amber-500/10 to-orange-400/10 backdrop-blur-sm border-yellow-700/30 hover:border-yellow-600/50 hover:shadow-xl hover:shadow-yellow-600/20 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
              hasNewNotification('inquiries') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('inquiries'); navigate('/buyer-account-settings?tab=favorites'); }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-900/70 mb-1">Inquiries Sent</p>
                  <p className="text-4xl font-bold text-yellow-900">{loadingMetrics ? '...' : metrics?.totalInquiries || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-600/20 rounded-full blur-xl"></div>
                  <MessageSquare className="h-12 w-12 text-yellow-700 relative" />
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
            className={`bg-gradient-to-br from-amber-600/15 via-yellow-500/10 to-orange-500/10 backdrop-blur-sm border-amber-700/30 hover:border-amber-600/50 hover:shadow-xl hover:shadow-amber-600/20 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
              hasNewNotification('favorites') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('favorites'); navigate('/saved-properties'); }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-900/70 mb-1">Saved Properties</p>
                  <p className="text-4xl font-bold text-amber-900">{loadingMetrics ? '...' : metrics?.totalFavorites || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-600/20 rounded-full blur-xl"></div>
                  <Heart className="h-12 w-12 text-amber-700 relative" />
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
            className={`bg-gradient-to-br from-yellow-500/15 via-amber-600/10 to-orange-600/10 backdrop-blur-sm border-yellow-600/30 hover:border-yellow-700/50 hover:shadow-xl hover:shadow-yellow-700/20 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
              hasNewNotification('alerts') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('alerts'); navigate('/search-filters'); }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-900/70 mb-1">Saved Searches</p>
                  <p className="text-4xl font-bold text-yellow-900">{loadingMetrics ? '...' : metrics?.savedSearches || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-600/20 rounded-full blur-xl"></div>
                  <Filter className="h-12 w-12 text-yellow-700 relative" />
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
            className={`bg-gradient-to-br from-orange-600/15 via-amber-500/10 to-yellow-500/10 backdrop-blur-sm border-orange-700/30 hover:border-orange-600/50 hover:shadow-xl hover:shadow-orange-600/20 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
              hasNewNotification('messages') ? 'animate-pulse-border' : ''
            }`}
            onClick={() => { clearCardNotifications('messages'); navigate('/buyer-messages'); }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900/70 mb-1">Conversations</p>
                  <p className="text-4xl font-bold text-orange-900">{loadingMetrics ? '...' : metrics?.totalConversations || 0}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-600/20 rounded-full blur-xl"></div>
                  <MessageSquare className="h-12 w-12 text-orange-700 relative" />
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

        {/* Personalized Property Recommendations */}
        <PersonalizedPropertyRecommendations />
        
        {/* Upcoming Appointments - Beautiful Beige Card */}
        <Card className="bg-gradient-to-br from-amber-50/80 via-yellow-50/70 to-orange-50/80 backdrop-blur-sm border-yellow-700/30 shadow-xl hover:shadow-2xl hover:shadow-yellow-600/20 transition-all duration-300">
          <CardHeader className="border-b border-yellow-700/20 bg-gradient-to-r from-yellow-600/10 to-amber-500/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-yellow-900">
                  <Calendar className="h-5 w-5 text-yellow-700" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription className="text-amber-800/70">
                  Your scheduled property viewings
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                className="text-yellow-900 hover:text-yellow-700 border-yellow-700/40 hover:bg-yellow-600/10 hover:border-yellow-600/60 transition-all duration-300"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-700"></div>
                <span className="ml-3 text-yellow-900 font-medium">Loading appointments...</span>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-yellow-700/50 mx-auto mb-3" />
                <div className="text-yellow-900 font-medium">No appointments scheduled yet</div>
                <div className="text-amber-800/70 text-sm mt-1">Agents will schedule appointments with you here</div>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-yellow-700/20 bg-white/60 hover:bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-yellow-600/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="uppercase text-xs bg-yellow-600/20 text-yellow-900 border-yellow-600/30">
                            {appt.appointment_type?.replace('_', ' ') || 'Meeting'}
                          </Badge>
                          <span className="font-semibold text-sm flex items-center gap-1 text-yellow-900">
                            <Clock className="h-3.5 w-3.5 text-yellow-700" />
                            {appt.date} @ {appt.time}
                          </span>
                        </div>
                        {appt.property?.title && (
                          <div className="text-sm font-medium text-amber-900">{appt.property.title}</div>
                        )}
                        {appt.agent && (
                          <div className="text-xs text-amber-800/70">
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
        <Card className="bg-gradient-to-br from-amber-50/80 via-yellow-50/70 to-orange-50/80 backdrop-blur-sm border-yellow-700/30 shadow-xl hover:shadow-2xl hover:shadow-yellow-600/20 transition-all duration-300">
          <CardHeader className="border-b border-yellow-700/20 bg-gradient-to-r from-yellow-600/10 to-amber-500/10">
            <CardTitle className="text-yellow-900">Property Comparison Tool</CardTitle>
            <CardDescription className="text-amber-800/70">Compare properties side by side</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <PropertyComparisonTool />
          </CardContent>
        </Card>

        {/* Property Alerts */}
        <Card className="bg-gradient-to-br from-amber-50/80 via-yellow-50/70 to-orange-50/80 backdrop-blur-sm border-yellow-700/30 shadow-xl hover:shadow-2xl hover:shadow-yellow-600/20 transition-all duration-300">
          <CardHeader className="border-b border-yellow-700/20 bg-gradient-to-r from-yellow-600/10 to-amber-500/10">
            <CardTitle className="text-yellow-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-700" />
              Property Alerts
            </CardTitle>
            <CardDescription className="text-amber-800/70">Get notified about new listings matching your criteria</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <PropertyAlerts />
          </CardContent>
        </Card>
      </div>
    </BuyerLayout>
  );
};

// Export with error boundary
export const BuyerDashboardNew = withErrorBoundary(BuyerDashboardNewComponent);