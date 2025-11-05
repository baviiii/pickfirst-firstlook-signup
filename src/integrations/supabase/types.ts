export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_specialties: {
        Row: {
          created_at: string
          id: string
          specialty: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          specialty: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          specialty?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_specialties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_specialties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          agent_id: string
          appointment_type: string
          client_email: string
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          date: string
          duration: number
          id: string
          inquiry_id: string | null
          notes: string | null
          property_address: string
          property_id: string | null
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          appointment_type: string
          client_email: string
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          date: string
          duration?: number
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          property_address?: string
          property_id?: string | null
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          appointment_type?: string
          client_email?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          date?: string
          duration?: number
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          property_address?: string
          property_id?: string | null
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "property_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      area_insights: {
        Row: {
          address: string
          air_quality: Json | null
          created_at: string
          fetched_at: string
          id: string
          latitude: number
          longitude: number
          nearby_places: Json
          updated_at: string
        }
        Insert: {
          address: string
          air_quality?: Json | null
          created_at?: string
          fetched_at?: string
          id?: string
          latitude: number
          longitude: number
          nearby_places?: Json
          updated_at?: string
        }
        Update: {
          address?: string
          air_quality?: Json | null
          created_at?: string
          fetched_at?: string
          id?: string
          latitude?: number
          longitude?: number
          nearby_places?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string
          calendar_id: string
          calendar_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          provider: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id: string
          calendar_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          calendar_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          agent_id: string
          client_id: string
          content: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          interaction_type: string
          next_follow_up: string | null
          outcome: string | null
          subject: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_type: string
          next_follow_up?: string | null
          outcome?: string | null
          subject?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_type?: string
          next_follow_up?: string | null
          outcome?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          agent_id: string
          client_id: string
          content: string
          created_at: string | null
          id: string
          note_type: string
        }
        Insert: {
          agent_id: string
          client_id: string
          content: string
          created_at?: string | null
          id?: string
          note_type?: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          content?: string
          created_at?: string | null
          id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          agent_id: string
          budget_range: string | null
          created_at: string | null
          email: string | null
          id: string
          invite_accepted_at: string | null
          invited_at: string | null
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_areas: string[] | null
          property_type: string | null
          rating: number | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          budget_range?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          invite_accepted_at?: string | null
          invited_at?: string | null
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          budget_range?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          invite_accepted_at?: string | null
          invited_at?: string | null
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          client_id: string | null
          created_at: string | null
          id: string
          inquiry_id: string | null
          last_message_at: string | null
          metadata: Json | null
          priority: string | null
          status: string | null
          subject: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "property_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_configurations: {
        Row: {
          basic_tier_enabled: boolean | null
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          free_tier_enabled: boolean
          id: string
          premium_tier_enabled: boolean
          updated_at: string
        }
        Insert: {
          basic_tier_enabled?: boolean | null
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          free_tier_enabled?: boolean
          id?: string
          premium_tier_enabled?: boolean
          updated_at?: string
        }
        Update: {
          basic_tier_enabled?: boolean | null
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          free_tier_enabled?: boolean
          id?: string
          premium_tier_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string | null
          device_info: Json | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string
          location_info: Json | null
          login_type: string
          origin: string | null
          referer: string | null
          session_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address: string
          location_info?: Json | null
          login_type?: string
          origin?: string | null
          referer?: string | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string
          location_info?: Json | null
          login_type?: string
          origin?: string | null
          referer?: string | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          role: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          role?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      property_alert_jobs: {
        Row: {
          alert_type: string
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          property_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          property_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          property_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_alert_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alert_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_alerts: {
        Row: {
          alert_type: string
          buyer_id: string
          created_at: string | null
          email_template: string
          id: string
          property_id: string
          sent_at: string
          status: string
        }
        Insert: {
          alert_type?: string
          buyer_id: string
          created_at?: string | null
          email_template?: string
          id?: string
          property_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          alert_type?: string
          buyer_id?: string
          created_at?: string | null
          email_template?: string
          id?: string
          property_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_alerts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alerts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alerts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_favorites: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          property_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          property_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_favorites_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inquiries: {
        Row: {
          agent_response: string | null
          buyer_id: string
          contact_preference: string | null
          created_at: string | null
          id: string
          message: string
          property_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          agent_response?: string | null
          buyer_id: string
          contact_preference?: string | null
          created_at?: string | null
          id?: string
          message: string
          property_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          agent_response?: string | null
          buyer_id?: string
          contact_preference?: string | null
          created_at?: string | null
          id?: string
          message?: string
          property_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_inquiries_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          address: string
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          early_access_until: string | null
          features: string[] | null
          garages: number | null
          id: string
          images: string[] | null
          latitude: number | null
          listing_source: string | null
          longitude: number | null
          lot_size: number | null
          price: number
          price_display: string | null
          property_type: string
          rejection_reason: string | null
          showing_instructions: string | null
          sold_date: string | null
          sold_price: number | null
          sold_to_client_id: string | null
          square_feet: number | null
          state: string
          status: string
          title: string
          updated_at: string | null
          vendor_favorable_contracts: string | null
          vendor_motivation: string | null
          vendor_ownership_duration: string | null
          vendor_special_conditions: string | null
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          early_access_until?: string | null
          features?: string[] | null
          garages?: number | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_source?: string | null
          longitude?: number | null
          lot_size?: number | null
          price: number
          price_display?: string | null
          property_type: string
          rejection_reason?: string | null
          showing_instructions?: string | null
          sold_date?: string | null
          sold_price?: number | null
          sold_to_client_id?: string | null
          square_feet?: number | null
          state: string
          status?: string
          title: string
          updated_at?: string | null
          vendor_favorable_contracts?: string | null
          vendor_motivation?: string | null
          vendor_ownership_duration?: string | null
          vendor_special_conditions?: string | null
          year_built?: number | null
          zip_code: string
        }
        Update: {
          address?: string
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          early_access_until?: string | null
          features?: string[] | null
          garages?: number | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          listing_source?: string | null
          longitude?: number | null
          lot_size?: number | null
          price?: number
          price_display?: string | null
          property_type?: string
          rejection_reason?: string | null
          showing_instructions?: string | null
          sold_date?: string | null
          sold_price?: number | null
          sold_to_client_id?: string | null
          square_feet?: number | null
          state?: string
          status?: string
          title?: string
          updated_at?: string | null
          vendor_favorable_contracts?: string | null
          vendor_motivation?: string | null
          vendor_ownership_duration?: string | null
          vendor_special_conditions?: string | null
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_sold_to_client_id_fkey"
            columns: ["sold_to_client_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_sold_to_client_id_fkey"
            columns: ["sold_to_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          advanced_analytics: boolean | null
          created_at: string | null
          featured_listings_included: number | null
          features: Json
          id: string
          is_active: boolean | null
          max_listings: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          priority_support: boolean | null
          stripe_price_id: string | null
          stripe_product_id: string | null
        }
        Insert: {
          advanced_analytics?: boolean | null
          created_at?: string | null
          featured_listings_included?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          max_listings?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Update: {
          advanced_analytics?: boolean | null
          created_at?: string | null
          featured_listings_included?: number | null
          features?: Json
          id?: string
          is_active?: boolean | null
          max_listings?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_password_history: {
        Row: {
          changed_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          agent_messages: boolean | null
          allow_marketing: boolean | null
          appointment_reminders: boolean | null
          budget_range: string | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          market_updates: boolean | null
          marketing_emails: boolean | null
          new_listings: boolean | null
          personalized_property_notifications: boolean | null
          preferred_areas: string[] | null
          preferred_contact_method: string | null
          preferred_features: string[] | null
          price_changes: boolean | null
          profile_visibility: string | null
          property_alerts: boolean | null
          property_type_preferences: string[] | null
          push_notifications: boolean | null
          show_activity_status: boolean | null
          show_email: boolean | null
          show_location: boolean | null
          show_phone: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_messages?: boolean | null
          allow_marketing?: boolean | null
          appointment_reminders?: boolean | null
          budget_range?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          market_updates?: boolean | null
          marketing_emails?: boolean | null
          new_listings?: boolean | null
          personalized_property_notifications?: boolean | null
          preferred_areas?: string[] | null
          preferred_contact_method?: string | null
          preferred_features?: string[] | null
          price_changes?: boolean | null
          profile_visibility?: string | null
          property_alerts?: boolean | null
          property_type_preferences?: string[] | null
          push_notifications?: boolean | null
          show_activity_status?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_messages?: boolean | null
          allow_marketing?: boolean | null
          appointment_reminders?: boolean | null
          budget_range?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          market_updates?: boolean | null
          marketing_emails?: boolean | null
          new_listings?: boolean | null
          personalized_property_notifications?: boolean | null
          preferred_areas?: string[] | null
          preferred_contact_method?: string | null
          preferred_features?: string[] | null
          price_changes?: boolean | null
          profile_visibility?: string | null
          property_alerts?: boolean | null
          property_type_preferences?: string[] | null
          push_notifications?: boolean | null
          show_activity_status?: boolean | null
          show_email?: boolean | null
          show_location?: boolean | null
          show_phone?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      agent_analytics: {
        Row: {
          active_listings: number | null
          agent_id: string | null
          avg_sale_price: number | null
          monthly_appointments: number | null
          monthly_inquiries: number | null
          monthly_revenue: number | null
          monthly_sales: number | null
          total_appointments: number | null
          total_clients: number | null
          total_inquiries: number | null
          total_sales: number | null
          weekly_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_client_sources: {
        Row: {
          agent_id: string | null
          count: number | null
          source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_monthly_performance: {
        Row: {
          agent_id: string | null
          listings: number | null
          month: string | null
          revenue: number | null
          sales: number | null
          showings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          location: string | null
          phone: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          phone?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      property_listings_public: {
        Row: {
          address: string | null
          agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          early_access_until: string | null
          features: string[] | null
          garages: number | null
          id: string | null
          images: string[] | null
          latitude: number | null
          listing_source: string | null
          longitude: number | null
          lot_size: number | null
          price: number | null
          property_type: string | null
          showing_instructions: string | null
          square_feet: number | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          description?: string | null
          early_access_until?: string | null
          features?: string[] | null
          garages?: number | null
          id?: string | null
          images?: string[] | null
          latitude?: number | null
          listing_source?: string | null
          longitude?: number | null
          lot_size?: number | null
          price?: number | null
          property_type?: string | null
          showing_instructions?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          contact_email?: never
          contact_phone?: never
          created_at?: string | null
          description?: string | null
          early_access_until?: string | null
          features?: string[] | null
          garages?: number | null
          id?: string | null
          images?: string[] | null
          latitude?: number | null
          listing_source?: string | null
          longitude?: number | null
          lot_size?: number | null
          price?: number | null
          property_type?: string | null
          showing_instructions?: string | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_listings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_logins: {
        Row: {
          attempts_last_hour: number | null
          created_at: string | null
          device_info: Json | null
          email: string | null
          email_attempts_last_hour: number | null
          failure_reason: string | null
          full_name: string | null
          id: string | null
          ip_address: string | null
          location_info: Json | null
          login_type: string | null
          origin: string | null
          referer: string | null
          role: string | null
          session_id: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_offmarket_listing: {
        Args: { listing_id: string; user_subscription_tier: string }
        Returns: boolean
      }
      can_view_property_contact: {
        Args: { property_id: string }
        Returns: boolean
      }
      can_view_vendor_details: {
        Args: { user_subscription_tier: string }
        Returns: boolean
      }
      check_property_alerts_access: {
        Args: { user_id: string }
        Returns: boolean
      }
      cleanup_old_login_history: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      create_system_alert: {
        Args: {
          alert_category: string
          alert_description: string
          alert_metadata?: Json
          alert_severity: string
          alert_source: string
          alert_title: string
        }
        Returns: string
      }
      get_database_performance: { Args: never; Returns: Json }
      get_database_statistics: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
          table_size: string
        }[]
      }
      get_pending_alert_jobs: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          id: string
          property_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_early_access_to_listing: {
        Args: { listing_id: string; user_subscription_tier: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_alert_job_completed: {
        Args: { error_msg?: string; job_id: string }
        Returns: boolean
      }
      mark_alert_job_processing: { Args: { job_id: string }; Returns: boolean }
      optimize_database: { Args: never; Returns: Json }
      run_database_maintenance: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "buyer" | "agent" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["buyer", "agent", "super_admin"],
    },
  },
} as const
