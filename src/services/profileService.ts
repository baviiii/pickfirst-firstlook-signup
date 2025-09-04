import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  company?: string;
  website?: string;
  role: string;
  subscription_tier?: string;
  subscription_status?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id?: string;
  user_id: string;
  
  // Notification preferences
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  property_alerts: boolean;
  agent_messages: boolean;
  appointment_reminders: boolean;
  new_listings: boolean;
  price_changes: boolean;
  market_updates: boolean;
  
  // Privacy settings
  profile_visibility: 'public' | 'private' | 'contacts_only';
  show_email: boolean;
  show_phone: boolean;
  show_location: boolean;
  show_activity_status: boolean;
  allow_marketing: boolean;
  
  // Buyer specific preferences
  preferred_contact_method: 'email' | 'phone' | 'both';
  budget_range?: string;
  preferred_areas?: string[];
  property_type_preferences?: string[];
  
  created_at?: string;
  updated_at?: string;
}

export class ProfileService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<ProfileData | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Profile service error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<ProfileData>): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove read-only fields
      const { id, email, created_at, updated_at, ...allowedUpdates } = updates;

      const { error } = await supabase
        .from('profiles')
        .update(allowedUpdates)
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return { success: false, error: error.message };
      }

      // Send profile update email
      await this.sendProfileUpdateEmail(userId, Object.keys(allowedUpdates));

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching preferences:', error);
        return null;
      }

      // Return default preferences if none exist
      if (!data) {
        return this.createDefaultPreferences(userId);
      }

      return data as UserPreferences;
    } catch (error) {
      console.error('Preferences service error:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if preferences exist
      const existing = await this.getUserPreferences(userId);
      
      if (!existing) {
        // Create new preferences
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            ...preferences
          });

        if (error) {
          console.error('Error creating preferences:', error);
          return { success: false, error: error.message };
        }
      } else {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update(preferences)
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating preferences:', error);
          return { success: false, error: error.message };
        }
      }

      toast.success('Preferences updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Preferences update error:', error);
      toast.error('Failed to update preferences');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create default preferences for a user
   */
  private static async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = {
      user_id: userId,
      email_notifications: true,
      push_notifications: false,
      marketing_emails: false,
      property_alerts: true,
      agent_messages: true,
      appointment_reminders: true,
      new_listings: true,
      price_changes: true,
      market_updates: false,
      profile_visibility: 'public' as const,
      show_email: false,
      show_phone: false,
      show_location: true,
      show_activity_status: false,
      allow_marketing: false,
      preferred_contact_method: 'email' as const
    };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs);

      if (error) {
        console.error('Error creating default preferences:', error);
      }
    } catch (error) {
      console.error('Default preferences creation error:', error);
    }

    return defaultPrefs;
  }

  /**
   * Send profile update notification email
   */
  private static async sendProfileUpdateEmail(userId: string, changedFields: string[]) {
    try {
      const profile = await this.getProfile(userId);
      const preferences = await this.getUserPreferences(userId);

      if (!profile || !preferences?.email_notifications) {
        return; // Don't send if no profile or email notifications disabled
      }

      const changes = changedFields.map(field => {
        switch (field) {
          case 'full_name': return 'Full name updated';
          case 'phone': return 'Phone number updated';
          case 'bio': return 'Bio updated';
          case 'location': return 'Location updated';
          case 'company': return 'Company information updated';
          case 'website': return 'Website updated';
          case 'avatar_url': return 'Profile picture updated';
          default: return `${field} updated`;
        }
      });

      await supabase.functions.invoke('send-email', {
        body: {
          to: profile.email,
          template: 'profileUpdate',
          data: {
            name: profile.full_name || 'User',
            changes,
            userId
          }
        }
      });
    } catch (error) {
      console.error('Error sending profile update email:', error);
    }
  }

  /**
   * Send welcome email for new users
   */
  static async sendWelcomeEmail(userId: string) {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return;

      await supabase.functions.invoke('send-email', {
        body: {
          to: profile.email,
          template: 'welcome',
          data: {
            name: profile.full_name || 'User',
            email: profile.email,
            location: profile.location,
            contactPreference: 'Email',
            platformName: 'PickFirst Real Estate',
            platformUrl: window.location.origin,
            userId
          }
        }
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  /**
   * Delete user profile and all associated data
   */
  static async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This will cascade delete due to foreign key constraints
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting profile:', error);
        return { success: false, error: error.message };
      }

      toast.success('Profile deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Profile deletion error:', error);
      toast.error('Failed to delete profile');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default ProfileService;