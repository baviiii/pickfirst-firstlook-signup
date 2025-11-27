import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  X, 
  Edit2, 
  Check, 
  Building2, 
  Home, 
  Briefcase,
  MapPin,
  DollarSign,
  Users
} from 'lucide-react';
import { AgentSpecialtyService, AgentSpecialty } from '@/services/agentSpecialtyService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AgentSpecialtyManagerProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

const SPECIALTY_ICONS: { [key: string]: React.ReactNode } = {
  'residential': <Home className="h-4 w-4" />,
  'commercial': <Building2 className="h-4 w-4" />,
  'luxury': <DollarSign className="h-4 w-4" />,
  'investment': <Briefcase className="h-4 w-4" />,
  'first-time buyers': <Users className="h-4 w-4" />,
  'relocation': <MapPin className="h-4 w-4" />,
};

const COMMON_SPECIALTIES = [
  'Residential Sales',
  'Commercial Real Estate',
  'Luxury Properties',
  'Investment Properties',
  'First-Time Buyers',
  'Relocation Services',
  'Property Management',
  'Land Development',
  'Rental Properties',
  'Foreclosure Properties',
  'New Construction',
  'Historic Properties',
  'Waterfront Properties',
  'Rural Properties',
  'Condominiums',
  'Townhouses',
  'Single Family Homes',
  'Multi-Family Properties',
  'Industrial Properties',
  'Retail Properties'
];

export const AgentSpecialtyManager: React.FC<AgentSpecialtyManagerProps> = ({
  className = '',
  showTitle = true,
  compact = false
}) => {
  const { user } = useAuth();
  const [specialties, setSpecialties] = useState<AgentSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      loadSpecialties();
    }
  }, [user]);

  const loadSpecialties = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await AgentSpecialtyService.getAgentSpecialties(user.id);
      if (error) throw error;
      setSpecialties(data || []);
    } catch (error) {
      console.error('Error loading specialties:', error);
      toast.error('Failed to load specialties');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecialty = async () => {
    if (!user || !newSpecialty.trim()) return;

    const specialty = newSpecialty.trim();
    
    // Check if specialty already exists
    const { exists } = await AgentSpecialtyService.specialtyExists(user.id, specialty);
    if (exists) {
      toast.error('This specialty already exists');
      return;
    }

    try {
      const { data, error } = await AgentSpecialtyService.addSpecialty(user.id, specialty);
      if (error) throw error;
      
      setSpecialties(prev => [data!, ...prev]);
      setNewSpecialty('');
      toast.success('Specialty added successfully');
    } catch (error) {
      console.error('Error adding specialty:', error);
      toast.error('Failed to add specialty');
    }
  };

  const handleRemoveSpecialty = async (specialtyId: string) => {
    try {
      const { error } = await AgentSpecialtyService.removeSpecialty(specialtyId);
      if (error) throw error;
      
      setSpecialties(prev => prev.filter(s => s.id !== specialtyId));
      toast.success('Specialty removed successfully');
    } catch (error) {
      console.error('Error removing specialty:', error);
      toast.error('Failed to remove specialty');
    }
  };

  const handleEditSpecialty = (specialty: AgentSpecialty) => {
    setEditingId(specialty.id);
    setEditingValue(specialty.specialty);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingValue.trim()) return;

    try {
      const { data, error } = await AgentSpecialtyService.updateSpecialty(editingId, editingValue);
      if (error) throw error;
      
      setSpecialties(prev => prev.map(s => s.id === editingId ? data! : s));
      setEditingId(null);
      setEditingValue('');
      toast.success('Specialty updated successfully');
    } catch (error) {
      console.error('Error updating specialty:', error);
      toast.error('Failed to update specialty');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewSpecialty(suggestion);
    setShowSuggestions(false);
  };

  const getSpecialtyIcon = (specialty: string) => {
    const lowerSpecialty = specialty.toLowerCase();
    for (const [key, icon] of Object.entries(SPECIALTY_ICONS)) {
      if (lowerSpecialty.includes(key)) {
        return icon;
      }
    }
    return <Briefcase className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card className={`pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pickfirst-yellow"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 ${className}`}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-pickfirst-yellow" />
            {compact ? 'Specialties' : 'Real Estate Specialties'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {compact 
              ? 'Manage your areas of expertise' 
              : 'Add and manage your real estate specialties to help clients find the right agent'
            }
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {/* Add New Specialty */}
        <div className="space-y-2">
          <Label htmlFor="new-specialty" className="text-foreground">Add New Specialty</Label>
          <div className="relative">
            <Input
              id="new-specialty"
              value={newSpecialty}
              onChange={(e) => {
                setNewSpecialty(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(newSpecialty.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g., Luxury Properties, First-Time Buyers..."
              className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-pickfirst-yellow/50"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 pickfirst-glass bg-card/95 border border-pickfirst-yellow/30 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {COMMON_SPECIALTIES
                  .filter(s => s.toLowerCase().includes(newSpecialty.toLowerCase()))
                  .slice(0, 8)
                  .map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-foreground hover:bg-pickfirst-yellow/10 hover:text-pickfirst-yellow flex items-center gap-2 transition-colors"
                    >
                      {getSpecialtyIcon(suggestion)}
                      {suggestion}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <Button 
            onClick={handleAddSpecialty}
            disabled={!newSpecialty.trim()}
            className="bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Specialty
          </Button>
        </div>

        {/* Current Specialties */}
        {specialties.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-foreground">Your Specialties ({specialties.length})</Label>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <div key={specialty.id} className="flex items-center gap-2">
                  {editingId === specialty.id ? (
                    <div className="flex items-center gap-1 bg-background/50 rounded-md px-2 py-1 border border-border">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-6 text-sm bg-transparent border-none text-foreground p-0"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Badge 
                      variant="secondary" 
                      className="bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30 hover:bg-pickfirst-yellow/30 flex items-center gap-1 px-3 py-1"
                    >
                      {getSpecialtyIcon(specialty.specialty)}
                      <span>{specialty.specialty}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSpecialty(specialty)}
                        className="h-4 w-4 p-0 ml-1 hover:bg-pickfirst-yellow/20 text-pickfirst-yellow hover:text-pickfirst-amber"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveSpecialty(specialty.id)}
                        className="h-4 w-4 p-0 ml-1 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No specialties added yet</p>
            <p className="text-sm">Add your first specialty above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
