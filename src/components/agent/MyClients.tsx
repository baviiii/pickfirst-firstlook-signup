import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Plus, Phone, Mail, MessageSquare, Calendar, Star, Edit, Trash2, Loader2, History, Send } from 'lucide-react';
import { toast } from 'sonner';
import { clientService, Client, ClientFilters } from '@/services/clientService';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { ClientHistory } from './ClientHistory';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneInput } from '@/components/ui/phone-input';
import { useNavigate } from 'react-router-dom';

export const MyClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'lead' as const,
    budget_range: '',
    preferred_areas: [] as string[],
    property_type: '',
    rating: 0,
    notes: ''
  });
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [userSearched, setUserSearched] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  // Load clients and user profile on mount
  useEffect(() => {
    fetchClients();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setCurrentUserProfile(data);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    const filters: ClientFilters = {};
    if (filterStatus !== 'all') filters.status = filterStatus;
    if (searchTerm) filters.search = searchTerm;

    const { data, error } = await clientService.getClients(filters);
    if (error) {
      toast.error('Failed to load clients');
      console.error('Error loading clients:', error);
    } else {
      setClients(data);
    }
    setLoading(false);
  };

  // Refetch clients when filters change
  useEffect(() => {
    fetchClients();
  }, [filterStatus, searchTerm]);

  // Use clients directly since filtering is now done at database level
  const filteredClients = clients;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'lead': return 'bg-blue-500/10 text-blue-500';
      case 'past_client': return 'bg-purple-500/10 text-purple-500';
      case 'inactive': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
      />
    ));
  };

  const handleContactClient = async (client: Client, method: 'phone' | 'email' | 'message') => {
    switch (method) {
      case 'phone':
        if (client.phone) {
          window.open(`tel:${client.phone}`);
        } else {
          toast.error('No phone number available');
        }
        break;
      case 'email':
        if (client.email) {
          window.open(`mailto:${client.email}`);
        } else {
          toast.error('No email available');
        }
        break;
      case 'message':
        // Find or create conversation with this client
        const profileId = client.user_id || client.id;
        
        // Check if conversation exists
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', profileId)
          .maybeSingle();

        if (existingConv) {
          navigate(`/agent-messages?conversation=${existingConv.id}`);
        } else {
          // Create new conversation
          const { data: newConv, error } = await supabase
            .from('conversations')
            .insert({
              client_id: profileId,
              agent_id: (await supabase.auth.getUser()).data.user?.id,
              subject: `Chat with ${client.name}`,
              status: 'active'
            })
            .select('id')
            .single();

          if (error) {
            toast.error('Failed to start conversation');
            return;
          }

          navigate(`/agent-messages?conversation=${newConv.id}`);
        }
        break;
    }
  };

  const handleAddClient = () => {
    setIsAddingClient(true);
  };

  const handleViewHistory = (client: Client) => {
    setHistoryClient(client);
    setShowHistory(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      const { error } = await clientService.deleteClient(clientId);
      if (error) {
        toast.error('Failed to delete client');
        console.error('Error deleting client:', error);
      } else {
        setClients(clients.filter(c => c.id !== clientId));
        toast.success('Client deleted successfully');
      }
    }
  };

  const handleSearchUser = async () => {
    if (!newClient.email) {
      toast.error('Please enter an email address to search');
      return;
    }

    setSearchingUser(true);
    setUserSearched(false);
    const { data, error } = await clientService.getUserByEmail(newClient.email);
    setSearchingUser(false);
    setUserSearched(true);

    if (error || !data) {
      setFoundUser(null);
      // Don't show error - just indicate not found
    } else {
      setFoundUser(data);
      // Pre-fill name if found
      setNewClient(prev => ({
        ...prev,
        name: data.full_name || prev.name
      }));
    }
  };

  const handleAddExistingClient = async () => {
    if (!foundUser) {
      toast.error('No user found');
      return;
    }

    const { data, error } = await clientService.createClient({
      ...newClient,
      name: foundUser.full_name || newClient.name,
      email: foundUser.email
    });

    if (error) {
      toast.error(error.message || 'Failed to add client');
      return;
    }

    toast.success('Client added successfully');
    setClients([data!, ...clients]);
    resetClientForm();
  };

  const handleSendInvite = async () => {
    if (!newClient.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    if (!newClient.email) {
      toast.error('Email is required to send invitation');
      return;
    }

    // Create client first
    const { data, error } = await clientService.createClient(newClient);
    if (error) {
      toast.error(error.message || 'Failed to create client');
      return;
    }

    // Send invitation
    setSendingInvite(true);
    const { error: inviteError } = await clientService.sendClientInvite(
      data!.id,
      currentUserProfile?.full_name || 'Your Agent'
    );
    setSendingInvite(false);

    if (inviteError) {
      toast.error('Client added but failed to send invitation');
    } else {
      toast.success('Client added and invitation sent!');
    }

    setClients([data!, ...clients]);
    resetClientForm();
  };

  const resetClientForm = () => {
    setIsAddingClient(false);
    setFoundUser(null);
    setUserSearched(false);
    setNewClient({
      name: '',
      email: '',
      phone: '',
      status: 'lead' as const,
      budget_range: '',
      preferred_areas: [],
      property_type: '',
      rating: 0,
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleAddClient}
          className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Client
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="past_client">Past Clients</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {clients.filter(c => c.status === 'active').length}
            </div>
            <div className="text-sm text-gray-300">Active Clients</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {clients.filter(c => c.status === 'lead').length}
            </div>
            <div className="text-sm text-gray-300">Leads</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {clients.filter(c => c.status === 'past_client').length}
            </div>
            <div className="text-sm text-gray-300">Past Clients</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-pickfirst-yellow">
              {clients.length > 0 ? Math.round(clients.reduce((sum, c) => sum + c.rating, 0) / clients.length * 10) / 10 : 0}
            </div>
            <div className="text-sm text-gray-300">Avg Rating</div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pickfirst-yellow" />
          <span className="ml-2 text-gray-300">Loading clients...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No clients found</h3>
            <p className="text-gray-300 mb-4">Start by adding your first client to manage your relationships.</p>
            <Button onClick={() => setIsAddingClient(true)} className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
          <Card key={client.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 hover:shadow-lg hover:shadow-pickfirst-yellow/10 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-lg">{client.name}</CardTitle>
                  <CardDescription className="text-gray-300">{client.email}</CardDescription>
                </div>
                <Badge className={getStatusColor(client.status)}>
                  {client.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {renderStars(client.rating)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">
                  <span className="text-white font-medium">Budget:</span> {client.budget_range}
                </div>
                <div className="text-gray-300">
                  <span className="text-white font-medium">Property:</span> {client.property_type}
                </div>
                <div className="text-gray-300">
                  <span className="text-white font-medium">Areas:</span> {client.preferred_areas.join(', ')}
                </div>
                <div className="text-gray-300">
                  <span className="text-white font-medium">Last Contact:</span> {new Date(client.last_contact).toLocaleDateString()}
                </div>
              </div>
              
              {client.notes && (
                <div className="text-sm text-gray-400 bg-white/5 p-2 rounded">
                  {client.notes}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClient(client, 'phone')}
                  className="flex-1 text-green-400 border-green-400/30 hover:bg-green-400/20 hover:text-green-300 hover:border-green-400/50"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClient(client, 'email')}
                  className="flex-1 text-blue-400 border-blue-400/30 hover:bg-blue-400/20 hover:text-blue-300 hover:border-blue-400/50"
                >
                  <Mail className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClient(client, 'message')}
                  className="flex-1 text-purple-400 border-purple-400/30 hover:bg-purple-400/20 hover:text-purple-300 hover:border-purple-400/50"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewHistory(client)}
                  className="text-pickfirst-yellow border-pickfirst-yellow/30 hover:bg-pickfirst-yellow/20 hover:text-pickfirst-amber hover:border-pickfirst-yellow/50"
                  title="View client history"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedClient(client)}
                  className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/20 hover:text-yellow-300 hover:border-yellow-400/50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClient(client.id)}
                  className="text-red-400 border-red-400/30 hover:bg-red-400/20 hover:text-red-300 hover:border-red-400/50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={isAddingClient} onOpenChange={(open) => {
        setIsAddingClient(open);
        if (!open) resetClientForm();
      }}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Client</DialogTitle>
            <DialogDescription className="text-gray-300">
              Search for existing users or add new clients with optional invitation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step 1: Email Search */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-pickfirst-yellow text-black flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="font-semibold text-white">Search by Email (Optional)</h3>
              </div>
              <p className="text-xs text-gray-400 ml-8">Check if the client is already registered in the system.</p>
              
              <div className="flex gap-2 ml-8">
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => {
                    setNewClient({...newClient, email: e.target.value});
                    setUserSearched(false);
                    setFoundUser(null);
                  }}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="client@example.com"
                />
                <Button 
                  onClick={handleSearchUser}
                  disabled={!newClient.email || searchingUser}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {searchingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {userSearched && foundUser && (
                <div className="ml-8 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="text-green-400 mt-1">✓</div>
                    <div className="flex-1">
                      <div className="text-sm text-green-400 font-medium mb-2">User Found in System</div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div><strong>Name:</strong> {foundUser.full_name || 'Not provided'}</div>
                        <div><strong>Email:</strong> {foundUser.email}</div>
                        <div><strong>Registered:</strong> {new Date(foundUser.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {userSearched && !foundUser && (
                <div className="ml-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="text-blue-400 mt-1">ℹ</div>
                    <div className="flex-1">
                      <div className="text-sm text-blue-400 font-medium mb-1">Not Registered Yet</div>
                      <div className="text-xs text-gray-400">
                        This email isn't in our system. You can add them as a client and optionally send an invitation.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Client Details */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-pickfirst-yellow text-black flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="font-semibold text-white">Client Information</h3>
              </div>
              <p className="text-xs text-gray-400 ml-8">Enter the basic details about this client.</p>

              <div className="ml-8 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Name *</label>
                  <Input
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Client full name"
                    disabled={!!foundUser}
                  />
                  {foundUser && (
                    <p className="text-xs text-gray-400 mt-1">Using name from registered account</p>
                  )}
                </div>

                {!foundUser && !newClient.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="client@example.com"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-300">Phone</label>
                  <PhoneInput
                    value={newClient.phone}
                    onChange={(value) => setNewClient({...newClient, phone: value})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Status</label>
                    <Select value={newClient.status} onValueChange={(value) => setNewClient({...newClient, status: value as any})}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="past_client">Past Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300">Property Type</label>
                    <Input
                      value={newClient.property_type}
                      onChange={(e) => setNewClient({...newClient, property_type: e.target.value})}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="e.g., Single Family"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Budget Range</label>
                  <Input
                    value={newClient.budget_range}
                    onChange={(e) => setNewClient({...newClient, budget_range: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="e.g., $300,000 - $500,000"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Notes</label>
                  <Textarea
                    value={newClient.notes}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Action Options */}
            <div className="space-y-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-pickfirst-yellow text-black flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="font-semibold text-white">Choose Action</h3>
              </div>
              <p className="text-xs text-gray-400 ml-8">Select how you want to add this client.</p>

              <div className="ml-8 space-y-3">
                {/* Option 1: Existing User */}
                {userSearched && foundUser && (
                  <div className="border-2 border-green-500/30 rounded-lg p-4 bg-green-500/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-green-400 mb-1">Connect Existing User</h4>
                        <p className="text-xs text-gray-400">
                          Link this registered user to your client list. They'll see you as their agent.
                        </p>
                      </div>
                      <Button 
                        onClick={handleAddExistingClient}
                        disabled={!newClient.name}
                        className="bg-green-500 text-white hover:bg-green-600 whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add as Client
                      </Button>
                    </div>
                  </div>
                )}

                {/* Option 2 & 3: New Client */}
                {(!userSearched || !foundUser) && (
                  <>
                    <div className="border-2 border-pickfirst-yellow/30 rounded-lg p-4 bg-pickfirst-yellow/5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-pickfirst-yellow mb-1">Add as Client Only</h4>
                          <p className="text-xs text-gray-400">
                            Add to your client list with the information provided. No invitation sent.
                          </p>
                        </div>
                        <Button 
                          onClick={async () => {
                            if (!newClient.name.trim()) {
                              toast.error('Client name is required');
                              return;
                            }
                            if (!newClient.email && !newClient.phone) {
                              toast.error('Email or phone is required');
                              return;
                            }
                            const { data, error } = await clientService.createClient(newClient);
                            if (error) {
                              toast.error(error.message || 'Failed to add client');
                              return;
                            }
                            toast.success('Client added successfully');
                            setClients([data!, ...clients]);
                            resetClientForm();
                          }}
                          disabled={!newClient.name || (!newClient.email && !newClient.phone)}
                          className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Client
                        </Button>
                      </div>
                    </div>

                    {newClient.email && (
                      <div className="border-2 border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-400 mb-1">Add & Send Invitation</h4>
                            <p className="text-xs text-gray-400">
                              Add to your client list and email them an invitation to join the platform.
                            </p>
                          </div>
                          <Button 
                            onClick={handleSendInvite}
                            disabled={sendingInvite || !newClient.name || !newClient.email}
                            className="bg-blue-500 text-white hover:bg-blue-600 whitespace-nowrap"
                          >
                            {sendingInvite ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Add & Invite
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!newClient.email && (
                      <div className="text-xs text-gray-400 ml-4 flex items-start gap-2">
                        <div className="mt-0.5">💡</div>
                        <span>Add an email address to enable the invitation option.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-2 pt-4 border-t border-white/10">
            <Button 
              variant="outline" 
              onClick={resetClientForm}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription className="text-gray-300">
              Update client information.
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Name</label>
                <Input
                  value={selectedClient.name}
                  onChange={(e) => setSelectedClient({...selectedClient, name: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Email</label>
                <Input
                  type="email"
                  value={selectedClient.email || ''}
                  onChange={(e) => setSelectedClient({...selectedClient, email: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Phone</label>
                <PhoneInput
                  value={selectedClient.phone || ''}
                  onChange={(value) => setSelectedClient({...selectedClient, phone: value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <Select 
                    value={selectedClient.status} 
                    onValueChange={(value) => setSelectedClient({...selectedClient, status: value as any})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="past_client">Past Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Property Type</label>
                  <Input
                    value={selectedClient.property_type || ''}
                    onChange={(e) => setSelectedClient({...selectedClient, property_type: e.target.value})}
                    className="bg-white/5 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Budget Range</label>
                <Input
                  value={selectedClient.budget_range || ''}
                  onChange={(e) => setSelectedClient({...selectedClient, budget_range: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">Notes</label>
                <Textarea
                  value={selectedClient.notes || ''}
                  onChange={(e) => setSelectedClient({...selectedClient, notes: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedClient(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedClient) return;
                
                const { error } = await clientService.updateClient(selectedClient.id, {
                  name: selectedClient.name,
                  email: selectedClient.email,
                  phone: selectedClient.phone,
                  status: selectedClient.status,
                  property_type: selectedClient.property_type,
                  budget_range: selectedClient.budget_range,
                  notes: selectedClient.notes,
                });

                if (error) {
                  toast.error('Failed to update client');
                  return;
                }

                toast.success('Client updated successfully');
                setClients(clients.map(c => c.id === selectedClient.id ? selectedClient : c));
                setSelectedClient(null);
              }}
              className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client History Dialog */}
      <ClientHistory 
        client={historyClient}
        isOpen={showHistory}
        onClose={() => {
          setShowHistory(false);
          setHistoryClient(null);
        }}
      />
    </div>
  );
};