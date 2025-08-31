import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { geocodeAddress, formatFullAddress } from '@/utils/geocoding';
import { supabase } from '@/integrations/supabase/client';

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
}

interface PropertyCoordinatesFormProps {
  property: Property;
  onCoordinatesUpdated?: (property: Property) => void;
  className?: string;
}

const PropertyCoordinatesForm: React.FC<PropertyCoordinatesFormProps> = ({
  property,
  onCoordinatesUpdated,
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [geocodingResult, setGeocodingResult] = useState<{
    success: boolean;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    error?: string;
  } | null>(null);

  // Initialize form with property data
  React.useEffect(() => {
    if (property) {
      setAddress(property.address || '');
      setCity(property.city || '');
      setState(property.state || '');
      setZipCode(property.zip_code || '');
    }
  }, [property]);

  const handleGeocode = async () => {
    if (!address.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      toast.error('Please fill in all address fields');
      return;
    }

    setIsLoading(true);
    setGeocodingResult(null);

    try {
      const fullAddress = formatFullAddress(address, city, state, zipCode);
      const result = await geocodeAddress(fullAddress);
      
      setGeocodingResult(result);
      
      if (result.success) {
        toast.success(`Found coordinates: ${result.latitude}, ${result.longitude}`);
      } else {
        toast.error(result.error || 'Geocoding failed');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCoordinates = async () => {
    if (!geocodingResult?.success || !geocodingResult.latitude || !geocodingResult.longitude) {
      toast.error('No valid coordinates to save');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('property_listings')
        .update({
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);

      if (error) {
        throw error;
      }

      toast.success('Coordinates saved successfully!');
      
      // Update the property object
      const updatedProperty = {
        ...property,
        latitude: geocodingResult.latitude,
        longitude: geocodingResult.longitude
      };

      // Call the callback if provided
      if (onCoordinatesUpdated) {
        onCoordinatesUpdated(updatedProperty);
      }

      // Reset the form
      setGeocodingResult(null);
    } catch (error) {
      console.error('Error saving coordinates:', error);
      toast.error('Failed to save coordinates');
    } finally {
      setIsLoading(false);
    }
  };

  const hasCoordinates = property.latitude && property.longitude;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Coordinates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCoordinates ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Coordinates are set</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Latitude</Label>
                <p className="font-mono">{property.latitude}</p>
              </div>
              <div>
                <Label className="text-gray-600">Longitude</Label>
                <p className="font-mono">{property.longitude}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setGeocodingResult(null);
                setAddress(property.address || '');
                setCity(property.city || '');
                setState(property.state || '');
                setZipCode(property.zip_code || '');
              }}
              className="w-full"
            >
              Update Coordinates
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Coordinates not set</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="NY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="10001"
                />
              </div>
            </div>

            <Button
              onClick={handleGeocode}
              disabled={isLoading || !address.trim() || !city.trim() || !state.trim() || !zipCode.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding Coordinates...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Find Coordinates
                </>
              )}
            </Button>

            {geocodingResult && (
              <div className="space-y-3 p-4 border rounded-lg">
                {geocodingResult.success ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Coordinates Found!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-600">Latitude</Label>
                        <p className="font-mono">{geocodingResult.latitude}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Longitude</Label>
                        <p className="font-mono">{geocodingResult.longitude}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600">Formatted Address</Label>
                      <p className="text-sm">{geocodingResult.formattedAddress}</p>
                    </div>
                    <Button
                      onClick={handleSaveCoordinates}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Coordinates'
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>{geocodingResult.error || 'Geocoding failed'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyCoordinatesForm;
