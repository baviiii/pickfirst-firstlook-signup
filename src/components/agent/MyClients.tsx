import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Plus, Phone, Mail, MessageSquare, Calendar, Star, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'lead' | 'past_client';
  budget_range: string;
  preferred_areas: string[];
  property_type: string;
  rating: number;
  notes: string;
  last_contact: string;
  created_at: string;
}

export const MyClients = () => {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(555) 123-4567',
      status: 'active',
      budget_range: '$400,000 - $600,000',
      preferred_areas: ['Downtown', 'Midtown'],
      property_type: 'Single Family Home',
      rating: 5,
      notes: 'Looking for move-in ready home with good schools nearby. Has pre-approval letter.',
      last_contact: '2024-01-24',
      created_at: '2024-01-10'
    },
    {
      id: '2',
      name: 'Mike & Lisa Chen',
      email: 'mike.chen@email.com',
      phone: '(555) 987-6543',
      status: 'lead',
      budget_range: '$800,000 - $1,200,000',
      preferred_areas: ['West End', 'North Hills'],
      property_type: 'Luxury Condo',
      rating: 4,
      notes: 'First time buyers, need guidance through process. Interested in modern amenities.',
      last_contact: '2024-01-23',
      created_at: '2024-01-20'
    },
    {
      id: '3',
      name: 'Robert Davis',
      email: 'robert.davis@email.com',
      phone: '(555) 456-7890',
      status: 'past_client',
      budget_range: '$300,000 - $450,000',
      preferred_areas: ['South Side'],
      property_type: 'Townhouse',
      rating: 5,
      notes: 'Successfully closed on property. Great referral source.',
      last_contact: '2024-01-15',
      created_at: '2023-12-01'
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== clientId));
      toast.success('Client deleted successfully');
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
              {Math.round(clients.reduce((sum, c) => sum + c.rating, 0) / clients.length * 10) / 10}
            </div>
            <div className="text-sm text-gray-300">Avg Rating</div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
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

      {filteredClients.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No clients found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'No clients match your current filters.' 
                : 'You haven\'t added any clients yet.'}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={handleAddClient} className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};