import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  Clock, 
  Star,
  User,
  MapPin,
  DollarSign,
  Home,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/services/clientService';

interface ClientHistoryProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Conversation {
  id: string;
  subject: string;
  created_at: string;
  last_message_at: string;
  status: string;
  unread_count: number;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  }>;
}

interface Interaction {
  id: string;
  interaction_type: string;
  subject: string;
  content: string;
  outcome: string;
  duration_minutes: number;
  created_at: string;
  next_follow_up: string;
}

interface Note {
  id: string;
  note_type: string;
  content: string;
  created_at: string;
}

export const ClientHistory = ({ client, isOpen, onClose }: ClientHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'interactions' | 'notes'>('conversations');

  const fetchClientHistory = useCallback(async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Get current agent ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const currentAgentId = user.id;

      // Use user_id for tables that reference profiles (appointments, conversations)
      // Use client.id for tables that reference clients table directly
      const profileId = client.user_id || client.id;
      
      console.log('🔍 Fetching client history:', {
        clientId: client.id,
        clientEmail: client.email,
        userId: client.user_id,
        profileId,
        agentId: currentAgentId
      });

      // Fetch conversations (references profiles.id as client_id)
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          created_at,
          last_message_at,
          status,
          messages(
            id,
            content,
            created_at,
            sender_id
          )
        `)
        .eq('client_id', profileId)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('Conversations error:', convError);
      }

      const transformedConversations = conversationsData?.map(conv => ({
        ...conv,
        unread_count: 0,
        messages: Array.isArray(conv.messages) ? conv.messages : []
      })) || [];

      setConversations(transformedConversations);

      // Fetch interactions (references clients.id)
      const { data: interactionsData, error: intError } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (intError) {
        console.error('Interactions error:', intError);
      }

      // Fetch appointments (references profiles.id as client_id)
      // Also check by email as fallback for clients without user_id
      // Build query to find appointments for this client
      // Match by: client_id (if user_id exists) OR client_email (fallback for clients without user_id)
      let appointmentsQuery = supabase
        .from('appointments')
        .select('*')
        .eq('agent_id', currentAgentId) // Ensure we only get appointments for this agent
        .order('created_at', { ascending: false });

      // Try multiple matching strategies:
      // 1. Match by client_id (user_id) if it exists
      // 2. Match by client_email as fallback (for clients without user_id)
      // 3. Match by client_id = client.id (in case appointments use client record ID)
      const conditions: string[] = [];
      
      if (profileId && profileId !== client.id) {
        // Client has user_id, match by it
        conditions.push(`client_id.eq.${profileId}`);
      }
      
      // Always try matching by email (handles cases where client_id is null)
      if (client.email) {
        conditions.push(`client_email.eq.${client.email}`);
      }
      
      // Also try matching by client record ID (just in case)
      conditions.push(`client_id.eq.${client.id}`);

      if (conditions.length > 0) {
        appointmentsQuery = appointmentsQuery.or(conditions.join(','));
      }

      const { data: appointmentsData, error: apptError } = await appointmentsQuery;
      
      console.log('🔍 Fetched appointments for client:', {
        clientId: client.id,
        clientEmail: client.email,
        userId: client.user_id,
        profileId,
        agentId: currentAgentId,
        appointmentsCount: appointmentsData?.length || 0,
        appointments: appointmentsData?.map(a => ({ 
          id: a.id, 
          client_id: a.client_id, 
          client_email: a.client_email, 
          date: a.date,
          client_name: a.client_name
        }))
      });

      if (apptError) {
        console.error('Appointments error:', apptError);
      }

      // Transform appointments to interaction format
      const transformedAppointments = appointmentsData?.map(appt => ({
        id: appt.id,
        interaction_type: 'appointment',
        subject: `${appt.appointment_type?.replace('_', ' ') || 'Appointment'}${appt.property_address ? ` - ${appt.property_address}` : ''}`,
        content: appt.notes || `Scheduled for ${appt.date} at ${appt.time}`,
        outcome: appt.status,
        duration_minutes: appt.duration,
        created_at: appt.created_at || appt.date,
        next_follow_up: null,
        appointment_date: appt.date,
        appointment_time: appt.time,
        appointment_type: appt.appointment_type
      })) || [];

      // Combine interactions and appointments
      const allInteractions = [...(interactionsData || []), ...transformedAppointments]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setInteractions(allInteractions);

      // Fetch notes (references clients.id)
      const { data: notesData, error: notesError } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (notesError) {
        console.error('Notes error:', notesError);
      }
      setNotes(notesData || []);

    } catch (error) {
      console.error('Error fetching client history:', error);
      toast.error('Failed to load client history');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client && isOpen) {
      fetchClientHistory();
    }
  }, [client, isOpen, fetchClientHistory]);

  // Real-time subscription for appointments and interactions
  useEffect(() => {
    if (!client || !isOpen) return;

    const profileId = client.user_id || client.id;
    let appointmentsSubscription: any = null;
    let interactionsSubscription: any = null;
    
    // Get current agent ID for subscription filter
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      // Subscribe to appointments table changes
      // Listen for appointments matching either client_id or client_email
      appointmentsSubscription = supabase
        .channel(`client-appointments-${client.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `agent_id=eq.${user.id}`
          },
          (payload) => {
            // Check if the appointment matches this client (by client_id or email)
            const appointment = (payload.new || payload.old) as any;
            if (appointment && (
              appointment.client_id === profileId || 
              appointment.client_id === client.id ||
              appointment.client_email === client.email
            )) {
              // Refresh client history when appointments change
              setTimeout(() => fetchClientHistory(), 500); // Small delay to ensure DB is updated
            }
          }
        )
        .subscribe();

      // Subscribe to client_interactions table changes
      interactionsSubscription = supabase
        .channel(`client-interactions-${client.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'client_interactions',
            filter: `client_id=eq.${client.id}`
          },
          () => {
            // Refresh client history when interactions change
            setTimeout(() => fetchClientHistory(), 500); // Small delay to ensure DB is updated
          }
        )
        .subscribe();
    });

    return () => {
      if (appointmentsSubscription) {
        appointmentsSubscription.unsubscribe();
      }
      if (interactionsSubscription) {
        interactionsSubscription.unsubscribe();
      }
    };
  }, [client?.id, client?.user_id, client?.email, isOpen, fetchClientHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'property_viewing': return <Home className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'call': return 'text-green-400 bg-green-400/10';
      case 'email': return 'text-blue-400 bg-blue-400/10';
      case 'meeting': return 'text-purple-400 bg-purple-400/10';
      case 'property_viewing': return 'text-yellow-400 bg-yellow-400/10';
      case 'appointment': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const renderConversations = () => (
    <div className="space-y-4">
      {conversations.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No conversations found</p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <Card key={conversation.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 border-pickfirst-yellow/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white">
                  {conversation.subject || 'General Conversation'}
                </CardTitle>
                <Badge variant="outline" className="text-xs border-pickfirst-yellow/20 text-pickfirst-yellow">
                  {conversation.status}
                </Badge>
              </div>
              <div className="text-xs text-gray-400">
                Started: {formatDate(conversation.created_at)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-xs text-gray-400">
                  Messages: {conversation.messages.length}
                </div>
                <div className="text-xs text-gray-400">
                  Last activity: {formatDate(conversation.last_message_at)}
                </div>
                {conversation.messages.slice(0, 2).map((message) => (
                  <div key={message.id} className="bg-white/5 p-2 rounded text-xs">
                    <div className="text-gray-300 truncate">
                      {message.content}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {formatDate(message.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderInteractions = () => (
    <div className="space-y-4">
      {interactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No interactions recorded</p>
        </div>
      ) : (
        interactions.map((interaction) => (
          <Card key={interaction.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 border-pickfirst-yellow/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getInteractionColor(interaction.interaction_type)}`}>
                  {getInteractionIcon(interaction.interaction_type)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium text-white">
                    {interaction.subject || interaction.interaction_type}
                  </CardTitle>
                  <div className="text-xs text-gray-400">
                    {formatDate(interaction.created_at)}
                    {interaction.duration_minutes && (
                      <span className="ml-2">
                        • {interaction.duration_minutes} minutes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {interaction.content && (
                <div className="text-sm text-gray-300 mb-3">
                  {interaction.content}
                </div>
              )}
              {(interaction as any).appointment_date && (interaction as any).appointment_time && (
                <div className="bg-white/5 p-2 rounded mb-2">
                  <div className="text-xs font-medium text-white mb-1">Appointment Details:</div>
                  <div className="text-xs text-gray-300">
                    Date: {new Date((interaction as any).appointment_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs text-gray-300">
                    Time: {(interaction as any).appointment_time}
                  </div>
                  {(interaction as any).appointment_type && (
                    <div className="text-xs text-gray-400 mt-1">
                      Type: {(interaction as any).appointment_type.replace('_', ' ')}
                    </div>
                  )}
                </div>
              )}
              {interaction.outcome && (
                <div className="bg-white/5 p-3 rounded">
                  <div className="text-xs font-medium text-white mb-1">Status:</div>
                  <Badge variant="outline" className="text-xs border-pickfirst-yellow/20 text-pickfirst-yellow capitalize">
                    {interaction.outcome}
                  </Badge>
                </div>
              )}
              {interaction.next_follow_up && (
                <div className="mt-3 flex items-center gap-2 text-xs text-pickfirst-yellow">
                  <Clock className="h-3 w-3" />
                  Follow-up: {formatDate(interaction.next_follow_up)}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-4">
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notes available</p>
        </div>
      ) : (
        notes.map((note) => (
          <Card key={note.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 border-pickfirst-yellow/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <Badge variant="outline" className="text-xs capitalize border-pickfirst-yellow/20 text-pickfirst-yellow">
                    {note.note_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(note.created_at)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {note.content}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-pickfirst-yellow/20 text-white">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.name}`} />
              <AvatarFallback className="bg-pickfirst-yellow/20 text-pickfirst-yellow">
                {client.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl text-white">
                {client.name}
              </DialogTitle>
              <div className="text-sm text-gray-400">{client.email}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {client.budget_range}
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  {client.property_type}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {client.rating}/5
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-4 border-b border-pickfirst-yellow/20">
          <Button
            variant={activeTab === 'conversations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('conversations')}
            className={`rounded-none border-b-2 border-transparent ${
              activeTab === 'conversations' 
                ? 'border-pickfirst-yellow bg-pickfirst-yellow/10 text-pickfirst-yellow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversations ({conversations.length})
          </Button>
          <Button
            variant={activeTab === 'interactions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('interactions')}
            className={`rounded-none border-b-2 border-transparent ${
              activeTab === 'interactions' 
                ? 'border-pickfirst-yellow bg-pickfirst-yellow/10 text-pickfirst-yellow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Interactions ({interactions.length})
          </Button>
          <Button
            variant={activeTab === 'notes' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('notes')}
            className={`rounded-none border-b-2 border-transparent ${
              activeTab === 'notes' 
                ? 'border-pickfirst-yellow bg-pickfirst-yellow/10 text-pickfirst-yellow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Notes ({notes.length})
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow" />
              <span className="ml-2 text-gray-400">Loading history...</span>
            </div>
          ) : (
            <div className="py-4">
              {activeTab === 'conversations' && renderConversations()}
              {activeTab === 'interactions' && renderInteractions()}
              {activeTab === 'notes' && renderNotes()}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};