import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { auditService } from './auditService';
import { rateLimitService } from './rateLimitService';
import PropertyAlertService from './propertyAlertService';
import { EmailService } from './emailService';
import { notificationService } from './notificationService';
import { messageService } from './messageService';

export type PropertyListing = Tables<'property_listings'>;
export type PropertyFavorite = Tables<'property_favorites'>;
export type PropertyInquiry = Tables<'property_inquiries'>;

// Helper function to parse price input (ranges, text, numbers)
function parsePriceForDatabase(priceInput: string | number | undefined): number {
  if (typeof priceInput === 'number') {
    return priceInput;
  }
  
  if (typeof priceInput === 'string') {
    const cleanInput = priceInput.trim();
    
    // Handle ranges like "900,000-1,200,000" or "900k-1.2M"
    const rangeMatch = cleanInput.match(/^([\d,k.m]+)\s*[-–—]\s*([\d,k.m]+)$/i);
    if (rangeMatch) {
      const minPrice = parseNumericPrice(rangeMatch[1]);
      const maxPrice = parseNumericPrice(rangeMatch[2]);
      // Use the minimum price for database storage and filtering
      return minPrice > 0 ? minPrice : maxPrice;
    }
    
    // Handle single numeric values
    const numericPrice = parseNumericPrice(cleanInput);
    if (numericPrice > 0) {
      return numericPrice;
    }
    
    // For text like "Best Offers", "POA", etc., use 0 as fallback
    return 0;
  }
  
  return 0;
}

