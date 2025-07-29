import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  Search, 
  Plus, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Star, 
  Edit, 
  Trash2,
  TrendingUp,
  Clock,
  Target,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'website' | 'referral' | 'social' | 'advertising' | 'walk_in';
  status: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'converted' | 'lost';
  budget_range: string;
  preferred_areas: string[];
  property_type: string;
  urgency: 'low' | 'medium' | 'high';
  rating: number;
  notes: string;
  last_contact: string;
  next_follow_up: string;
  created_at: string;
  lead_score: number;
}

export const AgentLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Jessica Martinez',
      email: 'jessica.martinez@email.com',
      phone: '(555) 123-4567',
      source: 'website',
      status: 'new',
      budget_range: '$500,000 - $700,000',
      preferred_areas: ['Downtown', 'Riverside'],
      property_type: 'Condo',
      urgency: 'high',
      rating: 4,
      notes: 'Interested in luxury condos with city views. Moving from out of state.',
      last_contact: '2024-01-24',
      next_follow_up: '2024-01-25',
      created_at: '2024-01-24',
      lead_score: 85
    },
    {
      id: '2',
      name: 'Tom Anderson',
      email: 'tom.anderson@email.com',
      phone: '(555) 987-6543',
      source: 'referral',
      status: 'contacted',
      budget_range: '$300,000 - $450,000',
      preferred_areas: ['Suburbs', 'North Hills'],
      property_type: 'Single Family Home',
      urgency: 'medium',
      rating: 5,
      notes: 'First-time buyer, referred by Sarah Johnson. Needs guidance through process.',
      last_contact: '2024-01-23',
      next_follow_up: '2024-01-26',
      created_at: '2024-01-20',
      lead_score: 75
    },
    {
      id: '3',
      name: 'Emily Foster',
      email: 'emily.foster@email.com',
      phone: '(555) 456-7890',
      source: 'social',
      status: 'qualified',
      budget_range: '$600,000 - $900,000',
      preferred_areas: ['West End', 'Midtown'],
      property_type: 'Townhouse',
      urgency: 'high',
      rating: 4,
      notes: 'Pre-approved for mortgage. Looking to buy within 30 days.',
      last_contact: '2024-01-22',
      next_follow_up: '2024-01-25',
      created_at: '2024-01-15',
      lead_score: 92
    },
    {
      id: '4',
      name: 'Mark Thompson',
      email: 'mark.thompson@email.com',
      phone: '(555) 321-9876',
      source: 'advertising',
      status: 'nurturing',
      budget_range: '$200,000 - $350,000',
      preferred_areas: ['South Side'],
      property_type: 'Apartment',
      urgency: 'low',
      rating: 3,
      notes: 'Investment property buyer. Interested in rental potential.',
      last_contact: '2024-01-20',
      next_follow_up: '2024-01-28',
      created_at: '2024-01-10',
      lead_score: 68
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500';
      case 'contacted': return 'bg-yellow-500/10 text-yellow-500';
      case 'qualified': return 'bg-green-500/10 text-green-500';
      case 'nurturing': return 'bg-purple-500/10 text-purple-500';
      case 'converted': return 'bg-emerald-500/10 text-emerald-500';
      case 'lost': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500/10 text-red-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return '🌐';
      case 'referral': return '👥';
      case 'social': return '📱';
      case 'advertising': return '📢';
      case 'walk_in': return '🚶';
      default: return '📧';
    }
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
      />
    ));
  };

  const handleContactLead = (lead: Lead, method: 'phone' | 'email' | 'message') => {
    switch (method) {
      case 'phone':
        window.open(`tel:${lead.phone}`);
        break;
      case 'email':
        window.open(`mailto:${lead.email}`);
        break;
      case 'message':
        toast.success(`Opening message thread with ${lead.name}`);
        break;
    }
    
    // Update last contact date
    setLeads(prev => prev.map(l => 
      l.id === lead.id ? { ...l, last_contact: new Date().toISOString().split('T')[0] } : l
    ));
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus as Lead['status'] } : lead
    ));
    toast.success('Lead status updated');
  };

  const handleDeleteLead = (leadId: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      setLeads(leads.filter(l => l.id !== leadId));
      toast.success('Lead deleted successfully');
    }
  };

  const isDueForFollowUp = (nextFollowUp: string) => {
    return new Date(nextFollowUp) <= new Date();
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    converted: leads.filter(l => l.status === 'converted').length,
    averageScore: Math.round(leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length),
    dueForFollowUp: leads.filter(l => isDueForFollowUp(l.next_follow_up)).length
  };

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => setIsAddingLead(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Lead
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-pickfirst-yellow">{stats.total}</div>
            <div className="text-sm text-gray-300">Total Leads</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-blue-500/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
            <div className="text-sm text-gray-300">New Leads</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-green-500/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.qualified}</div>
            <div className="text-sm text-gray-300">Qualified</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-emerald-500/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{stats.converted}</div>
            <div className="text-sm text-gray-300">Converted</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-500/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.averageScore}</div>
            <div className="text-sm text-gray-300">Avg Score</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-red-500/20 shadow-xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.dueForFollowUp}</div>
            <div className="text-sm text-gray-300">Follow-ups Due</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="nurturing">Nurturing</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="advertising">Advertising</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 hover:shadow-lg hover:shadow-pickfirst-yellow/10 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" />
                    <AvatarFallback>{lead.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{lead.name}</CardTitle>
                    <CardDescription>{lead.email}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{getSourceIcon(lead.source)}</span>
                    <span className="text-xs text-muted-foreground">{lead.source}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {renderStars(lead.rating)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className={`text-sm font-bold ${getLeadScoreColor(lead.lead_score)}`}>
                    {lead.lead_score}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span>{lead.budget_range}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property:</span>
                  <span>{lead.property_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Areas:</span>
                  <span className="text-right">{lead.preferred_areas.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency:</span>
                  <Badge className={getUrgencyColor(lead.urgency)} variant="secondary">
                    {lead.urgency}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Follow-up:</span>
                  <span className={isDueForFollowUp(lead.next_follow_up) ? 'text-red-500 font-bold' : ''}>
                    {new Date(lead.next_follow_up).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {lead.notes && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {lead.notes}
                </div>
              )}

              <div className="space-y-2">
                <Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="nurturing">Nurturing</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead, 'phone')}
                    className="flex-1 text-green-500 border-green-500/20 hover:bg-green-500/10"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead, 'email')}
                    className="flex-1 text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContactLead(lead, 'message')}
                    className="flex-1 text-purple-500 border-purple-500/20 hover:bg-purple-500/10"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {setSelectedLead(lead); setIsEditingLead(true);}}
                    className="text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/10"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteLead(lead.id)}
                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-xl">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2 text-white">No leads found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' || filterSource !== 'all'
                ? 'No leads match your current filters.' 
                : 'You haven\'t added any leads yet.'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterSource === 'all' && (
              <Button onClick={() => setIsAddingLead(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};