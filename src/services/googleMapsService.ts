import { supabase, handleAuthError } from '@/integrations/supabase/client';

export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
}

export interface PlaceAutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name: string;
  rating?: number;
  formatted_phone_number?: string;
  website?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

class GoogleMapsService {
  private async callGoogleMapsAPI(action: string, params: any) {
    try {
      const { data, error } = await supabase.functions.invoke('google-maps', {
        body: { action, ...params }
      });

      if (error) {
        console.error('Google Maps API error:', error);
        
        // Handle auth errors specifically
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Refresh Token Not Found') ||
            error.status === 400 || 
            error.status === 404) {
          await handleAuthError(error);
        }
        
        throw new Error(error.message || 'Failed to call Google Maps API');
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(data.error_message || `Google Maps API returned status: ${data.status}`);
      }

      return data;
    } catch (error) {
      console.error('Google Maps service error:', error);
      
      // Handle auth errors at the service level
      if (error instanceof Error && (
        error.message.includes('Invalid Refresh Token') || 
        error.message.includes('Refresh Token Not Found')
      )) {
        await handleAuthError(error);
      }
      
      throw error;
    }
  }

  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    const data = await this.callGoogleMapsAPI('geocode', { address });
    return data.results || [];
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult[]> {
    const latlng = `${lat},${lng}`;
    const data = await this.callGoogleMapsAPI('geocode', { latlng });
    return data.results || [];
  }

  async getPlaceAutocomplete(
    input: string, 
    options?: {
      types?: string;
      location?: string;
      radius?: number;
    }
  ): Promise<PlaceAutocompleteResult[]> {
    const data = await this.callGoogleMapsAPI('places_autocomplete', {
      input,
      ...options
    });
    return data.predictions || [];
  }

  // Search places with country bias (Australia first) - optimized for suburbs
  async searchPlaces(query: string, countryCode: string = 'AU'): Promise<PlaceAutocompleteResult[]> {
    const data = await this.callGoogleMapsAPI('places_autocomplete', {
      input: query,
      components: `country:${countryCode}`,
      types: 'geocode' // Use geocode instead of address to include suburbs, neighborhoods, and all location types
    });
    return data.predictions || [];
  }

  async getPlaceDetails(
    placeId: string,
    fields?: string[]
  ): Promise<PlaceDetails | null> {
    const fieldsParam = fields?.join(',') || 'place_id,formatted_address,geometry,name,rating,formatted_phone_number,website,address_components';
    const data = await this.callGoogleMapsAPI('place_details', {
      place_id: placeId,
      fields: fieldsParam
    });
    return data.result || null;
  }

  async nearbySearch(
    lat: number,
    lng: number,
    radius: number = 1000,
    type?: string
  ): Promise<any[]> {
    const location = `${lat},${lng}`;
    const data = await this.callGoogleMapsAPI('nearby_search', {
      location,
      radius,
      type
    });
    return data.results || [];
  }

  // Utility method to get coordinates from address
  async getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const results = await this.geocodeAddress(address);
      if (results.length > 0) {
        return results[0].geometry.location;
      }
      return null;
    } catch (error) {
      console.error('Failed to get coordinates from address:', error);
      return null;
    }
  }

  // Utility method to get address from coordinates
  async getAddressFromCoordinates(lat: number, lng: number): Promise<string | null> {
    try {
      const results = await this.reverseGeocode(lat, lng);
      if (results.length > 0) {
        return results[0].formatted_address;
      }
      return null;
    } catch (error) {
      console.error('Failed to get address from coordinates:', error);
      return null;
    }
  }

  // Get air quality data from Google Maps Air Quality API
  async getAirQuality(lat: number, lng: number): Promise<any> {
    try {
      const data = await this.callGoogleMapsAPI('air_quality', {
        latitude: lat,
        longitude: lng
      });
      return data;
    } catch (error) {
      console.error('Failed to get air quality data:', error);
      throw error;
    }
  }
}

export const googleMapsService = new GoogleMapsService();