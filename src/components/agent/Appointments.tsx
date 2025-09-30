import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, User, Phone, Plus, Search, Filter, ChevronRight, Edit3, MessageSquare, Undo2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppointmentForm } from './AppointmentForm';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { appointmentService } from '@/services/appointmentService';


interface Appointment {
  id: string;
  agent_id: string;
  client_id?: string;
  inquiry_id?: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  property_address: string;
  appointment_type: 'property_showing' | 'consultation' | 'contract_review' | 'closing' | 'follow_up';
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  property_id?: string;
  created_at: string;
}

interface StatusChangeDialog {
  isOpen: boolean;
  appointmentId: string;
  newStatus: string;
  currentNotes: string;
}

interface EditNotesDialog {
  isOpen: boolean;
  appointmentId: string;
  currentNotes: string;
}

export const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState<StatusChangeDialog>({
    isOpen: false,
    appointmentId: '',
    newStatus: '',
    currentNotes: ''
  });
  const [editNotesDialog, setEditNotesDialog] = useState<EditNotesDialog>({
    isOpen: false,
    appointmentId: '',
    currentNotes: ''
  });
  const [updatingStatus, setUpdatingStatus] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch from the actual appointments table with proper joins
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients!appointments_client_id_fkey(name, email, phone),
          property_listings!appointments_property_id_fkey(title, address)
        `)
        .eq('agent_id', user.id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our interface
      const appointmentsData = (data || []).map(appointment => ({
        id: appointment.id,
        agent_id: appointment.agent_id,
        client_id: appointment.client_id,
        inquiry_id: appointment.inquiry_id,
        client_name: appointment.client_name || appointment.clients?.name || 'Unknown Client',
        client_phone: appointment.client_phone || appointment.clients?.phone || '',
        client_email: appointment.client_email || appointment.clients?.email || '',
        property_address: appointment.property_address || appointment.property_listings?.address || 'Virtual/Office Meeting',
        appointment_type: appointment.appointment_type as any,
        date: appointment.date,
        time: appointment.time,
        duration: appointment.duration,
        status: appointment.status as any,
        notes: appointment.notes || '',
        property_id: appointment.property_id,
        created_at: appointment.created_at
      }));

      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'no_show': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property_showing': return '🏠';
      case 'consultation': return '💬';
      case 'contract_review': return '📋';
      case 'closing': return '🔑';
      case 'follow_up': return '📞';
      default: return '📅';
    }
  };

  const formatAppointmentType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filterAppointments = () => {
    return appointments.filter(appointment => {
      const matchesSearch = appointment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           appointment.property_address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
      const matchesType = filterType === 'all' || appointment.appointment_type === filterType;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            matchesDate = appointmentDate.toDateString() === today.toDateString();
            break;
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            matchesDate = appointmentDate.toDateString() === tomorrow.toDateString();
            break;
          case 'this_week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            matchesDate = appointmentDate >= today && appointmentDate <= weekFromNow;
            break;
          case 'past':
            matchesDate = appointmentDate < today;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const filteredAppointments = filterAppointments();

  const openStatusChangeDialog = (appointmentId: string, newStatus: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    setStatusChangeDialog({
      isOpen: true,
      appointmentId,
      newStatus,
      currentNotes: appointment.notes
    });
  };

  const openEditNotesDialog = (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    setEditNotesDialog({
      isOpen: true,
      appointmentId,
      currentNotes: appointment.notes
    });
  };
  const handleStatusChange = async (appointmentId: string, newStatus: string, notes?: string) => {
    setUpdatingStatus(appointmentId);
    try {
      const updateData: any = { status: newStatus };
      if (notes !== undefined) {
        updateData.notes = notes;
      }
  
      // Use appointmentService instead of direct Supabase call
      const { error } = await appointmentService.updateAppointment(appointmentId, updateData);
  
      if (error) throw error;
  
      // Update local state immediately for better UX
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: newStatus as any, notes: notes !== undefined ? notes : apt.notes }
            : apt
        )
      );
  
      toast.success(`Appointment ${newStatus.replace('_', ' ')} - Email sent!`);
      
      // Close dialog
      setStatusChangeDialog({
        isOpen: false,
        appointmentId: '',
        newStatus: '',
        currentNotes: ''
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment status');
    } finally {
      setUpdatingStatus('');
    }
  };

  const handleNotesUpdate = async (appointmentId: string, newNotes: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ notes: newNotes })
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state immediately
      setAppointments(prevAppointments => 
        prevAppointments.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, notes: newNotes }
            : apt
        )
      );

      toast.success('Notes updated successfully');
      
      // Close dialog
      setEditNotesDialog({
        isOpen: false,
        appointmentId: '',
        currentNotes: ''
      });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const getStatusOptions = (currentStatus: string) => {
    const allStatuses = [
      { value: 'scheduled', label: 'Scheduled', icon: '📅' },
      { value: 'confirmed', label: 'Confirmed', icon: '✅' },
      { value: 'completed', label: 'Completed', icon: '🎉' },
      { value: 'cancelled', label: 'Cancelled', icon: '❌' },
      { value: 'no_show', label: 'No Show', icon: '👻' }
    ];
    
    return allStatuses.filter(status => status.value !== currentStatus);
  };

  const getUpcomingStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === today.toDateString() && apt.status !== 'cancelled';
    });
    
    const thisWeek = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return aptDate >= today && aptDate <= weekFromNow && apt.status !== 'cancelled';
    });
    
    return {
      today: todayAppointments.length,
      week: thisWeek.length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      pending: appointments.filter(apt => apt.status === 'scheduled').length
    };
  };

  const stats = getUpcomingStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading appointments...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowAppointmentForm(true)}
            className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-500">{stats.today}</div>
              <div className="text-xs md:text-sm text-gray-300">Today</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-500">{stats.week}</div>
              <div className="text-xs md:text-sm text-gray-300">This Week</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-500">{stats.confirmed}</div>
              <div className="text-xs md:text-sm text-gray-300">Confirmed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardContent className="p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <div className="text-xs md:text-sm text-gray-300">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by client or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="property_showing">Property Showing</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="contract_review">Contract Review</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const appointmentDate = new Date(appointment.date);
            const isToday = appointmentDate.toDateString() === new Date().toDateString();
            const isPast = appointmentDate < new Date();
            
            return (
              <Card 
                key={appointment.id} 
                className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border transition-all hover:shadow-lg hover:shadow-pickfirst-yellow/10 ${
                  isToday ? 'border-pickfirst-yellow/40' : 'border-pickfirst-yellow/20'
                }`}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col space-y-4">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{getTypeIcon(appointment.appointment_type)}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-white truncate">{appointment.client_name}</h3>
                          <p className="text-pickfirst-yellow font-medium text-sm">{formatAppointmentType(appointment.appointment_type)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <Badge className={`${getStatusColor(appointment.status)} border text-xs`}>
                          {appointment.status.replace('_', ' ')}
                        </Badge>
                        {updatingStatus === appointment.id && (
                          <div className="text-xs text-pickfirst-yellow animate-pulse">Updating...</div>
                        )}
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="truncate">{appointmentDate.toLocaleDateString()}</span>
                        {isToday && <Badge className="bg-blue-500/10 text-blue-500 text-xs ml-auto">Today</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{appointment.time} ({appointment.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="truncate">{appointment.client_phone}</span>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 break-words">{appointment.property_address}</span>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div className="text-sm text-gray-400 bg-white/5 p-3 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-white">Notes:</strong>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditNotesDialog(appointment.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="break-words">{appointment.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                      <div className="flex flex-wrap gap-2 flex-1">
                        {/* Quick Status Change Buttons */}
                        {appointment.status === 'scheduled' && (
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-yellow-400 mb-1">
                              ⏳ Waiting for client response
                            </div>
                            <Button
                              size="sm"
                              onClick={() => openStatusChangeDialog(appointment.id, 'confirmed')}
                              className="bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20 text-xs"
                              disabled={updatingStatus === appointment.id}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark as Confirmed
                            </Button>
                          </div>
                        )}
                        
                        {['scheduled', 'confirmed'].includes(appointment.status) && !isPast && (
                          <Button
                            size="sm"
                            onClick={() => openStatusChangeDialog(appointment.id, 'completed')}
                            className="bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 text-xs"
                            disabled={updatingStatus === appointment.id}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                        )}

                        {['scheduled', 'confirmed'].includes(appointment.status) && (
                          <Button
                            size="sm"
                            onClick={() => openStatusChangeDialog(appointment.id, 'cancelled')}
                            className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-xs"
                            disabled={updatingStatus === appointment.id}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}

                        {appointment.status === 'cancelled' && (
                          <Button
                            size="sm"
                            onClick={() => openStatusChangeDialog(appointment.id, 'scheduled')}
                            className="bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 text-xs"
                            disabled={updatingStatus === appointment.id}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Reschedule
                          </Button>
                        )}

                        {/* Add/Edit Notes Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditNotesDialog(appointment.id)}
                          className="text-gray-300 border-white/20 hover:bg-white/5 text-xs"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {appointment.notes ? 'Edit Notes' : 'Add Notes'}
                        </Button>
                      </div>

                      {/* Change Status Dropdown */}
                      <Select onValueChange={(value) => openStatusChangeDialog(appointment.id, value)}>
                        <SelectTrigger className="w-full sm:w-auto bg-white/5 border-white/20 text-white text-xs">
                          <SelectValue placeholder="Change Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {getStatusOptions(appointment.status).map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              <span className="flex items-center gap-2">
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No appointments found</h3>
              <p className="text-gray-400 mb-4">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all' || dateFilter !== 'all'
                  ? 'No appointments match your current filters.'
                  : 'You haven\'t scheduled any appointments yet.'}
              </p>
              {!searchTerm && filterStatus === 'all' && filterType === 'all' && dateFilter === 'all' && (
                <Button 
                  onClick={() => setShowAppointmentForm(true)}
                  className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Your First Appointment
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Change Dialog */}
        <Dialog open={statusChangeDialog.isOpen} onOpenChange={(open) => 
          !open && setStatusChangeDialog({ isOpen: false, appointmentId: '', newStatus: '', currentNotes: '' })
        }>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-pickfirst-yellow/20 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Change Appointment Status</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update the status to "{statusChangeDialog.newStatus.replace('_', ' ')}" and optionally add notes.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <Textarea
                  value={statusChangeDialog.currentNotes}
                  onChange={(e) => setStatusChangeDialog(prev => ({ ...prev, currentNotes: e.target.value }))}
                  placeholder="Add any additional notes about this status change..."
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusChangeDialog({ isOpen: false, appointmentId: '', newStatus: '', currentNotes: '' })}
                className="border-white/20 text-gray-300 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusChange(
                  statusChangeDialog.appointmentId, 
                  statusChangeDialog.newStatus,
                  statusChangeDialog.currentNotes
                )}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
                disabled={updatingStatus === statusChangeDialog.appointmentId}
              >
                {updatingStatus === statusChangeDialog.appointmentId ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Notes Dialog */}
        <Dialog open={editNotesDialog.isOpen} onOpenChange={(open) =>
          !open && setEditNotesDialog({ isOpen: false, appointmentId: '', currentNotes: '' })
        }>
          <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-pickfirst-yellow/20 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Appointment Notes</DialogTitle>
              <DialogDescription className="text-gray-400">
                Add or update notes for this appointment.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <Textarea
                  value={editNotesDialog.currentNotes}
                  onChange={(e) => setEditNotesDialog(prev => ({ ...prev, currentNotes: e.target.value }))}
                  placeholder="Enter your notes here..."
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditNotesDialog({ isOpen: false, appointmentId: '', currentNotes: '' })}
                className="border-white/20 text-gray-300 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleNotesUpdate(editNotesDialog.appointmentId, editNotesDialog.currentNotes)}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
              >
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appointment Form */}
        <AppointmentForm
          isOpen={showAppointmentForm}
          onClose={() => setShowAppointmentForm(false)}
          onSuccess={() => {
            fetchAppointments();
            setShowAppointmentForm(false);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};