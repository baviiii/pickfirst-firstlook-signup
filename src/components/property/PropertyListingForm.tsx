import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyService, CreatePropertyListingData } from '@/services/propertyService';
import { googleMapsService } from '@/services/googleMapsService';
import { toast } from 'sonner';
import { Loader2, Home, MapPin, DollarSign, Bed, Bath, Ruler, Calendar, Phone, Mail, Upload, X, ImageIcon, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { withErrorBoundary } from '@/components/ui/error-boundary';

interface PropertyListingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface AddressSuggestion {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const PropertyListingFormComponent = ({ onSuccess, onCancel }: PropertyListingFormProps) => {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
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

  // Australian states and territories
  const australianStates = [
    { value: 'NSW', label: 'New South Wales' },
    { value: 'VIC', label: 'Victoria' },
    { value: 'QLD', label: 'Queensland' },
    { value: 'WA', label: 'Western Australia' },
    { value: 'SA', label: 'South Australia' },
    { value: 'TAS', label: 'Tasmania' },
    { value: 'ACT', label: 'Australian Capital Territory' },
    { value: 'NT', label: 'Northern Territory' }
  ];

  // Handle address search with Google Places Autocomplete
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingAddress(true);
    try {
      // Use your Supabase edge function for Places API
      const results = await googleMapsService.searchPlaces(query, 'AU'); // Australia first
      setAddressSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Address search error:', error);
      toast.error('Failed to search addresses');
    } finally {
      setSearchingAddress(false);
    }
  };

  // Handle address selection from suggestions
  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    try {
      setSearchingAddress(true);
      
      // Get detailed place information
      const placeDetails = await googleMapsService.getPlaceDetails(suggestion.place_id);
      
      if (placeDetails) {
        // Parse address components
        const addressComponents = placeDetails.address_components;
        let streetNumber = '';
        let route = '';
        let locality = '';
        let administrativeArea = '';
        let postalCode = '';
        let country = '';

        addressComponents.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('locality')) {
            locality = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            administrativeArea = component.short_name;
          } else if (types.includes('postal_code')) {
            postalCode = component.long_name;
          } else if (types.includes('country')) {
            country = component.short_name;
          }
        });

        // Update form with parsed address
        const fullAddress = streetNumber && route ? `${streetNumber} ${route}` : route;
        
        setFormData(prev => ({
          ...prev,
          address: fullAddress,
          city: locality,
          state: administrativeArea,
          zip_code: postalCode
        }));

        // Auto-generate coordinates
        if (placeDetails.geometry?.location) {
          const location = placeDetails.geometry.location;
          setCoordinates(location);
          setGeocodingStatus('success');
          toast.success('Address found and coordinates generated!');
        }

        // Close suggestions
        setShowSuggestions(false);
        setAddressSuggestions([]);
        
        // Focus on next field
        if (addressInputRef.current) {
          addressInputRef.current.blur();
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      toast.error('Failed to get address details');
    } finally {
      setSearchingAddress(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof CreatePropertyListingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset geocoding status when address fields change
    if (['address', 'city', 'state', 'zip_code'].includes(field)) {
      setGeocodingStatus('idle');
      setCoordinates(null);
    }

    // Handle address search for autocomplete
    if (field === 'address') {
      handleAddressSearch(value);
    }
  };

  // Auto-geocode address when all address fields are filled
  const autoGeocodeAddress = async () => {
    const { address, city, state, zip_code } = formData;
    
    if (!address || !city || !state || !zip_code) {
      return;
    }

    const fullAddress = `${address}, ${city}, ${state} ${zip_code}`;
    
    setGeocodingStatus('loading');
    
    try {
      const results = await googleMapsService.geocodeAddress(fullAddress);
      
      if (results.length > 0) {
        const location = results[0].geometry.location;
        setCoordinates(location);
        setGeocodingStatus('success');
        toast.success('Address coordinates found!');
      } else {
        setGeocodingStatus('error');
        toast.error('Could not find coordinates for this address');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setGeocodingStatus('error');
      toast.error('Failed to get address coordinates');
    }
  };

  // Trigger geocoding when address fields are complete
  const handleAddressBlur = () => {
    const { address, city, state, zip_code } = formData;
    if (address && city && state && zip_code) {
      autoGeocodeAddress();
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...(prev.features || []), feature]
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.price || formData.price === 0 || !formData.address || !formData.city || !formData.state || !formData.zip_code) {
      toast.error('Please fill in all required fields (Title, Price, and Address)');
      return;
    }
    
    // Check if we have coordinates
    if (!coordinates) {
      toast.error('Please ensure the address is valid and coordinates are found');
      return;
    }
    
    setLoading(true);

    try {
      // Add coordinates to the form data
      const listingDataWithCoordinates = {
        ...formData,
        latitude: coordinates.lat,
        longitude: coordinates.lng
      };
      
      let result;
      
      if (imageFiles.length > 0) {
        // Use the new method with image upload
        const { images, ...listingDataWithoutImages } = listingDataWithCoordinates;
        result = await PropertyService.createListingWithImages(
          listingDataWithoutImages,
          imageFiles
        );
      } else {
        // Use the regular method without images
        result = await PropertyService.createListing(listingDataWithCoordinates);
      }
      
      if (result.error) {
        toast.error(result.error.message || 'Failed to create listing');
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
                value={formData.price === 0 ? '' : formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                placeholder="Enter price (e.g., 500000)"
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
                value={formData.bedrooms === 0 ? '' : formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                placeholder="Number of bedrooms (e.g., 3)"
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
                value={formData.bathrooms === 0 ? '' : formData.bathrooms}
                onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value) || 0)}
                placeholder="Number of bathrooms (e.g., 2.5)"
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
                value={formData.square_feet === 0 ? '' : formData.square_feet}
                onChange={(e) => handleInputChange('square_feet', parseInt(e.target.value) || 0)}
                placeholder="Property size in sq ft (e.g., 2000)"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
          </div>

          {/* Address with Auto-Complete */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pickfirst-yellow" />
                Property Address
              </Label>
              
              {/* Geocoding Status Indicator */}
              <div className="flex items-center gap-2">
                {geocodingStatus === 'loading' && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Finding coordinates...</span>
                  </div>
                )}
                {geocodingStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Coordinates found!</span>
                  </div>
                )}
                {geocodingStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Address not found</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="address" className="text-white">Street Address *</Label>
                <div className="relative">
                  <Input
                    ref={addressInputRef}
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    onBlur={handleAddressBlur}
                    placeholder="Start typing address (Australia first)"
                    className="bg-white/5 border border-white/20 text-white pr-10"
                    required
                  />
                  {searchingAddress && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {!searchingAddress && formData.address && (
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  )}
                </div>
                
                {/* Address Suggestions Dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {addressSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.place_id}
                        type="button"
                        onClick={() => handleAddressSelect(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900">
                          {suggestion.structured_formatting.main_text}
                        </div>
                        <div className="text-sm text-gray-500">
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  onBlur={handleAddressBlur}
                  placeholder="City"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state" className="text-white">State *</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                  <SelectTrigger className="bg-white/5 border border-white/20 text-white">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border border-white/20">
                    {australianStates.map(state => (
                      <SelectItem key={state.value} value={state.value} className="text-white">
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip_code" className="text-white">ZIP Code *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  onBlur={handleAddressBlur}
                  placeholder="ZIP Code"
                  className="bg-white/5 border border-white/20 text-white"
                  required
                />
              </div>
            </div>
            
            {/* Coordinates Display */}
            {coordinates && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Location Coordinates:</span>
                </div>
                <div className="text-sm text-green-300 mt-1">
                  Latitude: {coordinates.lat.toFixed(6)}, Longitude: {coordinates.lng.toFixed(6)}
                </div>
              </div>
            )}
            
            {/* Manual Geocoding Button */}
            <Button
              type="button"
              variant="outline"
              onClick={autoGeocodeAddress}
              disabled={!formData.address || !formData.city || !formData.state || !formData.zip_code}
              className="text-white border-white/20 hover:border-pickfirst-yellow/30"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Find Coordinates
            </Button>
          </div>

          {/* Images Upload */}
          <div className="space-y-4">
            <Label className="text-white font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pickfirst-yellow" />
              Property Images
            </Label>
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

// Export with error boundary
export const PropertyListingForm = withErrorBoundary(PropertyListingFormComponent); 