import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, UserPlus, Calendar as CalendarSchedule } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { clientService } from '@/services/clientService';
import { appointmentService } from '@/services/appointmentService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PropertyInquiry {
  id: string;
  buyer_id: string;
  property_id: string;
  message: string;
  created_at: string;
  property?: {
    title: string;
    address: string;
    price: number;
  };
  buyer?: {
    full_name: string;
    email: string;
  };
}

interface LeadConversionDialogProps {
  inquiry: PropertyInquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const LeadConversionDialogComponent = ({ inquiry, open, onOpenChange, onSuccess }: LeadConversionDialogProps) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('client');
  const [loading, setLoading] = useState(false);
  const [hasClient, setHasClient] = useState(false);
  
  // Client conversion state
  const [clientData, setClientData] = useState({
    countryCode: '+61',
    phone: '',
    status: 'lead',
    budget_range: '',
    property_type: '',
    preferred_areas: '',
    notes: '',
  });

  // Appointment state
  const [appointmentData, setAppointmentData] = useState({
    appointment_type: 'property_showing',
    date: undefined as Date | undefined,
    time: '',
    duration: 60,
    notes: '',
  });

  // Check if this buyer is already a client for this agent
  useEffect(() => {
    const checkExistingClient = async () => {
      if (!open || !profile?.id) return;
      
      // Get buyer email - try from inquiry object first, then fetch if needed
      let buyerEmail = inquiry?.buyer?.email;
      
      if (!buyerEmail && inquiry?.buyer_id) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', inquiry.buyer_id)
          .single();
        
        buyerEmail = buyerProfile?.email;
        
        // Update inquiry object if we fetched the email
        if (buyerEmail && inquiry) {
          inquiry.buyer = {
            ...inquiry.buyer,
            email: buyerEmail,
            full_name: buyerProfile?.full_name || inquiry.buyer?.full_name || 'Unknown'
          };
        }
      }
      
      if (!buyerEmail) return;
      
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('agent_id', profile.id)
        .eq('email', buyerEmail)
        .maybeSingle();
      const exists = !!data;
      setHasClient(exists);
      if (exists) setActiveTab('appointment');
    };
    checkExistingClient();
  }, [open, inquiry?.buyer_id, inquiry?.buyer?.email, profile?.id]);

  const handleConvertToClient = async () => {
    // Try to get buyer email from inquiry object
    let buyerEmail = inquiry?.buyer?.email;
    
    // If email is not in inquiry object, fetch it from the buyer_id
    if (!buyerEmail && inquiry?.buyer_id) {
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', inquiry.buyer_id)
        .single();
      
      if (buyerProfile?.email) {
        buyerEmail = buyerProfile.email;
        // Update the inquiry object with buyer data for future use
        if (inquiry) {
          inquiry.buyer = {
            ...inquiry.buyer,
            email: buyerProfile.email,
            full_name: buyerProfile.full_name || inquiry.buyer?.full_name || 'Unknown'
          };
        }
      }
    }
    
    if (!buyerEmail) {
      toast.error('Buyer email not found. Please try refreshing the page.');
      console.error('Buyer email not found for inquiry:', inquiry);
      return;
    }

    setLoading(true);
    try {
      // Build E.164-style phone using selected country code
      const codeDigits = (clientData.countryCode || '+61').replace(/\D/g, '');
      const phoneDigits = (clientData.phone || '').replace(/\D/g, '');
      const formattedPhone = phoneDigits ? `+${codeDigits}${phoneDigits}` : undefined;

      const { data, error } = await clientService.createClientByEmail(
        buyerEmail,
        {
          phone: formattedPhone,
          status: clientData.status,
          budget_range: clientData.budget_range || undefined,
          property_type: clientData.property_type || undefined,
          preferred_areas: clientData.preferred_areas ? clientData.preferred_areas.split(',').map(a => a.trim()) : undefined,
          notes: clientData.notes || undefined,
        }
      );

      if (error) {
        toast.error(error.message || 'Failed to convert to client');
        return;
      }

      toast.success('Successfully converted lead to client!');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to convert to client');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!inquiry || !appointmentData.date || !appointmentData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await appointmentService.createAppointmentFromInquiry(
        inquiry.id,
        {
          date: format(appointmentData.date, 'yyyy-MM-dd'),
          time: appointmentData.time,
          appointment_type: appointmentData.appointment_type,
          duration: appointmentData.duration,
          notes: appointmentData.notes || undefined,
        }
      );

      if (error) {
        toast.error(error.message || 'Failed to schedule appointment');
        return;
      }

      toast.success('Appointment scheduled successfully! Email notifications sent and calendar synced.');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Appointment scheduling error:', error);
      toast.error('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientData({
      countryCode: '+61',
      phone: '',
      status: 'lead',
      budget_range: '',
      property_type: '',
      preferred_areas: '',
      notes: '',
    });
    setAppointmentData({
      appointment_type: 'property_showing',
      date: undefined,
      time: '',
      duration: 60,
      notes: '',
    });
    setActiveTab('client');
  };

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-pickfirst-yellow">Convert Lead</DialogTitle>
          <DialogDescription className="text-gray-300">
            Convert this inquiry from {inquiry.buyer?.full_name} into a client or schedule an appointment
          </DialogDescription>
        </DialogHeader>

        <div className="bg-white/5 p-3 rounded-lg mb-4">
          <div className="text-sm font-medium text-white mb-2">Property Inquiry</div>
          <div className="text-xs text-gray-300">
            <div><strong>Property:</strong> {inquiry.property?.title}</div>
            <div><strong>Address:</strong> {inquiry.property?.address}</div>
            <div><strong>Price:</strong> ${inquiry.property?.price?.toLocaleString()}</div>
            <div><strong>Message:</strong> {inquiry.message}</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full bg-white/10" style={{ gridTemplateColumns: hasClient ? '1fr' : '1fr 1fr' }}>
            {!hasClient && (
              <TabsTrigger value="client" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add as Client
              </TabsTrigger>
            )}
            <TabsTrigger value="appointment" className="flex items-center gap-2">
              <CalendarSchedule className="h-4 w-4" />
              Schedule Appointment
            </TabsTrigger>
          </TabsList>

          {!hasClient && (
          <TabsContent value="client" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-white">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="countryCode"
                    value={clientData.countryCode}
                    onChange={(e) => setClientData(prev => ({ ...prev, countryCode: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white w-24"
                    placeholder="+61"
                  />
                  <Input
                    id="phone"
                    value={clientData.phone}
                    onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-white/5 border-white/20 text-white flex-1"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status" className="text-white">Status</Label>
                <Select value={clientData.status} onValueChange={(value) => setClientData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_contract">Under Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget_range" className="text-white">Budget Range</Label>
                <Select value={clientData.budget_range} onValueChange={(value) => setClientData(prev => ({ ...prev, budget_range: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_200k">Under $200k</SelectItem>
                    <SelectItem value="200k_400k">$200k - $400k</SelectItem>
                    <SelectItem value="400k_600k">$400k - $600k</SelectItem>
                    <SelectItem value="600k_800k">$600k - $800k</SelectItem>
                    <SelectItem value="800k_1m">$800k - $1M</SelectItem>
                    <SelectItem value="over_1m">Over $1M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="property_type" className="text-white">Property Type</Label>
                <Select value={clientData.property_type} onValueChange={(value) => setClientData(prev => ({ ...prev, property_type: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="preferred_areas" className="text-white">Preferred Areas (comma separated)</Label>
              <Input
                id="preferred_areas"
                value={clientData.preferred_areas}
                onChange={(e) => setClientData(prev => ({ ...prev, preferred_areas: e.target.value }))}
                className="bg-white/5 border-white/20 text-white"
                placeholder="Downtown, Midtown, Suburbs"
              />
            </div>

            <div>
              <Label htmlFor="client_notes" className="text-white">Notes</Label>
              <Textarea
                id="client_notes"
                value={clientData.notes}
                onChange={(e) => setClientData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-white/5 border-white/20 text-white"
                placeholder="Additional notes about this client..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleConvertToClient}
              disabled={loading}
              className="w-full bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              {loading ? 'Converting...' : 'Convert to Client'}
            </Button>
          </TabsContent>
          )}

          <TabsContent value="appointment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment_type" className="text-white">Appointment Type</Label>
                <Select value={appointmentData.appointment_type} onValueChange={(value) => setAppointmentData(prev => ({ ...prev, appointment_type: value }))}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="property_showing">Property Showing</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="contract_review">Contract Review</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration" className="text-white">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={appointmentData.duration}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  className="bg-white/5 border-white/20 text-white"
                  min="15"
                  max="480"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white/5 border-white/20 text-white"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentData.date ? format(appointmentData.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentData.date}
                      onSelect={(date) => setAppointmentData(prev => ({ ...prev, date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="time" className="text-white">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, time: e.target.value }))}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="appointment_notes" className="text-white">Notes</Label>
              <Textarea
                id="appointment_notes"
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-white/5 border-white/20 text-white"
                placeholder="Additional notes for this appointment..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleScheduleAppointment}
              disabled={loading || !appointmentData.date || !appointmentData.time}
              className="w-full bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export const LeadConversionDialog = withErrorBoundary(LeadConversionDialogComponent);