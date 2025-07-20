import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyService, CreatePropertyListingData } from '@/services/propertyService';
import { toast } from 'sonner';
import { Loader2, Home, MapPin, DollarSign, Bed, Bath, Ruler, Calendar, Phone, Mail } from 'lucide-react';

interface PropertyListingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PropertyListingForm = ({ onSuccess, onCancel }: PropertyListingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePropertyListingData>({
    title: '',
    description: '',
    property_type: 'house',
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    square_feet: 0,
    lot_size: 0,
    year_built: 0,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_phone: '',
    contact_email: '',
    showing_instructions: '',
    features: [],
    images: []
  });

  const propertyTypes = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'other', label: 'Other' }
  ];

  const commonFeatures = [
    'pool', 'garage', 'fireplace', 'basement', 'attic', 'deck', 'patio',
    'garden', 'central_air', 'heating', 'dishwasher', 'washer_dryer',
    'hardwood_floors', 'carpet', 'tile_floors', 'granite_countertops',
    'stainless_steel_appliances', 'walk_in_closet', 'master_suite'
  ];

  const handleInputChange = (field: keyof CreatePropertyListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...(prev.features || []), feature]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await PropertyService.createListing(formData);
      
      if (error) {
        toast.error(error.message || 'Failed to create listing');
      } else {
        toast.success('Property listing created successfully! It will be reviewed by our team.');
        onSuccess?.();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Home className="w-6 h-6 text-pickfirst-yellow" />
          Add New Property Listing
        </CardTitle>
        <CardDescription className="text-gray-300">
          Create a new property listing for potential buyers to discover
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white font-semibold">Property Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Beautiful 3BR Family Home"
                className="bg-white/5 border border-white/20 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="property_type" className="text-white font-semibold">Property Type *</Label>
              <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                <SelectTrigger className="bg-white/5 border border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border border-white/20">
                  {propertyTypes.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-white">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white font-semibold">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the property, its features, and what makes it special..."
              className="bg-white/5 border border-white/20 text-white min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Price and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-white font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-pickfirst-yellow" />
                Price *
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder="500000"
                className="bg-white/5 border border-white/20 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-white font-semibold flex items-center gap-2">
                <Bed className="w-4 h-4 text-pickfirst-yellow" />
                Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                placeholder="3"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-white font-semibold flex items-center gap-2">
                <Bath className="w-4 h-4 text-pickfirst-yellow" />
                Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value) || 0)}
                placeholder="2.5"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="square_feet" className="text-white font-semibold flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pickfirst-yellow" />
                Square Feet
              </Label>
              <Input
                id="square_feet"
                type="number"
                value={formData.square_feet}
                onChange={(e) => handleInputChange('square_feet', parseInt(e.target.value) || 0)}
                placeholder="2000"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <Label className="text-white font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pickfirst-yellow" />
              Property Address
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-white">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="New York"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state" className="text-white">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="NY"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip_code" className="text-white">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="10001"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-white font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4 text-pickfirst-yellow" />
                Contact Phone
              </Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-white font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-pickfirst-yellow" />
                Contact Email
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="agent@example.com"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <Label className="text-white font-semibold">Property Features</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {commonFeatures.map(feature => (
                <Button
                  key={feature}
                  type="button"
                  variant={formData.features?.includes(feature) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFeatureToggle(feature)}
                  className={formData.features?.includes(feature) 
                    ? "bg-pickfirst-yellow text-black" 
                    : "bg-black text-white border-white/20 hover:border-pickfirst-yellow/30"
                  }
                >
                  {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Button>
              ))}
            </div>
          </div>

          {/* Showing Instructions */}
          <div className="space-y-2">
            <Label htmlFor="showing_instructions" className="text-white font-semibold">Showing Instructions</Label>
            <Textarea
              id="showing_instructions"
              value={formData.showing_instructions}
              onChange={(e) => handleInputChange('showing_instructions', e.target.value)}
              placeholder="Instructions for showing the property to potential buyers..."
              className="bg-white/5 border border-white/20 text-white"
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="text-white border-white/20 hover:border-pickfirst-yellow/30"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-pickfirst-yellow text-black hover:bg-pickfirst-yellow/90"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Listing
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 