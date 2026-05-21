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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          lat: number | null
          line: string
          lng: number | null
          neighborhood: string | null
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number | null
          line: string
          lng?: number | null
          neighborhood?: string | null
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          lat?: number | null
          line?: string
          lng?: number | null
          neighborhood?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_data: Json | null
          before_data: Json | null
          id: number
          ip: unknown
          metadata: Json | null
          occurred_at: string
          restaurant_id: string | null
          target_id: string | null
          target_table: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          id?: number
          ip?: unknown
          metadata?: Json | null
          occurred_at?: string
          restaurant_id?: string | null
          target_id?: string | null
          target_table: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          id?: number
          ip?: unknown
          metadata?: Json | null
          occurred_at?: string
          restaurant_id?: string | null
          target_id?: string | null
          target_table?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          expires_at: string
          id: string
          method: string
          phone: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          expires_at: string
          id?: string
          method?: string
          phone: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          method?: string
          phone?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          category: string
          id: string
          notes: string | null
          rate_pct: number
          updated_at: string
        }
        Insert: {
          category: string
          id?: string
          notes?: string | null
          rate_pct: number
          updated_at?: string
        }
        Update: {
          category?: string
          id?: string
          notes?: string | null
          rate_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_offers: {
        Row: {
          driver_id: string
          expires_at: string
          id: string
          offered_at: string
          order_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["delivery_offer_status"]
        }
        Insert: {
          driver_id: string
          expires_at?: string
          id?: string
          offered_at?: string
          order_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["delivery_offer_status"]
        }
        Update: {
          driver_id?: string
          expires_at?: string
          id?: string
          offered_at?: string
          order_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["delivery_offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "delivery_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          base_fee: number
          city: string
          created_at: string
          eta_minutes: number
          id: string
          neighborhood: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fee?: number
          city: string
          created_at?: string
          eta_minutes?: number
          id?: string
          neighborhood: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fee?: number
          city?: string
          created_at?: string
          eta_minutes?: number
          id?: string
          neighborhood?: string
          updated_at?: string
        }
        Relationships: []
      }
      dish_option_values: {
        Row: {
          id: string
          label: string
          option_id: string
          price_delta: number
          sort_order: number | null
        }
        Insert: {
          id?: string
          label: string
          option_id: string
          price_delta?: number
          sort_order?: number | null
        }
        Update: {
          id?: string
          label?: string
          option_id?: string
          price_delta?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "dish_options"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_options: {
        Row: {
          dish_id: string
          id: string
          name: string
          required: boolean | null
          selection_type: string
          sort_order: number | null
        }
        Insert: {
          dish_id: string
          id?: string
          name: string
          required?: boolean | null
          selection_type?: string
          sort_order?: number | null
        }
        Update: {
          dish_id?: string
          id?: string
          name?: string
          required?: boolean | null
          selection_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_options_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_reviews: {
        Row: {
          comment: string | null
          created_at: string
          dish_id: string
          id: string
          rating: number
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dish_id: string
          id?: string
          rating: number
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          dish_id?: string
          id?: string
          rating?: number
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_reviews_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      dishes: {
        Row: {
          allergens: string[] | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_popular: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name: string
          price: number
          restaurant_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string
          priority: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          priority?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          priority?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          lat: number
          lng: number
          speed: number | null
          status: string
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          lat: number
          lng: number
          speed?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          lat?: number
          lng?: number
          speed?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          city: string | null
          cni_url: string | null
          created_at: string
          full_name: string
          permis_url: string | null
          phone: string
          photo_url: string | null
          plate_number: string | null
          rating: number | null
          rejection_reason: string | null
          reviews_count: number
          status: Database["public"]["Enums"]["driver_application_status"]
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          vehicle_type: string | null
        }
        Insert: {
          city?: string | null
          cni_url?: string | null
          created_at?: string
          full_name: string
          permis_url?: string | null
          phone: string
          photo_url?: string | null
          plate_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviews_count?: number
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          vehicle_type?: string | null
        }
        Update: {
          city?: string | null
          cni_url?: string | null
          created_at?: string
          full_name?: string
          permis_url?: string | null
          phone?: string
          photo_url?: string | null
          plate_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          reviews_count?: number
          status?: Database["public"]["Enums"]["driver_application_status"]
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      email_log: {
        Row: {
          error_message: string | null
          id: string
          recipient: string
          related_id: string | null
          sent_at: string
          status: string
          subject: string | null
          template: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          recipient: string
          related_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          template: string
        }
        Update: {
          error_message?: string | null
          id?: string
          recipient?: string
          related_id?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          template?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          level: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          level?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          level?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mboapass_subscriptions: {
        Row: {
          amount_fcfa: number
          created_at: string
          ends_at: string
          id: string
          payment_reference: string | null
          plan: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          created_at?: string
          ends_at: string
          id?: string
          payment_reference?: string | null
          plan: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          created_at?: string
          ends_at?: string
          id?: string
          payment_reference?: string | null
          plan?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          inapp_enabled: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          inapp_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          inapp_enabled?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          dish_id: string | null
          id: string
          line_total: number
          name: string
          options: Json | null
          order_id: string
          qty: number
          unit_price: number
        }
        Insert: {
          dish_id?: string | null
          id?: string
          line_total: number
          name: string
          options?: Json | null
          order_id: string
          qty?: number
          unit_price: number
        }
        Update: {
          dish_id?: string | null
          id?: string
          line_total?: number
          name?: string
          options?: Json | null
          order_id?: string
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          accepted_at: string | null
          address_id: string | null
          cancelled_at: string | null
          commission_amount: number | null
          commission_rate_applied: number | null
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_fee: number
          driver_id: string | null
          eta_minutes: number | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          picked_up_at: string | null
          promo_code: string | null
          promo_discount: number
          ready_at: string | null
          reference: string
          restaurant_id: string
          restaurant_payout: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          address_id?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate_applied?: number | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          promo_code?: string | null
          promo_discount?: number
          ready_at?: string | null
          reference?: string
          restaurant_id: string
          restaurant_payout?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          address_id?: string | null
          cancelled_at?: string | null
          commission_amount?: number | null
          commission_rate_applied?: number | null
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number
          driver_id?: string | null
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          promo_code?: string | null
          promo_discount?: number
          ready_at?: string | null
          reference?: string
          restaurant_id?: string
          restaurant_payout?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          method: string
          phone: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          method?: string
          phone: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          method?: string
          phone?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          masked_number: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          masked_number: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          masked_number?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          applied: boolean
          applied_at: string | null
          external_ref: string
          id: number
          payload: Json | null
          provider: string
          provider_tx_id: string | null
          received_at: string
          status: string
        }
        Insert: {
          applied?: boolean
          applied_at?: string | null
          external_ref: string
          id?: number
          payload?: Json | null
          provider: string
          provider_tx_id?: string | null
          received_at?: string
          status: string
        }
        Update: {
          applied?: boolean
          applied_at?: string | null
          external_ref?: string
          id?: number
          payload?: Json | null
          provider?: string
          provider_tx_id?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_fcfa: number
          created_at: string
          deleted_at: string | null
          id: string
          metadata: Json
          msisdn: string | null
          otp_code: string | null
          provider: string
          provider_tx_id: string | null
          purpose: string
          reference: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_fcfa: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          msisdn?: string | null
          otp_code?: string | null
          provider: string
          provider_tx_id?: string | null
          purpose?: string
          reference: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_fcfa?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          metadata?: Json
          msisdn?: string | null
          otp_code?: string | null
          provider?: string
          provider_tx_id?: string | null
          purpose?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      phone_users: {
        Row: {
          created_at: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value_int: number | null
          value_text: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value_int?: number | null
          value_text?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value_int?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          default_role: string
          full_name: string | null
          id: string
          is_suspended: boolean
          onboarding_completed: boolean
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          preferred_language: string
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          default_role?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          preferred_language?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          default_role?: string
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          preferred_language?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promos: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_public: boolean
          max_uses: number | null
          min_order: number | null
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          max_uses?: number | null
          min_order?: number | null
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean
          max_uses?: number | null
          min_order?: number | null
          uses_count?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket_key: string
          id: number
          ip: string | null
          occurred_at: string
          scope: string | null
        }
        Insert: {
          bucket_key: string
          id?: number
          ip?: string | null
          occurred_at?: string
          scope?: string | null
        }
        Update: {
          bucket_key?: string
          id?: number
          ip?: string | null
          occurred_at?: string
          scope?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number
          code: string
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          bonus_amount?: number
          code: string
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          bonus_amount?: number
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      restaurant_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          invited_at: string | null
          invited_by: string | null
          joined_at: string
          restaurant_id: string
          role: Database["public"]["Enums"]["restaurant_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["restaurant_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["restaurant_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      restaurant_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          city: string
          commission_rate: number | null
          cover_url: string | null
          created_at: string
          cuisine: string
          deleted_at: string | null
          delivery_fee: number | null
          description: string | null
          eta_max: number | null
          eta_min: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_open: boolean | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          manually_closed: boolean
          manually_open: boolean
          min_order: number | null
          name: string
          neighborhood: string | null
          opening_hours: Json | null
          owner_id: string | null
          phone: string | null
          rating: number | null
          reviews_count: number | null
          slug: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_note: string | null
          validation_status: string
        }
        Insert: {
          address?: string | null
          city: string
          commission_rate?: number | null
          cover_url?: string | null
          created_at?: string
          cuisine: string
          deleted_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          eta_max?: number | null
          eta_min?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          manually_closed?: boolean
          manually_open?: boolean
          min_order?: number | null
          name: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string
        }
        Update: {
          address?: string | null
          city?: string
          commission_rate?: number | null
          cover_url?: string | null
          created_at?: string
          cuisine?: string
          deleted_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          eta_max?: number | null
          eta_min?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          manually_closed?: boolean
          manually_open?: boolean
          min_order?: number | null
          name?: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          slug?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string
          created_at: string
          driver_comment: string | null
          driver_id: string | null
          driver_rating: number | null
          id: string
          order_id: string
          restaurant_comment: string | null
          restaurant_id: string
          restaurant_rating: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          driver_comment?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          order_id: string
          restaurant_comment?: string | null
          restaurant_id: string
          restaurant_rating?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          driver_comment?: string | null
          driver_id?: string | null
          driver_rating?: number | null
          id?: string
          order_id?: string
          restaurant_comment?: string | null
          restaurant_id?: string
          restaurant_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          cost_points: number
          created_at: string
          id: string
          metadata: Json
          reward_code: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          cost_points: number
          created_at?: string
          id?: string
          metadata?: Json
          reward_code: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          cost_points?: number
          created_at?: string
          id?: string
          metadata?: Json
          reward_code?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards_catalog: {
        Row: {
          code: string
          cost_points: number
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          min_tier: string
          name: string
          type: string
          value: number
        }
        Insert: {
          code: string
          cost_points: number
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          min_tier?: string
          name: string
          type: string
          value?: number
        }
        Update: {
          code?: string
          cost_points?: number
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          min_tier?: string
          name?: string
          type?: string
          value?: number
        }
        Relationships: []
      }
      superadmin_2fa: {
        Row: {
          backup_codes_hashed: string[]
          created_at: string
          enabled: boolean
          failed_attempts: number
          last_used_at: string | null
          locked_until: string | null
          secret_ciphertext: string | null
          secret_iv: string | null
          secret_tag: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes_hashed?: string[]
          created_at?: string
          enabled?: boolean
          failed_attempts?: number
          last_used_at?: string | null
          locked_until?: string | null
          secret_ciphertext?: string | null
          secret_iv?: string | null
          secret_tag?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes_hashed?: string[]
          created_at?: string
          enabled?: boolean
          failed_attempts?: number
          last_used_at?: string | null
          locked_until?: string | null
          secret_ciphertext?: string | null
          secret_iv?: string | null
          secret_tag?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      superadmin_2fa_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          kind: string
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          kind?: string
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          kind?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_fcfa: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          payment_id: string | null
          reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          reference?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_fcfa: number
          created_at: string
          currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_fcfa?: number
          created_at?: string
          currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_fcfa?: number
          created_at?: string
          currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      restaurant_owners: {
        Row: {
          joined_at: string | null
          owner_id: string | null
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          joined_at?: string | null
          owner_id?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          joined_at?: string | null
          owner_id?: string | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "tenant_health"
            referencedColumns: ["restaurant_id"]
          },
        ]
      }
      tenant_health: {
        Row: {
          deleted_at: string | null
          dishes_count: number | null
          is_active: boolean | null
          is_open: boolean | null
          members_active: number | null
          name: string | null
          orders_7d: number | null
          owners_active: number | null
          restaurant_id: string | null
          slug: string | null
        }
        Insert: {
          deleted_at?: string | null
          dishes_count?: never
          is_active?: boolean | null
          is_open?: boolean | null
          members_active?: never
          name?: string | null
          orders_7d?: never
          owners_active?: never
          restaurant_id?: string | null
          slug?: string | null
        }
        Update: {
          deleted_at?: string | null
          dishes_count?: never
          is_active?: boolean | null
          is_open?: boolean | null
          members_active?: never
          name?: string | null
          orders_7d?: never
          owners_active?: never
          restaurant_id?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_find_user_id_by_email: { Args: { _email: string }; Returns: string }
      apply_referral_code: { Args: { _code: string }; Returns: string }
      claim_super_admin: { Args: never; Returns: boolean }
      claim_superadmin: { Args: never; Returns: boolean }
      current_user_restaurant_ids: {
        Args: { _min_role?: Database["public"]["Enums"]["restaurant_role"] }
        Returns: string[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gen_referral_code: { Args: { _uid: string }; Returns: string }
      get_commission_rate: {
        Args: { p_restaurant_id: string }
        Returns: number
      }
      has_any_superadmin: { Args: never; Returns: boolean }
      has_restaurant_membership: {
        Args: {
          _min_role?: Database["public"]["Enums"]["restaurant_role"]
          _restaurant_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      home_data: { Args: { _city?: string; _limit?: number }; Returns: Json }
      is_account_locked: { Args: { p_email: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_superadmin: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _metadata?: Json
          _restaurant_id?: string
          _target_id: string
          _target_table: string
        }
        Returns: undefined
      }
      loyalty_tier: { Args: { _pts: number }; Returns: string }
      moderate_restaurant: {
        Args: { p_decision: string; p_note?: string; p_restaurant_id: string }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      purge_old_login_attempts: { Args: never; Returns: number }
      purge_old_rate_limits: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_login_attempt: {
        Args: {
          p_email: string
          p_ip?: string
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      redeem_reward: { Args: { _reward_code: string }; Returns: Json }
      refund_order_to_wallet: {
        Args: { _order_id: string }
        Returns: {
          new_balance: number
          refunded_amount: number
        }[]
      }
      restaurant_page: { Args: { _slug: string }; Returns: Json }
      restaurant_role_weight: {
        Args: { _role: Database["public"]["Enums"]["restaurant_role"] }
        Returns: number
      }
      restore_restaurant: { Args: { _id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_restaurant: { Args: { _id: string }; Returns: undefined }
      unlock_account: { Args: { p_email: string }; Returns: number }
      user_exists_by_email: { Args: { _email: string }; Returns: boolean }
      user_exists_by_phone: { Args: { _phone: string }; Returns: boolean }
      wallet_apply: {
        Args: {
          _delta: number
          _description?: string
          _order_id?: string
          _payment_id?: string
          _reference?: string
          _type: string
          _user_id: string
        }
        Returns: {
          new_balance: number
          transaction_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "restaurateur"
        | "livreur"
        | "client"
        | "restaurant"
        | "superadmin"
      delivery_offer_status: "proposed" | "accepted" | "declined" | "expired"
      driver_application_status: "en_attente" | "valide" | "rejete"
      member_status: "active" | "invited" | "suspended"
      order_status:
        | "draft"
        | "pending_payment"
        | "paid"
        | "accepted"
        | "preparing"
        | "ready"
        | "picked_up"
        | "delivering"
        | "delivered"
        | "cancelled"
        | "refunded"
      restaurant_role: "owner" | "manager" | "staff" | "kitchen"
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
      app_role: [
        "admin",
        "restaurateur",
        "livreur",
        "client",
        "restaurant",
        "superadmin",
      ],
      delivery_offer_status: ["proposed", "accepted", "declined", "expired"],
      driver_application_status: ["en_attente", "valide", "rejete"],
      member_status: ["active", "invited", "suspended"],
      order_status: [
        "draft",
        "pending_payment",
        "paid",
        "accepted",
        "preparing",
        "ready",
        "picked_up",
        "delivering",
        "delivered",
        "cancelled",
        "refunded",
      ],
      restaurant_role: ["owner", "manager", "staff", "kitchen"],
    },
  },
} as const
