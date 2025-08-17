import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Plus, Phone, Mail, MessageSquare, Calendar, Star, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clientService, Client, ClientFilters } from '@/services/clientService';
import { withErrorBoundary } from '@/components/ui/error-boundary';

export const MyClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({
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

  // Load clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

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

  const handleContactClient = (client: Client, method: 'phone' | 'email' | 'message') => {
    switch (method) {
      case 'phone':
        window.open(`tel:${client.phone}`);
        break;
      case 'email':
        window.open(`mailto:${client.email}`);
        break;
      case 'message':
        toast.success(`Opening message thread with ${client.name}`);
        break;
    }
  };

  const handleAddClient = () => {
    setIsAddingClient(true);
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
      toast.error('Please enter an email address');
      return;
    }

    setSearchingUser(true);
    const { data, error } = await clientService.getUserByEmail(newClient.email);
    setSearchingUser(false);

    if (error) {
      toast.error('User not found. Please ensure the email is registered in the system.');
      setFoundUser(null);
    } else {
      setFoundUser(data);
      toast.success(`Found user: ${data.full_name || data.email}`);
    }
  };

  const handleCreateClient = async () => {
    if (!foundUser) {
      toast.error('Please search for a user first');
      return;
    }

    const { data, error } = await clientService.createClientByEmail(newClient.email, newClient);
    if (error) {
      toast.error(error.message || 'Failed to create client');
      console.error('Error creating client:', error);
    } else {
      setClients([data!, ...clients]);
      setIsAddingClient(false);
      setNewClient({
        email: '',
        phone: '',
        status: 'lead' as const,
        budget_range: '',
        preferred_areas: [],
        property_type: '',
        rating: 0,
        notes: ''
      });
      setFoundUser(null);
      toast.success('Client added successfully');
    }
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
                  className="flex-1 text-green-500 border-green-500/20 hover:bg-green-500/10"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClient(client, 'email')}
                  className="flex-1 text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                >
                  <Mail className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContactClient(client, 'message')}
                  className="flex-1 text-purple-500 border-purple-500/20 hover:bg-purple-500/10"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedClient(client)}
                  className="text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClient(client.id)}
                  className="text-red-500 border-red-500/20 hover:bg-red-500/10"
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
      <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-pickfirst-yellow/20 text-white">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription className="text-gray-300">
              Enter the client's information to add them to your client list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Email Address *</label>
              <div className="flex gap-2">
                <Input
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="Enter registered user's email"
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
                    'Search User'
                  )}
                </Button>
              </div>
            </div>

            {foundUser && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-sm text-green-400 font-medium">User Found:</div>
                <div className="text-sm text-gray-300">
                  <div><strong>Name:</strong> {foundUser.full_name || 'Not provided'}</div>
                  <div><strong>Email:</strong> {foundUser.email}</div>
                  <div><strong>Member since:</strong> {new Date(foundUser.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Phone</label>
                <Input
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="(555) 123-4567"
                />
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Budget Range</label>
                <Input
                  value={newClient.budget_range}
                  onChange={(e) => setNewClient({...newClient, budget_range: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="$300,000 - $500,000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Property Type</label>
                <Input
                  value={newClient.property_type}
                  onChange={(e) => setNewClient({...newClient, property_type: e.target.value})}
                  className="bg-white/5 border-white/20 text-white"
                  placeholder="Single Family Home"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300">Notes</label>
              <Textarea
                value={newClient.notes}
                onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                className="bg-white/5 border-white/20 text-white"
                placeholder="Any additional notes about this client..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddingClient(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateClient}
              disabled={!foundUser}
              className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              Add Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};