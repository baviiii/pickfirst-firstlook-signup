import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Phone, Plus, Search, Filter, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  property_address: string;
  appointment_type: 'property_showing' | 'consultation' | 'contract_review' | 'closing' | 'follow_up';
  date: string;
  time: string;
  duration: number; // minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string;
  property_id?: string;
  created_at: string;
}

export const Appointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      client_name: 'Sarah Johnson',
      client_phone: '(555) 123-4567',
      property_address: '123 Oak Street, Downtown',
      appointment_type: 'property_showing',
      date: '2024-01-26',
      time: '10:00',
      duration: 60,
      status: 'confirmed',
      notes: 'First showing for this client. Interested in move-in ready homes.',
      created_at: '2024-01-24'
    },
    {
      id: '2',
      client_name: 'Mike & Lisa Chen',
      client_phone: '(555) 987-6543',
      property_address: '456 Pine Avenue, West End',
      appointment_type: 'consultation',
      date: '2024-01-26',
      time: '14:30',
      duration: 90,
      status: 'scheduled',
      notes: 'Initial consultation for first-time buyers. Need to discuss pre-approval process.',
      created_at: '2024-01-25'
    },
    {
      id: '3',
      client_name: 'Robert Davis',
      client_phone: '(555) 456-7890',
      property_address: '789 Maple Drive, South Side',
      appointment_type: 'contract_review',
      date: '2024-01-26',
      time: '16:00',
      duration: 45,
      status: 'confirmed',
      notes: 'Final contract review before closing. All contingencies have been met.',
      created_at: '2024-01-23'
    },
    {
      id: '4',
      client_name: 'Jennifer Williams',
      client_phone: '(555) 321-9876',
      property_address: '321 Elm Street, Midtown',
      appointment_type: 'property_showing',
      date: '2024-01-27',
      time: '11:00',
      duration: 60,
      status: 'scheduled',
      notes: 'Second showing. Client is very interested, may make an offer.',
      created_at: '2024-01-25'
    },
    {
      id: '5',
      client_name: 'David Thompson',
      client_phone: '(555) 654-3210',
      property_address: 'Office - Virtual Meeting',
      appointment_type: 'follow_up',
      date: '2024-01-25',
      time: '15:00',
      duration: 30,
      status: 'completed',
      notes: 'Follow-up call to discuss financing options. Needs to improve credit score.',
      created_at: '2024-01-22'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-500';
      case 'scheduled': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-purple-500/10 text-purple-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      case 'no_show': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-gray-500';
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

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    setAppointments(appointments.map(apt => 
      apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
    ));
    toast.success('Appointment status updated');
  };

  const getUpcomingStats = () => {
    const today = new Date();
    const todayAppointments = appointments.filter(apt => 
      apt.date === today.toISOString().split('T')[0] && apt.status !== 'cancelled'
    );
    
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

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.today}</div>
            <div className="text-sm text-gray-300">Today</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.week}</div>
            <div className="text-sm text-gray-300">This Week</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.confirmed}</div>
            <div className="text-sm text-gray-300">Confirmed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <div className="text-sm text-gray-300">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getTypeIcon(appointment.appointment_type)}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{appointment.client_name}</h3>
                          <p className="text-pickfirst-yellow font-medium">{formatAppointmentType(appointment.appointment_type)}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span>{appointmentDate.toLocaleDateString()}</span>
                        {isToday && <Badge className="bg-blue-500/10 text-blue-500 text-xs">Today</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>{appointment.time} ({appointment.duration} min)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="h-4 w-4 text-purple-500" />
                        <span>{appointment.client_phone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-orange-500 mt-0.5" />
                      <span className="text-gray-300">{appointment.property_address}</span>
                    </div>

                    {appointment.notes && (
                      <div className="text-sm text-gray-400 bg-white/5 p-3 rounded">
                        <strong className="text-white">Notes:</strong> {appointment.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col lg:flex-row gap-2 lg:min-w-[200px]">
                    {appointment.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                        className="bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                      >
                        Confirm
                      </Button>
                    )}
                    
                    {['scheduled', 'confirmed'].includes(appointment.status) && !isPast && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, 'completed')}
                        className="bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20"
                      >
                        Mark Complete
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-300 border-white/20 hover:bg-white/5"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
              <Button className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Your First Appointment
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};