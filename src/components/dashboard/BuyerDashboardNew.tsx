import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PersonalizedPropertyRecommendations } from '@/components/buyer/PersonalizedPropertyRecommendations';
import { PropertyComparisonTool } from '@/components/property/PropertyComparisonTool';
import PropertyAlerts from '@/components/buyer/PropertyAlerts';
import { BuyerLayout } from '@/components/layouts/BuyerLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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

  // Show welcome toast on mount
  useEffect(() => {
    const firstName = profile?.full_name?.split(' ')[0] || 'Buyer';
    toast.success(`Welcome back, ${firstName}! 👋`, {
      description: "Ready to find your dream home?",
      duration: 3000,
    });
  }, [profile]);

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
      scheduled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
      declined: 'bg-red-500/20 text-red-300 border-red-500/30',
      completed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      cancelled: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      no_show: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
  };

  return (
    <BuyerLayout>
      <div className="space-y-4 sm:space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
              onClick={() => navigate('/buyer-account-settings?tab=favorites')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Inquiries Sent</p>
                    <p className="text-3xl font-bold text-blue-400">{loadingMetrics ? '...' : metrics?.totalInquiries || 0}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
              onClick={() => navigate('/saved-properties')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Saved Properties</p>
                    <p className="text-3xl font-bold text-red-400">{loadingMetrics ? '...' : metrics?.totalFavorites || 0}</p>
                  </div>
                  <Heart className="h-10 w-10 text-red-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer"
              onClick={() => navigate('/search-filters')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Saved Searches</p>
                    <p className="text-3xl font-bold text-green-400">{loadingMetrics ? '...' : metrics?.savedSearches || 0}</p>
                  </div>
                  <Filter className="h-10 w-10 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
              onClick={() => navigate('/buyer-messages')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversations</p>
                    <p className="text-3xl font-bold text-purple-400">{loadingMetrics ? '...' : metrics?.totalConversations || 0}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-purple-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personalized Property Recommendations */}
          <PersonalizedPropertyRecommendations />

          {/* Recent Appointments */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-pickfirst-yellow" />
                    Upcoming Appointments
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Your scheduled property viewings
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/buyer-account-settings?tab=appointments')}
                  className="text-gray-300 hover:text-pickfirst-yellow border-pickfirst-yellow/30"
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
                  <span className="ml-3 text-gray-300">Loading appointments...</span>
                </div>
              ) : appointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400">No appointments scheduled yet</div>
                  <div className="text-gray-500 text-sm mt-1">Agents will schedule appointments with you here</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 3).map((appt) => (
                    <div key={appt.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="uppercase text-xs">
                              {appt.appointment_type?.replace('_', ' ') || 'Meeting'}
                            </Badge>
                            <span className="text-white font-medium text-sm flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {appt.date} @ {appt.time}
                            </span>
                          </div>
                          {appt.property?.title && (
                            <div className="text-gray-300 text-sm">{appt.property.title}</div>
                          )}
                          {appt.agent && (
                            <div className="text-gray-400 text-xs">
                              With: {appt.agent.full_name}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {appt.status === 'scheduled' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500/20 text-green-300 hover:bg-green-500/30" 
                                onClick={() => handleConfirmAppointment(appt.id)}
                              >
                                <Check className="h-4 w-4 mr-1" /> Confirm
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-300 border-red-400/30 hover:bg-red-500/10" 
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
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white">Property Comparison Tool</CardTitle>
              <CardDescription className="text-gray-300">Compare properties side by side</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyComparisonTool />
            </CardContent>
          </Card>

          {/* Property Alerts */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-pickfirst-yellow" />
                Property Alerts
              </CardTitle>
              <CardDescription className="text-gray-300">Get notified about new listings matching your criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyAlerts />
            </CardContent>
          </Card>
        </div>
      </BuyerLayout>
  );
};

// Export with error boundary
export const BuyerDashboardNew = withErrorBoundary(BuyerDashboardNewComponent);
