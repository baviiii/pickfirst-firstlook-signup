import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type PropertyListing = Tables<'property_listings'>;
export type PropertyFavorite = Tables<'property_favorites'>;
export type PropertyInquiry = Tables<'property_inquiries'>;

export interface CreatePropertyListingData {
  title: string;
  description?: string;
  property_type: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
  images?: string[];
  contact_phone?: string;
  contact_email?: string;
  showing_instructions?: string;
}

export interface UpdatePropertyListingData extends Partial<CreatePropertyListingData> {
  status?: string;
  rejection_reason?: string;
}

export interface PropertyFilters {
  property_type?: string[];
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  state?: string;
  features?: string[];
}

export class PropertyService {
  // Create a new property listing
  static async createListing(listingData: CreatePropertyListingData): Promise<{ data: PropertyListing | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_listings')
      .insert({
        ...listingData,
        agent_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  }

  // Get all listings for the current user (agent)
  static async getMyListings(): Promise<{ data: PropertyListing[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get all approved listings (for buyers)
  static async getApprovedListings(filters?: PropertyFilters): Promise<{ data: PropertyListing[] | null; error: any }> {
    let query = supabase
      .from('property_listings')
      .select('*')
      .eq('status', 'approved');

    if (filters) {
      if (filters.property_type && filters.property_type.length > 0) {
        query = query.in('property_type', filters.property_type);
      }
      if (filters.min_price) {
        query = query.gte('price', filters.min_price);
      }
      if (filters.max_price) {
        query = query.lte('price', filters.max_price);
      }
      if (filters.bedrooms) {
        query = query.gte('bedrooms', filters.bedrooms);
      }
      if (filters.bathrooms) {
        query = query.gte('bathrooms', filters.bathrooms);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.features && filters.features.length > 0) {
        query = query.overlaps('features', filters.features);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  }

  // Get all listings (for super admins)
  static async getAllListings(): Promise<{ data: PropertyListing[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        profiles!property_listings_agent_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get a single listing by ID
  static async getListingById(id: string): Promise<{ data: PropertyListing | null; error: any }> {
    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        profiles!property_listings_agent_id_fkey (
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  // Update a listing
  static async updateListing(id: string, data: UpdatePropertyListingData): Promise<{ data: PropertyListing | null; error: any }> {
    const { data: listing, error } = await supabase
      .from('property_listings')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    return { data: listing, error };
  }

  // Delete a listing
  static async deleteListing(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('property_listings')
      .delete()
      .eq('id', id);

    return { error };
  }

  // Approve a listing (super admin only)
  static async approveListing(id: string): Promise<{ data: PropertyListing | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_listings')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Reject a listing (super admin only)
  static async rejectListing(id: string, reason: string): Promise<{ data: PropertyListing | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_listings')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Add to favorites
  static async addToFavorites(propertyId: string): Promise<{ data: PropertyFavorite | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_favorites')
      .insert({
        buyer_id: user.id,
        property_id: propertyId
      })
      .select()
      .single();

    return { data, error };
  }

  // Remove from favorites
  static async removeFromFavorites(propertyId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('property_favorites')
      .delete()
      .eq('buyer_id', user.id)
      .eq('property_id', propertyId);

    return { error };
  }

  // Get user's favorites
  static async getFavorites(): Promise<{ data: PropertyListing[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_favorites')
      .select(`
        property_listings (*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const favorites = data.map(item => item.property_listings as PropertyListing);
      return { data: favorites, error: null };
    }

    return { data: null, error };
  }

  // Check if property is favorited
  static async isFavorited(propertyId: string): Promise<{ data: boolean; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: false, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_favorites')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('property_id', propertyId)
      .single();

    return { data: !!data, error };
  }

  // Create an inquiry
  static async createInquiry(propertyId: string, message: string, contactPreference?: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_inquiries')
      .insert({
        buyer_id: user.id,
        property_id: propertyId,
        message,
        contact_preference: contactPreference
      })
      .select()
      .single();

    return { data, error };
  }

  // Get inquiries for a property (agent)
  static async getPropertyInquiries(propertyId: string): Promise<{ data: PropertyInquiry[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_inquiries')
      .select(`
        *,
        profiles!property_inquiries_buyer_id_fkey (
          full_name,
          email
        )
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get user's inquiries (buyer)
  static async getMyInquiries(): Promise<{ data: PropertyInquiry[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_inquiries')
      .select(`
        *,
        property_listings (
          title,
          address,
          city,
          state
        )
      `)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Respond to an inquiry (agent)
  static async respondToInquiry(inquiryId: string, response: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data, error } = await supabase
      .from('property_inquiries')
      .update({
        status: 'responded',
        agent_response: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', inquiryId)
      .select()
      .single();

    return { data, error };
  }
} 