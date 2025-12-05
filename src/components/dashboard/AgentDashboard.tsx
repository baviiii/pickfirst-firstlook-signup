import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AgentLayoutSidebar } from '@/components/layouts/AgentLayoutSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Home, Users, MessageSquare, Settings, PlusCircle, BarChart3, Calendar, Phone, FileText, Edit3, Trash2, Eye, UserPlus, Mail, Clock, MapPin, User, Mail as MailIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PropertyListingModal } from '@/components/property/PropertyListingModal';
import { analyticsService, AgentMetrics } from '@/services/analyticsService';
import { AgentSpecialtyManager } from '@/components/agent/AgentSpecialtyManager';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useCardNotifications } from '@/hooks/useCardNotifications';
import { appointmentService, AppointmentWithDetails } from '@/services/appointmentService';
import { format } from 'date-fns';

export const AgentDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const { cardCounts, hasNewNotification, clearCardNotifications } = useCardNotifications();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [loadingAppointmentDetails, setLoadingAppointmentDetails] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      const { data } = await analyticsService.getAgentMetrics();
      setMetrics(data);
      setLoadingMetrics(false);
    };
    fetchMetrics();

    // Check if URL hash indicates we should open the modal
    if (window.location.hash === '#add-listing') {
      setShowModal(true);
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Listen for custom event from sidebar
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('openAddListingModal', handleOpenModal);

    return () => {
      window.removeEventListener('openAddListingModal', handleOpenModal);
    };
  }, []);

  const handleListingCreated = () => {
    setShowModal(false);
  };

  const handleViewAppointmentDetails = async (appointmentId: string) => {
    setLoadingAppointmentDetails(true);
    setAppointmentModalOpen(true);
    
    try {
      // Fetch full appointment details with property and client info
      const { data: appointments } = await appointmentService.getMyAppointments();
      const appointment = appointments?.find(apt => apt.id === appointmentId);
      
      if (appointment) {
        setSelectedAppointment(appointment);
      } else {
        // Fallback: fetch from appointments table directly
        const { data: appointmentData } = await supabase
          .from('appointments')
          .select(`
            *,
            property:property_listings!appointments_property_id_fkey (
              id,
              title,
              address,
              city,
              state,
              price,
              images,
              property_type
            )
          `)
          .eq('id', appointmentId)
          .single();
        
        if (appointmentData) {
          setSelectedAppointment(appointmentData as AppointmentWithDetails);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error);
    } finally {
      setLoadingAppointmentDetails(false);
    }
  };

  const agentActions = [
    { icon: PlusCircle, label: 'Add New Listing', description: 'Create a new property listing', color: 'bg-green-500/10 text-green-500', onClick: () => setShowModal(true), cardType: null as any },
    { icon: Home, label: 'My Listings', description: 'Manage your properties', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/my-listings'), cardType: 'listings' as const },
    { icon: Users, label: 'My Clients', description: 'Manage client relationships', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/my-clients'), cardType: 'clients' as const },
    { icon: Calendar, label: 'Appointments', description: 'View scheduled showings', color: 'bg-orange-500/10 text-orange-500', onClick: () => navigate('/appointments'), cardType: 'appointments' as const },
    { icon: BarChart3, label: 'Analytics', description: 'View performance metrics', color: 'bg-indigo-500/10 text-indigo-500', onClick: () => navigate('/agent-analytics'), cardType: null as any },
    { icon: MessageSquare, label: 'Messages', description: 'Client communications', color: 'bg-pickfirst-yellow/10 text-pickfirst-yellow', onClick: () => { clearCardNotifications('messages'); navigate('/agent-messages'); }, cardType: 'messages' as const },
    { icon: Phone, label: 'Leads', description: 'Follow up with prospects', color: 'bg-pink-500/10 text-pink-500', onClick: () => { clearCardNotifications('leads'); navigate('/agent-leads'); }, cardType: 'leads' as const },
    { icon: Settings, label: 'Profile Settings', description: 'Update your profile', color: 'bg-gray-500/10 text-gray-500', onClick: () => navigate('/agent-profile'), cardType: null as any }
  ];

  return (
    <AgentLayoutSidebar>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 dashboard-animate-fade-up dashboard-delay-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, Agent {profile?.full_name?.split(' ')[0] || 'Smith'}!
          </h1>
          <p className="text-muted-foreground">Ready to help your clients find their dream home?</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <Badge className="bg-primary text-primary-foreground">Real Estate Agent</Badge>
        </div>
      </div>

      {/* Quick Actions Grid - Matching Buyer Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agentActions.map((action, index) => {
          const Icon = action.icon;
          const notificationCount = action.cardType ? cardCounts[action.cardType] || 0 : 0;
          const hasNew = action.cardType ? hasNewNotification(action.cardType) : false;
          const delays = ['dashboard-delay-0', 'dashboard-delay-50', 'dashboard-delay-100', 'dashboard-delay-150', 'dashboard-delay-200', 'dashboard-delay-250', 'dashboard-delay-300', 'dashboard-delay-350'];
          const delayClass = delays[Math.min(index, delays.length - 1)];
          
          return (
            <Card
              key={index}
              className={`hover:shadow-md transition-all cursor-pointer pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg hover:shadow-xl hover:scale-105 relative dashboard-animate-fade-up ${delayClass} ${
                hasNew ? 'animate-pulse-border' : ''
              }`}
              onClick={action.onClick}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${action.color} relative`}>
                    <Icon className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold ${
                        hasNew ? 'animate-bounce-scale' : ''
                      }`}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-sm text-foreground flex-1">{action.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs text-muted-foreground">
                  {action.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Property Listing Modal */}
      <PropertyListingModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        onSuccess={handleListingCreated} 
      />

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg dashboard-animate-fade-scale dashboard-delay-200">
          <CardHeader>
            <CardTitle className="text-foreground">This Month's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-bold text-green-600">
                  {loadingMetrics ? '...' : metrics?.activeListings || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Listings</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-600">
                  {loadingMetrics ? '...' : metrics?.totalListings || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Listings</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-600">
                  {loadingMetrics ? '...' : metrics?.totalClients || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Clients</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-600">
                  {loadingMetrics ? '...' : metrics?.totalAppointments || 0}
                </div>
                <div className="text-sm text-muted-foreground">Appointments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg dashboard-animate-fade-scale dashboard-delay-250">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingMetrics ? (
                <div className="text-muted-foreground">Loading activity...</div>
              ) : metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                metrics.recentActivity.map((activity) => {
                  // Parse user-friendly messages
                  const getActivityDetails = () => {
                    const action = activity.action.toUpperCase();
                    const table = activity.table_name;
                    
                    // Check for custom messages in details
                    if (activity.details) {
                      return {
                        message: activity.details,
                        icon: Eye,
                        color: 'text-blue-600'
                      };
                    }
                    
                    // Map technical actions to user-friendly messages
                    if (action === 'CREATE' || action === 'INSERT') {
                      if (table === 'property_listings') return { message: 'Added a new property listing', icon: PlusCircle, color: 'text-green-600' };
                      if (table === 'clients') return { message: 'Added a new client', icon: UserPlus, color: 'text-green-600' };
                      if (table === 'appointments') return { message: 'Scheduled a new appointment', icon: Calendar, color: 'text-green-600' };
                      if (table === 'messages') return { message: 'Sent a message', icon: Mail, color: 'text-green-600' };
                      return { message: `Created new ${table.replace('_', ' ')}`, icon: PlusCircle, color: 'text-green-600' };
                    }
                    
                    if (action === 'UPDATE') {
                      if (table === 'property_listings') return { message: 'Updated a property listing', icon: Edit3, color: 'text-blue-600' };
                      if (table === 'profiles') return { message: 'Updated profile information', icon: Edit3, color: 'text-blue-600' };
                      if (table === 'appointments') return { message: 'Modified an appointment', icon: Calendar, color: 'text-blue-600' };
                      if (table === 'clients') return { message: 'Updated client information', icon: Edit3, color: 'text-blue-600' };
                      return { message: `Updated ${table.replace('_', ' ')}`, icon: Edit3, color: 'text-blue-600' };
                    }
                    
                    if (action === 'DELETE') {
                      if (table === 'property_listings') return { message: 'Removed a property listing', icon: Trash2, color: 'text-red-600' };
                      if (table === 'clients') return { message: 'Removed a client', icon: Trash2, color: 'text-red-600' };
                      if (table === 'appointments') return { message: 'Cancelled an appointment', icon: Trash2, color: 'text-red-600' };
                      return { message: `Deleted ${table.replace('_', ' ')}`, icon: Trash2, color: 'text-red-600' };
                    }
                    
                    if (action === 'VIEW') {
                      if (table === 'property_listings') return { message: 'Viewed property listings', icon: Eye, color: 'text-purple-600' };
                      return { message: `Viewed ${table.replace('_', ' ')}`, icon: Eye, color: 'text-purple-600' };
                    }
                    
                    return { message: `${action.toLowerCase()} on ${table.replace('_', ' ')}`, icon: FileText, color: 'text-muted-foreground' };
                  };
                  
                  const { message, icon: Icon, color } = getActivityDetails();
                  const timeAgo = (() => {
                    const now = new Date();
                    const activityDate = new Date(activity.timestamp);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                    return activityDate.toLocaleDateString();
                  })();
                  
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors">
                      <div className={`p-2 rounded-lg bg-primary/10 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <div className="text-muted-foreground text-sm">No recent activity</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg dashboard-animate-fade-scale dashboard-delay-300">
          <CardHeader>
            <CardTitle className="text-foreground">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-2xl font-bold text-primary">
                  {loadingMetrics ? '...' : `$${(metrics?.monthlyRevenue || 0).toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-pickfirst-amber/10 border border-pickfirst-amber/20">
                <div className="text-xl font-bold text-pickfirst-amber">
                  {loadingMetrics ? '...' : `$${((metrics?.monthlyRevenue || 0) * 3).toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">This Quarter (Est.)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-lg dashboard-animate-fade-up dashboard-delay-300">
        <CardHeader>
          <CardTitle className="text-foreground text-base sm:text-lg truncate flex-1 min-w-0">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingMetrics ? (
              <div className="text-muted-foreground">Loading appointments...</div>
            ) : metrics?.upcomingAppointments && metrics.upcomingAppointments.length > 0 ? (
              metrics.upcomingAppointments.map((appointment: any, index: number) => (
                <div key={appointment?.id || `appt-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-lg bg-card/80 border border-border hover:bg-card transition-colors">
                  {/* Mobile: Time badge on top, Desktop: Time on left */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                    <div className="text-center sm:min-w-[80px]">
                      <div className="text-xs sm:text-sm font-bold text-primary">{appointment.time}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1 sm:hidden">
                        {appointment.date ? new Date(appointment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </div>
                    {appointment.id && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground border-border shrink-0 sm:hidden h-8 text-xs"
                        onClick={() => handleViewAppointmentDetails(appointment.id)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">{appointment.client_name || 'Unknown Client'}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                      {appointment.appointment_type ? appointment.appointment_type.replace('_', ' ') : 'Appointment'} - {appointment.property_address || 'Virtual/Office Meeting'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1 hidden sm:block">
                      {appointment.date ? new Date(appointment.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  {appointment.id && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-muted-foreground hover:text-foreground border-border shrink-0 hidden sm:inline-flex"
                      onClick={() => handleViewAppointmentDetails(appointment.id)}
                    >
                      View Details
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">No upcoming appointments</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Specialties */}
      <div className="dashboard-animate-fade-scale dashboard-delay-400">
        <AgentSpecialtyManager />
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen}>
        <DialogContent className="pickfirst-glass bg-card text-card-foreground border border-pickfirst-yellow/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Appointment Details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              View all information about this appointment
            </DialogDescription>
          </DialogHeader>
          
          {loadingAppointmentDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
            </div>
          ) : selectedAppointment ? (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  className={`${
                    selectedAppointment.status === 'confirmed' ? 'bg-green-500/20 text-green-600 border-green-500/30' :
                    selectedAppointment.status === 'scheduled' ? 'bg-blue-500/20 text-blue-600 border-blue-500/30' :
                    selectedAppointment.status === 'completed' ? 'bg-purple-500/20 text-purple-600 border-purple-500/30' :
                    selectedAppointment.status === 'cancelled' ? 'bg-red-500/20 text-red-600 border-red-500/30' :
                    'bg-gray-500/20 text-gray-600 border-gray-500/30'
                  }`}
                >
                  {selectedAppointment.status?.charAt(0).toUpperCase() + selectedAppointment.status?.slice(1).replace('_', ' ') || 'Scheduled'}
                </Badge>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card/80 border border-border">
                  <div className="p-2 rounded-lg bg-pickfirst-yellow/20">
                    <Calendar className="h-5 w-5 text-pickfirst-yellow" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">
                      {selectedAppointment.date ? format(new Date(selectedAppointment.date), 'EEEE, MMMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-card/80 border border-border">
                  <div className="p-2 rounded-lg bg-pickfirst-yellow/20">
                    <Clock className="h-5 w-5 text-pickfirst-yellow" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold text-foreground">
                      {selectedAppointment.time || 'N/A'}
                      {selectedAppointment.duration && ` (${selectedAppointment.duration} min)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Appointment Type */}
              <div className="p-4 rounded-lg bg-card/80 border border-border">
                <p className="text-sm text-muted-foreground mb-1">Appointment Type</p>
                <p className="font-semibold text-foreground capitalize">
                  {selectedAppointment.appointment_type?.replace('_', ' ') || 'N/A'}
                </p>
              </div>

              {/* Client Information */}
              <div className="p-4 rounded-lg bg-card/80 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-pickfirst-yellow" />
                  <h3 className="font-semibold text-foreground">Client Information</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium text-foreground">
                      {selectedAppointment.client_name || selectedAppointment.client?.name || 'N/A'}
                    </span>
                  </div>
                  {selectedAppointment.client_email && (
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${selectedAppointment.client_email}`}
                        className="text-sm text-pickfirst-yellow hover:underline"
                      >
                        {selectedAppointment.client_email}
                      </a>
                    </div>
                  )}
                  {selectedAppointment.client_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${selectedAppointment.client_phone}`}
                        className="text-sm text-pickfirst-yellow hover:underline"
                      >
                        {selectedAppointment.client_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Property Information */}
              {(selectedAppointment.property || selectedAppointment.property_address) && (
                <div className="p-4 rounded-lg bg-card/80 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-pickfirst-yellow" />
                    <h3 className="font-semibold text-foreground">Property Information</h3>
                  </div>
                  <div className="space-y-2">
                    {selectedAppointment.property?.title && (
                      <div>
                        <span className="text-sm text-muted-foreground">Title: </span>
                        <span className="text-sm font-medium text-foreground">
                          {selectedAppointment.property.title}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Address: </span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedAppointment.property?.address || selectedAppointment.property_address || 'N/A'}
                        {selectedAppointment.property?.city && `, ${selectedAppointment.property.city}`}
                        {selectedAppointment.property?.state && ` ${selectedAppointment.property.state}`}
                      </span>
                    </div>
                    {selectedAppointment.property?.price && (
                      <div>
                        <span className="text-sm text-muted-foreground">Price: </span>
                        <span className="text-sm font-medium text-foreground">
                          ${selectedAppointment.property.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedAppointment.property_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAppointmentModalOpen(false);
                          navigate(`/property/${selectedAppointment.property_id}`);
                        }}
                        className="mt-2"
                      >
                        View Property
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="p-4 rounded-lg bg-card/80 border border-border">
                  <h3 className="font-semibold text-foreground mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/appointments')}
                  className="flex-1"
                >
                  View All Appointments
                </Button>
                {selectedAppointment.property_id && (
                  <Button
                    onClick={() => {
                      setAppointmentModalOpen(false);
                      navigate(`/property/${selectedAppointment.property_id}`);
                    }}
                    className="flex-1 bg-pickfirst-yellow hover:bg-pickfirst-amber text-black"
                  >
                    View Property
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Unable to load appointment details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AgentLayoutSidebar>
  );
};