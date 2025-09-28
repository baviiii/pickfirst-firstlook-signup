import { supabase } from '@/integrations/supabase/client';
import BuyerProfileService, { BuyerPreferences } from './buyerProfileService';
import EmailService from './emailService';
import { Database } from '@/integrations/supabase/types';

type PropertyListing = Database['public']['Tables']['property_listings']['Row'];

export interface PropertyAlert {
  id: string;
  buyer_id: string;
  property_id: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
  email_template: string;
  created_at: string;
}

export interface AlertMatch {
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  property: PropertyListing;
  matchScore: number;
  matchedCriteria: string[];
}

/**
 * Check if a user has access to property alerts feature
 */
async function checkPropertyAlertsAccess(userId: string): Promise<boolean> {
  try {
    // Get user's subscription status first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return false;
    }

    const subscriptionTier = profile.subscription_tier || 'free';
    
    // Check for basic or unlimited property alerts based on subscription tier
    const featureKey = subscriptionTier === 'premium' ? 'property_alerts_unlimited' : 'property_alerts_basic';
    
    const { data: featureConfig, error } = await supabase
      .from('feature_configurations')
      .select('free_tier_enabled, premium_tier_enabled')
      .eq('feature_key', featureKey)
      .single();

    if (error || !featureConfig) {
      console.error('Error checking property alerts feature config:', error);
      // Fallback: allow basic alerts for all users if config is missing
      return featureKey === 'property_alerts_basic';
    }
    
    // Check feature access based on subscription tier
    if (subscriptionTier === 'free' && !featureConfig.free_tier_enabled) {
      return false;
    }
    
    if (subscriptionTier === 'premium' && !featureConfig.premium_tier_enabled) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in checkPropertyAlertsAccess:', error);
    // Fallback: allow basic alerts for free users
    return true;
  }
}

/**
 * Log feature access attempt for audit purposes
 */
async function logFeatureAccessAttempt(
  userId: string, 
  action: string, 
  allowed: boolean, 
  details?: any
): Promise<void> {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        table_name: 'property_alerts',
        action: `feature_access_${action}`,
        new_values: {
          allowed,
          feature: 'property_alerts',
          details,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging feature access attempt:', error);
  }
}

