import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { auditService } from './auditService';
import { rateLimitService } from './rateLimitService';

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

// Validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export class PropertyService {
  // Upload images to Supabase Storage
  static async uploadImages(files: File[]): Promise<{ data: string[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          return { 
            data: null, 
            error: new Error(`File ${file.name} is too large. Maximum size is 5MB.`) 
          };
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          return { 
            data: null, 
            error: new Error(`File ${file.name} is not an image.`) 
          };
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        const filePath = `property-images/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          return { data: null, error: uploadError };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }

      return { data: uploadedUrls, error: null };
    } catch (error) {
      console.error('Error uploading images:', error);
      return { data: null, error };
    }
  }

  // Delete images from Supabase Storage
  static async deleteImages(imageUrls: string[]): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      // Extract file paths from URLs
      const filePaths = imageUrls.map(url => {
        const urlParts = url.split('/');
        return urlParts.slice(-2).join('/'); // Get user-id/filename
      });

      // Delete from storage
      const { error } = await supabase.storage
        .from('property-images')
        .remove(filePaths);

      return { error };
    } catch (error) {
      console.error('Error deleting images:', error);
      return { error };
    }
  }

  // Create a new property listing with image upload
  static async createListingWithImages(
    listingData: Omit<CreatePropertyListingData, 'images'>, 
    imageFiles: File[]
  ): Promise<{ data: PropertyListing | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check rate limit for property creation
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'property:create');
      if (!rateLimit.allowed) {
        // Log rate limit violation
        await auditService.log(user.id, 'RATE_LIMIT_EXCEEDED', 'property_listings', {
          newValues: {
            message: 'attempted property creation with images',
            rateLimitType: 'property:create',
            resetTime: rateLimit.resetTime,
            imageCount: imageFiles.length
          }
        });
        
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Validate and sanitize input
      if (!listingData.title || listingData.title.trim().length < 3) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'title too short',
            title: listingData.title
          },
          recordId: 'validation_failed'
        });
        return { data: null, error: { message: 'Property title must be at least 3 characters long' } };
      }

      if (listingData.price <= 0) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid price',
            price: listingData.price
          },
          recordId: 'validation_failed'
        });
        return { data: null, error: { message: 'Property price must be greater than 0' } };
      }

      if (listingData.contact_email && !validateEmail(listingData.contact_email)) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid email format',
            email: listingData.contact_email
          },
          recordId: 'validation_failed'
        });
        return { data: null, error: { message: 'Invalid contact email format' } };
      }

      if (listingData.contact_phone && !validatePhone(listingData.contact_phone)) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid phone format',
            phone: listingData.contact_phone
          },
          recordId: 'validation_failed'
        });
        return { data: null, error: { message: 'Invalid contact phone format' } };
      }

      // Validate image files
      if (imageFiles.length > 10) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'too many images',
            imageCount: imageFiles.length,
            maxAllowed: 10
          },
          recordId: 'validation_failed'
        });
        return { data: null, error: { message: 'Maximum 10 images allowed per property' } };
      }

      // Log image upload attempt
      await auditService.log(user.id, 'IMAGE_UPLOAD_START', 'property_listings', {
        newValues: {
          message: 'starting image upload for property creation',
          imageCount: imageFiles.length,
          totalSize: imageFiles.reduce((sum, file) => sum + file.size, 0),
          fileNames: imageFiles.map(f => f.name)
        }
      });

      // Upload images first
      const { data: imageUrls, error: uploadError } = await this.uploadImages(imageFiles);
      if (uploadError) {
        // Log image upload failure
        await auditService.log(user.id, 'IMAGE_UPLOAD_FAILED', 'property_listings', {
          newValues: {
            error: uploadError.message || 'Unknown upload error',
            imageCount: imageFiles.length
          }
        });
        return { data: null, error: uploadError };
      }

      // Log successful image upload
      await auditService.log(user.id, 'IMAGE_UPLOAD_SUCCESS', 'property_listings', {
        newValues: {
          message: 'images uploaded successfully for property creation',
          imageCount: imageUrls?.length || 0,
          uploadedUrls: imageUrls
        }
      });

      // Sanitize inputs
      const sanitizedData = {
        ...listingData,
        title: sanitizeInput(listingData.title),
        description: listingData.description ? sanitizeInput(listingData.description) : undefined,
        address: sanitizeInput(listingData.address),
        city: sanitizeInput(listingData.city),
        state: sanitizeInput(listingData.state),
        zip_code: sanitizeInput(listingData.zip_code),
        contact_phone: listingData.contact_phone ? sanitizeInput(listingData.contact_phone) : undefined,
        contact_email: listingData.contact_email ? sanitizeInput(listingData.contact_email) : undefined,
        showing_instructions: listingData.showing_instructions ? sanitizeInput(listingData.showing_instructions) : undefined,
      };

      // Create listing with uploaded image URLs
      const { data, error } = await supabase
        .from('property_listings')
        .insert({
          ...sanitizedData,
          agent_id: user.id,
          status: 'pending',
          images: imageUrls || []
        })
        .select()
        .single();

      // Log the property creation action
      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'property_listings', {
          recordId: data.id,
          newValues: {
            title: data.title,
            price: data.price,
            property_type: data.property_type,
            address: data.address,
            city: data.city,
            state: data.state,
            action: 'created new property listing with images',
            image_count: data.images?.length || 0,
            status: data.status,
            created_at: data.created_at
          }
        });
      } else if (error) {
        // Log property creation failure
        await auditService.log(user.id, 'CREATE_FAILED', 'property_listings', {
          newValues: {
            error: error.message || 'Unknown database error',
            title: sanitizedData.title,
            imageCount: imageUrls?.length || 0
          }
        });
      }

      return { data, error };
    } catch (error) {
      console.error('Error creating listing with images:', error);
      
      // Log unexpected error
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await auditService.log(user.id, 'SYSTEM_ERROR', 'property_listings', {
            newValues: {
              description: 'unexpected error during property creation with images',
              error: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            }
          });
        }
      } catch (auditError) {
        console.error('Failed to log system error:', auditError);
      }
      
      return { data: null, error };
    }
  }

  // Create a new property listing
  static async createListing(listingData: CreatePropertyListingData): Promise<{ data: PropertyListing | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'property:create');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Validate and sanitize input
      if (!listingData.title || listingData.title.trim().length < 3) {
        return { data: null, error: { message: 'Property title must be at least 3 characters long' } };
      }

      if (listingData.price <= 0) {
        return { data: null, error: { message: 'Property price must be greater than 0' } };
      }

      if (listingData.contact_email && !validateEmail(listingData.contact_email)) {
        return { data: null, error: { message: 'Invalid contact email format' } };
      }

      if (listingData.contact_phone && !validatePhone(listingData.contact_phone)) {
        return { data: null, error: { message: 'Invalid contact phone format' } };
      }

      // Sanitize inputs
      const sanitizedData = {
        ...listingData,
        title: sanitizeInput(listingData.title),
        description: listingData.description ? sanitizeInput(listingData.description) : undefined,
        address: sanitizeInput(listingData.address),
        city: sanitizeInput(listingData.city),
        state: sanitizeInput(listingData.state),
        zip_code: sanitizeInput(listingData.zip_code),
        contact_phone: listingData.contact_phone ? sanitizeInput(listingData.contact_phone) : undefined,
        contact_email: listingData.contact_email ? sanitizeInput(listingData.contact_email) : undefined,
        showing_instructions: listingData.showing_instructions ? sanitizeInput(listingData.showing_instructions) : undefined,
      };

      const { data, error } = await supabase
        .from('property_listings')
        .insert({
          ...sanitizedData,
          agent_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      // Log the action
      if (!error && data) {
        await auditService.log(user.id, 'CREATE', 'property_listings', {
          recordId: data.id,
          newValues: {
            title: data.title,
            price: data.price,
            property_type: data.property_type,
            address: data.address,
            city: data.city,
            state: data.state,
            action: 'created new property listing',
            image_count: data.images?.length || 0
          }
        });
      }

      return { data, error };
    } catch (error) {
      console.error('Error creating property listing:', error);
      return { data: null, error };
    }
  }

  // Get all listings for the current user (agent)
  static async getMyListings(): Promise<{ data: PropertyListing[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'property:view');
      if (!rateLimit.allowed) {
        return { 
          data: null, 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      const { data, error } = await supabase
        .from('property_listings')
        .select('*')
        .eq('agent_id', user.id)  // Filter by the current user's ID
        .order('created_at', { ascending: false });

      // Log the action
      if (!error) {
        await auditService.log(user.id, 'VIEW', 'property_listings', {
          newValues: {
            count: data?.length || 0,
            action: 'viewed my property listings'
          }
        });

        // If no listings found, return empty array instead of null
        if (!data || data.length === 0) {
          return { data: [], error: null };
        }
      }

      return { data: data || [], error };
    } catch (error) {
      console.error('Error fetching my listings:', error);
      return { data: [], error };
    }
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
        query = query.ilike('state', `%${filters.state}%`);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  }

  // Get all listings (for admins)
  static async getAllListings(): Promise<{ data: PropertyListing[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        agent:profiles!property_listings_agent_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get a specific listing by ID
  static async getListingById(id: string): Promise<{ data: PropertyListing | null; error: any }> {
    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        *,
        agent:profiles!property_listings_agent_id_fkey(full_name, email)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  }

  // Update a listing
  static async updateListing(id: string, data: UpdatePropertyListingData): Promise<{ data: PropertyListing | null; error: any }> {
    const { data: result, error } = await supabase
      .from('property_listings')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    return { data: result, error };
  }

  // Delete a listing
  static async deleteListing(id: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkRateLimit(user.id, 'property:delete');
      if (!rateLimit.allowed) {
        return { 
          error: { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds.` 
          } 
        };
      }

      // Get the listing first to delete associated images and for audit log
      const { data: listing } = await this.getListingById(id);
      
      if (listing?.images && listing.images.length > 0) {
        await this.deleteImages(listing.images);
      }

      const { error } = await supabase
        .from('property_listings')
        .delete()
        .eq('id', id);

      // Log the action
      if (!error && listing) {
        await auditService.log(user.id, 'DELETE', 'property_listings', {
          recordId: id,
          oldValues: {
            title: listing.title,
            price: listing.price,
            property_type: listing.property_type,
            address: listing.address,
            city: listing.city,
            state: listing.state,
            action: 'deleted property listing',
            image_count: listing.images?.length || 0
          }
        });
      }

      return { error };
    } catch (error) {
      console.error('Error deleting listing:', error);
      return { error };
    }
  }

  // Approve a listing (admin only)
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

  // Reject a listing (admin only)
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

  // Add property to favorites
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

  // Remove property from favorites
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

  // Get user's favorite properties
  static async getFavorites(): Promise<{ data: PropertyListing[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_favorites')
      .select(`
        property:property_listings(*)
      `)
      .eq('buyer_id', user.id);

    if (error) {
      return { data: null, error };
    }

    const properties = data?.map(item => item.property).filter(Boolean) || [];
    return { data: properties, error: null };
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

  // Create property inquiry
  static async createInquiry(propertyId: string, message: string, contactPreference?: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_inquiries')
      .insert({
        property_id: propertyId,
        buyer_id: user.id,
        message,
        contact_preference: contactPreference
      })
      .select()
      .single();

    return { data, error };
  }

  // Get inquiries for a specific property (agent only)
  static async getPropertyInquiries(propertyId: string): Promise<{ data: PropertyInquiry[] | null; error: any }> {
    const { data, error } = await supabase
      .from('property_inquiries')
      .select(`
        *,
        buyer:profiles!property_inquiries_buyer_id_fkey(full_name, email)
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Get user's own inquiries
  static async getMyInquiries(): Promise<{ data: PropertyInquiry[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_inquiries')
      .select(`
        *,
        property:property_listings(title, address)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Respond to an inquiry (agent only)
  static async respondToInquiry(inquiryId: string, response: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data, error } = await supabase
      .from('property_inquiries')
      .update({
        agent_response: response,
        responded_at: new Date().toISOString()
      })
      .eq('id', inquiryId)
      .select()
      .single();

    return { data, error };
  }
} 