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

  // Check if this buyer is already a client for this agent and preload property type
  useEffect(() => {
    const checkExistingClientAndPreload = async () => {
      if (!open || !profile?.id || !inquiry) return;
      
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
      
      // Check if buyer is already a client
      if (buyerEmail && inquiry.buyer_id) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, name, status, email, user_id')
          .eq('user_id', inquiry.buyer_id)
          .eq('agent_id', profile.id)
          .maybeSingle();
        const exists = !!existingClient;
        setHasClient(exists);
        if (exists) setActiveTab('appointment');
      }
      
      // Preload property type from the inquiry's property
      if (inquiry.property_id) {
        const { data: property } = await supabase
          .from('property_listings')
          .select('property_type')
          .eq('id', inquiry.property_id)
          .maybeSingle();
        
        if (property?.property_type) {
          setClientData(prev => ({
            ...prev,
            property_type: property.property_type
          }));
        }
      }
    };
    checkExistingClientAndPreload();
  }, [open, inquiry?.buyer_id, inquiry?.buyer?.email, inquiry?.property_id, profile?.id]);

  const handleConvertToClient = async () => {
    if (!inquiry) {
      toast.error('Inquiry not found');
      return;
    }

    // Log inquiry structure for debugging
    console.log('Converting inquiry to client. Inquiry data:', {
      id: inquiry.id,
      buyer_id: inquiry.buyer_id,
      buyer: inquiry.buyer,
      hasBuyerObject: !!inquiry.buyer,
      buyerEmail: inquiry.buyer?.email
    });

    // Try multiple ways to get buyer email
    let buyerEmail: string | undefined;
    
    // Method 1: Try from inquiry.buyer.email
    buyerEmail = inquiry.buyer?.email;
    
    // Method 2: Try from nested buyer object (different structure)
    if (!buyerEmail && (inquiry as any)?.buyer) {
      buyerEmail = (inquiry as any).buyer.email;
    }
    
    // Method 3: ALWAYS fetch from buyer_id to ensure we have the latest email
    // This is the most reliable method
    if (inquiry.buyer_id) {
      console.log('Fetching buyer email from buyer_id:', inquiry.buyer_id);
      try {
        // PRIMARY: use buyer_public_profiles view (bypasses RLS)
        const { data: buyerProfile } = await supabase
          .from('buyer_public_profiles')
          .select('email, full_name')
          .eq('id', inquiry.buyer_id)
          .maybeSingle();

        if (buyerProfile?.email) {
          buyerEmail = buyerProfile.email;
          inquiry.buyer = {
            ...inquiry.buyer,
            email: buyerProfile.email,
            full_name: buyerProfile.full_name || inquiry.buyer?.full_name || 'Unknown'
          };
        } else {
          // SECONDARY: Check if the buyer is actually an agent (agents can inquire in buyer mode)
          const { data: agentProfile } = await supabase
            .from('agent_public_profiles')
            .select('email, full_name')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();

          if (agentProfile?.email) {
            buyerEmail = agentProfile.email;
            inquiry.buyer = {
              ...inquiry.buyer,
              email: agentProfile.email,
              full_name: agentProfile.full_name || inquiry.buyer?.full_name || 'Unknown'
            };
          }
        }

        // FALLBACK 1: RPC helper for buyer
        if (!buyerEmail) {
          const { data: rpcProfile } = await supabase
            .rpc('get_buyer_public_profile', { buyer_id: inquiry.buyer_id });

          if (rpcProfile && rpcProfile.length > 0 && rpcProfile[0].email) {
            buyerEmail = rpcProfile[0].email;
            inquiry.buyer = {
              ...inquiry.buyer,
              email: rpcProfile[0].email,
              full_name: rpcProfile[0].full_name || inquiry.buyer?.full_name || 'Unknown'
            };
          } else {
            // FALLBACK 2: RPC helper for agent
            const { data: agentRpcProfile } = await supabase
              .rpc('get_agent_public_profile', { agent_id: inquiry.buyer_id });

            if (agentRpcProfile && agentRpcProfile.length > 0 && agentRpcProfile[0].email) {
              buyerEmail = agentRpcProfile[0].email;
              inquiry.buyer = {
                ...inquiry.buyer,
                email: agentRpcProfile[0].email,
                full_name: agentRpcProfile[0].full_name || inquiry.buyer?.full_name || 'Unknown'
              };
            }
          }
        }

        // Last resort: direct profiles table (may fail due to RLS)
        if (!buyerEmail) {
          const { data: directProfile, error: buyerError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();

          if (buyerError) {
            console.error('Error fetching buyer profile:', buyerError);
          }

          if (directProfile?.email) {
            buyerEmail = directProfile.email;
            inquiry.buyer = {
              ...inquiry.buyer,
              email: directProfile.email,
              full_name: directProfile.full_name || inquiry.buyer?.full_name || 'Unknown'
            };
          }
        }
      } catch (error) {
        console.error('Exception fetching buyer profile:', error);
        toast.error('Failed to fetch buyer information');
        return;
      }
    } else {
      console.error('No buyer_id found in inquiry:', inquiry);
    }
    
    // Final check - if still no email, show detailed error
    if (!buyerEmail) {
      console.error('Buyer email not found. Inquiry details:', {
        inquiryId: inquiry.id,
        buyerId: inquiry.buyer_id,
        buyer: inquiry.buyer,
        fullInquiry: inquiry
      });
      toast.error('Buyer email not found. The buyer profile may be missing an email address.');
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

      // Check if client was created (appointment service logs this)
      // The appointment service automatically creates clients, so we don't need to do anything extra
      // But we'll show a success message that includes client creation
      toast.success('Appointment scheduled successfully! Client automatically added to your clients list.');
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
      <DialogContent className="bg-card text-card-foreground border border-pickfirst-yellow/30 shadow-xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Convert Lead</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Convert this enquiry from {inquiry.buyer?.full_name} into a client or schedule an appointment
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <div className="text-sm font-medium text-foreground mb-2">Property Enquiry</div>
          <div className="text-xs text-muted-foreground">
            <div><strong>Property:</strong> {inquiry.property?.title}</div>
            <div><strong>Address:</strong> {inquiry.property?.address}</div>
            <div><strong>Price:</strong> ${inquiry.property?.price?.toLocaleString()}</div>
            <div><strong>Message:</strong> {inquiry.message}</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full bg-muted" style={{ gridTemplateColumns: hasClient ? '1fr' : '1fr 1fr' }}>
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
                <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="countryCode"
                    value={clientData.countryCode}
                    onChange={(e) => setClientData(prev => ({ ...prev, countryCode: e.target.value }))}
                    className="bg-background border-border text-foreground w-24"
                    placeholder="+61"
                  />
                  <Input
                    id="phone"
                    value={clientData.phone}
                    onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-background border-border text-foreground flex-1"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status" className="text-foreground">Status</Label>
                <Select value={clientData.status} onValueChange={(value) => setClientData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-popover text-popover-foreground border border-border">
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
                <Label htmlFor="budget_range" className="text-foreground">Budget Range</Label>
                <Select value={clientData.budget_range} onValueChange={(value) => setClientData(prev => ({ ...prev, budget_range: value }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-popover text-popover-foreground border border-border">
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
                <Label htmlFor="property_type" className="text-foreground">Property Type</Label>
                <Select value={clientData.property_type} onValueChange={(value) => setClientData(prev => ({ ...prev, property_type: value }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-popover text-popover-foreground border border-border">
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
              <Label htmlFor="preferred_areas" className="text-foreground">Preferred Areas (comma separated)</Label>
              <Input
                id="preferred_areas"
                value={clientData.preferred_areas}
                onChange={(e) => setClientData(prev => ({ ...prev, preferred_areas: e.target.value }))}
                className="bg-background border-border text-foreground"
                placeholder="Downtown, Midtown, Suburbs"
              />
            </div>

            <div>
              <Label htmlFor="client_notes" className="text-foreground">Notes</Label>
              <Textarea
                id="client_notes"
                value={clientData.notes}
                onChange={(e) => setClientData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-background border-border text-foreground"
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
                <Label htmlFor="appointment_type" className="text-foreground">Appointment Type</Label>
                <Select value={appointmentData.appointment_type} onValueChange={(value) => setAppointmentData(prev => ({ ...prev, appointment_type: value }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-popover text-popover-foreground border border-border">
                    <SelectItem value="property_showing">Property Showing</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="contract_review">Contract Review</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration" className="text-foreground">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={appointmentData.duration}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  className="bg-background border-border text-foreground"
                  min="15"
                  max="480"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-background border-border text-foreground"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentData.date ? format(appointmentData.date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[110] bg-popover text-popover-foreground" align="start">
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
                <Label htmlFor="time" className="text-foreground">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={appointmentData.time}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, time: e.target.value }))}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="appointment_notes" className="text-foreground">Notes</Label>
              <Textarea
                id="appointment_notes"
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-background border-border text-foreground"
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