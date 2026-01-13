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
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          period_date: string
          period_type: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_date: string
          period_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_date?: string
          period_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      allergen_acknowledgments: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          allergens: string[]
          id: string
          material_id: string
          notes: string | null
          production_lot_id: string | null
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          allergens: string[]
          id?: string
          material_id: string
          notes?: string | null
          production_lot_id?: string | null
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          allergens?: string[]
          id?: string
          material_id?: string
          notes?: string | null
          production_lot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_acknowledgments_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_acknowledgments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_acknowledgments_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          notes: string | null
          previous_status: string | null
          related_record_id: string
          related_table_name: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          related_record_id: string
          related_table_name: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          related_record_id?: string
          related_table_name?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          company_prefix: string | null
          country: string | null
          created_at: string
          email: string | null
          fax: string | null
          gs1_company_prefix: string | null
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
          company_prefix?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          gs1_company_prefix?: string | null
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
          company_prefix?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          gs1_company_prefix?: string | null
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
      complaint_attachments: {
        Row: {
          complaint_id: string
          file_name: string
          file_path: string | null
          file_type: string | null
          file_url: string | null
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          complaint_id: string
          file_name: string
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          complaint_id?: string
          file_name?: string
          file_path?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaint_attachments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "quality_complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string | null
          document_name: string
          document_type: string
          expiration_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          is_current: boolean | null
          notes: string | null
          related_entity_id: string
          related_entity_type: string
          replaced_by_id: string | null
          storage_provider: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          document_name: string
          document_type: string
          expiration_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          related_entity_id: string
          related_entity_type: string
          replaced_by_id?: string | null
          storage_provider?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string | null
          document_name?: string
          document_type?: string
          expiration_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          related_entity_id?: string
          related_entity_type?: string
          replaced_by_id?: string | null
          storage_provider?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_replaced_by_id_fkey"
            columns: ["replaced_by_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      disassembly_records: {
        Row: {
          container_status: string
          conversion_factor: number
          converted_quantity: number
          converted_unit_id: string
          created_at: string
          emptied_at: string | null
          emptied_by: string | null
          id: string
          label_printed: boolean | null
          label_printed_at: string | null
          location_id: string
          material_id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          original_purchase_unit_id: string
          original_quantity: number
          parent_receiving_lot_id: string
          remaining_quantity: number
          updated_at: string
        }
        Insert: {
          container_status?: string
          conversion_factor: number
          converted_quantity: number
          converted_unit_id: string
          created_at?: string
          emptied_at?: string | null
          emptied_by?: string | null
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          location_id: string
          material_id: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          original_purchase_unit_id: string
          original_quantity: number
          parent_receiving_lot_id: string
          remaining_quantity: number
          updated_at?: string
        }
        Update: {
          container_status?: string
          conversion_factor?: number
          converted_quantity?: number
          converted_unit_id?: string
          created_at?: string
          emptied_at?: string | null
          emptied_by?: string | null
          id?: string
          label_printed?: boolean | null
          label_printed_at?: string | null
          location_id?: string
          material_id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          original_purchase_unit_id?: string
          original_quantity?: number
          parent_receiving_lot_id?: string
          remaining_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disassembly_records_converted_unit_id_fkey"
            columns: ["converted_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_emptied_by_fkey"
            columns: ["emptied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_original_purchase_unit_id_fkey"
            columns: ["original_purchase_unit_id"]
            isOneToOne: false
            referencedRelation: "material_purchase_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disassembly_records_parent_receiving_lot_id_fkey"
            columns: ["parent_receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "disassembly_records_parent_receiving_lot_id_fkey"
            columns: ["parent_receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
        ]
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
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string | null
          effective_to: string | null
          employee_id: string
          end_time: string | null
          id: string
          is_available: boolean | null
          notes: string | null
          preference: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string | null
          effective_to?: string | null
          employee_id: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          notes?: string | null
          preference?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string | null
          effective_to?: string | null
          employee_id?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          notes?: string | null
          preference?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_discipline: {
        Row: {
          action_taken: string | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          discipline_type: string
          employee_id: string
          employee_signature_date: string | null
          file_path: string | null
          file_url: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          incident_date: string
          is_closed: boolean | null
          manager_signature_date: string | null
          updated_at: string
          witness_name: string | null
        }
        Insert: {
          action_taken?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          discipline_type: string
          employee_id: string
          employee_signature_date?: string | null
          file_path?: string | null
          file_url?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          incident_date: string
          is_closed?: boolean | null
          manager_signature_date?: string | null
          updated_at?: string
          witness_name?: string | null
        }
        Update: {
          action_taken?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discipline_type?: string
          employee_id?: string
          employee_signature_date?: string | null
          file_path?: string | null
          file_url?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          incident_date?: string
          is_closed?: boolean | null
          manager_signature_date?: string | null
          updated_at?: string
          witness_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_discipline_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_discipline_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          document_name: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          is_archived: boolean | null
          is_required: boolean | null
          is_signed: boolean | null
          signed_at: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          document_name: string
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          is_required?: boolean | null
          is_signed?: boolean | null
          signed_at?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          document_name?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          is_required?: boolean | null
          is_signed?: boolean | null
          signed_at?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          break_minutes: number | null
          color: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          employee_id: string
          end_time: string
          id: string
          is_published: boolean | null
          job_position_id: string | null
          location_id: string | null
          notes: string | null
          shift_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id: string
          end_time: string
          id?: string
          is_published?: boolean | null
          job_position_id?: string | null
          location_id?: string | null
          notes?: string | null
          shift_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          employee_id?: string
          end_time?: string
          id?: string
          is_published?: boolean | null
          job_position_id?: string | null
          location_id?: string | null
          notes?: string | null
          shift_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_entries: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          break_end: string | null
          break_start: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
          department_id: string | null
          employee_id: string
          id: string
          job_position_id: string | null
          notes: string | null
          overtime_hours: number | null
          shift_id: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          department_id?: string | null
          employee_id: string
          id?: string
          job_position_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          department_id?: string | null
          employee_id?: string
          id?: string
          job_position_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          shift_id?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_entries_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_entries_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "employee_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_off: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          hours_requested: number | null
          id: string
          notes: string | null
          rejection_reason: string | null
          start_date: string
          status: string | null
          time_off_type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          hours_requested?: number | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string | null
          time_off_type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          hours_requested?: number | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string | null
          time_off_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_off_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_time_off_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_training: {
        Row: {
          certificate_number: string | null
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          notes: string | null
          passing_score: number | null
          score: number | null
          status: string | null
          trainer_id: string | null
          training_date: string
          training_name: string
          training_type: string | null
          updated_at: string
        }
        Insert: {
          certificate_number?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          passing_score?: number | null
          score?: number | null
          status?: string | null
          trainer_id?: string | null
          training_date: string
          training_name: string
          training_type?: string | null
          updated_at?: string
        }
        Update: {
          certificate_number?: string | null
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          passing_score?: number | null
          score?: number | null
          status?: string | null
          trainer_id?: string | null
          training_date?: string
          training_name?: string
          training_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_training_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_wage_history: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          employee_id: string
          end_date: string | null
          hourly_rate: number | null
          id: string
          job_position_id: string | null
          notes: string | null
          pay_type: string
          reason: string | null
          salary_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_position_id?: string | null
          notes?: string | null
          pay_type: string
          reason?: string | null
          salary_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          employee_id?: string
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_position_id?: string | null
          notes?: string | null
          pay_type?: string
          reason?: string | null
          salary_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_wage_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wage_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_wage_history_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employee_number: string
          employment_status: string | null
          employment_type: string | null
          first_name: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          job_position_id: string | null
          last_name: string
          location_id: string | null
          mobile_phone: string | null
          notes: string | null
          pay_frequency: string | null
          pay_type: string | null
          payroll_id: string | null
          phone: string | null
          preferred_name: string | null
          profile_id: string | null
          salary_amount: number | null
          state: string | null
          termination_date: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number: string
          employment_status?: string | null
          employment_type?: string | null
          first_name: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_position_id?: string | null
          last_name: string
          location_id?: string | null
          mobile_phone?: string | null
          notes?: string | null
          pay_frequency?: string | null
          pay_type?: string | null
          payroll_id?: string | null
          phone?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          salary_amount?: number | null
          state?: string | null
          termination_date?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employee_number?: string
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_position_id?: string | null
          last_name?: string
          location_id?: string | null
          mobile_phone?: string | null
          notes?: string | null
          pay_frequency?: string | null
          pay_type?: string | null
          payroll_id?: string | null
          phone?: string | null
          preferred_name?: string | null
          profile_id?: string | null
          salary_amount?: number | null
          state?: string | null
          termination_date?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          category: string
          cost_name: string
          created_at: string
          description: string | null
          effective_from: string | null
          effective_to: string | null
          gl_account: string | null
          id: string
          is_active: boolean | null
          monthly_amount: number
          updated_at: string
        }
        Insert: {
          category: string
          cost_name: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_name?: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          gl_account?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      gl_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          created_at: string
          id: string
          is_active: boolean | null
          mapping_purpose: string | null
          updated_at: string
          xero_account_id: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          mapping_purpose?: string | null
          updated_at?: string
          xero_account_id?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          mapping_purpose?: string | null
          updated_at?: string
          xero_account_id?: string | null
        }
        Relationships: []
      }
      inventory_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disassembly_record_id: string | null
          id: string
          location_id: string
          notes: string | null
          production_lot_id: string | null
          quantity_adjusted: number
          quantity_after: number
          quantity_before: number
          reason_code: string
          receiving_lot_id: string | null
          requires_approval: boolean | null
          unit_id: string
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disassembly_record_id?: string | null
          id?: string
          location_id: string
          notes?: string | null
          production_lot_id?: string | null
          quantity_adjusted: number
          quantity_after: number
          quantity_before: number
          reason_code: string
          receiving_lot_id?: string | null
          requires_approval?: boolean | null
          unit_id: string
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disassembly_record_id?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          production_lot_id?: string | null
          quantity_adjusted?: number
          quantity_after?: number
          quantity_before?: number
          reason_code?: string
          receiving_lot_id?: string | null
          requires_approval?: boolean | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_disassembly_record_id_fkey"
            columns: ["disassembly_record_id"]
            isOneToOne: false
            referencedRelation: "disassembly_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_adjustments_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movement_items: {
        Row: {
          created_at: string
          id: string
          material_id: string | null
          movement_id: string
          product_id: string | null
          production_lot_id: string | null
          quantity_moved: number | null
          quantity_requested: number
          receiving_lot_id: string | null
          scanned_at: string | null
          scanned_by: string | null
          scanned_verified: boolean | null
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id?: string | null
          movement_id: string
          product_id?: string | null
          production_lot_id?: string | null
          quantity_moved?: number | null
          quantity_requested: number
          receiving_lot_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_verified?: boolean | null
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string | null
          movement_id?: string
          product_id?: string | null
          production_lot_id?: string | null
          quantity_moved?: number | null
          quantity_requested?: number
          receiving_lot_id?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_verified?: boolean | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movement_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "inventory_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_movement_items_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movement_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          destination_location_id: string
          id: string
          movement_type: string
          notes: string | null
          requested_at: string
          requested_by: string | null
          source_location_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          destination_location_id: string
          id?: string
          movement_type: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          source_location_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          destination_location_id?: string
          id?: string
          movement_type?: string
          notes?: string | null
          requested_at?: string
          requested_by?: string | null
          source_location_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          from_location_id: string | null
          id: string
          material_id: string | null
          notes: string | null
          performed_by: string | null
          product_id: string | null
          production_lot_id: string | null
          quantity: number
          reason_code: string | null
          receiving_lot_id: string | null
          reference_id: string | null
          reference_type: string | null
          to_location_id: string | null
          transaction_type: string
          unit_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity: number
          reason_code?: string | null
          receiving_lot_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          transaction_type: string
          unit_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          from_location_id?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          performed_by?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity?: number
          reason_code?: string | null
          receiving_lot_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          transaction_type?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_transactions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_freight_links: {
        Row: {
          allocation_amount: number | null
          created_at: string
          created_by: string | null
          freight_invoice_id: string
          id: string
          material_invoice_id: string
        }
        Insert: {
          allocation_amount?: number | null
          created_at?: string
          created_by?: string | null
          freight_invoice_id: string
          id?: string
          material_invoice_id: string
        }
        Update: {
          allocation_amount?: number | null
          created_at?: string
          created_by?: string | null
          freight_invoice_id?: string
          id?: string
          material_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_freight_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_freight_links_freight_invoice_id_fkey"
            columns: ["freight_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_freight_links_material_invoice_id_fkey"
            columns: ["material_invoice_id"]
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
      job_positions: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      labor_budgets: {
        Row: {
          budget_amount: number | null
          budget_date: string
          budget_hours: number | null
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          notes: string | null
          target_gallons: number | null
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          budget_date: string
          budget_hours?: number | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          target_gallons?: number | null
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          budget_date?: string
          budget_hours?: number | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          notes?: string | null
          target_gallons?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_budgets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
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
      material_category_gl_defaults: {
        Row: {
          category: string
          created_at: string | null
          gl_account_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          gl_account_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          gl_account_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_category_gl_defaults_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      material_documents: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date_published: string | null
          date_reviewed: string | null
          document_name: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          is_archived: boolean | null
          material_id: string
          requirement_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          material_id: string
          requirement_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          material_id?: string
          requirement_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      material_listed_material_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          listed_material_id: string
          material_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          listed_material_id: string
          material_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          listed_material_id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_listed_material_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_listed_material_links_listed_material_id_fkey"
            columns: ["listed_material_id"]
            isOneToOne: false
            referencedRelation: "listed_material_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_listed_material_links_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
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
          approval_status: string | null
          authentication_method: string[] | null
          base_unit_id: string
          box_allergen_free_adhesives: boolean | null
          box_dimensions_internal: string | null
          box_flute_type: string | null
          box_foreign_material_control: boolean | null
          box_heavy_metals_coneg: boolean | null
          box_joint_style: string | null
          box_recycled_content_verified: boolean | null
          box_strength_type: string | null
          box_strength_value: string | null
          box_style_code: string | null
          ca_prop65_prohibited: boolean | null
          category: string | null
          coa_critical_limits: Json | null
          coa_required: boolean | null
          code: string
          cost_per_base_unit: number | null
          country_of_origin: string | null
          created_at: string
          density: number | null
          description: string | null
          food_claims: string[] | null
          fraud_vulnerability_score: string | null
          gl_account_id: string | null
          haccp_foreign_material_controls: string[] | null
          haccp_heavy_metal_limits: boolean | null
          haccp_kill_step_applied: boolean | null
          haccp_new_allergen: boolean | null
          haccp_new_allergen_name: string | null
          haccp_rte_or_kill_step: string | null
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
          pkg_fda_food_contact: boolean | null
          pkg_food_grade_suitable: boolean | null
          pkg_heavy_metals_compliant: boolean | null
          pkg_material_type: string | null
          pkg_pcr_fda_approved: boolean | null
          pkg_recyclable: boolean | null
          pkg_volume: number | null
          pkg_volume_uom_id: string | null
          pkg_weight_kg: number | null
          qa_verified_at: string | null
          qa_verified_by: string | null
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
          approval_status?: string | null
          authentication_method?: string[] | null
          base_unit_id: string
          box_allergen_free_adhesives?: boolean | null
          box_dimensions_internal?: string | null
          box_flute_type?: string | null
          box_foreign_material_control?: boolean | null
          box_heavy_metals_coneg?: boolean | null
          box_joint_style?: string | null
          box_recycled_content_verified?: boolean | null
          box_strength_type?: string | null
          box_strength_value?: string | null
          box_style_code?: string | null
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_critical_limits?: Json | null
          coa_required?: boolean | null
          code: string
          cost_per_base_unit?: number | null
          country_of_origin?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          food_claims?: string[] | null
          fraud_vulnerability_score?: string | null
          gl_account_id?: string | null
          haccp_foreign_material_controls?: string[] | null
          haccp_heavy_metal_limits?: boolean | null
          haccp_kill_step_applied?: boolean | null
          haccp_new_allergen?: boolean | null
          haccp_new_allergen_name?: string | null
          haccp_rte_or_kill_step?: string | null
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
          pkg_fda_food_contact?: boolean | null
          pkg_food_grade_suitable?: boolean | null
          pkg_heavy_metals_compliant?: boolean | null
          pkg_material_type?: string | null
          pkg_pcr_fda_approved?: boolean | null
          pkg_recyclable?: boolean | null
          pkg_volume?: number | null
          pkg_volume_uom_id?: string | null
          pkg_weight_kg?: number | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
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
          approval_status?: string | null
          authentication_method?: string[] | null
          base_unit_id?: string
          box_allergen_free_adhesives?: boolean | null
          box_dimensions_internal?: string | null
          box_flute_type?: string | null
          box_foreign_material_control?: boolean | null
          box_heavy_metals_coneg?: boolean | null
          box_joint_style?: string | null
          box_recycled_content_verified?: boolean | null
          box_strength_type?: string | null
          box_strength_value?: string | null
          box_style_code?: string | null
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_critical_limits?: Json | null
          coa_required?: boolean | null
          code?: string
          cost_per_base_unit?: number | null
          country_of_origin?: string | null
          created_at?: string
          density?: number | null
          description?: string | null
          food_claims?: string[] | null
          fraud_vulnerability_score?: string | null
          gl_account_id?: string | null
          haccp_foreign_material_controls?: string[] | null
          haccp_heavy_metal_limits?: boolean | null
          haccp_kill_step_applied?: boolean | null
          haccp_new_allergen?: boolean | null
          haccp_new_allergen_name?: string | null
          haccp_rte_or_kill_step?: string | null
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
          pkg_fda_food_contact?: boolean | null
          pkg_food_grade_suitable?: boolean | null
          pkg_heavy_metals_compliant?: boolean | null
          pkg_material_type?: string | null
          pkg_pcr_fda_approved?: boolean | null
          pkg_recyclable?: boolean | null
          pkg_volume?: number | null
          pkg_volume_uom_id?: string | null
          pkg_weight_kg?: number | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
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
            foreignKeyName: "materials_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
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
            foreignKeyName: "materials_pkg_volume_uom_id_fkey"
            columns: ["pkg_volume_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_qa_verified_by_fkey"
            columns: ["qa_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      overhead_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overhead_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pallet_cases: {
        Row: {
          added_at: string
          added_by: string | null
          case_label_id: string | null
          id: string
          pallet_id: string
          product_id: string
          production_lot_id: string
          quantity: number
          removed_at: string | null
          removed_by: string | null
          sscc_code: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          case_label_id?: string | null
          id?: string
          pallet_id: string
          product_id: string
          production_lot_id: string
          quantity: number
          removed_at?: string | null
          removed_by?: string | null
          sscc_code?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          case_label_id?: string | null
          id?: string
          pallet_id?: string
          product_id?: string
          production_lot_id?: string
          quantity?: number
          removed_at?: string | null
          removed_by?: string | null
          sscc_code?: string | null
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
      period_close_items: {
        Row: {
          created_at: string
          id: string
          is_resolved: boolean | null
          issue_description: string
          item_id: string
          item_reference: string | null
          item_type: string
          period_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          issue_description: string
          item_id: string
          item_reference?: string | null
          item_type: string
          period_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          issue_description?: string
          item_id?: string
          item_reference?: string | null
          item_type?: string
          period_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_close_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_close_items_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      pick_request_items: {
        Row: {
          created_at: string
          id: string
          pick_request_id: string
          product_id: string
          quantity_picked: number | null
          quantity_requested: number
          status: string | null
          unit_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pick_request_id: string
          product_id: string
          quantity_picked?: number | null
          quantity_requested: number
          status?: string | null
          unit_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pick_request_id?: string
          product_id?: string
          quantity_picked?: number | null
          quantity_requested?: number
          status?: string | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_request_items_pick_request_id_fkey"
            columns: ["pick_request_id"]
            isOneToOne: false
            referencedRelation: "pick_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_request_picks: {
        Row: {
          id: string
          notes: string | null
          pallet_case_id: string | null
          pallet_id: string | null
          pick_request_item_id: string
          picked_at: string
          picked_by: string | null
          production_lot_id: string | null
          quantity_picked: number
          scan_verified: boolean | null
        }
        Insert: {
          id?: string
          notes?: string | null
          pallet_case_id?: string | null
          pallet_id?: string | null
          pick_request_item_id: string
          picked_at?: string
          picked_by?: string | null
          production_lot_id?: string | null
          quantity_picked: number
          scan_verified?: boolean | null
        }
        Update: {
          id?: string
          notes?: string | null
          pallet_case_id?: string | null
          pallet_id?: string | null
          pick_request_item_id?: string
          picked_at?: string
          picked_by?: string | null
          production_lot_id?: string | null
          quantity_picked?: number
          scan_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_request_picks_pallet_case_id_fkey"
            columns: ["pallet_case_id"]
            isOneToOne: false
            referencedRelation: "pallet_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_request_picks_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_request_picks_pick_request_item_id_fkey"
            columns: ["pick_request_item_id"]
            isOneToOne: false
            referencedRelation: "pick_request_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_request_picks_picked_by_fkey"
            columns: ["picked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_request_picks_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          customer_id: string | null
          id: string
          location_id: string
          notes: string | null
          priority: string | null
          request_date: string
          request_number: string
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          location_id: string
          notes?: string | null
          priority?: string | null
          request_date?: string
          request_number: string
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          priority?: string | null
          request_date?: string
          request_number?: string
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pick_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_requests_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
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
          approval_status: string | null
          carrier_name: string | null
          completed_at: string | null
          created_at: string
          driver_name: string | null
          id: string
          inspection_debris_free: boolean | null
          inspection_notes: string | null
          inspection_passed: boolean | null
          inspection_pest_free: boolean | null
          location_id: string | null
          notes: string | null
          purchase_order_id: string
          qa_verified_at: string | null
          qa_verified_by: string | null
          received_by: string | null
          received_date: string
          receiving_number: string
          seal_intact: boolean | null
          seal_number: string | null
          status: string
          trailer_number: string | null
          truck_number: string | null
          truck_temperature_setting: number | null
          truck_temperature_type: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          carrier_name?: string | null
          completed_at?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          inspection_debris_free?: boolean | null
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          inspection_pest_free?: boolean | null
          location_id?: string | null
          notes?: string | null
          purchase_order_id: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          received_by?: string | null
          received_date?: string
          receiving_number: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          trailer_number?: string | null
          truck_number?: string | null
          truck_temperature_setting?: number | null
          truck_temperature_type?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          carrier_name?: string | null
          completed_at?: string | null
          created_at?: string
          driver_name?: string | null
          id?: string
          inspection_debris_free?: boolean | null
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          inspection_pest_free?: boolean | null
          location_id?: string | null
          notes?: string | null
          purchase_order_id?: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          received_by?: string | null
          received_date?: string
          receiving_number?: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          trailer_number?: string | null
          truck_number?: string | null
          truck_temperature_setting?: number | null
          truck_temperature_type?: string | null
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
            foreignKeyName: "po_receiving_sessions_qa_verified_by_fkey"
            columns: ["qa_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      product_recipe_items: {
        Row: {
          created_at: string
          id: string
          listed_material_id: string | null
          material_id: string | null
          notes: string | null
          quantity_required: number
          recipe_id: string
          sort_order: number | null
          unit_id: string | null
          wastage_percentage: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          listed_material_id?: string | null
          material_id?: string | null
          notes?: string | null
          quantity_required: number
          recipe_id: string
          sort_order?: number | null
          unit_id?: string | null
          wastage_percentage?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          listed_material_id?: string | null
          material_id?: string | null
          notes?: string | null
          quantity_required?: number
          recipe_id?: string
          sort_order?: number | null
          unit_id?: string | null
          wastage_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recipe_items_listed_material_id_fkey"
            columns: ["listed_material_id"]
            isOneToOne: false
            referencedRelation: "listed_material_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipe_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipe_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          batch_size: number
          batch_unit_id: string | null
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_default: boolean | null
          product_id: string
          recipe_name: string
          recipe_version: string | null
          standard_labor_hours: number | null
          standard_machine_hours: number | null
          updated_at: string
        }
        Insert: {
          batch_size?: number
          batch_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          product_id: string
          recipe_name: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          updated_at?: string
        }
        Update: {
          batch_size?: number
          batch_unit_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          product_id?: string
          recipe_name?: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_batch_unit_id_fkey"
            columns: ["batch_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
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
          approval_status: string | null
          batch_number: number
          cost_category: string | null
          created_at: string
          expiry_date: string | null
          id: string
          is_synced_to_xero: boolean | null
          is_trial_batch: boolean | null
          julian_day: number
          labor_cost: number | null
          labor_hours: number | null
          lot_number: string
          machine_hours: number | null
          machine_id: string
          material_cost: number | null
          notes: string | null
          overhead_cost: number | null
          produced_by: string | null
          product_id: string
          production_date: string
          qa_verified_at: string | null
          qa_verified_by: string | null
          quantity_available: number
          quantity_produced: number
          recipe_id: string | null
          status: string | null
          synced_at: string | null
          total_cost: number | null
          trial_canvas_url: string | null
          trial_notes: Json | null
          updated_at: string
          xero_journal_id: string | null
        }
        Insert: {
          approval_status?: string | null
          batch_number: number
          cost_category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_synced_to_xero?: boolean | null
          is_trial_batch?: boolean | null
          julian_day: number
          labor_cost?: number | null
          labor_hours?: number | null
          lot_number: string
          machine_hours?: number | null
          machine_id: string
          material_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          produced_by?: string | null
          product_id: string
          production_date?: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          quantity_available: number
          quantity_produced: number
          recipe_id?: string | null
          status?: string | null
          synced_at?: string | null
          total_cost?: number | null
          trial_canvas_url?: string | null
          trial_notes?: Json | null
          updated_at?: string
          xero_journal_id?: string | null
        }
        Update: {
          approval_status?: string | null
          batch_number?: number
          cost_category?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_synced_to_xero?: boolean | null
          is_trial_batch?: boolean | null
          julian_day?: number
          labor_cost?: number | null
          labor_hours?: number | null
          lot_number?: string
          machine_hours?: number | null
          machine_id?: string
          material_cost?: number | null
          notes?: string | null
          overhead_cost?: number | null
          produced_by?: string | null
          product_id?: string
          production_date?: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          quantity_available?: number
          quantity_produced?: number
          recipe_id?: string | null
          status?: string | null
          synced_at?: string | null
          total_cost?: number | null
          trial_canvas_url?: string | null
          trial_notes?: Json | null
          updated_at?: string
          xero_journal_id?: string | null
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
          {
            foreignKeyName: "production_lots_qa_verified_by_fkey"
            columns: ["qa_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          approval_status: string | null
          case_pack_quantity: number | null
          case_upc_code: string | null
          case_weight_kg: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          qa_verified_at: string | null
          qa_verified_by: string | null
          sku: string
          standard_labor_rate: number | null
          standard_overhead_rate: number | null
          unit_id: string
          units_per_case: number | null
          upc_code: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          case_pack_quantity?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          sku: string
          standard_labor_rate?: number | null
          standard_overhead_rate?: number | null
          unit_id: string
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          case_pack_quantity?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          sku?: string
          standard_labor_rate?: number | null
          standard_overhead_rate?: number | null
          unit_id?: string
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_qa_verified_by_fkey"
            columns: ["qa_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          finalization_status: string | null
          financials_complete: boolean | null
          freight_amount: number | null
          freight_complete: boolean | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_status: string | null
          purchase_order_id: string
          receiving_complete: boolean | null
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
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          finalization_status?: string | null
          financials_complete?: boolean | null
          freight_amount?: number | null
          freight_complete?: boolean | null
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id: string
          receiving_complete?: boolean | null
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
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          finalization_status?: string | null
          financials_complete?: boolean | null
          freight_amount?: number | null
          freight_complete?: boolean | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          purchase_order_id?: string
          receiving_complete?: boolean | null
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
            foreignKeyName: "purchase_order_invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_invoices_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          xero_invoice_id: string | null
          xero_synced_at: string | null
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
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
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
          xero_invoice_id?: string | null
          xero_synced_at?: string | null
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
      quality_complaints: {
        Row: {
          complaint_date: string
          complaint_number: string
          complaint_type: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          credit_issued: number | null
          customer_id: string | null
          description: string | null
          id: string
          material_id: string | null
          preventive_action: string | null
          product_id: string | null
          production_lot_id: string | null
          receiving_lot_id: string | null
          replacement_cost: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          severity: string
          status: string
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          complaint_date?: string
          complaint_number: string
          complaint_type: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          credit_issued?: number | null
          customer_id?: string | null
          description?: string | null
          id?: string
          material_id?: string | null
          preventive_action?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          receiving_lot_id?: string | null
          replacement_cost?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          complaint_date?: string
          complaint_number?: string
          complaint_type?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          credit_issued?: number | null
          customer_id?: string | null
          description?: string | null
          id?: string
          material_id?: string | null
          preventive_action?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          receiving_lot_id?: string | null
          replacement_cost?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_complaints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "quality_complaints_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_complaints_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_metrics: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metric_date: string
          metric_details: Json | null
          metric_type: string
          metric_value: number | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_date: string
          metric_details?: Json | null
          metric_type: string
          metric_value?: number | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_date?: string
          metric_details?: Json | null
          metric_type?: string
          metric_value?: number | null
        }
        Relationships: []
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
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
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
      receiving_hold_log: {
        Row: {
          action: string
          id: string
          new_status: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          previous_status: string | null
          reason: string | null
          receiving_lot_id: string
        }
        Insert: {
          action: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          reason?: string | null
          receiving_lot_id: string
        }
        Update: {
          action?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          previous_status?: string | null
          reason?: string | null
          receiving_lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_hold_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_hold_log_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "receiving_hold_log_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
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
          container_status: string | null
          cost_finalized: boolean | null
          cost_per_base_unit: number | null
          cost_total: number | null
          created_at: string
          current_location_id: string | null
          current_quantity: number | null
          expiry_date: string | null
          id: string
          internal_lot_number: string
          last_transaction_at: string | null
          location_id: string | null
          material_id: string
          notes: string | null
          qa_approved_at: string | null
          qa_approved_by: string | null
          qa_notes: string | null
          qa_status: string | null
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
          container_status?: string | null
          cost_finalized?: boolean | null
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          current_location_id?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          internal_lot_number: string
          last_transaction_at?: string | null
          location_id?: string | null
          material_id: string
          notes?: string | null
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_notes?: string | null
          qa_status?: string | null
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
          container_status?: string | null
          cost_finalized?: boolean | null
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          current_location_id?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          internal_lot_number?: string
          last_transaction_at?: string | null
          location_id?: string | null
          material_id?: string
          notes?: string | null
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_notes?: string | null
          qa_status?: string | null
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
            foreignKeyName: "fk_receiving_lots_current_location"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "receiving_lots_qa_approved_by_fkey"
            columns: ["qa_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      shift_templates: {
        Row: {
          break_minutes: number | null
          color: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          job_position_id: string | null
          name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          job_position_id?: string | null
          name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          job_position_id?: string | null
          name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_templates_job_position_id_fkey"
            columns: ["job_position_id"]
            isOneToOne: false
            referencedRelation: "job_positions"
            referencedColumns: ["id"]
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
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          date_published: string | null
          date_reviewed: string | null
          document_name: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          is_archived: boolean | null
          requirement_id: string | null
          supplier_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          requirement_id?: string | null
          supplier_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          date_published?: string | null
          date_reviewed?: string | null
          document_name?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          is_archived?: boolean | null
          requirement_id?: string | null
          supplier_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          qa_verified_at: string | null
          qa_verified_by: string | null
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
          qa_verified_at?: string | null
          qa_verified_by?: string | null
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
          qa_verified_at?: string | null
          qa_verified_by?: string | null
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
          {
            foreignKeyName: "suppliers_qa_verified_by_fkey"
            columns: ["qa_verified_by"]
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
      user_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_step_viewed: number | null
          module_key: string
          skipped_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_step_viewed?: number | null
          module_key: string
          skipped_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_step_viewed?: number | null
          module_key?: string
          skipped_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          refresh_token: string
          tenant_id: string
          tenant_name: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          refresh_token: string
          tenant_id: string
          tenant_name?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          refresh_token?: string
          tenant_id?: string
          tenant_name?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_journal_batches: {
        Row: {
          batch_date: string
          batch_type: string
          created_at: string
          created_by: string | null
          id: string
          production_lot_ids: string[] | null
          status: string | null
          sync_error: string | null
          synced_at: string | null
          total_labor_amount: number | null
          total_material_amount: number | null
          total_overhead_amount: number | null
          total_wip_amount: number | null
          xero_journal_id: string | null
        }
        Insert: {
          batch_date: string
          batch_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          production_lot_ids?: string[] | null
          status?: string | null
          sync_error?: string | null
          synced_at?: string | null
          total_labor_amount?: number | null
          total_material_amount?: number | null
          total_overhead_amount?: number | null
          total_wip_amount?: number | null
          xero_journal_id?: string | null
        }
        Update: {
          batch_date?: string
          batch_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          production_lot_ids?: string[] | null
          status?: string | null
          sync_error?: string | null
          synced_at?: string | null
          total_labor_amount?: number | null
          total_material_amount?: number | null
          total_overhead_amount?: number | null
          total_wip_amount?: number | null
          xero_journal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_journal_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_manufacturing_account_mappings: {
        Row: {
          helper_text: string | null
          id: string
          mapping_key: string
          updated_at: string
          updated_by: string | null
          xero_account_code: string | null
          xero_account_id: string | null
          xero_account_name: string | null
          xero_account_type: string | null
        }
        Insert: {
          helper_text?: string | null
          id?: string
          mapping_key: string
          updated_at?: string
          updated_by?: string | null
          xero_account_code?: string | null
          xero_account_id?: string | null
          xero_account_name?: string | null
          xero_account_type?: string | null
        }
        Update: {
          helper_text?: string | null
          id?: string
          mapping_key?: string
          updated_at?: string
          updated_by?: string | null
          xero_account_code?: string | null
          xero_account_id?: string | null
          xero_account_name?: string | null
          xero_account_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xero_manufacturing_account_mappings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      document_expiration_watchlist: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_type: string | null
          entity_name: string | null
          expiration_date: string | null
          expiration_status: string | null
          file_url: string | null
          id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          uploaded_by: string | null
        }
        Relationships: []
      }
      inventory_by_lot_location: {
        Row: {
          container_status: string | null
          current_quantity: number | null
          expiry_date: string | null
          expiry_status: string | null
          internal_lot_number: string | null
          location_id: string | null
          location_name: string | null
          material_code: string | null
          material_id: string | null
          material_name: string | null
          original_quantity: number | null
          receiving_lot_id: string | null
          supplier_lot_number: string | null
          unit_code: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_pending_items: {
        Row: {
          approval_status: string | null
          created_at: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          qa_verified_by: string | null
          table_name: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      stale_draft_items: {
        Row: {
          approval_status: string | null
          created_at: string | null
          days_stale: number | null
          id: string | null
          item_code: string | null
          item_name: string | null
          table_name: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_landed_costs: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      can_ship_production_lot: { Args: { p_lot_id: string }; Returns: boolean }
      check_permission: {
        Args: {
          _required_level?: string
          _resource_key: string
          _user_id: string
        }
        Returns: boolean
      }
      cleanup_stale_editors: { Args: never; Returns: undefined }
      generate_complaint_number: { Args: never; Returns: string }
      generate_employee_number: { Args: never; Returns: string }
      generate_listed_material_code: { Args: never; Returns: string }
      generate_material_code: { Args: { p_category: string }; Returns: string }
      generate_pallet_number: {
        Args: { p_build_date?: string }
        Returns: string
      }
      generate_pick_request_number: {
        Args: { p_request_date?: string }
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
      get_unapproved_recipe_materials: {
        Args: { p_recipe_id: string }
        Returns: {
          approval_status: string
          material_id: string
          material_name: string
        }[]
      }
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
      is_material_approved: {
        Args: { p_material_id: string }
        Returns: boolean
      }
      supplier_has_valid_documents: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "supervisor" | "employee"
      approval_status_enum:
        | "Draft"
        | "Pending_QA"
        | "Approved"
        | "Rejected"
        | "Archived"
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
      approval_status_enum: [
        "Draft",
        "Pending_QA",
        "Approved",
        "Rejected",
        "Archived",
      ],
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