// Helper to parse numeric price with K/M suffixes
function parseNumericPrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[,$\s]/g, '').toLowerCase();
  
  if (cleaned.includes('k')) {
    const num = parseFloat(cleaned.replace('k', ''));
    return isNaN(num) ? 0 : num * 1000;
  }
  
  if (cleaned.includes('m')) {
    const num = parseFloat(cleaned.replace('m', ''));
    return isNaN(num) ? 0 : num * 1000000;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export interface CreatePropertyListingData {
  title: string;
  description?: string;
  property_type: string;
  price: string | number | undefined;
  bedrooms?: number | undefined;
  bathrooms?: number | undefined;
  square_feet?: number | undefined;
  lot_size?: number | undefined;
  year_built?: number | undefined;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  features?: string[];
  images?: string[];
  contact_phone?: string;
  contact_email?: string;
  showing_instructions?: string;
  vendor_ownership_duration?: string | null;
  vendor_special_conditions?: string | null;
  vendor_favorable_contracts?: string | null;
  vendor_motivation?: string | null;
}

export interface UpdatePropertyListingData extends Partial<CreatePropertyListingData> {
  status?: string;
  rejection_reason?: string;
  sold_price?: number;
  sold_date?: string;
  sold_to_client_id?: string;
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
  // Helper function to get admin emails
  private static async getAdminEmails(): Promise<string[]> {
    try {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('email')
        .in('role', ['super_admin', 'admin'])
        .not('email', 'is', null);
      
      if (error) {
        console.error('Error fetching admin emails:', error);
        return [];
      }
      
      return (admins || []).map(admin => admin.email).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error getting admin emails:', error);
      return [];
    }
  }

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
        const filePath = fileName; // Path within the bucket (no bucket prefix needed)

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
          }
          // Removed recordId for validation errors since no actual record exists
        });
        return { data: null, error: { message: 'Property title must be at least 3 characters long' } };
      }

      // Parse and validate price
      const numericPrice = parsePriceForDatabase(listingData.price);
      if (listingData.price && numericPrice < 0) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid price',
            price: listingData.price,
            parsedPrice: numericPrice
          }
        });
        return { data: null, error: { message: 'Invalid price format' } };
      }

      if (listingData.contact_email && !validateEmail(listingData.contact_email)) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid email format',
            email: listingData.contact_email
          }
          // Removed recordId for validation errors since no actual record exists
        });
        return { data: null, error: { message: 'Invalid contact email format' } };
      }

      if (listingData.contact_phone && !validatePhone(listingData.contact_phone)) {
        await auditService.log(user.id, 'VALIDATION_ERROR', 'property_listings', {
          newValues: {
            error: 'invalid phone format',
            phone: listingData.contact_phone
          }
          // Removed recordId for validation errors since no actual record exists
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
          }
          // Removed recordId for validation errors since no actual record exists
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

      // Sanitize inputs and convert price
      const sanitizedData = {
        ...listingData,
        title: sanitizeInput(listingData.title),
        description: listingData.description ? sanitizeInput(listingData.description) : undefined,
        price: numericPrice, // Use parsed numeric price for database
        price_display: typeof listingData.price === 'string' ? listingData.price : undefined, // Store original text
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

      // Log the property creation action and send email notification
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

        // Send email notifications to agent and admins
        try {
          // Get agent profile for email
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          // Send email to agent
          if (agentProfile?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: agentProfile.email,
                template: 'propertyListingSubmitted',
                data: {
                  agentName: agentProfile.full_name || 'Agent',
                  propertyTitle: data.title,
                  propertyAddress: `${data.address}, ${data.city}, ${data.state}`,
                  propertyPrice: data.price,
                  propertyType: data.property_type?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
                  submissionDate: new Date().toLocaleDateString(),
                  dashboardUrl: 'https://www.pickfirst.com.au/dashboard',
                  propertyUrl: `https://www.pickfirst.com.au/property/${data.id}`
                },
                subject: `Property Listing Submitted: ${data.title}`
              }
            });
          }

          // Send email to all admins
          const adminEmails = await this.getAdminEmails();
          if (adminEmails.length > 0) {
            const adminPromises = adminEmails.map(adminEmail =>
              supabase.functions.invoke('send-email', {
                body: {
                  to: adminEmail,
                  template: 'propertyListingSubmitted',
                  data: {
                    agentName: agentProfile?.full_name || 'Agent',
                    agentEmail: agentProfile?.email || user.email || 'Unknown',
                    propertyTitle: data.title,
                    propertyAddress: `${data.address}, ${data.city}, ${data.state}`,
                    propertyPrice: data.price,
                    propertyType: data.property_type?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    submissionDate: new Date().toLocaleDateString(),
                    dashboardUrl: 'https://www.pickfirst.com.au/admin/properties',
                    propertyUrl: `https://www.pickfirst.com.au/property/${data.id}`,
                    listingId: data.id
                  },
                  subject: `New Property Listing Submitted: ${data.title}`
                }
              })
            );
            await Promise.allSettled(adminPromises);
          }
        } catch (emailError) {
          console.error('Failed to send property submission emails:', emailError);
          // Don't fail the creation if email fails
        }
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

  // Update a property listing
  static async updateListing(id: string, data: UpdatePropertyListingData): Promise<{ data: PropertyListing | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if this is a status change to 'sold'
      const wasMarkedAsSold = data.status === 'sold';
      let previousStatus: string | null = null;
      
      if (wasMarkedAsSold) {
        // Get current listing data before update
        const { data: currentListing, error: fetchError } = await supabase
          .from('property_listings')
          .select('status, agent_id')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching current listing:', fetchError);
        } else if (currentListing) {
          previousStatus = currentListing.status;
        }
      }

      // Convert price if it's a string/range
      const updateData: any = { ...data };
      if (data.price !== undefined) {
        updateData.price = parsePriceForDatabase(data.price);
      }

      // Update the listing
      const { data: updatedListing, error } = await supabase
        .from('property_listings')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating listing:', error);
        return { data: null, error };
      }

      // If the property was just marked as sold, notify interested buyers
      if (wasMarkedAsSold && previousStatus !== 'sold' && updatedListing) {
        try {
          // Get all inquiries for this property
          const { data: inquiries, error: inquiryError } = await supabase
            .from('property_inquiries')
            .select('*, buyer:profiles!buyer_id(full_name, email)')
            .eq('property_id', id);

          if (inquiryError) {
            console.error('Error fetching inquiries:', inquiryError);
          } else if (inquiries && inquiries.length > 0) {
            // Get agent info for the email
            let agentName = 'the agent';
            if (updatedListing.agent_id) {
              const { data: agent, error: agentError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', updatedListing.agent_id)
                .single();
              
              if (agentError) {
                console.error('Error fetching agent:', agentError);
              } else if (agent) {
                agentName = agent.full_name || 'the agent';
              }
            }

            // Send email to each inquirer
            for (const inquiry of inquiries) {
              if (inquiry.buyer?.email) {
                const buyerName = (inquiry.buyer as any)?.full_name || 'there';
                const propertyTitle = updatedListing.title || 'the property';
                const soldPrice = data.sold_price ? `for $${data.sold_price.toLocaleString()}` : '';
                
                // Use a type assertion for the buyer object
                const buyerEmail = (inquiry.buyer as any)?.email;
                if (buyerEmail) {
                  // Get property URL safely for build environment
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pickfirst.com.au';
                  const propertyUrl = `${baseUrl}/property/${id}`;
                  
                  await supabase.functions.invoke('send-email', {
                    body: {
                      to: buyerEmail,
                      template: 'property-sold',
                      data: {
                        name: buyerName,
                        property: {
                          title: propertyTitle,
                          address: updatedListing.address || '',
                          sold_price: soldPrice,
                          agent_name: agentName,
                          property_url: propertyUrl
                        }
                      }
                    }
                  });
                }
              }
            }
          }
        } catch (notificationError) {
          console.error('Error notifying buyers:', notificationError);
          // Don't fail the update if notification fails
        }
      }

      return { data: updatedListing, error: null };
    } catch (error) {
      console.error('Error in updateListing:', error);
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

      // Parse and validate price
      const numericPrice = parsePriceForDatabase(listingData.price);
      if (listingData.price && numericPrice < 0) {
        return { data: null, error: { message: 'Invalid price format' } };
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
        price: numericPrice, // Use parsed numeric price for database
        price_display: typeof listingData.price === 'string' ? listingData.price : undefined, // Store original text
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

        // Send email notifications to agent and admins
        try {
          // Get agent profile for email
          const { data: agentProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          // Send email to agent
          if (agentProfile?.email) {
            await supabase.functions.invoke('send-email', {
              body: {
                to: agentProfile.email,
                template: 'propertyListingSubmitted',
                data: {
                  agentName: agentProfile.full_name || 'Agent',
                  propertyTitle: data.title,
                  propertyAddress: `${data.address}, ${data.city}, ${data.state}`,
                  propertyPrice: data.price,
                  propertyType: data.property_type?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
                  submissionDate: new Date().toLocaleDateString(),
                  dashboardUrl: 'https://www.pickfirst.com.au/dashboard',
                  propertyUrl: `https://www.pickfirst.com.au/property/${data.id}`
                },
                subject: `Property Listing Submitted: ${data.title}`
              }
            });
          }

          // Send email to all admins
          const adminEmails = await this.getAdminEmails();
          if (adminEmails.length > 0) {
            const adminPromises = adminEmails.map(adminEmail =>
              supabase.functions.invoke('send-email', {
                body: {
                  to: adminEmail,
                  template: 'propertyListingSubmitted',
                  data: {
                    agentName: agentProfile?.full_name || 'Agent',
                    agentEmail: agentProfile?.email || user.email || 'Unknown',
                    propertyTitle: data.title,
                    propertyAddress: `${data.address}, ${data.city}, ${data.state}`,
                    propertyPrice: data.price,
                    propertyType: data.property_type?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    submissionDate: new Date().toLocaleDateString(),
                    dashboardUrl: 'https://www.pickfirst.com.au/admin/properties',
                    propertyUrl: `https://www.pickfirst.com.au/property/${data.id}`,
                    listingId: data.id
                  },
                  subject: `New Property Listing Submitted: ${data.title}`
                }
              })
            );
            await Promise.allSettled(adminPromises);
          }
        } catch (emailError) {
          console.error('Failed to send property submission emails:', emailError);
          // Don't fail the creation if email fails
        }
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
    try {
      const { data, error } = await supabase
        .from('property_listings')
        .select(`
          *,
          agent:profiles!property_listings_agent_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all listings:', error);
      } else {
        console.log('Successfully fetched listings:', data?.length || 0, 'listings');
        if (data && data.length > 0) {
          console.log('Sample listing statuses:', data.map(l => ({ id: l.id.substring(0, 8), status: l.status, title: l.title })));
        }
      }

      return { data, error };
    } catch (error) {
      console.error('Exception in getAllListings:', error);
      return { data: null, error };
    }
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

  // Delete a listing (admin only)
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // First, get the current listing to check its status
      const { data: currentListing, error: fetchError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (currentListing.status === 'approved') {
        return { data: currentListing, error: null };
      }

      // Update the listing status
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', id);

      if (updateError) {
        return { data: null, error: updateError };
      }

      // Fetch the updated listing
      const { data: updatedListing, error: fetchUpdatedError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchUpdatedError) {
        // Return fallback data if we can't fetch the updated listing
        const fallbackListing: PropertyListing = {
          ...currentListing,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        };
        return { data: fallbackListing, error: null };
      }

      // Log the approval action
      try {
        await auditService.log(user.id, 'UPDATE', 'property_listings', {
          recordId: id,
          oldValues: { status: currentListing.status },
          newValues: { status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }
        });
      } catch (auditError) {
        // Don't fail the approval if audit logging fails
      }

      // Trigger property alerts for the newly approved listing
      try {
        await this.triggerPropertyAlerts(id);
      } catch (alertError) {
        console.error('Failed to trigger property alerts:', alertError);
        // Don't fail the approval if alert triggering fails
      }

      // Send approval email notification to the agent
      try {
        // Get agent profile for email
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', updatedListing.agent_id)
          .single();

        if (agentProfile?.email) {
          // Send property listing approved email
          await supabase.functions.invoke('send-email', {
            body: {
              to: agentProfile.email,
              template: 'propertyListingApproved',
              data: {
                agentName: agentProfile.full_name || 'Agent',
                propertyTitle: updatedListing.title,
                propertyAddress: `${updatedListing.address}, ${updatedListing.city}, ${updatedListing.state}`,
                propertyPrice: updatedListing.price,
                propertyType: updatedListing.property_type?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
                propertyImages: updatedListing.images || [],
                approvalDate: new Date(updatedListing.approved_at!).toLocaleDateString(),
                approvedBy: 'Admin Team',
                propertyUrl: `https://www.pickfirst.com.au/property/${id}`,
                dashboardUrl: 'https://www.pickfirst.com.au/dashboard'
              }
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send property approval email:', emailError);
        // Don't fail the approval if email fails
      }

      return { data: updatedListing, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Reject a listing (admin only)
  static async rejectListing(id: string, reason: string): Promise<{ data: PropertyListing | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // First, get the current listing to check its status
      const { data: currentListing, error: fetchError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return { data: null, error: fetchError };
      }

      if (currentListing.status === 'rejected') {
        return { data: currentListing, error: null };
      }

      // Update the listing status
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', id);

      if (updateError) {
        return { data: null, error: updateError };
      }

      // Fetch the updated listing
      const { data: updatedListing, error: fetchUpdatedError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchUpdatedError) {
        // Return fallback data if we can't fetch the updated listing
        const fallbackListing: PropertyListing = {
          ...currentListing,
          status: 'rejected',
          rejection_reason: reason
        };
        return { data: fallbackListing, error: null };
      }

      // Log the rejection action
      try {
        await auditService.log(user.id, 'UPDATE', 'property_listings', {
          recordId: id,
          oldValues: { status: currentListing.status },
          newValues: { status: 'rejected', rejection_reason: reason }
        });
      } catch (auditError) {
        // Don't fail the rejection if audit logging fails
      }

      // Send rejection email notification to the agent
      try {
        // Get agent profile for email
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', updatedListing.agent_id)
          .single();

        if (agentProfile?.email) {
          // Send property listing rejected email
          await supabase.functions.invoke('send-email', {
            body: {
              to: agentProfile.email,
              template: 'propertyListingRejected',
              data: {
                agentName: agentProfile.full_name || 'Agent',
                propertyTitle: updatedListing.title,
                propertyAddress: `${updatedListing.address}, ${updatedListing.city}, ${updatedListing.state}`,
                rejectionReason: reason,
                reviewDate: new Date().toLocaleDateString(),
                editUrl: 'https://www.pickfirst.com.au/dashboard'
              }
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send property rejection email:', emailError);
        // Don't fail the rejection if email fails
      }

      return { data: updatedListing, error: null };
    } catch (error) {
      return { data: null, error };
    }
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

  // Check if user has already inquired about a property
  static async hasInquired(propertyId: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('property_inquiries')
      .select('*, conversation_id')
      .eq('property_id', propertyId)
      .eq('buyer_id', user.id)
      .maybeSingle();

    return { data, error };
  }

  // Create property inquiry
  static async createInquiry(propertyId: string, message: string, contactPreference?: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Check if user has already inquired (this will be caught by the unique constraint, but we can provide a better error message)
    const { data: existingInquiry } = await this.hasInquired(propertyId);
    if (existingInquiry) {
      // Get the conversation ID if it exists
      const conversationLink = existingInquiry.conversation_id 
        ? `/buyer-messages?conversation=${existingInquiry.conversation_id}`
        : '/buyer-messages';
      
      const error = new Error('You have already inquired about this property.') as any;
      error.conversationId = existingInquiry.conversation_id;
      error.conversationLink = conversationLink;
      return { data: null, error };
    }

    // Get property details to find the agent
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('agent_id, title, address')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return { data: null, error: { message: 'Property not found' } };
    }

    // Create the inquiry first (without conversation_id)
    const { data: inquiry, error: inquiryError } = await supabase
      .from('property_inquiries')
      .insert({
        property_id: propertyId,
        buyer_id: user.id,
        message,
        contact_preference: contactPreference,
        status: 'pending'
      })
      .select()
      .single();

    if (inquiryError) {
      return { data: null, error: inquiryError };
    }

    // Create conversation immediately with the inquiry message
    let conversationId: string | null = null;
    try {
      // Create conversation using the messaging service
      conversationId = await messageService.getOrCreateConversation(
        property.agent_id, // clientId is actually agentId when buyer creates conversation
        `Property Inquiry: ${property.title}`,
        inquiry.id,
        propertyId
      );

      if (conversationId) {
        // Update inquiry with conversation_id
        await supabase
          .from('property_inquiries')
          .update({ conversation_id: conversationId })
          .eq('id', inquiry.id);

        // Send the initial inquiry message as the first message in the conversation
        const inquiryMessage = `I'm interested in this property:\n\n${property.title}\n${property.address}\n\n${message.trim()}`;
        await messageService.sendMessage(conversationId, inquiryMessage);
      }
    } catch (error) {
      console.error('Failed to create conversation for inquiry:', error);
      // Don't fail the inquiry if conversation creation fails - it can be created later
    }

    // Send email notification to agent about new inquiry
    try {
      await this.sendAgentInquiryNotification(propertyId, property.agent_id, user.id, message);
    } catch (error) {
      console.error('Failed to send agent inquiry notification:', error);
      // Don't fail the inquiry if email notification fails
    }

    // Create in-app notification for agent about new inquiry
    try {
      // Get buyer name for notification
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const buyerName = buyerProfile?.full_name || 'A potential buyer';

      await notificationService.createNotification(
        property.agent_id,
        'new_inquiry',
        'New Property Inquiry',
        `${buyerName} has inquired about "${property.title}"`,
        conversationId ? `/agent-messages?conversation=${conversationId}` : '/agent-leads',
        {
          inquiry_id: inquiry.id,
          property_id: propertyId,
          buyer_id: user.id,
          property_title: property.title,
          conversation_id: conversationId
        }
      );
    } catch (error) {
      console.error('Failed to create agent inquiry notification:', error);
      // Don't fail the inquiry if notification creation fails
    }

    // Send confirmation notification to buyer
    try {
      await notificationService.createNotification(
        user.id,
        'inquiry_response',
        'Inquiry Received',
        `Your inquiry about "${property.title}" has been received. The agent will respond soon.`,
        conversationId ? `/buyer-messages?conversation=${conversationId}` : '/buyer-messages',
        {
          inquiry_id: inquiry.id,
          property_id: propertyId,
          property_title: property.title,
          conversation_id: conversationId
        }
      );
    } catch (error) {
      console.error('Failed to create buyer confirmation notification:', error);
      // Don't fail the inquiry if notification creation fails
    }

    // Return inquiry with conversation_id if it was created
    if (conversationId) {
      const { data: updatedInquiry } = await supabase
        .from('property_inquiries')
        .select('*')
        .eq('id', inquiry.id)
        .single();
      
      return { data: updatedInquiry || inquiry, error: null };
    }

    return { data: inquiry, error: null };
  }

  // Get inquiries for a specific property (agent only)
  static async getPropertyInquiries(propertyId: string): Promise<{ data: PropertyInquiry[] | null; error: any }> {
    try {
      // First get the inquiries
      const { data: inquiries, error: inquiryError } = await supabase
        .from('property_inquiries')
        .select(`
          *,
          conversation:conversations!property_inquiries_conversation_id_fkey(id, subject, last_message_at)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (inquiryError) {
        return { data: null, error: inquiryError };
      }

      if (!inquiries || inquiries.length === 0) {
        return { data: [], error: null };
      }

      // Fetch buyer profiles using the public view to bypass RLS
      const inquiriesWithBuyers = await Promise.all(
        inquiries.map(async (inquiry) => {
          let buyerData = null;
          
          // Try to get buyer from public profile view
          const { data: buyerProfile } = await supabase
            .from('buyer_public_profiles')
            .select('id, full_name, email')
            .eq('id', inquiry.buyer_id)
            .maybeSingle();

          if (buyerProfile) {
            buyerData = {
              full_name: buyerProfile.full_name || 'Unknown Buyer',
              email: buyerProfile.email || ''
            };
          } else {
            // Fallback: try RPC function
            const { data: buyerFromRPC } = await supabase
              .rpc('get_buyer_public_profile', { buyer_id: inquiry.buyer_id });
            
            if (buyerFromRPC && buyerFromRPC.length > 0) {
              buyerData = {
                full_name: buyerFromRPC[0].full_name || 'Unknown Buyer',
                email: buyerFromRPC[0].email || ''
              };
            } else {
              // Last resort: fetch directly from profiles (might fail due to RLS)
              const { data: buyerDirect } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', inquiry.buyer_id)
                .maybeSingle();
              
              if (buyerDirect) {
                buyerData = {
                  full_name: buyerDirect.full_name || 'Unknown Buyer',
                  email: buyerDirect.email || ''
                };
              }
            }
          }

          return {
            ...inquiry,
            buyer: buyerData || { full_name: 'Unknown Buyer', email: '' }
          };
        })
      );

      return { data: inquiriesWithBuyers, error: null };
    } catch (error) {
      console.error('Error fetching property inquiries:', error);
      return { data: null, error };
    }
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
        property:property_listings(title, address),
        conversation:conversations(id, subject, last_message_at)
      `)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  // Mark inquiry as viewed (agent only)
  static async markInquiryAsViewed(inquiryId: string): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Check if already viewed
    const { data: inquiry } = await supabase
      .from('property_inquiries')
      .select('viewed_at')
      .eq('id', inquiryId)
      .single();

    if (inquiry?.viewed_at) {
      return { error: null }; // Already viewed
    }

    const { error } = await supabase
      .from('property_inquiries')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', inquiryId);

    return { error };
  }

  // Respond to an inquiry (agent only)
  static async respondToInquiry(inquiryId: string, response: string): Promise<{ data: PropertyInquiry | null; error: any }> {
    // Get inquiry details first
    const { data: inquiry, error: inquiryFetchError } = await supabase
      .from('property_inquiries')
      .select('*, property:property_listings(title, agent_id)')
      .eq('id', inquiryId)
      .single();

    if (inquiryFetchError || !inquiry) {
      return { data: null, error: inquiryFetchError || new Error('Inquiry not found') };
    }

    // Update inquiry status
    const { data, error } = await supabase
      .from('property_inquiries')
      .update({
        agent_response: response,
        responded_at: new Date().toISOString(),
        status: 'responded'
      })
      .eq('id', inquiryId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Get buyer and agent details for email
    const { data: buyer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', inquiry.buyer_id)
      .single();

    const { data: agent } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', (inquiry.property as any)?.agent_id)
      .single();

    const propertyTitle = (inquiry.property as any)?.title || 'the property';

    // If conversation exists, send the response as a message
    if (inquiry.conversation_id) {
      try {
        await messageService.sendMessage(inquiry.conversation_id, response);
        // Email will be sent automatically by messaging function
      } catch (error) {
        console.error('Failed to send response as message:', error);
        // If message sending fails, send email directly
        if (buyer?.email) {
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: buyer.email,
                template: 'messageNotification',
                subject: `Agent Response - ${propertyTitle}`,
                data: {
                  recipientName: buyer.full_name || 'there',
                  senderName: agent?.full_name || 'The agent',
                  senderEmail: agent?.email || null,
                  messageContent: response,
                  messagePreview: response.substring(0, 200),
                  conversationId: inquiry.conversation_id,
                  conversationSubject: `Property Inquiry: ${propertyTitle}`,
                  platformName: 'PickFirst Real Estate',
                  platformUrl: 'https://www.pickfirst.com.au'
                }
              }
            });
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    } else {
      // If no conversation exists, send email directly
      if (buyer?.email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: buyer.email,
              template: 'messageNotification',
              subject: `Agent Response - ${propertyTitle}`,
              data: {
                recipientName: buyer.full_name || 'there',
                senderName: agent?.full_name || 'The agent',
                senderEmail: agent?.email || null,
                messageContent: response,
                messagePreview: response.substring(0, 200),
                conversationId: null,
                conversationSubject: `Property Inquiry: ${propertyTitle}`,
                platformName: 'PickFirst Real Estate',
                platformUrl: 'https://www.pickfirst.com.au'
              }
            }
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }
    }

    // Notify buyer that agent has responded
    try {
      await notificationService.createNotification(
        inquiry.buyer_id,
        'inquiry_response',
        'Agent Responded',
        `The agent has responded to your inquiry about "${propertyTitle}"`,
        inquiry.conversation_id ? `/buyer-messages?conversation=${inquiry.conversation_id}` : '/buyer-messages',
        {
          inquiry_id: inquiryId,
          property_id: inquiry.property_id,
          property_title: propertyTitle,
          conversation_id: inquiry.conversation_id
        }
      );
    } catch (error) {
      console.error('Failed to notify buyer of response:', error);
      // Don't fail the response if notification fails
    }

    return { data, error: null };
  }

  // Send email notification to agent about new property inquiry
  private static async sendAgentInquiryNotification(
    propertyId: string, 
    agentId: string, 
    buyerId: string, 
    inquiryMessage: string
  ): Promise<void> {
    try {
      // Get property details
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .select('title, address, city, state, price, images')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error('Property not found');
      }

      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Get buyer details
      const { data: buyer, error: buyerError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', buyerId)
        .single();

      if (buyerError || !buyer) {
        throw new Error('Buyer not found');
      }

      // Send email to agent
      await supabase.functions.invoke('send-email', {
        body: {
          to: agent.email,
          template: 'agentInquiryNotification',
          subject: `🔔 New Property Inquiry - ${property.title}`,
          data: {
            agentName: agent.full_name || 'Agent',
            propertyTitle: property.title,
            propertyAddress: `${property.address}, ${property.city}, ${property.state}`,
            propertyPrice: `$${property.price.toLocaleString()}`,
            propertyImage: property.images && property.images.length > 0 ? property.images[0] : null,
            buyerName: buyer.full_name || 'A potential buyer',
            buyerEmail: buyer.email,
            buyerPhone: buyer.phone || 'Not provided',
            inquiryMessage: inquiryMessage,
            propertyUrl: `https://www.pickfirst.com.au/property/${propertyId}`,
            dashboardUrl: 'https://www.pickfirst.com.au/agent-leads',
            platformName: 'PickFirst Real Estate'
          }
        }
      });

      // Log the notification for audit purposes
      await auditService.log(agentId, 'EMAIL_SENT', 'property_inquiries', {
        recordId: propertyId,
        newValues: {
          action: 'agent_inquiry_notification',
          propertyId,
          buyerId,
          agentEmail: agent.email,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error sending agent inquiry notification:', error);
      throw error;
    }
  }

  // Trigger property alerts for a newly approved listing
  private static async triggerPropertyAlerts(propertyId: string): Promise<void> {
    try {
      // Call the property alert service to process the new property
      const result = await PropertyAlertService.processNewProperty(propertyId);
      
      if (result.success) {
      } else {
      }
    } catch (error) {
      console.error('Error triggering property alerts:', error);
      throw error;
    }
  }

  // Get agent details by ID
  static async getAgentDetails(agentId: string): Promise<{ data: any | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, bio, company, location, avatar_url')
        .eq('id', agentId)
        .eq('role', 'agent')
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching agent details:', error);
      return { data: null, error };
    }
  }
}