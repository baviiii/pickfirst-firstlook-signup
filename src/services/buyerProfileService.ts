import { supabase } from '@/integrations/supabase/client';
import ProfileService, { UserPreferences } from './profileService';
import EmailService from './emailService';
import { toast } from 'sonner';

export interface BuyerPreferences extends UserPreferences {
  // Extended buyer-specific preferences
  max_budget?: number;
  min_budget?: number;
  preferred_bedrooms?: number;
  preferred_bathrooms?: number;
  preferred_garages?: number;
  preferred_features?: string[];
  preferred_square_feet_min?: number;
  preferred_square_feet_max?: number;
  move_in_timeline?: 'immediate' | '1-3_months' | '3-6_months' | '6-12_months' | 'flexible';
  financing_pre_approved?: boolean;
  first_time_buyer?: boolean;
}

export interface PropertySearchCriteria {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  bedrooms?: number;
  bathrooms?: number;
  garages?: number;
  features?: string[];
  minSquareFeet?: number;
  maxSquareFeet?: number;
}

export class BuyerProfileService extends ProfileService {
  /**
   * Get buyer-specific preferences
   */
  static async getBuyerPreferences(userId: string): Promise<BuyerPreferences | null> {
    try {
      const preferences = await super.getUserPreferences(userId);
      if (!preferences) return null;

      // Convert budget_range back to min_budget and max_budget
      const buyerPreferences: BuyerPreferences = { ...preferences } as BuyerPreferences;
      
      if (preferences.budget_range) {
        const [minStr, maxStr] = preferences.budget_range.split('-');
        buyerPreferences.min_budget = parseInt(minStr) || 0;
        buyerPreferences.max_budget = parseInt(maxStr) || 1000000;
      } else {
        buyerPreferences.min_budget = 0;
        buyerPreferences.max_budget = 1000000;
      }

      // Extract bedrooms, bathrooms, and garages from preferred_areas array
      if (preferences.preferred_areas) {
        const bedroomPref = preferences.preferred_areas.find(area => area.startsWith('bedrooms:'));
        const bathroomPref = preferences.preferred_areas.find(area => area.startsWith('bathrooms:'));
        const garagePref = preferences.preferred_areas.find(area => area.startsWith('garages:'));
        
        buyerPreferences.preferred_bedrooms = bedroomPref ? parseInt(bedroomPref.split(':')[1]) : null;
        buyerPreferences.preferred_bathrooms = bathroomPref ? parseInt(bathroomPref.split(':')[1]) : null;
        buyerPreferences.preferred_garages = garagePref ? parseInt(garagePref.split(':')[1]) : null;
        
        // Filter out bedroom/bathroom/garage preferences from areas
        buyerPreferences.preferred_areas = preferences.preferred_areas.filter(area => 
          !area.startsWith('bedrooms:') && !area.startsWith('bathrooms:') && !area.startsWith('garages:')
        );
      } else {
        buyerPreferences.preferred_bedrooms = null;
        buyerPreferences.preferred_bathrooms = null;
        buyerPreferences.preferred_garages = null;
      }

      // Set default values for fields that don't exist in the database
      buyerPreferences.move_in_timeline = 'flexible';
      buyerPreferences.financing_pre_approved = false;
      buyerPreferences.first_time_buyer = false;

      return buyerPreferences;
    } catch (error) {
      console.error('Error fetching buyer preferences:', error);
      return null;
    }
  }

