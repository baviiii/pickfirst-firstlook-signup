export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          subscription_tier: string
          subscription_status: string
          subscription_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          subscription_tier?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          subscription_tier?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          price_monthly: number | null
          price_yearly: number | null
          features: Json
          max_listings: number | null
          featured_listings_included: number
          priority_support: boolean
          advanced_analytics: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          features?: Json
          max_listings?: number | null
          featured_listings_included?: number
          priority_support?: boolean
          advanced_analytics?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          features?: Json
          max_listings?: number | null
          featured_listings_included?: number
          priority_support?: boolean
          advanced_analytics?: boolean
          created_at?: string
        }
        Relationships: []
      }
      property_listings: {
        Row: {
          id: string
          agent_id: string
          title: string
          description: string | null
          property_type: string
          status: string
          price: number
          bedrooms: number | null
          bathrooms: number | null
          square_feet: number | null
          lot_size: number | null
          year_built: number | null
          address: string
          city: string
          state: string
          zip_code: string
          latitude: number | null
          longitude: number | null
          features: string[] | null
          images: string[] | null
          contact_phone: string | null
          contact_email: string | null
          showing_instructions: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          title: string
          description?: string | null
          property_type: string
          status?: string
          price: number
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          lot_size?: number | null
          year_built?: number | null
          address: string
          city: string
          state: string
          zip_code: string
          latitude?: number | null
          longitude?: number | null
          features?: string[] | null
          images?: string[] | null
          contact_phone?: string | null
          contact_email?: string | null
          showing_instructions?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          title?: string
          description?: string | null
          property_type?: string
          status?: string
          price?: number
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          lot_size?: number | null
          year_built?: number | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          latitude?: number | null
          longitude?: number | null
          features?: string[] | null
          images?: string[] | null
          contact_phone?: string | null
          contact_email?: string | null
          showing_instructions?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
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
          }
        ]
      }
      property_favorites: {
        Row: {
          id: string
          buyer_id: string
          property_id: string
          created_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          property_id: string
          created_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          property_id?: string
          created_at?: string
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
          }
        ]
      }
      property_inquiries: {
        Row: {
          id: string
          buyer_id: string
          property_id: string
          message: string
          contact_preference: string | null
          status: string
          created_at: string
          responded_at: string | null
          agent_response: string | null
        }
        Insert: {
          id?: string
          buyer_id: string
          property_id: string
          message: string
          contact_preference?: string | null
          status?: string
          created_at?: string
          responded_at?: string | null
          agent_response?: string | null
        }
        Update: {
          id?: string
          buyer_id?: string
          property_id?: string
          message?: string
          contact_preference?: string | null
          status?: string
          created_at?: string
          responded_at?: string | null
          agent_response?: string | null
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
          }
        ]
      }
      clients: {
        Row: {
          id: string
          agent_id: string
          name: string
          email: string | null
          phone: string | null
          status: string
          budget_range: string | null
          preferred_areas: string[] | null
          property_type: string | null
          rating: number
          notes: string | null
          last_contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          name: string
          email?: string | null
          phone?: string | null
          status?: string
          budget_range?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number
          notes?: string | null
          last_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          status?: string
          budget_range?: string | null
          preferred_areas?: string[] | null
          property_type?: string | null
          rating?: number
          notes?: string | null
          last_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      client_notes: {
        Row: {
          id: string
          client_id: string
          agent_id: string
          note_type: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          agent_id: string
          note_type?: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          agent_id?: string
          note_type?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      client_interactions: {
        Row: {
          id: string
          client_id: string
          agent_id: string
          interaction_type: string
          subject: string | null
          content: string | null
          duration_minutes: number | null
          outcome: string | null
          next_follow_up: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          agent_id: string
          interaction_type: string
          subject?: string | null
          content?: string | null
          duration_minutes?: number | null
          outcome?: string | null
          next_follow_up?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          agent_id?: string
          interaction_type?: string
          subject?: string | null
          content?: string | null
          duration_minutes?: number | null
          outcome?: string | null
          next_follow_up?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
