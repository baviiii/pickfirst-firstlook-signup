import { googleMapsService } from '@/services/googleMapsService';

export interface GeocodingResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  error?: string;
}

/**
 * Geocode an address to get coordinates
 * @param address - The address to geocode
 * @returns Promise<GeocodingResult>
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  try {
    if (!address || address.trim().length === 0) {
      return {
        success: false,
        error: 'Address is required'
      };
    }

    const results = await googleMapsService.geocodeAddress(address);
    
    if (results.length === 0) {
      return {
        success: false,
        error: 'Address not found'
      };
    }

    const result = results[0];
    return {
      success: true,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Geocoding failed'
    };
  }
};

/**
 * Geocode multiple addresses in batch
 * @param addresses - Array of addresses to geocode
 * @param delay - Delay between requests in milliseconds (to respect rate limits)
 * @returns Promise<GeocodingResult[]>
 */
export const geocodeAddresses = async (
  addresses: string[], 
  delay: number = 100
): Promise<GeocodingResult[]> => {
  const results: GeocodingResult[] = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const result = await geocodeAddress(addresses[i]);
    results.push(result);
    
    // Add delay between requests to respect rate limits
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};

/**
 * Create a full address string from address components
 * @param address - Street address
 * @param city - City
 * @param state - State
 * @param zipCode - ZIP code
 * @returns Formatted address string
 */
export const formatFullAddress = (
  address: string, 
  city: string, 
  state: string, 
  zipCode: string
): string => {
  return `${address}, ${city}, ${state} ${zipCode}`.trim();
};

/**
 * Validate coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns boolean
 */
export const validateCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Check if coordinates are within a bounding box
 * @param lat - Latitude to check
 * @param lon - Longitude to check
 * @param bounds - Bounding box {north, south, east, west}
 * @returns boolean
 */
export const isWithinBounds = (
  lat: number, 
  lon: number, 
  bounds: { north: number; south: number; east: number; west: number }
): boolean => {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  );
};