export class PropertyAlertService {
  /**
   * Process new property and find matching buyers
   */
  static async processNewProperty(propertyId: string): Promise<{ 
    success: boolean; 
    matchesFound: number; 
    alertsSent: number; 
    error?: string 
  }> {
    try {
      // Get the new property
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', propertyId)
        .eq('status', 'approved')
        .single();

      if (propertyError || !property) {
        return { success: false, matchesFound: 0, alertsSent: 0, error: 'Property not found or not approved' };
      }

      // Find all buyers with property alerts enabled
      const { data: buyersWithAlerts, error: buyersError } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          property_alerts,
          email_notifications,
          profiles!inner (
            id,
            email,
            full_name,
            role,
            subscription_tier
          )
        `)
        .eq('property_alerts', true)
        .eq('email_notifications', true)
        .eq('profiles.role', 'buyer');

      if (buyersError || !buyersWithAlerts) {
        return { success: false, matchesFound: 0, alertsSent: 0, error: 'Failed to fetch buyers with alerts' };
      }

      const matches: AlertMatch[] = [];
      const alertsToSend: Array<{ buyerId: string; property: PropertyListing }> = [];
      let accessDeniedCount = 0;

      // Check each buyer's preferences against the new property
      for (const buyerPref of buyersWithAlerts) {
        const buyerId = buyerPref.user_id;
        const buyerEmail = buyerPref.profiles.email;
        const buyerName = buyerPref.profiles.full_name || 'User';

        // SECURITY: Check if buyer has access to property alerts feature
        const hasAccess = await checkPropertyAlertsAccess(buyerId);
        if (!hasAccess) {
          accessDeniedCount++;
          await logFeatureAccessAttempt(buyerId, 'property_alert_processing', false, {
            property_id: propertyId,
            reason: 'insufficient_subscription_tier'
          });
          continue; // Skip users without proper subscription
        }

        // Log successful feature access
        await logFeatureAccessAttempt(buyerId, 'property_alert_processing', true, {
          property_id: propertyId
        });

        // Get buyer's detailed preferences
        const preferences = await BuyerProfileService.getBuyerPreferences(buyerId);
        if (!preferences) continue;

        // Check if property matches buyer preferences
        const matchResult = this.checkPropertyMatch(property, preferences);
        
        if (matchResult.isMatch) {
          matches.push({
            buyerId,
            buyerEmail,
            buyerName,
            property,
            matchScore: matchResult.score,
            matchedCriteria: matchResult.matchedCriteria
          });

          alertsToSend.push({ buyerId, property });
        }
      }

      // Send alerts to matching buyers
      let alertsSent = 0;
      for (const alert of alertsToSend) {
        try {
          const match = matches.find(m => m.buyerId === alert.buyerId);
          if (!match) continue;

          await this.sendPropertyAlert(match);
          await this.logAlertSent(alert.buyerId, propertyId);
          alertsSent++;
        } catch (error) {
          console.error(`Failed to send alert to buyer ${alert.buyerId}:`, error);
        }
      }

      // Log the alert processing with access control stats
      await this.logAlertProcessing(propertyId, matches.length, alertsSent, accessDeniedCount);

      return {
        success: true,
        matchesFound: matches.length,
        alertsSent
      };

    } catch (error) {
      console.error('Error processing new property for alerts:', error);
      return { 
        success: false, 
        matchesFound: 0, 
        alertsSent: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if a property matches buyer preferences
   */
  private static checkPropertyMatch(
    property: PropertyListing, 
    preferences: BuyerPreferences
  ): { isMatch: boolean; score: number; matchedCriteria: string[] } {
    const matchedCriteria: string[] = [];
    let score = 0;
    let totalCriteria = 0;

    // Price range matching
    if (preferences.min_budget || preferences.max_budget) {
      totalCriteria++;
      const price = parseFloat(property.price.toString());
      
      if (preferences.min_budget && price >= preferences.min_budget) {
        matchedCriteria.push('price_min');
        score += 0.3;
      }
      
      if (preferences.max_budget && price <= preferences.max_budget) {
        matchedCriteria.push('price_max');
        score += 0.3;
      }
    }

    // Bedrooms matching
    if (preferences.preferred_bedrooms && property.bedrooms) {
      totalCriteria++;
      if (property.bedrooms >= preferences.preferred_bedrooms) {
        matchedCriteria.push('bedrooms');
        score += 0.2;
      }
    }

    // Bathrooms matching
    if (preferences.preferred_bathrooms && property.bathrooms) {
      totalCriteria++;
      if (property.bathrooms >= preferences.preferred_bathrooms) {
        matchedCriteria.push('bathrooms');
        score += 0.2;
      }
    }

    // Location matching
    if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
      totalCriteria++;
      const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
      const isLocationMatch = preferences.preferred_areas.some(area => 
        propertyLocation.includes(area.toLowerCase()) || 
        property.city.toLowerCase().includes(area.toLowerCase())
      );
      
      if (isLocationMatch) {
        matchedCriteria.push('location');
        score += 0.3;
      }
    }

    // Property type matching
    if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
      totalCriteria++;
      if (preferences.property_type_preferences.includes(property.property_type)) {
        matchedCriteria.push('property_type');
        score += 0.2;
      }
    }

    // Square footage matching
    if (preferences.preferred_square_feet_min && property.square_feet) {
      totalCriteria++;
      if (property.square_feet >= preferences.preferred_square_feet_min) {
        matchedCriteria.push('square_feet_min');
        score += 0.1;
      }
    }

    if (preferences.preferred_square_feet_max && property.square_feet) {
      totalCriteria++;
      if (property.square_feet <= preferences.preferred_square_feet_max) {
        matchedCriteria.push('square_feet_max');
        score += 0.1;
      }
    }

    // Consider it a match if it meets at least 60% of the criteria or has a high score
    const isMatch = totalCriteria === 0 || score >= 0.6 || (matchedCriteria.length >= 2 && score >= 0.4);

    return {
      isMatch,
      score: totalCriteria > 0 ? score / totalCriteria : 0,
      matchedCriteria
    };
  }

  /**
   * Send property alert email to buyer
   */
  private static async sendPropertyAlert(match: AlertMatch): Promise<void> {
    try {
      const propertyUrl = `https://baviiii.github.io/pickfirst-firstlook-signup/property/${match.property.id}`;
      
      await EmailService.sendPropertyAlert(
        match.buyerEmail,
        match.buyerName,
        {
          title: match.property.title,
          price: parseFloat(match.property.price.toString()),
          location: `${match.property.city}, ${match.property.state}`,
          propertyType: match.property.property_type,
          bedrooms: match.property.bedrooms || 0,
          bathrooms: match.property.bathrooms || 0,
          propertyUrl
        }
      );

      // Log the alert in the database
      await this.createAlertRecord(match.buyerId, match.property.id, 'sent');

    } catch (error) {
      console.error('Error sending property alert:', error);
      await this.createAlertRecord(match.buyerId, match.property.id, 'failed');
      throw error;
    }
  }

