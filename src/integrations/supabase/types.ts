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
          created_at: string
          description: string | null
          id: string
          is_3pl: boolean | null
          is_active: boolean
          location_code: string
          location_type: string
          name: string
          target_temperature_max: number | null
          target_temperature_min: number | null
          temperature_controlled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_code: string
          location_type: string
          name: string
          target_temperature_max?: number | null
          target_temperature_min?: number | null
          temperature_controlled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_code?: string
          location_type?: string
          name?: string
          target_temperature_max?: number | null
          target_temperature_min?: number | null
          temperature_controlled?: boolean | null
          updated_at?: string
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
      check_permission: {
        Args: {
          _required_level?: string
          _resource_key: string
          _user_id: string
        }
        Returns: boolean
      }
      generate_listed_material_code: { Args: never; Returns: string }
      generate_material_code: { Args: { p_category: string }; Returns: string }
      generate_pallet_number: {
        Args: { p_build_date?: string }
        Returns: string
      }
      generate_production_lot_number: {
        Args: { p_machine_id: string; p_production_date?: string }
        Returns: string
      }
      generate_receiving_lot_number: {
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
      user_status: ["active", "inactive", "pending"],
    },
  },
} as const