  /**
   * Update buyer preferences with property search criteria
   */
  static async updateBuyerPreferences(
    userId: string, 
    preferences: Partial<BuyerPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('BuyerProfileService: Updating preferences for user:', userId);
      console.log('BuyerProfileService: Input preferences:', preferences);
      
      // Convert numeric budget fields to budget_range text for database compatibility
      const dbPreferences: any = { ...preferences };
      
      // Convert min_budget and max_budget to budget_range
      if (preferences.min_budget !== undefined || preferences.max_budget !== undefined) {
        const min = preferences.min_budget || 0;
        const max = preferences.max_budget || 1000000;
        dbPreferences.budget_range = `${min}-${max}`;
        
        // Remove the numeric fields that don't exist in the database
        delete dbPreferences.min_budget;
        delete dbPreferences.max_budget;
      }

      // Store bedrooms, bathrooms, and garages in preferred_areas array for now (temporary solution)
      if (preferences.preferred_bedrooms !== undefined || preferences.preferred_bathrooms !== undefined || preferences.preferred_garages !== undefined) {
        const existingAreas = dbPreferences.preferred_areas || [];
        
        // Remove existing bedroom/bathroom/garage preferences
        const filteredAreas = existingAreas.filter(area => 
          !area.startsWith('bedrooms:') && !area.startsWith('bathrooms:') && !area.startsWith('garages:')
        );
        const newAreas = [...filteredAreas];
        
        // Add new preferences only if they have values (not null/undefined)
        if (preferences.preferred_bedrooms !== null && preferences.preferred_bedrooms !== undefined) {
          newAreas.push(`bedrooms:${preferences.preferred_bedrooms}`);
        }
        if (preferences.preferred_bathrooms !== null && preferences.preferred_bathrooms !== undefined) {
          newAreas.push(`bathrooms:${preferences.preferred_bathrooms}`);
        }
        if (preferences.preferred_garages !== null && preferences.preferred_garages !== undefined) {
          newAreas.push(`garages:${preferences.preferred_garages}`);
        }
        
        dbPreferences.preferred_areas = newAreas;
      }

      // Remove other fields that don't exist in the database schema
      delete dbPreferences.preferred_bedrooms;
      delete dbPreferences.preferred_bathrooms;
      delete dbPreferences.preferred_garages;
      delete dbPreferences.preferred_square_feet_min;
      delete dbPreferences.preferred_square_feet_max;
      delete dbPreferences.move_in_timeline;
      delete dbPreferences.financing_pre_approved;
      delete dbPreferences.first_time_buyer;

      console.log('BuyerProfileService: Final dbPreferences to save:', dbPreferences);
      
      // First update the basic preferences
      const result = await super.updateUserPreferences(userId, dbPreferences);
      console.log('BuyerProfileService: Database update result:', result);
      
      if (result.success) {
        // Log the preference update for analytics
        await this.logBuyerActivity(userId, 'preferences_updated', {
          updated_fields: Object.keys(preferences)
        });

        // Removed property alert setup confirmation email (was sending fake property image)
        // If property alerts are enabled and search criteria changed, send confirmation
        // if (preferences.property_alerts && this.hasSearchCriteriaChanged(preferences)) {
        //   await this.sendPropertyAlertSetupConfirmation(userId);
        // }

        // Send preferences updated email if email notifications enabled
        try {
          const profile = await super.getProfile(userId);
          const prefs = await super.getUserPreferences(userId);
          if (profile?.email && prefs?.email_notifications) {
            await EmailService.sendPreferencesUpdated(
              profile.email,
              profile.full_name || 'User',
              preferences // Pass the actual preference values, not just keys
            );
          }
        } catch (e) {
          console.error('Failed to send preferences updated email:', e);
        }
      }

      return result;
    } catch (error) {
      console.error('Error updating buyer preferences:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save property search criteria
   */
  static async saveSearchCriteria(
    userId: string, 
    criteria: PropertySearchCriteria
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const preferences: Partial<BuyerPreferences> = {
        min_budget: criteria.minPrice,
        max_budget: criteria.maxPrice,
        preferred_bedrooms: criteria.bedrooms,
        preferred_bathrooms: criteria.bathrooms,
        preferred_garages: criteria.garages,
        preferred_square_feet_min: criteria.minSquareFeet,
        preferred_square_feet_max: criteria.maxSquareFeet,
        preferred_areas: criteria.location ? [criteria.location] : undefined,
        property_type_preferences: criteria.propertyTypes || undefined,
        preferred_features: criteria.features
      };

      const result = await this.updateBuyerPreferences(userId, preferences);
      
      if (result.success) {
        toast.success('Search preferences saved successfully');
        
        // Log search criteria save
        await this.logBuyerActivity(userId, 'search_criteria_saved', criteria);

        // Note: Email is already sent by updateBuyerPreferences above
        // No need to send a duplicate email here
      }

      return result;
    } catch (error) {
      console.error('Error saving search criteria:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get matching properties based on buyer preferences
   */
  static async getMatchingProperties(userId: string, limit: number = 20) {
    try {
      const preferences = await this.getBuyerPreferences(userId);
      if (!preferences) return [];

      let query = supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'approved');

      // Apply filters based on preferences
      if (preferences.min_budget) {
        query = query.gte('price', preferences.min_budget);
      }
      if (preferences.max_budget) {
        query = query.lte('price', preferences.max_budget);
      }
      if (preferences.preferred_bedrooms) {
        query = query.gte('bedrooms', preferences.preferred_bedrooms);
      }
      if (preferences.preferred_garages !== undefined) {
        query = query.gte('garages', preferences.preferred_garages);
      }
      if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
        query = query.in('city', preferences.preferred_areas);
      }
      if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
        query = query.in('property_type', preferences.property_type_preferences);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching matching properties:', error);
        return [];
      }

      // Log property search
      await this.logBuyerActivity(userId, 'properties_searched', {
        filters_applied: Object.keys(preferences).length,
        results_count: data?.length || 0
      });

      return data || [];
    } catch (error) {
      console.error('Error getting matching properties:', error);
      return [];
    }
  }

  /**
   * Mark property as favorite
   */
  static async togglePropertyFavorite(
    userId: string, 
    propertyId: string
  ): Promise<{ success: boolean; isFavorited: boolean; error?: string }> {
    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('property_favorites')
        .select('id')
        .eq('buyer_id', userId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (existing) {
        // Remove from favorites
        const { error } = await supabase
          .from('property_favorites')
          .delete()
          .eq('id', existing.id);

        if (error) {
          return { success: false, isFavorited: false, error: error.message };
        }

        await this.logBuyerActivity(userId, 'property_unfavorited', { property_id: propertyId });
        return { success: true, isFavorited: false };
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('property_favorites')
          .insert({
            buyer_id: userId,
            property_id: propertyId
          });

        if (error) {
          return { success: false, isFavorited: false, error: error.message };
        }

        await this.logBuyerActivity(userId, 'property_favorited', { property_id: propertyId });
        return { success: true, isFavorited: true };
      }
    } catch (error) {
      console.error('Error toggling property favorite:', error);
      return { success: false, isFavorited: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get buyer's favorite properties
   */
  static async getFavoriteProperties(userId: string) {
    try {
      const { data, error } = await supabase
        .from('property_favorites')
        .select(`
          id,
          created_at,
          property_listings (*)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorite properties:', error);
        return [];
      }

      return data?.map(fav => fav.property_listings).filter(Boolean) || [];
    } catch (error) {
      console.error('Error getting favorite properties:', error);
      return [];
    }
  }

  /**
   * Send property alert setup confirmation
   */
  private static async sendPropertyAlertSetupConfirmation(userId: string) {
    try {
      const profile = await super.getProfile(userId);
      if (!profile) return;

      const preferences = await this.getBuyerPreferences(userId);
      if (!preferences) return;

      // Send confirmation email
      await EmailService.sendCustomEmail({
        to: profile.email,
        template: 'propertyAlert',
        data: {
          name: profile.full_name || 'User',
          propertyTitle: 'Property Alert Setup Complete',
          price: preferences.max_budget || 0,
          location: preferences.preferred_areas?.join(', ') || 'Any location',
          propertyType: preferences.property_type_preferences?.join(', ') || 'Any type',
          bedrooms: preferences.preferred_bedrooms || 'Any',
          bathrooms: preferences.preferred_bathrooms || 'Any'
        },
        subject: 'Property Alerts Activated - We\'ll Find Your Perfect Home'
      });
    } catch (error) {
      console.error('Error sending property alert confirmation:', error);
    }
  }

  /**
   * Log buyer activity for analytics
   */
  private static async logBuyerActivity(
    userId: string, 
    action: string, 
    metadata: Record<string, any> = {}
  ) {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          table_name: 'buyer_activities',
          action,
          new_values: {
            timestamp: new Date().toISOString(),
            ...metadata
          }
        });
    } catch (error) {
      console.error('Error logging buyer activity:', error);
    }
  }

  /**
   * Check if search criteria has meaningfully changed
   */
  private static hasSearchCriteriaChanged(preferences: Partial<BuyerPreferences>): boolean {
    const searchCriteriaFields = [
      'min_budget', 'max_budget', 'preferred_bedrooms', 'preferred_bathrooms',
      'preferred_areas', 'property_type_preferences'
    ];
    
    return searchCriteriaFields.some(field => preferences.hasOwnProperty(field));
  }
}

export default BuyerProfileService;