  /**
   * Create alert record in database
   */
  private static async createAlertRecord(
    buyerId: string, 
    propertyId: string, 
    status: 'sent' | 'delivered' | 'failed'
  ): Promise<void> {
    try {
      await supabase
        .from('property_alerts')
        .insert({
          buyer_id: buyerId,
          property_id: propertyId,
          status,
          email_template: 'propertyAlert',
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating alert record:', error);
    }
  }

  /**
   * Log alert processing activity with access control metrics
   */
  private static async logAlertProcessing(
    propertyId: string, 
    matchesFound: number, 
    alertsSent: number,
    accessDeniedCount: number = 0
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: 'system',
          table_name: 'property_alerts',
          action: 'process_new_property',
          new_values: {
            property_id: propertyId,
            matches_found: matchesFound,
            alerts_sent: alertsSent,
            access_denied_count: accessDeniedCount,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error logging alert processing:', error);
    }
  }

  /**
   * Log individual alert sent
   */
  private static async logAlertSent(buyerId: string, propertyId: string): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: buyerId,
          table_name: 'property_alerts',
          action: 'alert_sent',
          new_values: {
            property_id: propertyId,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error logging alert sent:', error);
    }
  }

  /**
   * Get alert history for a buyer - with feature access validation
   */
  static async getBuyerAlertHistory(buyerId: string, limit: number = 20): Promise<PropertyAlert[]> {
    try {
      // SECURITY: Check if buyer has access to property alerts feature
      const hasAccess = await checkPropertyAlertsAccess(buyerId);
      if (!hasAccess) {
        await logFeatureAccessAttempt(buyerId, 'alert_history_access', false, {
          reason: 'insufficient_subscription_tier'
        });
        return []; // Return empty array for unauthorized users
      }

      await logFeatureAccessAttempt(buyerId, 'alert_history_access', true);

      const { data, error } = await supabase
        .from('property_alerts')
        .select(`
          *,
          property_listings (
            id,
            title,
            price,
            city,
            state,
            property_type,
            bedrooms,
            bathrooms
          )
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching alert history:', error);
        return [];
      }

      return (data || []) as PropertyAlert[];
    } catch (error) {
      console.error('Error getting buyer alert history:', error);
      return [];
    }
  }

  /**
   * Get alert statistics for admin dashboard
   */
  static async getAlertStatistics(): Promise<{
    totalAlerts: number;
    alertsToday: number;
    alertsThisWeek: number;
    successRate: number;
    topMatchedCriteria: Array<{ criteria: string; count: number }>;
  }> {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [totalResult, todayResult, weekResult, successResult] = await Promise.all([
        supabase.from('property_alerts').select('id', { count: 'exact' }),
        supabase.from('property_alerts').select('id', { count: 'exact' }).gte('created_at', today.toISOString().split('T')[0]),
        supabase.from('property_alerts').select('id', { count: 'exact' }).gte('created_at', weekAgo.toISOString()),
        supabase.from('property_alerts').select('status')
      ]);

      const totalAlerts = totalResult.count || 0;
      const alertsToday = todayResult.count || 0;
      const alertsThisWeek = weekResult.count || 0;
      
      const successfulAlerts = successResult.data?.filter(alert => alert.status === 'sent').length || 0;
      const successRate = totalAlerts > 0 ? (successfulAlerts / totalAlerts) * 100 : 0;

      // Get top matched criteria from audit logs
      const { data: criteriaData } = await supabase
        .from('audit_logs')
        .select('new_values')
        .eq('table_name', 'property_alerts')
        .eq('action', 'alert_sent')
        .gte('created_at', weekAgo.toISOString());

      const criteriaCount: Record<string, number> = {};
      criteriaData?.forEach(log => {
        const matchedCriteria = (log.new_values as any)?.matched_criteria || [];
        matchedCriteria.forEach((criteria: string) => {
          criteriaCount[criteria] = (criteriaCount[criteria] || 0) + 1;
        });
      });

      const topMatchedCriteria = Object.entries(criteriaCount)
        .map(([criteria, count]) => ({ criteria, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalAlerts,
        alertsToday,
        alertsThisWeek,
        successRate: Math.round(successRate * 100) / 100,
        topMatchedCriteria
      };
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      return {
        totalAlerts: 0,
        alertsToday: 0,
        alertsThisWeek: 0,
        successRate: 0,
        topMatchedCriteria: []
      };
    }
  }

  /**
   * Test the alert system with a specific property - with feature access validation
   */
  static async testAlertSystem(propertyId: string, testUserId?: string): Promise<{
    success: boolean;
    result: any;
    error?: string;
  }> {
    try {
      // If testing for a specific user, validate their access
      if (testUserId) {
        const hasAccess = await checkPropertyAlertsAccess(testUserId);
        if (!hasAccess) {
          await logFeatureAccessAttempt(testUserId, 'alert_system_test', false, {
            property_id: propertyId,
            reason: 'insufficient_subscription_tier'
          });
          return {
            success: false,
            result: null,
            error: 'User does not have access to property alerts feature'
          };
        }
        
        await logFeatureAccessAttempt(testUserId, 'alert_system_test', true, {
          property_id: propertyId
        });
      }

      const result = await this.processNewProperty(propertyId);
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        result: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default PropertyAlertService;
