import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { PropertyService, CreatePropertyListingData } from '@/services/propertyService';
import { toast } from 'sonner';
import { Loader2, Upload, X, ImageIcon } from 'lucide-react';

interface PropertyListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PropertyListingModal = ({ open, onOpenChange, onSuccess }: PropertyListingModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePropertyListingData>({
    title: '',
    description: '',
    property_type: '',
    price: 0,
    bedrooms: undefined,
    bathrooms: undefined,
    square_feet: undefined,
    lot_size: undefined,
    year_built: undefined,
    address: '',
    city: '',
    state: '',
    zip_code: '',
    latitude: undefined,
    longitude: undefined,
    features: [],
    images: [],
    contact_phone: '',
    contact_email: '',
    showing_instructions: ''
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleInputChange = (field: keyof CreatePropertyListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + imageFiles.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // Create previews
    const newPreviews = [...imagePreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = formData.features || [];
    if (currentFeatures.includes(feature)) {
      handleInputChange('features', currentFeatures.filter(f => f !== feature));
    } else {
      handleInputChange('features', [...currentFeatures, feature]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll simulate image upload URLs
      // In a real app, you'd upload to Supabase Storage or another service
      const imageUrls = imageFiles.map((_, index) => `https://placeholder-image-${index}.jpg`);
      
      const { error } = await PropertyService.createListing({
        ...formData,
        images: imageUrls
      });

      if (error) {
        toast.error(error.message || 'Failed to create listing');
      } else {
        toast.success('Property listing created successfully!');
        onSuccess?.();
        onOpenChange(false);
        // Reset form
        setFormData({
          title: '',
          description: '',
          property_type: '',
          price: 0,
          bedrooms: undefined,
          bathrooms: undefined,
          square_feet: undefined,
          lot_size: undefined,
          year_built: undefined,
          address: '',
          city: '',
          state: '',
          zip_code: '',
          latitude: undefined,
          longitude: undefined,
          features: [],
          images: [],
          contact_phone: '',
          contact_email: '',
          showing_instructions: ''
        });
        setImageFiles([]);
        setImagePreviews([]);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const availableFeatures = [
    'Pool', 'Garage', 'Garden', 'Balcony', 'Fireplace', 'Air Conditioning',
    'Heating', 'Dishwasher', 'Washer/Dryer', 'Gym', 'Security System', 'Parking'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 border border-pickfirst-yellow/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl pickfirst-gradient-yellow-amber-text">Create New Property Listing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="text-white">Property Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Beautiful Family Home"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="property_type" className="text-white">Property Type</Label>
              <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the property features and highlights..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
            />
          </div>

          {/* Price and Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="price" className="text-white">Price *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', Number(e.target.value))}
                placeholder="500000"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="bedrooms" className="text-white">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms || ''}
                onChange={(e) => handleInputChange('bedrooms', Number(e.target.value) || undefined)}
                placeholder="3"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="bathrooms" className="text-white">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms || ''}
                onChange={(e) => handleInputChange('bathrooms', Number(e.target.value) || undefined)}
                placeholder="2.5"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="square_feet" className="text-white">Square Feet</Label>
              <Input
                id="square_feet"
                type="number"
                value={formData.square_feet || ''}
                onChange={(e) => handleInputChange('square_feet', Number(e.target.value) || undefined)}
                placeholder="2000"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="address" className="text-white">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Main Street"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="city" className="text-white">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="New York"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-white">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="NY"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Images Upload */}
          <div>
            <Label className="text-white">Property Images</Label>
            <div className="mt-2">
              <Label htmlFor="images" className="cursor-pointer">
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-pickfirst-yellow/40 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400">Click to upload images (max 10)</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF up to 5MB each</p>
                </div>
              </Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-white/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features */}
          <div>
            <Label className="text-white">Property Features</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {availableFeatures.map(feature => (
                <Button
                  key={feature}
                  type="button"
                  variant={formData.features?.includes(feature) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFeatureToggle(feature)}
                  className={formData.features?.includes(feature) 
                    ? "bg-pickfirst-yellow text-black hover:bg-pickfirst-amber" 
                    : "text-gray-300 border-white/20 hover:bg-white/10"
                  }
                >
                  {feature}
                </Button>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_phone" className="text-white">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="contact_email" className="text-white">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="agent@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Showing Instructions */}
          <div>
            <Label htmlFor="showing_instructions" className="text-white">Showing Instructions</Label>
            <Textarea
              id="showing_instructions"
              value={formData.showing_instructions}
              onChange={(e) => handleInputChange('showing_instructions', e.target.value)}
              placeholder="Please call 24 hours in advance to schedule a showing..."
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-gray-300 border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};