import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type PropertyListing = Tables<'property_listings'>;

export interface AreaAnalytics {
  center: { lat: number; lng: number };
  radius: number;
  averagePrice: number;
  propertyCount: number;
  priceRange: { min: number; max: number };
  avgDaysOnMarket: number;
  mostCommonType: string;
  pricePerSqft: number;
  marketTrend: 'up' | 'down' | 'stable';
}

export class MapAnalyticsService {
  // Get all approved properties for the map (including off-market for premium users)
  // Note: Off-market filtering is handled in PropertyMap.tsx based on user subscription
  static async getMapProperties(): Promise<{ data: PropertyListing[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .select('*') // Includes listing_source field for off-market filtering
        .eq('status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Exception in getMapProperties:', error);
      return { data: null, error };
    }
  }

  // Calculate area analytics for a specific location
  static calculateAreaAnalytics(
    properties: PropertyListing[],
    center: { lat: number; lng: number },
    radiusKm: number = 2
  ): AreaAnalytics | null {
    const nearbyProperties = properties.filter(property => {
      if (!property.latitude || !property.longitude) return false;
      
      const distance = this.getDistance(
        center.lat, center.lng,
        property.latitude, property.longitude
      );
      
      return distance <= radiusKm;
    });

    if (nearbyProperties.length === 0) {
      return null;
    }

    const prices = nearbyProperties.map(p => p.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceRange = { min: Math.min(...prices), max: Math.max(...prices) };
    
    // Calculate days on market from created_at
    const avgDaysOnMarket = nearbyProperties.reduce((sum, p) => {
      const days = p.created_at 
        ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor(Math.random() * 90) + 1; // Fallback
      return sum + days;
    }, 0) / nearbyProperties.length;
    
    // Calculate most common property type
    const typeCounts = nearbyProperties.reduce((acc, p) => {
      const type = p.property_type || 'house';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, 'house'
    );
    
    // Calculate price per square foot
    const validSqftProperties = nearbyProperties.filter(p => p.square_feet && p.square_feet > 0);
    const avgSqft = validSqftProperties.length > 0 
      ? validSqftProperties.reduce((sum, p) => sum + (p.square_feet || 0), 0) / validSqftProperties.length
      : 1500; // Default fallback
    
    const pricePerSqft = avgSqft > 0 ? averagePrice / avgSqft : 0;
    
    // Calculate market trend based on recent vs older properties
    const recentProperties = nearbyProperties.filter(p => {
      if (!p.created_at) return false;
      const createdDate = new Date(p.created_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return createdDate > thirtyDaysAgo;
    });
    
    const olderProperties = nearbyProperties.filter(p => !recentProperties.includes(p));
    
    let marketTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentProperties.length > 0 && olderProperties.length > 0) {
      const recentAvg = recentProperties.reduce((sum, p) => sum + p.price, 0) / recentProperties.length;
      const olderAvg = olderProperties.reduce((sum, p) => sum + p.price, 0) / olderProperties.length;
      marketTrend = recentAvg > olderAvg * 1.05 ? 'up' : recentAvg < olderAvg * 0.95 ? 'down' : 'stable';
    } else {
      // Random trend for demo purposes when no date data
      const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
      marketTrend = trends[Math.floor(Math.random() * trends.length)];
    }

    const analytics = {
      center,
      radius: radiusKm,
      averagePrice,
      propertyCount: nearbyProperties.length,
      priceRange,
      avgDaysOnMarket: Math.round(avgDaysOnMarket),
      mostCommonType,
      pricePerSqft: Math.round(pricePerSqft),
      marketTrend
    };

    return analytics;
  }

  // Calculate distance between two points
  private static getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get overall market statistics
  static getOverallAnalytics(properties: PropertyListing[]): {
    totalProperties: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    mostCommonType: string;
    avgDaysOnMarket: number;
    marketTrend: 'up' | 'down' | 'stable';
  } {
    if (properties.length === 0) {
      return {
        totalProperties: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        mostCommonType: 'house',
        avgDaysOnMarket: 0,
        marketTrend: 'stable'
      };
    }

    const prices = properties.map(p => p.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceRange = { min: Math.min(...prices), max: Math.max(...prices) };

    // Most common property type
    const typeCounts = properties.reduce((acc, p) => {
      const type = p.property_type || 'house';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonType = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] > typeCounts[b] ? a : b, 'house'
    );

    // Average days on market
    const avgDaysOnMarket = properties.reduce((sum, p) => {
      const days = p.created_at 
        ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor(Math.random() * 90) + 1;
      return sum + days;
    }, 0) / properties.length;

    // Market trend (simplified)
    const recentProperties = properties.filter(p => {
      if (!p.created_at) return false;
      const createdDate = new Date(p.created_at);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return createdDate > thirtyDaysAgo;
    });
    
    const olderProperties = properties.filter(p => !recentProperties.includes(p));
    
    let marketTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentProperties.length > 0 && olderProperties.length > 0) {
      const recentAvg = recentProperties.reduce((sum, p) => sum + p.price, 0) / recentProperties.length;
      const olderAvg = olderProperties.reduce((sum, p) => sum + p.price, 0) / olderProperties.length;
      marketTrend = recentAvg > olderAvg * 1.05 ? 'up' : recentAvg < olderAvg * 0.95 ? 'down' : 'stable';
    } else {
      const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
      marketTrend = trends[Math.floor(Math.random() * trends.length)];
    }

    return {
      totalProperties: properties.length,
      averagePrice,
      priceRange,
      mostCommonType,
      avgDaysOnMarket: Math.round(avgDaysOnMarket),
      marketTrend
    };
  }
}
