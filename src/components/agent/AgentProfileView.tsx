import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Building, MessageSquare, Calendar, Award, TrendingUp, Home, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { analyticsService } from '@/services/analyticsService';

interface AgentProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  created_at: string;
  // Agent-specific calculated fields
  specialties?: string[];
  total_listings?: number;
  active_listings?: number;
  total_inquiries?: number;
  response_time?: string;
  joined_date?: string;
}

interface AgentProfileViewProps {
  agentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStartConversation?: () => void;
}

export const AgentProfileView = ({ agentId, isOpen, onClose, onStartConversation }: AgentProfileViewProps) => {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && agentId) {
      loadAgentProfile();
    }
  }, [isOpen, agentId]);

  const loadAgentProfile = async () => {
    if (!agentId) return;
    
    setLoading(true);
    try {
      // Get basic profile information from public view (bypasses RLS)
      const { data: profile, error: profileError } = await supabase
        .from('agent_public_profiles')
        .select('*')
        .eq('id', agentId)
        .single();

      if (profileError || !profile) {
        toast.error('Failed to load agent profile');
        return;
      }

      // Get agent statistics
      const { count: totalListings } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId);

      const { count: activeListings } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('status', 'approved');

      const { count: totalInquiries } = await supabase
        .from('property_inquiries')
        .select('property_listings!inner(*)', { count: 'exact', head: true })
        .eq('property_listings.agent_id', agentId);

      // Get specialties
      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('agent_specialties')
        .select('specialty')
        .eq('user_id', agentId);


      // Calculate response time
      const { averageMinutes } = await analyticsService.calculateAverageResponseTime(agentId);

      const formatResponseTime = (minutes: number | null) => {
        if (minutes === null) return 'N/A';
        if (minutes < 1) return '< 1 min';
        if (minutes < 60) return `≈ ${Math.round(minutes)} min`;
        const hours = minutes / 60;
        if (hours < 24) return `≈ ${Math.round(hours)} hours`;
        const days = hours / 24;
        return `> ${Math.floor(days)} days`;
      };

      // Create enhanced agent profile
      const agentProfile: AgentProfile = {
        ...profile,
        total_listings: totalListings || 0,
        active_listings: activeListings || 0,
        total_inquiries: totalInquiries || 0,
        response_time: formatResponseTime(averageMinutes),
        specialties: specialtiesData?.map(s => s.specialty) || [],
        joined_date: profile.created_at,
      };

      setAgent(agentProfile);
    } catch (error) {
      console.error('Error loading agent profile:', error);
      toast.error('Failed to load agent profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
            <span className="ml-3 text-white">Loading agent profile...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!agent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Agent Profile</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-white text-center">
            <p className="mb-4">Unable to load agent profile</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Agent Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage src={agent.avatar_url} />
              <AvatarFallback className="bg-pickfirst-yellow text-black text-2xl">
                {agent.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white mb-2">{agent.full_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30">
                  <Home className="h-3 w-3 mr-1" />
                  {agent.total_listings} listings
                </Badge>
                <span className="text-sm text-gray-400">
                  Member since {new Date(agent.joined_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
              
              {agent.company && (
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{agent.company}</span>
                </div>
              )}

              {agent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{agent.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Agent Performance Stats */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pickfirst-yellow" />
                Performance & Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-pickfirst-yellow">{agent.active_listings}</div>
                  <div className="text-sm text-gray-400 mt-1">Active Listings</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-pickfirst-yellow">{agent.total_listings}</div>
                  <div className="text-sm text-gray-400 mt-1">Total Listings</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-pickfirst-yellow">{agent.total_inquiries}</div>
                  <div className="text-sm text-gray-400 mt-1">Inquiries</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-pickfirst-yellow">{agent.response_time}</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Response</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-pickfirst-yellow" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-pickfirst-yellow flex-shrink-0" />
                <span className="text-sm text-gray-300 break-all">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-pickfirst-yellow flex-shrink-0" />
                  <span className="text-sm text-gray-300">{agent.phone}</span>
                </div>
              )}
              {agent.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-pickfirst-yellow flex-shrink-0" />
                  <a href={agent.website} target="_blank" rel="noopener noreferrer" className="text-sm text-pickfirst-yellow hover:underline break-all">
                    {agent.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bio */}
          {agent.bio && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">{agent.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Specialties */}
          {agent.specialties && agent.specialties.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {agent.specialties.map((specialty, index) => (
                    <Badge key={index} className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onStartConversation}
              className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 min-w-[100px]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
