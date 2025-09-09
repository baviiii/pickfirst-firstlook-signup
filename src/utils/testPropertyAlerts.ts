import { supabase } from '@/integrations/supabase/client';
import PropertyAlertService from '@/services/propertyAlertService';
import BuyerProfileService from '@/services/buyerProfileService';

// Simple UUID generator fallback if not available
const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Test utility for the property alert system
 */
export class PropertyAlertTester {
  /**
   * Test the complete property alert flow
   */
  static async testCompleteFlow(): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      console.log('🧪 Starting Property Alert System Test...');

      // Step 1: Create a test buyer with preferences
      const testBuyer = await this.createTestBuyer();
      if (!testBuyer.success) {
        return { success: false, results: null, error: testBuyer.error };
      }

      // Step 2: Create a test property
      const testProperty = await this.createTestProperty();
      if (!testProperty.success) {
        return { success: false, results: null, error: testProperty.error };
      }

      // Step 3: Test property matching
      const matchResult = await this.testPropertyMatching(testProperty.propertyId!, testBuyer.buyerId!);
      if (!matchResult.success) {
        return { success: false, results: null, error: matchResult.error };
      }

      // Step 4: Test alert processing
      const alertResult = await PropertyAlertService.testAlertSystem(testProperty.propertyId!);
      if (!alertResult.success) {
        return { success: false, results: null, error: alertResult.error };
      }

      // Step 5: Clean up test data
      await this.cleanupTestData(testBuyer.buyerId!, testProperty.propertyId!);

      console.log('✅ Property Alert System Test Completed Successfully!');
      
