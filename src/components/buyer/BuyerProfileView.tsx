import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Building, MessageSquare, Home, DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BuyerProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
  // Buyer-specific fields
  budget_range?: string;
  preferred_areas?: string[];
  property_type_preferences?: string[];
  first_time_buyer?: boolean;
  financing_pre_approved?: boolean;
  move_in_timeline?: string;
  total_inquiries?: number;
  favorite_properties_count?: number;
}

interface BuyerProfileViewProps {
  buyerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStartConversation?: () => void;
}

export const BuyerProfileView = ({ buyerId, isOpen, onClose, onStartConversation }: BuyerProfileViewProps) => {
  const [buyer, setBuyer] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && buyerId) {
      loadBuyerProfile();
    }
  }, [isOpen, buyerId]);

  const loadBuyerProfile = async () => {
    if (!buyerId) return;
    
    setLoading(true);
    try {
      // Get basic profile information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', buyerId)
        .eq('role', 'buyer')
        .single();

      if (profileError || !profile) {
        toast.error('Failed to load buyer profile');
        return;
      }

      // Get preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', buyerId)
        .maybeSingle();

      // Get statistics
      const { count: inquiriesCount } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', buyerId);

      const { count: favoritesCount } = await supabase
        .from('property_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', buyerId);

      const buyerProfile: BuyerProfile = {
        ...profile,
        // Add preferences data
        budget_range: preferences?.budget_range,
        preferred_areas: preferences?.preferred_areas,
        property_type_preferences: preferences?.property_type_preferences,
        // Calculate buyer-specific insights
        first_time_buyer: !inquiriesCount || inquiriesCount < 3, // Heuristic for first-time buyer
        financing_pre_approved: false, // Would come from preferences if we had this field
        move_in_timeline: 'flexible', // Would come from preferences if we had this field
        total_inquiries: inquiriesCount || 0,
        favorite_properties_count: favoritesCount || 0,
      };

      setBuyer(buyerProfile);
    } catch (error) {
      console.error('Error loading buyer profile:', error);
      toast.error('Failed to load buyer profile');
    } finally {
      setLoading(false);
    }
  };

  const getBudgetDisplay = (budgetRange?: string) => {
    if (!budgetRange) return 'Not specified';
    const [min, max] = budgetRange.split('-').map(Number);
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  };

  const getBuyerExperienceLevel = (buyer: BuyerProfile) => {
    if (buyer.first_time_buyer) return { level: 'First-time Buyer', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if ((buyer.total_inquiries || 0) > 10) return { level: 'Experienced Buyer', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    return { level: 'Active Buyer', color: 'bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30' };
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
            <span className="ml-3 text-white">Loading buyer profile...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!buyer) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Buyer Profile</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-white text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="mb-4">Unable to load buyer profile</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const experienceLevel = getBuyerExperienceLevel(buyer);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-pickfirst-yellow/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg sm:text-xl">Buyer Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Buyer Header */}
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
              <AvatarImage src={buyer.avatar_url} />
              <AvatarFallback className="bg-pickfirst-yellow text-black text-xl sm:text-2xl">
                {buyer.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{buyer.full_name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <Badge className={experienceLevel.color}>
                  {experienceLevel.level}
                </Badge>
                <span className="text-sm text-gray-400">
                  Member since {new Date(buyer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
              
              {buyer.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <span className="text-sm text-gray-300 truncate">{buyer.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pickfirst-yellow flex-shrink-0" />
                <span className="text-sm text-gray-300 truncate">{buyer.email}</span>
              </div>
              {buyer.phone && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pickfirst-yellow flex-shrink-0" />
                  <span className="text-sm text-gray-300">{buyer.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Preferences */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <Home className="h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow" />
                Property Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pickfirst-yellow flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-white">Budget Range</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300">{getBudgetDisplay(buyer.budget_range)}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pickfirst-yellow flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-white">Preferred Areas</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 line-clamp-2">
                    {buyer.preferred_areas && buyer.preferred_areas.length > 0 
                      ? buyer.preferred_areas.join(', ') 
                      : 'No specific preference'}
                  </p>
                </div>
              </div>

              {buyer.property_type_preferences && buyer.property_type_preferences.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pickfirst-yellow flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-white">Property Types</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {buyer.property_type_preferences.map((type, index) => (
                      <Badge key={index} className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30 text-xs">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buyer Activity & Insights */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-pickfirst-yellow" />
                Activity & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-pickfirst-yellow">{buyer.total_inquiries}</div>
                  <div className="text-[10px] sm:text-sm text-gray-400">Property Inquiries</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-pickfirst-yellow">{buyer.favorite_properties_count}</div>
                  <div className="text-[10px] sm:text-sm text-gray-400">Saved Properties</div>
                </div>
              </div>
              
              <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm min-w-0">
                    <p className="text-blue-400 font-medium">Agent Tips:</p>
                    <p className="text-gray-300 mt-1 leading-relaxed">
                      {buyer.first_time_buyer 
                        ? "This is likely a first-time buyer. Consider providing extra guidance on the buying process, financing options, and market insights."
                        : `This buyer has made ${buyer.total_inquiries} inquiries and shows active engagement. They may be ready to make decisions quickly.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          {buyer.bio && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">{buyer.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <Button
              onClick={onStartConversation}
              className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90 h-9 sm:h-10"
            >
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="text-sm sm:text-base">Start Conversation</span>
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 h-9 sm:h-10 sm:min-w-[100px]"
            >
              <span className="text-sm sm:text-base">Close</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};