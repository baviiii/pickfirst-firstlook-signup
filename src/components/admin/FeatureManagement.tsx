import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings2, Edit, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FeatureConfig {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  free_tier_enabled: boolean;
  premium_tier_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const FeatureManagement = () => {
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureConfig | null>(null);
  const [formData, setFormData] = useState({
    feature_key: '',
    feature_name: '',
    description: '',
    free_tier_enabled: false,
    premium_tier_enabled: true
  });

  const getFeatureDescription = (featureKey: string): string => {
    const descriptions: { [key: string]: string } = {
      // === NEW CLEAN FEATURE GATES ===
      // Search & Discovery
      'basic_search': 'Standard property search functionality',
      'advanced_search_filters': 'Advanced property filtering options',
      'market_insights': 'Access to market analytics and insights',
      
      // Property Management
      'favorites_basic': 'Save up to 10 favorite properties',
      'favorites_unlimited': 'Save unlimited favorite properties',
      'property_comparison_basic': 'Compare up to 2 properties side by side',
      'property_comparison_unlimited': 'Compare unlimited properties side by side',
      'property_alerts_basic': 'Up to 3 customized property alerts',
      'property_alerts_unlimited': 'Unlimited customized property alerts',
      
      // Communication
      'agent_messaging': 'Send messages to agents about properties',
      'message_history_30days': 'Access to 30 days of message history',
      'message_history_unlimited': 'Access to complete message history',
      'priority_support': 'Get priority response from agents',
      
      // Notifications
      'email_notifications': 'Receive email notifications',
      'personalized_alerts': 'Enhanced property recommendations based on search preferences',
      'instant_notifications': 'Real-time push notifications',
      
      // === LEGACY FEATURE GATES (for backward compatibility) ===
      'limited_favorites': '[LEGACY] Save up to 10 favorite properties',
      'standard_agent_contact': '[LEGACY] Basic agent contact functionality',
      'property_inquiry_messaging': '[LEGACY] Send messages to agents about specific properties',
      'unlimited_favorites': '[LEGACY] Save unlimited favorite properties',
      'priority_agent_connections': '[LEGACY] Get priority response from agents',
      'email_property_alerts': '[LEGACY] Receive email notifications for new properties',
      'direct_messaging': '[LEGACY] Basic contact form functionality for reaching agents',
      'live_messaging': '[LEGACY] Real-time messaging with agents and property inquiries',
      'message_history_access': '[LEGACY] Access to complete conversation history with agents',
      'personalized_property_notifications': '[LEGACY] Enhanced property recommendations',
      'property_comparison': '[LEGACY] Compare multiple properties side by side',
      'property_alerts': '[LEGACY] Customized alerts for new properties matching criteria'
    };
    return descriptions[featureKey] || 'No description available';
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_configurations')
        .select('*')
        .order('feature_name');

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('Failed to fetch feature configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.feature_key || !formData.feature_name) {
        toast.error('Feature key and name are required');
        return;
      }

      if (editingFeature) {
        const { error } = await supabase
          .from('feature_configurations')
          .update({
            feature_name: formData.feature_name,
            description: formData.description,
            free_tier_enabled: formData.free_tier_enabled,
            premium_tier_enabled: formData.premium_tier_enabled
          })
          .eq('id', editingFeature.id);

        if (error) throw error;
        toast.success('Feature updated successfully');
      } else {
        const { error } = await supabase
          .from('feature_configurations')
          .insert([formData]);

        if (error) throw error;
        toast.success('Feature created successfully');
      }

      setDialogOpen(false);
      setEditingFeature(null);
      setFormData({
        feature_key: '',
        feature_name: '',
        description: '',
        free_tier_enabled: false,
        premium_tier_enabled: true
      });
      fetchFeatures();
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature configuration');
    }
  };

  const handleEdit = (feature: FeatureConfig) => {
    setEditingFeature(feature);
    setFormData({
      feature_key: feature.feature_key,
      feature_name: feature.feature_name,
      description: feature.description || '',
      free_tier_enabled: feature.free_tier_enabled,
      premium_tier_enabled: feature.premium_tier_enabled
    });
    setDialogOpen(true);
  };

  const handleDelete = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature configuration?')) return;

    try {
      const { error } = await supabase
        .from('feature_configurations')
        .delete()
        .eq('id', featureId);

      if (error) throw error;
      toast.success('Feature deleted successfully');
      fetchFeatures();
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature configuration');
    }
  };

  const toggleFeatureAccess = async (featureId: string, tier: 'free' | 'premium', enabled: boolean) => {
    try {
      const updateData = tier === 'free' 
        ? { free_tier_enabled: enabled }
        : { premium_tier_enabled: enabled };

      const { error } = await supabase
        .from('feature_configurations')
        .update(updateData)
        .eq('id', featureId);

      if (error) throw error;
      
      toast.success(`${tier} tier access ${enabled ? 'enabled' : 'disabled'}`);
      fetchFeatures();
    } catch (error) {
      console.error('Error updating feature access:', error);
      toast.error('Failed to update feature access');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Feature Gate Management
            </CardTitle>
            <CardDescription>
              Control which features are available to different subscription tiers. Changes take effect immediately for all users.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingFeature(null);
                setFormData({
                  feature_key: '',
                  feature_name: '',
                  description: '',
                  free_tier_enabled: false,
                  premium_tier_enabled: true
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingFeature ? 'Edit Feature' : 'Add New Feature'}
                </DialogTitle>
                <DialogDescription>
                  Configure feature access for different subscription tiers
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="feature_key">Feature Key</Label>
                  <Input
                    id="feature_key"
                    value={formData.feature_key}
                    onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                    placeholder="e.g., advanced_search"
                    disabled={!!editingFeature}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feature_name">Feature Name</Label>
                  <Input
                    id="feature_name"
                    value={formData.feature_name}
                    onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                    placeholder="e.g., Advanced Search"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Feature description..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="free_tier"
                    checked={formData.free_tier_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, free_tier_enabled: checked })}
                  />
                  <Label htmlFor="free_tier">Enable for Free Tier</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="premium_tier"
                    checked={formData.premium_tier_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, premium_tier_enabled: checked })}
                  />
                  <Label htmlFor="premium_tier">Enable for Premium Tier</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave}>
                  {editingFeature ? 'Update' : 'Create'} Feature
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Free Tier</TableHead>
              <TableHead>Premium Tier</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : features.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No features configured</TableCell>
              </TableRow>
            ) : (
              features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{feature.feature_name}</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {feature.feature_key}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">
                      {feature.description || getFeatureDescription(feature.feature_key)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={feature.free_tier_enabled}
                        onCheckedChange={(checked) => 
                          toggleFeatureAccess(feature.id, 'free', checked)
                        }
                      />
                      <Badge variant={feature.free_tier_enabled ? 'default' : 'secondary'}>
                        {feature.free_tier_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={feature.premium_tier_enabled}
                        onCheckedChange={(checked) => 
                          toggleFeatureAccess(feature.id, 'premium', checked)
                        }
                      />
                      <Badge variant={feature.premium_tier_enabled ? 'default' : 'secondary'}>
                        {feature.premium_tier_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(feature)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(feature.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};