      return {
        success: true,
        results: {
          testBuyer: testBuyer.buyerId,
          testProperty: testProperty.propertyId,
          matching: matchResult.results,
          alerts: alertResult.result
        }
      };

    } catch (error) {
      console.error('❌ Property Alert System Test Failed:', error);
      return {
        success: false,
        results: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a test buyer with property alert preferences
   */
  static async createTestBuyer(data?: any): Promise<{
    success: boolean;
    buyerId?: string;
    error?: string;
  }> {
    try {
      const testEmail = data?.email || `test-buyer-${Date.now()}@example.com`;
      const testName = data?.name || 'Test Buyer';

      // Create test profile
      const userId = generateUuid();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: testEmail,
          full_name: testName,
          role: 'buyer'
        })
        .select()
        .single();

      if (profileError) {
        return { success: false, error: `Failed to create test profile: ${profileError.message}` };
      }

      // Create user preferences with property alerts enabled
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: profile.id,
          property_alerts: true,
          email_notifications: true,
          min_budget: data?.budget ? data.budget * 0.8 : 300000,
          max_budget: data?.budget || 600000,
          preferred_bedrooms: data?.bedrooms || 3,
          preferred_bathrooms: data?.bathrooms || 2,
          preferred_areas: data?.location ? [data.location] : ['San Francisco', 'Oakland'],
          property_type_preferences: ['house', 'condo']
        });

      if (prefsError) {
        return { success: false, error: `Failed to create test preferences: ${prefsError.message}` };
      }

      console.log(`✅ Created test buyer: ${profile.id}`);
      return { success: true, buyerId: profile.id };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a test property listing
   */
  static async createTestProperty(data?: any): Promise<{
    success: boolean;
    propertyId?: string;
    error?: string;
  }> {
    try {
      // Get a test agent (or create one)
      const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'agent')
        .limit(1)
        .single();

      let agentId: string;

      if (agentError || !agent) {
        // Create a test agent if none exists
        const newAgentId = generateUuid();
        const { data: newAgent, error: newAgentError } = await supabase
          .from('profiles')
          .insert({
            id: newAgentId,
            email: `test-agent-${Date.now()}@example.com`,
            full_name: 'Test Agent',
            role: 'agent'
          })
          .select()
          .single();

        if (newAgentError) {
          return { success: false, error: `Failed to create test agent: ${newAgentError.message}` };
        }
        agentId = newAgent.id;
      } else {
        agentId = agent.id;
      }

      // Create test property
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .insert({
          agent_id: agentId,
          title: data?.title || 'Test Property - Perfect Match',
          description: 'A beautiful test property that matches buyer preferences',
          property_type: data?.property_type?.toLowerCase() || 'house',
          price: data?.price || 450000,
          bedrooms: data?.bedrooms || 3,
          bathrooms: data?.bathrooms || 2,
          square_feet: 1800,
          address: '123 Test Street',
          city: data?.city || 'San Francisco',
          state: data?.state || 'CA',
          zip_code: '94102',
          status: 'approved'
        })
        .select()
        .single();

      if (propertyError) {
        return { success: false, error: `Failed to create test property: ${propertyError.message}` };
      }

      console.log(`✅ Created test property: ${property.id}`);
      return { success: true, propertyId: property.id };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test property matching logic
   */
  private static async testPropertyMatching(
    propertyId: string, 
    buyerId: string
  ): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      // Get buyer preferences
      const preferences = await BuyerProfileService.getBuyerPreferences(buyerId);
      if (!preferences) {
        return { success: false, error: 'Failed to get buyer preferences' };
      }

      // Get property details
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError) {
        return { success: false, error: `Failed to get property: ${propertyError.message}` };
      }

      // Test the matching logic (simplified version)
      const price = parseFloat(property.price.toString());
      const matches = {
        priceMin: preferences.min_budget ? price >= preferences.min_budget : true,
        priceMax: preferences.max_budget ? price <= preferences.max_budget : true,
        bedrooms: preferences.preferred_bedrooms ? property.bedrooms >= preferences.preferred_bedrooms : true,
        bathrooms: preferences.preferred_bathrooms ? property.bathrooms >= preferences.preferred_bathrooms : true,
        location: preferences.preferred_areas ? preferences.preferred_areas.some((area: string) => 
          property.city.toLowerCase().includes(area.toLowerCase())
        ) : true,
        propertyType: preferences.property_type_preferences ? 
          preferences.property_type_preferences.includes(property.property_type) : true
      };

      const matchCount = Object.values(matches).filter(Boolean).length;
      const isMatch = matchCount >= 3; // At least 3 criteria must match

      console.log(`✅ Property matching test: ${matchCount}/6 criteria matched, isMatch: ${isMatch}`);

      return {
        success: true,
        results: {
          matches,
          matchCount,
          isMatch,
          preferences,
          property
        }
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clean up test data
   */
  private static async cleanupTestData(buyerId: string, propertyId: string): Promise<void> {
    try {
      // Delete property alerts
      await supabase
        .from('property_alerts')
        .delete()
        .or(`buyer_id.eq.${buyerId},property_id.eq.${propertyId}`);

      // Delete user preferences
      await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', buyerId);

      // Delete property
      await supabase
        .from('property_listings')
        .delete()
        .eq('id', propertyId);

      // Delete profiles (buyer and potentially agent)
      await supabase
        .from('profiles')
        .delete()
        .eq('id', buyerId);

      console.log('✅ Cleaned up test data');
    } catch (error) {
      console.error('⚠️ Failed to clean up test data:', error);
    }
  }

  /**
   * Test alert statistics
   */
  static async testAlertStatistics(): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      const stats = await PropertyAlertService.getAlertStatistics();
      console.log('✅ Alert statistics:', stats);
      return { success: true, results: stats };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test buyer alert history
   */
  static async testBuyerAlertHistory(buyerId: string): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      const history = await PropertyAlertService.getBuyerAlertHistory(buyerId);
      console.log('✅ Buyer alert history:', history);
      return { success: true, results: history };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export helper functions for easy testing
export const testPropertyAlerts = () => PropertyAlertTester.testCompleteFlow();
export const testAlertStats = () => PropertyAlertTester.testAlertStatistics();
export const testBuyerHistory = (buyerId: string) => PropertyAlertTester.testBuyerAlertHistory(buyerId);

// Default export
export default PropertyAlertTester;