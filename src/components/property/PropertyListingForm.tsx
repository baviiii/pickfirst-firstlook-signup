import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { PhoneInput } from '@/components/ui/phone-input';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { PropertyService, CreatePropertyListingData } from '@/services/propertyService';
import { googleMapsService } from '@/services/googleMapsService';
import { InputSanitizer } from '@/utils/inputSanitization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Home, MapPin, DollarSign, Bed, Bath, Ruler, Phone, Mail, Upload, X, ImageIcon, CheckCircle, AlertCircle, Search, Clock, FileText, Handshake, Lightbulb, Sparkles } from 'lucide-react';

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
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [floorPlanFiles, setFloorPlanFiles] = useState<File[]>([]);
  const [floorPlanPreviews, setFloorPlanPreviews] = useState<string[]>([]);
  const [openInspections, setOpenInspections] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [analyzingDescription, setAnalyzingDescription] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [listingType, setListingType] = useState<'on-market' | 'off-market'>('on-market');
  
  // Pre-populate email from user profile
  const initialEmail = user?.email || (profile as any)?.email || '';
  
  const [formData, setFormData] = useState<CreatePropertyListingData & {
    vendor_ownership_duration?: string;
    vendor_special_conditions?: string;
    vendor_favorable_contracts?: string;
    vendor_motivation?: string;
  }>({
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
    contact_email: initialEmail,
    showing_instructions: '',
    features: [],
    images: [],
    vendor_ownership_duration: '',
    vendor_special_conditions: '',
    vendor_favorable_contracts: '',
    vendor_motivation: ''
  });

  // Update email when user/profile loads
  useEffect(() => {
    if (user?.email || (profile as any)?.email) {
      const email = user?.email || (profile as any)?.email;
      setFormData(prev => ({ ...prev, contact_email: email }));
    }
  }, [user, profile]);

  const propertyTypes = [
    { value: 'house', label: 'House' },
    { value: 'apartment', label: 'Apartment' },
    { value: 'unit', label: 'Unit' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'acreage', label: 'Acreage' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'other', label: 'Other' }
  ];

  const commonFeatures = [
    'Pool', 'Dishwasher', 'Fireplace', 'Deck', 'Patio',
    'Garden', 'Ducted Heating/Cooling', 'Washer/Dryer', 'Hardwood Floors', 'Carpet', 'Tile Floors', 
    'Granite Countertops', 'Stainless Steel Appliances', 'Walk-in Closet', 'Master Suite', 
    'Balcony', 'Study', 'Solar Panels', 'Security System', 'Outdoor Entertainment', 'Ensuite'
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
      const results = await googleMapsService.searchPlaces(query, 'AU');
      setAddressSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
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
    // Allow completely free typing - NO sanitization during input
    // All validation and sanitization happens only on submit
    console.log(`Input change - Field: ${field}, Value: "${value}", Length: ${value?.length}`);
    
    // Store the raw value directly without any processing
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset geocoding status when address fields change
    if (['address', 'city', 'state', 'zip_code'].includes(field)) {
      setGeocodingStatus('idle');
      setCoordinates(null);
    }

    // Handle address search for autocomplete (only for address field)
    if (field === 'address' && typeof value === 'string') {
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
    if (files.length + imageFiles.length > 25) {
      toast.error('Maximum 25 images allowed');
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

  const handleFloorPlanUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + floorPlanFiles.length > 5) {
      toast.error('Maximum 5 floor plans allowed');
      return;
    }

    const newFiles = [...floorPlanFiles, ...files];
    setFloorPlanFiles(newFiles);

    // Create previews
    const newPreviews = [...floorPlanPreviews];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setFloorPlanPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFloorPlan = (index: number) => {
    const newFiles = floorPlanFiles.filter((_, i) => i !== index);
    const newPreviews = floorPlanPreviews.filter((_, i) => i !== index);
    setFloorPlanFiles(newFiles);
    setFloorPlanPreviews(newPreviews);
  };

  const addOpenInspection = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    setOpenInspections(prev => [...prev, {
      date: dateStr,
      startTime: '10:00',
      endTime: '10:30'
    }]);
  };

  const updateOpenInspection = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    setOpenInspections(prev => prev.map((inspection, i) => 
      i === index ? { ...inspection, [field]: value } : inspection
    ));
  };

  const removeOpenInspection = (index: number) => {
    setOpenInspections(prev => prev.filter((_, i) => i !== index));
  };

  const formatOpenInspectionsForSubmission = () => {
    if (openInspections.length === 0) return '';
    
    return openInspections.map(inspection => {
      const date = new Date(inspection.date).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `${date} from ${inspection.startTime} to ${inspection.endTime}`;
    }).join('\n');
  };

  // Auto-detect property features from description using keyword matching
  const handleAutoDetectFeatures = () => {
    if (!formData.description || formData.description.trim().length === 0) {
      toast.error('Please enter a description first');
      return;
    }

    setAnalyzingDescription(true);
    
    try {
      const description = formData.description.toLowerCase();
      const updates: any = {};
      const detectedItems: string[] = [];

      // Extract bedrooms
      const bedroomPatterns = [
        /(\d+)\s*(?:bed(?:room)?s?|br)/i,
        /(\d+)\s*x\s*(?:bed(?:room)?s?)/i
      ];
      for (const pattern of bedroomPatterns) {
        const match = description.match(pattern);
        if (match && parseInt(match[1]) > 0 && !formData.bedrooms) {
          updates.bedrooms = parseInt(match[1]);
          detectedItems.push('bedrooms');
          break;
        }
      }

      // Extract bathrooms
      const bathroomPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:bath(?:room)?s?)/i,
        /(\d+)\s*x\s*(?:bath(?:room)?s?)/i
      ];
      for (const pattern of bathroomPatterns) {
        const match = description.match(pattern);
        if (match && parseFloat(match[1]) > 0 && !formData.bathrooms) {
          updates.bathrooms = parseFloat(match[1]);
          detectedItems.push('bathrooms');
          break;
        }
      }

      // Extract parking/garages
      const parkingPatterns = [
        /(\d+)\s*(?:car\s*)?(?:garage|carport|parking)/i,
        /(?:garage|carport|parking)\s*(?:for\s*)?(\d+)/i,
        /(\d+)\s*car\s*(?:space|park)/i
      ];
      for (const pattern of parkingPatterns) {
        const match = description.match(pattern);
        if (match && parseInt(match[1]) > 0 && !(formData as any).garages) {
          updates.garages = parseInt(match[1]);
          detectedItems.push('parking');
          break;
        }
      }

      // Extract square feet
      const sqftPatterns = [
        /(\d+(?:,\d+)?)\s*(?:sq\s*ft|sqft|square\s*feet)/i,
        /(\d+(?:,\d+)?)\s*m2/i
      ];
      for (const pattern of sqftPatterns) {
        const match = description.match(pattern);
        if (match && !formData.square_feet) {
          const value = parseInt(match[1].replace(/,/g, ''));
          if (value > 0) {
            updates.square_feet = value;
            detectedItems.push('square feet');
            break;
          }
        }
      }

      // Detect features using keywords
      const featureKeywords: { [key: string]: string[] } = {
        'Pool': ['pool', 'swimming pool', 'lap pool', 'heated pool'],
        'Garden': ['garden', 'landscaped', 'backyard', 'yard'],
        'Balcony': ['balcony', 'terrace', 'patio'],
        'Fireplace': ['fireplace', 'wood fire', 'log fire'],
        'Security System': ['security system', 'alarm', 'cctv', 'security cameras'],
        'Solar Panels': ['solar', 'solar panels', 'solar power'],
        'Study': ['study', 'home office', 'office'],
        'Air Conditioning': ['air con', 'a/c', 'air conditioning', 'ducted cooling', 'split system'],
        'Heating': ['heating', 'ducted heating', 'central heating', 'hydronic'],
        'Dishwasher': ['dishwasher'],
        'Deck': ['deck', 'outdoor deck', 'timber deck'],
        'Patio': ['patio', 'outdoor entertaining'],
        'Hardwood Floors': ['hardwood', 'timber floors', 'polished floors'],
        'Granite Countertops': ['granite', 'stone bench', 'marble'],
        'Stainless Steel Appliances': ['stainless steel', 's/s appliances'],
        'Walk-in Closet': ['walk-in', 'walk in robe', 'wir'],
        'Ensuite': ['ensuite', 'en-suite', 'master ensuite'],
        'Garage': ['garage', 'lock-up garage', 'double garage', 'single garage']
      };

      const detectedFeatures: string[] = [];
      for (const [feature, keywords] of Object.entries(featureKeywords)) {
        if (!formData.features?.includes(feature)) {
          for (const keyword of keywords) {
            if (description.includes(keyword)) {
              detectedFeatures.push(feature);
              break;
            }
          }
        }
      }

      if (detectedFeatures.length > 0) {
        updates.features = [...new Set([...(formData.features || []), ...detectedFeatures])];
        detectedItems.push(`${detectedFeatures.length} features`);
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
        toast.success(`Auto-detected: ${detectedItems.join(', ')}`);
      } else {
        toast.info('No additional features detected in description');
      }
    } catch (error) {
      toast.error('Failed to analyze description. Please try again.');
    } finally {
      setAnalyzingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title || !formData.price || formData.price === 0 || !formData.address || !formData.city || !formData.state || !formData.zip_code) {
      toast.error('Please fill in all required fields (Title, Price, and Address)');
      return;
    }
    
    // Validate required email
    if (!formData.contact_email || !formData.contact_email.trim()) {
      toast.error('Contact email is required');
      return;
    }
    
    // Validate email format
    const emailValidation = InputSanitizer.validateEmail(formData.contact_email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Invalid email address');
      return;
    }
    
    // Validate required images
    if (imageFiles.length === 0) {
      toast.error('At least one property image is required');
      return;
    }
    
    // Check if we have coordinates
    if (!coordinates) {
      toast.error('Please ensure the address is valid and coordinates are found');
      return;
    }
    
    setLoading(true);

    try {
      // Sanitize all text fields before submission
      const sanitizedFormData: any = { ...formData };
      
      // Sanitize string fields (preserve spaces, but clean dangerous content)
      const textFields: (keyof CreatePropertyListingData)[] = [
        'title', 'description', 'address', 'city', 'state', 'zip_code', 
        'showing_instructions', 'vendor_special_conditions', 
        'vendor_favorable_contracts', 'vendor_motivation'
      ];
      
      for (const field of textFields) {
        if (sanitizedFormData[field] && typeof sanitizedFormData[field] === 'string') {
          const sanitizationResult = InputSanitizer.sanitizeText(sanitizedFormData[field], 10000);
          if (!sanitizationResult.isValid) {
            toast.error(`${field}: ${sanitizationResult.error || 'Invalid input'}`);
            setLoading(false);
            return;
          }
          sanitizedFormData[field] = sanitizationResult.sanitizedValue;
        }
      }
      
      // Validate email if provided
      if (sanitizedFormData.contact_email) {
        const emailValidation = InputSanitizer.validateEmail(sanitizedFormData.contact_email);
        if (!emailValidation.isValid) {
          toast.error(emailValidation.error || 'Invalid email address');
          setLoading(false);
          return;
        }
        sanitizedFormData.contact_email = emailValidation.sanitizedValue;
      }
      
      // Add coordinates, listing source, and formatted open inspections to the form data
      const listingDataWithCoordinates = {
        ...sanitizedFormData,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        listing_source: listingType === 'off-market' ? 'agent_posted' : 'external_feed',
        showing_instructions: formatOpenInspectionsForSubmission(),
        vendor_ownership_duration: sanitizedFormData.vendor_ownership_duration?.trim() || null,
        vendor_special_conditions: sanitizedFormData.vendor_special_conditions || null,
        vendor_favorable_contracts: sanitizedFormData.vendor_favorable_contracts || null,
        vendor_motivation: sanitizedFormData.vendor_motivation || null
      };
      
      let result;
      
      if (imageFiles.length > 0) {
        // Use the new method with image upload
        const { images, ...listingDataWithoutImages } = listingDataWithCoordinates;
        result = await PropertyService.createListingWithImages(
          listingDataWithoutImages,
          imageFiles,
          floorPlanFiles
        );
      } else {
        // Use the regular method without images
        result = await PropertyService.createListing(listingDataWithCoordinates);
      }
      
      if (result.error) {
        toast.error(result.error.message || 'Failed to create listing');
      } else {
        toast.success('Property listing created successfully! It will be reviewed by our team.');
        setFloorPlanFiles([]);
        setFloorPlanPreviews([]);
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
          {/* Listing Type Selection */}
          <div className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-400/30 rounded-lg">
            <Label className="text-white font-semibold mb-3 block">Listing Type *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setListingType('on-market')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  listingType === 'on-market'
                    ? 'border-pickfirst-yellow bg-pickfirst-yellow/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    listingType === 'on-market' ? 'border-pickfirst-yellow' : 'border-white/40'
                  }`}>
                    {listingType === 'on-market' && (
                      <div className="w-3 h-3 rounded-full bg-pickfirst-yellow"></div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">On-Market Listing</div>
                    <div className="text-gray-400 text-sm">Publicly visible to all buyers</div>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setListingType('off-market')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  listingType === 'off-market'
                    ? 'border-pickfirst-yellow bg-pickfirst-yellow/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    listingType === 'off-market' ? 'border-pickfirst-yellow' : 'border-white/40'
                  }`}>
                    {listingType === 'off-market' && (
                      <div className="w-3 h-3 rounded-full bg-pickfirst-yellow"></div>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Off-Market Listing</div>
                    <div className="text-gray-400 text-sm">Exclusive to premium subscribers</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

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
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-white font-semibold">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDetectFeatures}
                disabled={analyzingDescription || !formData.description}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
              >
                {analyzingDescription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-Detect Features
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the property, its features, and what makes it special... (AI will auto-detect features)"
              className="bg-white/5 border border-white/20 text-white min-h-[100px]"
              rows={4}
            />
            <p className="text-xs text-gray-400">
              💡 Tip: Mention features like pool, garage, bedrooms, bathrooms, etc., and click Auto-Detect to fill them automatically
            </p>
          </div>

          {/* Price - Allow text, numbers, and ranges */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-white font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price *
            </Label>
            <Input
              id="price"
              type="text"
              value={formData.price || ''}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="e.g., 750,000 or Best Offers or 900,000-1,200,000"
              className="bg-white/5 border border-white/20 text-white"
              required
            />
            <p className="text-xs text-gray-400">
              💡 Examples: 750,000 • 900,000-1,200,000 • 1.2M-1.5M • Best Offers • Price on Application
            </p>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-white font-semibold flex items-center gap-2">
                <Bed className="h-4 w-4" />
                Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms || ''}
                onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                placeholder="0"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-white font-semibold flex items-center gap-2">
                <Bath className="h-4 w-4" />
                Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms || ''}
                onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="garages" className="text-white font-semibold flex items-center gap-2">
                🚗 Garages
              </Label>
              <Input
                id="garages"
                type="number"
                value={(formData as any).garages || ''}
                onChange={(e) => handleInputChange('garages' as any, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="bg-white/5 border border-white/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="square_feet" className="text-white font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Square Meters
              </Label>
              <Input
                id="square_feet"
                type="text"
                value={formData.square_feet ? formData.square_feet.toLocaleString() : ''}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/,/g, '');
                  const parsedValue = parseInt(numericValue) || 0;
                  handleInputChange('square_feet', parsedValue);
                }}
                placeholder="0"
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
                <Label htmlFor="zip_code" className="text-white">Post Code *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  onBlur={handleAddressBlur}
                  placeholder="Post Code"
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
              Property Images *
            </Label>
            <div className="space-y-4">
              <Label htmlFor="images" className="cursor-pointer">
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-pickfirst-yellow/40 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400">Click to upload images (max 25) *</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF up to 5MB each - At least one image required</p>
                </div>
              </Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                required
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

          {/* Floor Plans Upload */}
          <div className="space-y-4">
            <Label className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-pickfirst-yellow" />
              Floor Plans
            </Label>
            <div className="space-y-4">
              <Label htmlFor="floorplans" className="cursor-pointer">
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-pickfirst-yellow/40 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400">Click to upload floor plans (max 5)</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF up to 10MB each</p>
                </div>
              </Label>
              <Input
                id="floorplans"
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFloorPlanUpload}
                className="hidden"
              />
            </div>

            {/* Floor Plan Previews */}
            {floorPlanPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {floorPlanPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Floor Plan ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-white/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removeFloorPlan(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Floor Plan {index + 1}
                    </div>
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
              <PhoneInput
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(value) => handleInputChange('contact_phone', value)}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-white font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-pickfirst-yellow" />
                Contact Email *
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="agent@example.com"
                className="bg-white/5 border border-white/20 text-white"
                required
              />
              {(user?.email || (profile as any)?.email) && (
                <p className="text-xs text-gray-400">
                  Pre-filled from your profile. You can update it if needed.
                </p>
              )}
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

          {/* Open Inspections Scheduler */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-pickfirst-yellow" />
                Open Inspections
              </Label>
              <Button
                type="button"
                onClick={addOpenInspection}
                variant="outline"
                size="sm"
                className="text-pickfirst-yellow border-pickfirst-yellow/40 hover:bg-pickfirst-yellow/10"
              >
                <Clock className="w-4 h-4 mr-2" />
                Add Inspection
              </Button>
            </div>
            
            {openInspections.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-lg">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No open inspections scheduled</p>
                <p className="text-xs text-gray-500">Click "Add Inspection" to schedule viewing times</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openInspections.map((inspection, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 border border-white/20 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Date Picker */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">Date</Label>
                        <Input
                          type="date"
                          value={inspection.date}
                          onChange={(e) => updateOpenInspection(index, 'date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="bg-white/5 border border-white/20 text-white"
                        />
                      </div>
                      
                      {/* Start Time */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">Start Time</Label>
                        <Input
                          type="time"
                          value={inspection.startTime}
                          onChange={(e) => updateOpenInspection(index, 'startTime', e.target.value)}
                          className="bg-white/5 border border-white/20 text-white"
                        />
                      </div>
                      
                      {/* End Time */}
                      <div>
                        <Label className="text-xs text-gray-400 mb-1 block">End Time</Label>
                        <Input
                          type="time"
                          value={inspection.endTime}
                          onChange={(e) => updateOpenInspection(index, 'endTime', e.target.value)}
                          className="bg-white/5 border border-white/20 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOpenInspection(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Preview of formatted inspections */}
            {openInspections.length > 0 && (
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <Label className="text-green-400 text-sm font-medium mb-2 block">Preview:</Label>
                <div className="text-green-300 text-sm whitespace-pre-line">
                  {formatOpenInspectionsForSubmission()}
                </div>
              </div>
            )}
          </div>

          {/* Vendor Details - Optional */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-400/30 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <Label className="text-yellow-400 font-semibold text-lg">Vendor Details (Optional)</Label>
            </div>
            <p className="text-yellow-200/80 text-sm mb-4">
              {listingType === 'off-market' 
                ? 'These details will be visible to Premium subscribers only and help them make informed decisions.'
                : 'Adding vendor details can help attract serious buyers. Premium subscribers will have priority access to this information.'
              }
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_ownership_duration" className="text-white font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  Ownership Duration (years/months)
                </Label>
                <Input
                  id="vendor_ownership_duration"
                  type="text"
                  value={formData.vendor_ownership_duration}
                  onChange={(e) => handleInputChange('vendor_ownership_duration', e.target.value)}
                  placeholder="e.g., 7 years, 2 months or 18 months or 2.5 years"
                  className="bg-white/5 border border-white/20 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vendor_motivation" className="text-white font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Vendor Motivation
                </Label>
                <Input
                  id="vendor_motivation"
                  value={formData.vendor_motivation}
                  onChange={(e) => handleInputChange('vendor_motivation', e.target.value)}
                  placeholder="Why is the vendor selling? (e.g., relocating, downsizing)"
                  className="bg-white/5 border border-white/20 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor_special_conditions" className="text-white font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                Special Conditions
              </Label>
              <Textarea
                id="vendor_special_conditions"
                value={formData.vendor_special_conditions}
                onChange={(e) => handleInputChange('vendor_special_conditions', e.target.value)}
                placeholder="Any special conditions or requirements from the vendor (e.g., settlement period, inspection requirements)"
                className="bg-white/5 border border-white/20 text-white"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor_favorable_contracts" className="text-white font-semibold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-yellow-400" />
                Favorable Contract Terms
              </Label>
              <Textarea
                id="vendor_favorable_contracts"
                value={formData.vendor_favorable_contracts}
                onChange={(e) => handleInputChange('vendor_favorable_contracts', e.target.value)}
                placeholder="Any favorable contract terms the vendor is offering (e.g., flexible settlement, included items, price negotiations)"
                className="bg-white/5 border border-white/20 text-white"
                rows={3}
              />
            </div>
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