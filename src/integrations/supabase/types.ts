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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
        ]
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
          email: string
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          preferred_areas: string[] | null
          property_type: string | null
          rating: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          budget_range?: string | null
          created_at?: string | null
          email: string
          id: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          budget_range?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["id"]
            isOneToOne: true
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
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          inquiry_id?: string | null
          last_message_at?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          features: string[] | null
          id: string
          images: string[] | null
          latitude: number | null
          longitude: number | null
          lot_size: number | null
          price: number
          property_type: string
          rejection_reason: string | null
          showing_instructions: string | null
          square_feet: number | null
          state: string
          status: string
          title: string
          updated_at: string | null
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
          features?: string[] | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          lot_size?: number | null
          price: number
          property_type: string
          rejection_reason?: string | null
          showing_instructions?: string | null
          square_feet?: number | null
          state: string
          status?: string
          title: string
          updated_at?: string | null
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
          features?: string[] | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          lot_size?: number | null
          price?: number
          property_type?: string
          rejection_reason?: string | null
          showing_instructions?: string | null
          square_feet?: number | null
          state?: string
          status?: string
          title?: string
          updated_at?: string | null
          year_built?: number | null
          zip_code?: string
        }
        Relationships: [
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
          max_listings: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          priority_support: boolean | null
        }
        Insert: {
          advanced_analytics?: boolean | null
          created_at?: string | null
          featured_listings_included?: number | null
          features?: Json
          id?: string
          max_listings?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
        }
        Update: {
          advanced_analytics?: boolean | null
          created_at?: string | null
          featured_listings_included?: number | null
          features?: Json
          id?: string
          max_listings?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_database_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          row_count: number
          table_name: string
          table_size: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
