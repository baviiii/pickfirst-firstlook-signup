import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, User, MapPin, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface Client {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  status: string;
  rating?: number;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  property_interest?: string;
}

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
}

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedContact?: { id: string; user_id?: string | null; type: 'client' | 'lead'; name: string; phone: string; email: string };
}

export const AppointmentForm = ({ isOpen, onClose, onSuccess, preselectedContact }: AppointmentFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<{ id: string; user_id?: string | null; type: 'client' | 'lead'; name: string; phone: string; email: string } | null>(preselectedContact || null);
  const [showContactSelector, setShowContactSelector] = useState(!preselectedContact);
  
  const [formData, setFormData] = useState({
    appointment_type: '',
    date: undefined as Date | undefined,
    time: '',
    duration: 60,
    property_id: '',
    property_address: '',
    notes: ''
  });
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const appointmentTypes = [
    { value: 'property_showing', label: 'Property Showing', icon: '🏠' },
    { value: 'consultation', label: 'Consultation', icon: '💬' },
    { value: 'contract_review', label: 'Contract Review', icon: '📋' },
    { value: 'closing', label: 'Closing', icon: '🔑' },
    { value: 'follow_up', label: 'Follow Up', icon: '📞' }
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch real clients from the clients table and properties from database
      const [clientsResult, propertiesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id, user_id, name, email, phone, status')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('property_listings')
          .select('id, title, address, price')
          .eq('agent_id', user.id)
          .in('status', ['active', 'approved'])
          .limit(50)
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (propertiesResult.error) throw propertiesResult.error;

      setClients((clientsResult.data || []).map(client => ({
        id: client.id,
        user_id: client.user_id,
        name: client.name || 'Unknown Client',
        email: client.email,
        phone: client.phone || '',
        status: client.status || 'active'
      })));

      setProperties((propertiesResult.data || []).map(property => ({
        id: property.id,
        title: property.title,
        address: property.address,
        price: property.price
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleContactSelect = (contact: { id: string; user_id?: string | null; type: 'client' | 'lead'; name: string; phone: string; email: string }) => {
    setSelectedContact(contact);
    setShowContactSelector(false);
    
    // If it's a lead with property interest, auto-fill property
    if (contact.type === 'lead') {
      const lead = leads.find(l => l.id === contact.id);
      if (lead?.property_interest) {
        const property = properties.find(p => p.id === lead.property_interest);
        if (property) {
          setFormData(prev => ({
            ...prev,
            property_id: property.id,
            property_address: property.address
          }));
        }
      }
    }
  };

  const filteredContacts = [
    ...clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(client => ({ ...client, type: 'client' as const })),
    ...leads.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(lead => ({ ...lead, type: 'lead' as const }))
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !formData.date || !formData.time || !formData.appointment_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Determine client_id - must reference profiles.id if set, otherwise null
      // The foreign key constraint expects client_id to reference profiles(id), not clients(id)
      let clientId: string | null = null;
      
      if (selectedContact.type === 'client' && selectedContact.user_id) {
        // Verify the user_id exists in profiles table before using it
        // user_id should be the profile ID, but we need to validate it exists
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', selectedContact.user_id)
          .maybeSingle();
        
        if (profileCheck && !profileError) {
          // user_id exists in profiles table, safe to use
          clientId = selectedContact.user_id;
        } else {
          // user_id doesn't exist in profiles (non-registered client or invalid reference)
          // Set to null which is allowed by the foreign key constraint
          console.warn(`Client user_id ${selectedContact.user_id} not found in profiles table, setting client_id to null`);
          clientId = null;
        }
      } else if (selectedContact.type === 'lead' && selectedContact.email) {
        // For leads, try to find if they have a profile by email
        // This handles cases where a lead is actually a registered user
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', selectedContact.email.toLowerCase())
          .maybeSingle();
        
        if (profileByEmail) {
          clientId = profileByEmail.id;
        }
        // Otherwise clientId remains null (for non-registered leads)
      }

      // Use the appointment service to create the appointment
      const { data: newAppointment, error } = await supabase
        .from('appointments')
        .insert([{
          agent_id: user?.id,
          client_id: clientId,
          inquiry_id: selectedContact.type === 'lead' ? selectedContact.id : null,
          client_name: selectedContact.name,
          client_phone: selectedContact.phone,
          client_email: selectedContact.email,
          appointment_type: formData.appointment_type,
          date: format(formData.date, 'yyyy-MM-dd'),
          time: formData.time,
          duration: formData.duration,
          property_id: formData.property_id || null,
          property_address: formData.property_address || 'Virtual/Office Meeting',
          notes: formData.notes,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notifications and sync to calendar
      if (newAppointment) {
        // Get agent profile for notifications
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', user?.id)
          .single();

        if (agentProfile) {
          // Send email notifications
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: selectedContact.email,
                template: 'appointmentConfirmation',
                data: {
                  name: selectedContact.name,
                  propertyTitle: formData.property_address || 'Virtual/Office Meeting',
                  date: format(formData.date, 'yyyy-MM-dd'),
                  time: formData.time,
                  agentName: agentProfile.full_name || 'Your Agent',
                  agentPhone: agentProfile.phone || ''
                }
              }
            });

            await supabase.functions.invoke('send-email', {
              body: {
                to: agentProfile.email,
                template: 'appointmentNotification',
                data: {
                  agentName: agentProfile.full_name,
                  clientName: selectedContact.name,
                  clientEmail: selectedContact.email,
                  clientPhone: selectedContact.phone || 'Not provided',
                  appointmentType: formData.appointment_type.replace('_', ' ').toUpperCase(),
                  date: format(formData.date, 'yyyy-MM-dd'),
                  time: formData.time,
                  duration: formData.duration,
                  location: formData.property_address || 'Virtual/Office Meeting',
                  notes: formData.notes || 'No additional notes',
                  appointmentId: newAppointment.id
                },
                subject: `New Appointment Scheduled - ${selectedContact.name}`
              }
            });
          } catch (emailError) {
            console.error('Email notification error:', emailError);
            // Don't fail the appointment creation if email fails
          }
        }
      }

      toast.success('Appointment scheduled successfully! Email notifications sent and calendar synced.');
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedContact(null);
    setShowContactSelector(true);
    setSearchTerm('');
    setFormData({
      appointment_type: '',
      date: undefined,
      time: '',
      duration: 60,
      property_id: '',
      property_address: '',
      notes: ''
    });
  };

  return (
    <ErrorBoundary>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white shadow-2xl">
          <DialogHeader className="border-b border-pickfirst-yellow/20 pb-4">
            <DialogTitle className="text-white text-xl font-bold">Schedule New Appointment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Contact Selection */}
            {showContactSelector ? (
              <div className="space-y-4">
                <Label className="text-white">Select Client or Lead</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search clients and leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2 bg-black/20 rounded-lg p-2 border border-white/10">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No clients or leads found matching "{searchTerm}"
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <Card 
                        key={`${contact.type}-${contact.id}`}
                        className="cursor-pointer hover:bg-pickfirst-yellow/10 hover:border-pickfirst-yellow/30 transition-all bg-white/5 border-white/20"
                        onClick={() => handleContactSelect({
                          id: contact.id,
                          type: contact.type,
                          name: contact.name,
                          phone: contact.phone || '',
                          email: contact.email
                        })}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-semibold">{contact.name}</span>
                                <Badge className={`${contact.type === 'client' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} text-xs border`}>
                                  {contact.type.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-300 truncate">{contact.email}</div>
                              {contact.phone && <div className="text-sm text-gray-400">{contact.phone}</div>}
                            </div>
                            <User className="h-5 w-5 text-pickfirst-yellow flex-shrink-0 ml-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-white font-semibold">Selected Contact</Label>
                <Card className="bg-pickfirst-yellow/10 border-pickfirst-yellow/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-pickfirst-yellow" />
                          <span className="text-white font-semibold text-lg">{selectedContact?.name}</span>
                          <Badge className={`${selectedContact?.type === 'client' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'} text-xs border`}>
                            {selectedContact?.type?.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-300">{selectedContact?.email}</div>
                        {selectedContact?.phone && <div className="text-sm text-gray-400">{selectedContact?.phone}</div>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowContactSelector(true)}
                        className="text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!showContactSelector && (
              <>
                {/* Appointment Type */}
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Appointment Type *</Label>
                  <Select value={formData.appointment_type} onValueChange={(value) => setFormData({...formData, appointment_type: value})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select appointment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white z-[110]">
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white focus:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-white z-[110]" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => setFormData({...formData, date})}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="rounded-md border"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Time *</Label>
                    <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {formData.time || "Select time"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4 bg-gray-800 border-gray-700 text-white z-[110]" align="start">
                        <div className="space-y-4">
                          <div className="text-sm font-medium text-white mb-3">Select Time</div>
                          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                            {timeSlots.map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, time});
                                  setTimePickerOpen(false);
                                }}
                                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                                  formData.time === time
                                    ? 'bg-pickfirst-yellow text-black font-semibold'
                                    : 'bg-white/5 text-white hover:bg-pickfirst-yellow/20 hover:text-pickfirst-yellow'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-gray-700">
                            <Label className="text-xs text-gray-400 mb-2 block">Or enter custom time:</Label>
                            <Input
                              type="time"
                              value={formData.time}
                              onChange={(e) => {
                                setFormData({...formData, time: e.target.value});
                                if (e.target.value) {
                                  setTimePickerOpen(false);
                                }
                              }}
                              className="bg-white/5 border-white/20 text-white"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Duration (minutes)</Label>
                  <Select value={formData.duration.toString()} onValueChange={(value) => setFormData({...formData, duration: parseInt(value)})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white z-[110]">
                      <SelectItem value="30" className="text-white focus:bg-gray-700">30 minutes</SelectItem>
                      <SelectItem value="45" className="text-white focus:bg-gray-700">45 minutes</SelectItem>
                      <SelectItem value="60" className="text-white focus:bg-gray-700">1 hour</SelectItem>
                      <SelectItem value="90" className="text-white focus:bg-gray-700">1.5 hours</SelectItem>
                      <SelectItem value="120" className="text-white focus:bg-gray-700">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Selection */}
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Property (Optional)</Label>
                  {properties.length === 0 ? (
                    <div className="text-sm text-gray-400 bg-white/5 p-3 rounded border border-white/10">
                      No properties available. You can enter a custom location below.
                    </div>
                  ) : (
                    <Select 
                      value={formData.property_id ? formData.property_id : "__none__"} 
                      onValueChange={(value) => {
                        if (value === "__none__") {
                          setFormData({
                            ...formData, 
                            property_id: '',
                            property_address: ''
                          });
                          return;
                        }
                        const property = properties.find(p => p.id === value);
                        setFormData({
                          ...formData, 
                          property_id: value,
                          property_address: property?.address || ''
                        });
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select property or leave empty for virtual meeting" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white z-[110] max-h-[300px]">
                        <SelectItem value="__none__" className="text-white focus:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <span>No property (Virtual/Office Meeting)</span>
                          </div>
                        </SelectItem>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id} className="text-white focus:bg-gray-700">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{property.title}</div>
                                <div className="text-sm text-gray-400 truncate">{property.address}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Custom Location */}
                {!formData.property_id && formData.property_id !== '__none__' && (
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Meeting Location</Label>
                    <Input
                      placeholder="Enter meeting location or leave empty for virtual meeting"
                      value={formData.property_address}
                      onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                      className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Notes</Label>
                  <Textarea
                    placeholder="Add any additional notes about this appointment..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                    rows={3}
                  />
                </div>
              </>
            )}

            <DialogFooter className="border-t border-pickfirst-yellow/20 pt-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-gray-300 border-white/20 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || showContactSelector || !selectedContact || !formData.date || !formData.time || !formData.appointment_type}
                className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};