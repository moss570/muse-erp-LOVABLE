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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_editors: {
        Row: {
          id: string
          last_heartbeat: string
          resource_id: string
          resource_type: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_heartbeat?: string
          resource_id: string
          resource_type: string
          started_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_heartbeat?: string
          resource_id?: string
          resource_type?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bills_of_lading: {
        Row: {
          bol_number: string
          carrier_name: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          driver_name: string | null
          from_location_id: string
          id: string
          notes: string | null
          seal_number: string | null
          ship_date: string
          status: string | null
          to_location_id: string
          total_cases: number | null
          total_pallets: number | null
          trailer_number: string | null
          truck_number: string | null
          updated_at: string
        }
        Insert: {
          bol_number: string
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          driver_name?: string | null
          from_location_id: string
          id?: string
          notes?: string | null
          seal_number?: string | null
          ship_date?: string
          status?: string | null
          to_location_id: string
          total_cases?: number | null
          total_pallets?: number | null
          trailer_number?: string | null
          truck_number?: string | null
          updated_at?: string
        }
        Update: {
          bol_number?: string
          carrier_name?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          driver_name?: string | null
          from_location_id?: string
          id?: string
          notes?: string | null
          seal_number?: string | null
          ship_date?: string
          status?: string | null
          to_location_id?: string
          total_cases?: number | null
          total_pallets?: number | null
          trailer_number?: string | null
          truck_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_of_lading_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bol_pallets: {
        Row: {
          added_at: string
          bol_id: string
          id: string
          pallet_id: string
        }
        Insert: {
          added_at?: string
          bol_id: string
          id?: string
          pallet_id: string
        }
        Update: {
          added_at?: string
          bol_id?: string
          id?: string
          pallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bol_pallets_bol_id_fkey"
            columns: ["bol_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bol_pallets_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string
          country: string | null
          created_at: string
          email: string | null
          fax: string | null
          id: string
          logo_path: string | null
          logo_url: string | null
          phone: string | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          categories: string[] | null
          city: string | null
          code: string
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          customer_type: string | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          tax_exempt: boolean | null
          tax_id: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[] | null
          city?: string | null
          code: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tax_exempt?: boolean | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[] | null
          city?: string | null
          code?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tax_exempt?: boolean | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          department_type: Database["public"]["Enums"]["department_type"]
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_type: Database["public"]["Enums"]["department_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_type?: Database["public"]["Enums"]["department_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_requirements: {
        Row: {
          areas: string[]
          created_at: string
          description: string | null
          document_name: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          areas: string[]
          created_at?: string
          description?: string | null
          document_name: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          areas?: string[]
          created_at?: string
          description?: string | null
          document_name?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          bcc_addresses: string[] | null
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          created_by: string | null
          description: string | null
          document_file_path: string | null
          document_file_url: string | null
          document_html: string | null
          email_file_path: string | null
          email_file_url: string | null
          email_html: string | null
          email_subject: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          send_to_all_contacts: boolean | null
          send_to_primary_contact: boolean | null
          sort_order: number | null
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          bcc_addresses?: string[] | null
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_file_path?: string | null
          document_file_url?: string | null
          document_html?: string | null
          email_file_path?: string | null
          email_file_url?: string | null
          email_html?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          send_to_all_contacts?: boolean | null
          send_to_primary_contact?: boolean | null
          sort_order?: number | null
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          bcc_addresses?: string[] | null
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_file_path?: string | null
          document_file_url?: string | null
          document_html?: string | null
          email_file_path?: string | null
          email_file_url?: string | null
          email_html?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          send_to_all_contacts?: boolean | null
          send_to_primary_contact?: boolean | null
          sort_order?: number | null
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: []
      }
      dropdown_options: {
        Row: {
          created_at: string
          dropdown_type: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          dropdown_type: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          dropdown_type?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      invoice_additional_costs: {
        Row: {
          allocated_to_item_id: string | null
          allocation_method: string | null
          amount: number
          cost_type: string
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          xero_account_code: string | null
        }
        Insert: {
          allocated_to_item_id?: string | null
          allocation_method?: string | null
          amount: number
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          xero_account_code?: string | null
        }
        Update: {
          allocated_to_item_id?: string | null
          allocation_method?: string | null
          amount?: number
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          xero_account_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_additional_costs_allocated_to_item_id_fkey"
            columns: ["allocated_to_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_additional_costs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          line_total: number | null
          material_id: string | null
          po_item_id: string | null
          quantity: number
          receiving_item_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          line_total?: number | null
          material_id?: string | null
          po_item_id?: string | null
          quantity: number
          receiving_item_id?: string | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          material_id?: string | null
          po_item_id?: string | null
          quantity?: number
          receiving_item_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_receiving_item_id_fkey"
            columns: ["receiving_item_id"]
            isOneToOne: false
            referencedRelation: "po_receiving_items"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          barcode_field: string | null
          barcode_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields_config: Json | null
          height_inches: number
          id: string
          include_barcode: boolean | null
          is_active: boolean | null
          is_default: boolean | null
          label_format: string
          label_type: string
          name: string
          sort_order: number | null
          template_html: string | null
          updated_at: string
          width_inches: number
        }
        Insert: {
          barcode_field?: string | null
          barcode_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_config?: Json | null
          height_inches?: number
          id?: string
          include_barcode?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          label_format?: string
          label_type: string
          name: string
          sort_order?: number | null
          template_html?: string | null
          updated_at?: string
          width_inches?: number
        }
        Update: {
          barcode_field?: string | null
          barcode_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_config?: Json | null
          height_inches?: number
          id?: string
          include_barcode?: boolean | null
          is_active?: boolean | null
          is_default?: boolean | null
          label_format?: string
          label_type?: string
          name?: string
          sort_order?: number | null
          template_html?: string | null
          updated_at?: string
          width_inches?: number
        }
        Relationships: []
      }
      landed_cost_allocations: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          cost_per_base_unit: number
          duty_allocated: number | null
          freight_allocated: number | null
          id: string
          invoice_id: string
          material_cost: number
          other_costs_allocated: number | null
          quantity_in_base_unit: number
          receiving_lot_id: string
          total_landed_cost: number
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          cost_per_base_unit: number
          duty_allocated?: number | null
          freight_allocated?: number | null
          id?: string
          invoice_id: string
          material_cost: number
          other_costs_allocated?: number | null
          quantity_in_base_unit: number
          receiving_lot_id: string
          total_landed_cost: number
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          cost_per_base_unit?: number
          duty_allocated?: number | null
          freight_allocated?: number | null
          id?: string
          invoice_id?: string
          material_cost?: number
          other_costs_allocated?: number | null
          quantity_in_base_unit?: number
          receiving_lot_id?: string
          total_landed_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "landed_cost_allocations_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_allocations_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      listed_material_names: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_3pl: boolean | null
          is_active: boolean
          location_code: string
          location_type: string
          name: string
          state: string | null
          target_temperature_max: number | null
          target_temperature_min: number | null
          temperature_controlled: boolean | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_code: string
          location_type: string
          name: string
          state?: string | null
          target_temperature_max?: number | null
          target_temperature_min?: number | null
          temperature_controlled?: boolean | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_code?: string
          location_type?: string
          name?: string
          state?: string | null
          target_temperature_max?: number | null
          target_temperature_min?: number | null
          temperature_controlled?: boolean | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          machine_number: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          machine_number: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          machine_number?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_documents: {
        Row: {
          created_at: string
          date_published: string | null
          date_reviewed: string | null
          document_name: string
          file_path: string | null
          file_url: string | null
          id: string
          material_id: string
          requirement_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          material_id: string
          requirement_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name?: string
          file_path?: string | null
          file_url?: string | null
          id?: string
          material_id?: string
          requirement_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "document_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_purchase_units: {
        Row: {
          code: string | null
          conversion_to_base: number
          cost_per_unit: number | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          item_number: string | null
          material_id: string
          photo_added_at: string | null
          photo_path: string | null
          photo_url: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          conversion_to_base: number
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          item_number?: string | null
          material_id: string
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          conversion_to_base?: number
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          item_number?: string | null
          material_id?: string
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_purchase_units_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_purchase_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      material_sub_categories: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      material_suppliers: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          lead_time_days: number | null
          material_id: string
          min_order_quantity: number | null
          notes: string | null
          purchase_unit_id: string | null
          supplier_id: string
          supplier_item_number: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          lead_time_days?: number | null
          material_id: string
          min_order_quantity?: number | null
          notes?: string | null
          purchase_unit_id?: string | null
          supplier_id: string
          supplier_item_number?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          lead_time_days?: number | null
          material_id?: string
          min_order_quantity?: number | null
          notes?: string | null
          purchase_unit_id?: string | null
          supplier_id?: string
          supplier_item_number?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_suppliers_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_purchase_unit_id_fkey"
            columns: ["purchase_unit_id"]
            isOneToOne: false
            referencedRelation: "material_purchase_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_suppliers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          allergens: string[] | null
          authentication_method: string | null
          base_unit_id: string
          ca_prop65_prohibited: boolean | null
          category: string | null
          coa_required: boolean | null
          code: string
          cost_per_base_unit: number | null
          country_of_origin: string | null
          created_at: string
          density: number | null
          description: string | null
          food_claims: string[] | null
          fraud_vulnerability_score: string | null
          id: string
          is_active: boolean | null
          item_number: string | null
          label_copy: string | null
          listed_material_id: string | null
          manufacturer: string | null
          material_status: string | null
          min_stock_level: number | null
          name: string
          other_hazards: string | null
          photo_added_at: string | null
          photo_path: string | null
          photo_url: string | null
          receiving_temperature_max: number | null
          receiving_temperature_min: number | null
          storage_temperature_max: number | null
          storage_temperature_min: number | null
          sub_category: string | null
          supply_chain_complexity: string | null
          updated_at: string
          usage_unit_conversion: number | null
          usage_unit_id: string | null
        }
        Insert: {
          allergens?: string[] | null
          authentication_method?: string | null
          base_unit_id: string
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_required?: boolean | null
          code: string
          cost_per_base_unit?: number | null
          country_of_origin?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          food_claims?: string[] | null
          fraud_vulnerability_score?: string | null
          id?: string
          is_active?: boolean | null
          item_number?: string | null
          label_copy?: string | null
          listed_material_id?: string | null
          manufacturer?: string | null
          material_status?: string | null
          min_stock_level?: number | null
          name: string
          other_hazards?: string | null
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          receiving_temperature_max?: number | null
          receiving_temperature_min?: number | null
          storage_temperature_max?: number | null
          storage_temperature_min?: number | null
          sub_category?: string | null
          supply_chain_complexity?: string | null
          updated_at?: string
          usage_unit_conversion?: number | null
          usage_unit_id?: string | null
        }
        Update: {
          allergens?: string[] | null
          authentication_method?: string | null
          base_unit_id?: string
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_required?: boolean | null
          code?: string
          cost_per_base_unit?: number | null
          country_of_origin?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          food_claims?: string[] | null
          fraud_vulnerability_score?: string | null
          id?: string
          is_active?: boolean | null
          item_number?: string | null
          label_copy?: string | null
          listed_material_id?: string | null
          manufacturer?: string | null
          material_status?: string | null
          min_stock_level?: number | null
          name?: string
          other_hazards?: string | null
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          receiving_temperature_max?: number | null
          receiving_temperature_min?: number | null
          storage_temperature_max?: number | null
          storage_temperature_min?: number | null
          sub_category?: string | null
          supply_chain_complexity?: string | null
          updated_at?: string
          usage_unit_conversion?: number | null
          usage_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_listed_material_id_fkey"
            columns: ["listed_material_id"]
            isOneToOne: false
            referencedRelation: "listed_material_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_usage_unit_id_fkey"
            columns: ["usage_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_cases: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          pallet_id: string
          product_id: string
          production_lot_id: string
          quantity: number
          removed_at: string | null
          removed_by: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          pallet_id: string
          product_id: string
          production_lot_id: string
          quantity: number
          removed_at?: string | null
          removed_by?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          pallet_id?: string
          product_id?: string
          production_lot_id?: string
          quantity?: number
          removed_at?: string | null
          removed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_cases_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_cases_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_cases_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_cases_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_transfers: {
        Row: {
          bol_id: string | null
          created_at: string
          from_location_id: string | null
          id: string
          notes: string | null
          pallet_id: string
          to_location_id: string
          transfer_date: string
          transferred_by: string | null
        }
        Insert: {
          bol_id?: string | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          notes?: string | null
          pallet_id: string
          to_location_id: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Update: {
          bol_id?: string | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          notes?: string | null
          pallet_id?: string
          to_location_id?: string
          transfer_date?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pallet_transfers_bol_id_fkey"
            columns: ["bol_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_transfers_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_transfers_transferred_by_fkey"
            columns: ["transferred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pallets: {
        Row: {
          build_date: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string | null
          notes: string | null
          pallet_number: string
          status: string | null
          total_cases: number | null
          updated_at: string
        }
        Insert: {
          build_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          pallet_number: string
          status?: string | null
          total_cases?: number | null
          updated_at?: string
        }
        Update: {
          build_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          pallet_number?: string
          status?: string | null
          total_cases?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pallets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_resources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          parent_key: string | null
          resource_key: string
          resource_name: string
          resource_type: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_key?: string | null
          resource_key: string
          resource_name: string
          resource_type: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_key?: string | null
          resource_key?: string
          resource_name?: string
          resource_type?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      po_receiving_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          inspection_status: string | null
          internal_lot_number: string
          manufacture_date: string | null
          notes: string | null
          po_item_id: string
          quantity_in_base_unit: number
          quantity_received: number
          receiving_lot_id: string | null
          receiving_session_id: string
          rejection_reason: string | null
          supplier_lot_number: string | null
          temperature_in_range: boolean | null
          temperature_reading: number | null
          temperature_unit: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          inspection_status?: string | null
          internal_lot_number: string
          manufacture_date?: string | null
          notes?: string | null
          po_item_id: string
          quantity_in_base_unit: number
          quantity_received: number
          receiving_lot_id?: string | null
          receiving_session_id: string
          rejection_reason?: string | null
          supplier_lot_number?: string | null
          temperature_in_range?: boolean | null
          temperature_reading?: number | null
          temperature_unit?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          inspection_status?: string | null
          internal_lot_number?: string
          manufacture_date?: string | null
          notes?: string | null
          po_item_id?: string
          quantity_in_base_unit?: number
          quantity_received?: number
          receiving_lot_id?: string | null
          receiving_session_id?: string
          rejection_reason?: string | null
          supplier_lot_number?: string | null
          temperature_in_range?: boolean | null
          temperature_reading?: number | null
          temperature_unit?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_receiving_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_items_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_items_receiving_session_id_fkey"
            columns: ["receiving_session_id"]
            isOneToOne: false
            referencedRelation: "po_receiving_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      po_receiving_sessions: {
        Row: {
          carrier_name: string | null
          completed_at: string | null
          created_at: string
          driver_name: string | null
          id: string
          inspection_notes: string | null
          inspection_passed: boolean | null
          location_id: string | null
          notes: string | null
          purchase_order_id: string
          received_by: string | null
          received_date: string
          receiving_number: string
          seal_intact: boolean | null
          seal_number: string | null
          status: string
          trailer_number: string | null
          truck_number: string | null
          updated_at: string
        }
        Insert: {
          carrier_name?: string | null
          completed_at?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          location_id?: string | null
          notes?: string | null
          purchase_order_id: string
          received_by?: string | null
          received_date?: string
          receiving_number: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          trailer_number?: string | null
          truck_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier_name?: string | null
          completed_at?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          location_id?: string | null
          notes?: string | null
          purchase_order_id?: string
          received_by?: string | null
          received_date?: string
          receiving_number?: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          trailer_number?: string | null
          truck_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_receiving_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_sessions_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_receiving_sessions_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lot_materials: {
        Row: {
          created_at: string
          id: string
          production_lot_id: string
          quantity_used: number
          receiving_lot_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          production_lot_id: string
          quantity_used: number
          receiving_lot_id: string
        }
        Update: {
          created_at?: string
          id?: string
          production_lot_id?: string
          quantity_used?: number
          receiving_lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lot_materials_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lot_materials_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lots: {
        Row: {
          batch_number: number
          created_at: string
          expiry_date: string | null
          id: string
          julian_day: number
          lot_number: string
          machine_id: string
          notes: string | null
          produced_by: string | null
          product_id: string
          production_date: string
          quantity_available: number
          quantity_produced: number
          status: string | null
          updated_at: string
        }
        Insert: {
          batch_number: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          julian_day: number
          lot_number: string
          machine_id: string
          notes?: string | null
          produced_by?: string | null
          product_id: string
          production_date?: string
          quantity_available: number
          quantity_produced: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          julian_day?: number
          lot_number?: string
          machine_id?: string
          notes?: string | null
          produced_by?: string | null
          product_id?: string
          production_date?: string
          quantity_available?: number
          quantity_produced?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_lots_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_produced_by_fkey"
            columns: ["produced_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          case_weight_kg: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sku: string
          unit_id: string
          units_per_case: number | null
          updated_at: string
        }
        Insert: {
          case_weight_kg?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sku: string
          unit_id: string
          units_per_case?: number | null
          updated_at?: string
        }
        Update: {
          case_weight_kg?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sku?: string
          unit_id?: string
          units_per_case?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badge_number: string | null
          created_at: string
          department_id: string | null
          email: string | null
          employee_id: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          last_name: string | null
          phone: string | null
          pin_hash: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          pin_hash?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pin_hash?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_invoices: {
        Row: {
          amount_paid: number | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_status: string | null
          purchase_order_id: string
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          total_amount: number
          updated_at: string
          xero_invoice_id: string | null
          xero_sync_error: string | null
          xero_sync_status: string | null
          xero_synced_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          xero_invoice_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          xero_invoice_id?: string | null
          xero_sync_error?: string | null
          xero_sync_status?: string | null
          xero_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          is_fully_received: boolean | null
          line_total: number | null
          material_id: string
          notes: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          quantity_remaining: number | null
          sort_order: number | null
          supplier_item_number: string | null
          unit_cost: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fully_received?: boolean | null
          line_total?: number | null
          material_id: string
          notes?: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number
          quantity_remaining?: number | null
          sort_order?: number | null
          supplier_item_number?: string | null
          unit_cost: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fully_received?: boolean | null
          line_total?: number | null
          material_id?: string
          notes?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          quantity_remaining?: number | null
          sort_order?: number | null
          supplier_item_number?: string | null
          unit_cost?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          delivery_location_id: string | null
          expected_delivery_date: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          order_date: string
          po_number: string
          requires_approval: boolean
          sent_at: string | null
          sent_by: string | null
          sent_to_emails: string[] | null
          shipping_amount: number | null
          shipping_method: string | null
          shipping_terms: string | null
          status: string
          subtotal: number | null
          supplier_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_date?: string
          po_number: string
          requires_approval?: boolean
          sent_at?: string | null
          sent_by?: string | null
          sent_to_emails?: string[] | null
          shipping_amount?: number | null
          shipping_method?: string | null
          shipping_terms?: string | null
          status?: string
          subtotal?: number | null
          supplier_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_location_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_date?: string
          po_number?: string
          requires_approval?: boolean
          sent_at?: string | null
          sent_by?: string | null
          sent_to_emails?: string[] | null
          shipping_amount?: number | null
          shipping_method?: string | null
          shipping_terms?: string | null
          status?: string
          subtotal?: number | null
          supplier_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_affected_lots: {
        Row: {
          bol_id: string | null
          created_at: string
          current_location_id: string | null
          customer_id: string | null
          id: string
          notes: string | null
          production_lot_id: string | null
          quantity_affected: number | null
          quantity_destroyed: number | null
          quantity_recovered: number | null
          recall_id: string
          receiving_lot_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bol_id?: string | null
          created_at?: string
          current_location_id?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          production_lot_id?: string | null
          quantity_affected?: number | null
          quantity_destroyed?: number | null
          quantity_recovered?: number | null
          recall_id: string
          receiving_lot_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bol_id?: string | null
          created_at?: string
          current_location_id?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          production_lot_id?: string | null
          quantity_affected?: number | null
          quantity_destroyed?: number | null
          quantity_recovered?: number | null
          recall_id?: string
          receiving_lot_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_affected_lots_bol_id_fkey"
            columns: ["bol_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_affected_lots_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_affected_lots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_affected_lots_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_affected_lots_recall_id_fkey"
            columns: ["recall_id"]
            isOneToOne: false
            referencedRelation: "recall_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_affected_lots_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      recall_events: {
        Row: {
          actual_affected_quantity: number | null
          completed_date: string | null
          corrective_actions: string | null
          created_at: string
          created_by: string | null
          estimated_affected_quantity: number | null
          id: string
          initiated_date: string
          notes: string | null
          preventive_actions: string | null
          reason: string
          recall_class: string | null
          recall_number: string
          recall_type: string
          regulatory_notification_date: string | null
          regulatory_notified: boolean | null
          regulatory_reference: string | null
          source_supplier_id: string | null
          source_supplier_lot: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_affected_quantity?: number | null
          completed_date?: string | null
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          estimated_affected_quantity?: number | null
          id?: string
          initiated_date?: string
          notes?: string | null
          preventive_actions?: string | null
          reason: string
          recall_class?: string | null
          recall_number: string
          recall_type: string
          regulatory_notification_date?: string | null
          regulatory_notified?: boolean | null
          regulatory_reference?: string | null
          source_supplier_id?: string | null
          source_supplier_lot?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_affected_quantity?: number | null
          completed_date?: string | null
          corrective_actions?: string | null
          created_at?: string
          created_by?: string | null
          estimated_affected_quantity?: number | null
          id?: string
          initiated_date?: string
          notes?: string | null
          preventive_actions?: string | null
          reason?: string
          recall_class?: string | null
          recall_number?: string
          recall_type?: string
          regulatory_notification_date?: string | null
          regulatory_notified?: boolean | null
          regulatory_reference?: string | null
          source_supplier_id?: string | null
          source_supplier_lot?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recall_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recall_events_source_supplier_id_fkey"
            columns: ["source_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_inspections: {
        Row: {
          actual_value: string | null
          check_name: string
          check_type: string
          created_at: string
          expected_value: string | null
          id: string
          inspected_at: string
          inspected_by: string | null
          notes: string | null
          passed: boolean | null
          receiving_item_id: string
        }
        Insert: {
          actual_value?: string | null
          check_name: string
          check_type: string
          created_at?: string
          expected_value?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          notes?: string | null
          passed?: boolean | null
          receiving_item_id: string
        }
        Update: {
          actual_value?: string | null
          check_name?: string
          check_type?: string
          created_at?: string
          expected_value?: string | null
          id?: string
          inspected_at?: string
          inspected_by?: string | null
          notes?: string | null
          passed?: boolean | null
          receiving_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_inspections_receiving_item_id_fkey"
            columns: ["receiving_item_id"]
            isOneToOne: false
            referencedRelation: "po_receiving_items"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_lots: {
        Row: {
          cost_per_base_unit: number | null
          cost_total: number | null
          created_at: string
          expiry_date: string | null
          id: string
          internal_lot_number: string
          location_id: string | null
          material_id: string
          notes: string | null
          quantity_in_base_unit: number
          quantity_received: number
          received_by: string | null
          received_date: string
          status: string | null
          supplier_id: string | null
          supplier_lot_number: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          internal_lot_number: string
          location_id?: string | null
          material_id: string
          notes?: string | null
          quantity_in_base_unit: number
          quantity_received: number
          received_by?: string | null
          received_date?: string
          status?: string | null
          supplier_id?: string | null
          supplier_lot_number?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          internal_lot_number?: string
          location_id?: string | null
          material_id?: string
          notes?: string | null
          quantity_in_base_unit?: number
          quantity_received?: number
          received_by?: string | null
          received_date?: string
          status?: string | null
          supplier_id?: string | null
          supplier_lot_number?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_lots_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_lots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          access_level: string
          created_at: string
          id: string
          resource_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          resource_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          resource_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "permission_resources"
            referencedColumns: ["resource_key"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          role: string | null
          send_po_to: boolean | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          role?: string | null
          send_po_to?: boolean | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          role?: string | null
          send_po_to?: boolean | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          date_published: string | null
          date_reviewed: string | null
          document_name: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          requirement_id: string | null
          supplier_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          requirement_id?: string | null
          supplier_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          requirement_id?: string | null
          supplier_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "document_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          approval_date: string | null
          approval_status: string | null
          approved_by: string | null
          audit_score: number | null
          categories: string[] | null
          certification_expiry_date: string | null
          city: string | null
          code: string
          conditional_notes: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          fax: string | null
          food_safety_certification: string | null
          gfsi_certified: boolean | null
          id: string
          is_active: boolean | null
          last_audit_date: string | null
          name: string
          next_review_date: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          risk_level: string | null
          state: string | null
          supplier_type: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          audit_score?: number | null
          categories?: string[] | null
          certification_expiry_date?: string | null
          city?: string | null
          code: string
          conditional_notes?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          fax?: string | null
          food_safety_certification?: string | null
          gfsi_certified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          name: string
          next_review_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          risk_level?: string | null
          state?: string | null
          supplier_type?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          audit_score?: number | null
          categories?: string[] | null
          certification_expiry_date?: string | null
          city?: string | null
          code?: string
          conditional_notes?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          fax?: string | null
          food_safety_certification?: string | null
          gfsi_certified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          name?: string
          next_review_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          risk_level?: string | null
          state?: string | null
          supplier_type?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      template_merge_fields: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          created_at: string
          description: string | null
          field_key: string
          field_label: string
          id: string
          is_active: boolean | null
          sample_value: string | null
          sort_order: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          field_key: string
          field_label: string
          id?: string
          is_active?: boolean | null
          sample_value?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          created_at?: string
          description?: string | null
          field_key?: string
          field_label?: string
          id?: string
          is_active?: boolean | null
          sample_value?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      unit_conversions: {
        Row: {
          conversion_factor: number
          created_at: string
          from_unit_id: string
          id: string
          is_active: boolean | null
          material_id: string | null
          to_unit_id: string
          updated_at: string
        }
        Insert: {
          conversion_factor: number
          created_at?: string
          from_unit_id: string
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          to_unit_id: string
          updated_at?: string
        }
        Update: {
          conversion_factor?: number
          created_at?: string
          from_unit_id?: string
          id?: string
          is_active?: boolean | null
          material_id?: string | null
          to_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_base_unit: boolean | null
          name: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          name: string
          unit_type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_base_unit?: boolean | null
          name?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_landed_costs: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      check_permission: {
        Args: {
          _required_level?: string
          _resource_key: string
          _user_id: string
        }
        Returns: boolean
      }
      cleanup_stale_editors: { Args: never; Returns: undefined }
      generate_listed_material_code: { Args: never; Returns: string }
      generate_material_code: { Args: { p_category: string }; Returns: string }
      generate_pallet_number: {
        Args: { p_build_date?: string }
        Returns: string
      }
      generate_po_number: { Args: { p_order_date?: string }; Returns: string }
      generate_production_lot_number: {
        Args: { p_machine_id: string; p_production_date?: string }
        Returns: string
      }
      generate_recall_number: { Args: never; Returns: string }
      generate_receiving_lot_number: {
        Args: { p_received_date?: string }
        Returns: string
      }
      generate_receiving_number: {
        Args: { p_received_date?: string }
        Returns: string
      }
      generate_supplier_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "supervisor" | "employee"
      department_type:
        | "production"
        | "warehouse"
        | "quality_control"
        | "sales"
        | "purchasing"
        | "admin"
        | "maintenance"
        | "hr"
      label_format: "3x2" | "3x5" | "4x6" | "2x1" | "custom"
      template_category:
        | "purchase"
        | "sale"
        | "inventory"
        | "production"
        | "crm"
        | "financial"
      template_type: "document" | "email"
      user_status: "active" | "inactive" | "pending"
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
      app_role: ["admin", "manager", "supervisor", "employee"],
      department_type: [
        "production",
        "warehouse",
        "quality_control",
        "sales",
        "purchasing",
        "admin",
        "maintenance",
        "hr",
      ],
      label_format: ["3x2", "3x5", "4x6", "2x1", "custom"],
      template_category: [
        "purchase",
        "sale",
        "inventory",
        "production",
        "crm",
        "financial",
      ],
      template_type: ["document", "email"],
      user_status: ["active", "inactive", "pending"],
    },
  },
} as const
