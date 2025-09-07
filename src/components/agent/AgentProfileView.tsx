import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Building, Star, MessageSquare } from 'lucide-react';

interface AgentProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  company?: string;
  avatar_url?: string;
  bio?: string;
  specialties?: string[];
  rating?: number;
  total_sales?: number;
  years_experience?: number;
}

interface AgentProfileViewProps {
  agent: AgentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartConversation?: () => void;
}

export const AgentProfileView = ({ agent, isOpen, onClose, onStartConversation }: AgentProfileViewProps) => {
  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Agent Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Agent Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={agent.avatar_url} />
              <AvatarFallback className="bg-pickfirst-yellow text-black text-2xl">
                {agent.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{agent.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Star className="h-4 w-4 text-pickfirst-yellow fill-current" />
                <span className="text-gray-300">
                  {agent.rating ? `${agent.rating.toFixed(1)}/5` : 'No rating yet'}
                </span>
                {agent.total_sales && (
                  <span className="text-gray-400">• {agent.total_sales} sales</span>
                )}
                {agent.years_experience && (
                  <span className="text-gray-400">• {agent.years_experience} years experience</span>
                )}
              </div>
              
              {agent.company && (
                <div className="flex items-center gap-1 mt-1">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-300">{agent.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-pickfirst-yellow" />
                <span className="text-gray-300">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-pickfirst-yellow" />
                  <span className="text-gray-300">{agent.phone}</span>
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
              className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Conversation
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
