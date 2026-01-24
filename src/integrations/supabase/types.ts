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
      admin_audit_log: {
        Row: {
          action_details: Json | null
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          justification: string | null
          target_user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          alert_type: string
          created_at: string | null
          days_before_expiry: number | null
          id: string
          is_enabled: boolean | null
          notification_channels: string[] | null
          notify_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          days_before_expiry?: number | null
          id?: string
          is_enabled?: boolean | null
          notification_channels?: string[] | null
          notify_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          days_before_expiry?: number | null
          id?: string
          is_enabled?: boolean | null
          notification_channels?: string[] | null
          notify_roles?: string[] | null
          updated_at?: string | null
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
      allergen_sequence_rules: {
        Row: {
          allergen: string
          cleaning_time_minutes: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          requires_deep_clean_after: boolean | null
          sequence_priority: number
          updated_at: string | null
          warning_if_after: string[] | null
        }
        Insert: {
          allergen: string
          cleaning_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_deep_clean_after?: boolean | null
          sequence_priority: number
          updated_at?: string | null
          warning_if_after?: string[] | null
        }
        Update: {
          allergen?: string
          cleaning_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_deep_clean_after?: boolean | null
          sequence_priority?: number
          updated_at?: string | null
          warning_if_after?: string[] | null
        }
        Relationships: []
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
      audit_findings: {
        Row: {
          assigned_to: string | null
          audit_id: string
          capa_id: string | null
          capa_required: boolean | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          evidence: string | null
          finding_number: string
          finding_type: string
          id: string
          location: string | null
          requirement: string | null
          response: string | null
          response_date: string | null
          response_due_date: string | null
          severity: string | null
          status: string
          title: string
          updated_at: string
          verification_notes: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          capa_id?: string | null
          capa_required?: boolean | null
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          evidence?: string | null
          finding_number: string
          finding_type: string
          id?: string
          location?: string | null
          requirement?: string | null
          response?: string | null
          response_date?: string | null
          response_due_date?: string | null
          severity?: string | null
          status?: string
          title: string
          updated_at?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          capa_id?: string | null
          capa_required?: boolean | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evidence?: string | null
          finding_number?: string
          finding_type?: string
          id?: string
          location?: string | null
          requirement?: string | null
          response?: string | null
          response_date?: string | null
          response_due_date?: string | null
          severity?: string | null
          status?: string
          title?: string
          updated_at?: string
          verification_notes?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          audit_date: string
          audit_end_date: string | null
          audit_number: string
          audit_scope: string | null
          audit_type: string
          auditor_name: string | null
          auditor_organization: string | null
          auditor_type: string | null
          created_at: string
          created_by: string | null
          critical_findings: number | null
          description: string | null
          id: string
          lead_auditor_id: string | null
          major_findings: number | null
          minor_findings: number | null
          observations: number | null
          status: string
          title: string
          total_findings: number | null
          updated_at: string
        }
        Insert: {
          audit_date: string
          audit_end_date?: string | null
          audit_number: string
          audit_scope?: string | null
          audit_type: string
          auditor_name?: string | null
          auditor_organization?: string | null
          auditor_type?: string | null
          created_at?: string
          created_by?: string | null
          critical_findings?: number | null
          description?: string | null
          id?: string
          lead_auditor_id?: string | null
          major_findings?: number | null
          minor_findings?: number | null
          observations?: number | null
          status?: string
          title: string
          total_findings?: number | null
          updated_at?: string
        }
        Update: {
          audit_date?: string
          audit_end_date?: string | null
          audit_number?: string
          audit_scope?: string | null
          audit_type?: string
          auditor_name?: string | null
          auditor_organization?: string | null
          auditor_type?: string | null
          created_at?: string
          created_by?: string | null
          critical_findings?: number | null
          description?: string | null
          id?: string
          lead_auditor_id?: string | null
          major_findings?: number | null
          minor_findings?: number | null
          observations?: number | null
          status?: string
          title?: string
          total_findings?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_lead_auditor_id_fkey"
            columns: ["lead_auditor_id"]
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
      capa_activity_log: {
        Row: {
          action: string
          capa_id: string
          comment: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          capa_id: string
          comment?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          capa_id?: string
          comment?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capa_activity_log_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capa_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          capa_id: string
          comments: string | null
          id: string
          requested_at: string
          requested_by: string | null
          revision_comments: string | null
          stage: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          capa_id: string
          comments?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          revision_comments?: string | null
          stage: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          capa_id?: string
          comments?: string | null
          id?: string
          requested_at?: string
          requested_by?: string | null
          revision_comments?: string | null
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_approvals_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capa_attachments: {
        Row: {
          attachment_category: string | null
          capa_id: string
          description: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_category?: string | null
          capa_id: string
          description?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_category?: string | null
          capa_id?: string
          description?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capa_attachments_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capa_root_cause_analysis: {
        Row: {
          analysis_summary: string | null
          analyzed_at: string
          analyzed_by: string | null
          capa_id: string
          contributing_factors: string[] | null
          fishbone_data: Json | null
          five_whys_data: Json | null
          id: string
          method: string
          root_cause_statement: string | null
          updated_at: string
        }
        Insert: {
          analysis_summary?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          capa_id: string
          contributing_factors?: string[] | null
          fishbone_data?: Json | null
          five_whys_data?: Json | null
          id?: string
          method: string
          root_cause_statement?: string | null
          updated_at?: string
        }
        Update: {
          analysis_summary?: string | null
          analyzed_at?: string
          analyzed_by?: string | null
          capa_id?: string
          contributing_factors?: string[] | null
          fishbone_data?: Json | null
          five_whys_data?: Json | null
          id?: string
          method?: string
          root_cause_statement?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_root_cause_analysis_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_root_cause_analysis_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      capa_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      capa_severity_settings: {
        Row: {
          color_code: string | null
          containment_hours: number
          corrective_action_days: number
          created_at: string
          effectiveness_review_days: number
          id: string
          preventive_action_days: number
          root_cause_hours: number
          severity: string
          updated_at: string
          verification_days: number
        }
        Insert: {
          color_code?: string | null
          containment_hours: number
          corrective_action_days: number
          created_at?: string
          effectiveness_review_days: number
          id?: string
          preventive_action_days: number
          root_cause_hours: number
          severity: string
          updated_at?: string
          verification_days: number
        }
        Update: {
          color_code?: string | null
          containment_hours?: number
          corrective_action_days?: number
          created_at?: string
          effectiveness_review_days?: number
          id?: string
          preventive_action_days?: number
          root_cause_hours?: number
          severity?: string
          updated_at?: string
          verification_days?: number
        }
        Relationships: []
      }
      capa_tasks: {
        Row: {
          assigned_to: string | null
          capa_id: string
          completed_by: string | null
          completed_date: string | null
          completion_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          evidence_attached: boolean | null
          evidence_required: boolean | null
          id: string
          sort_order: number | null
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          capa_id: string
          completed_by?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence_attached?: boolean | null
          evidence_required?: boolean | null
          id?: string
          sort_order?: number | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          capa_id?: string
          completed_by?: string | null
          completed_date?: string | null
          completion_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence_attached?: boolean | null
          evidence_required?: boolean | null
          id?: string
          sort_order?: number | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capa_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_tasks_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capa_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          muted_until: string | null
          notifications_enabled: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted_until?: string | null
          notifications_enabled?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          allow_file_sharing: boolean | null
          channel_type: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          is_archived: boolean | null
          name: string
          participant_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          allow_file_sharing?: boolean | null
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          participant_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          allow_file_sharing?: boolean | null
          channel_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          participant_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          content_type: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          mentions: string[] | null
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          mentions?: string[] | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          mentions?: string[] | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          channel_id: string
          id: string
          last_read_at: string | null
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          auto_rollover_production_targets: boolean
          city: string | null
          company_name: string
          company_prefix: string | null
          country: string | null
          created_at: string
          default_tax_rate: number | null
          email: string | null
          fax: string | null
          gs1_company_prefix: string | null
          id: string
          logo_path: string | null
          logo_url: string | null
          phone: string | null
          remittance_email: string | null
          sales_notification_email: string | null
          state: string | null
          threeppl_release_email: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          auto_rollover_production_targets?: boolean
          city?: string | null
          company_name?: string
          company_prefix?: string | null
          country?: string | null
          created_at?: string
          default_tax_rate?: number | null
          email?: string | null
          fax?: string | null
          gs1_company_prefix?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          phone?: string | null
          remittance_email?: string | null
          sales_notification_email?: string | null
          state?: string | null
          threeppl_release_email?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          auto_rollover_production_targets?: boolean
          city?: string | null
          company_name?: string
          company_prefix?: string | null
          country?: string | null
          created_at?: string
          default_tax_rate?: number | null
          email?: string | null
          fax?: string | null
          gs1_company_prefix?: string | null
          id?: string
          logo_path?: string | null
          logo_url?: string | null
          phone?: string | null
          remittance_email?: string | null
          sales_notification_email?: string | null
          state?: string | null
          threeppl_release_email?: string | null
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
      container_sizes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_weight_kg: number | null
          min_weight_kg: number | null
          name: string
          sku_code: string
          sort_order: number | null
          target_weight_kg: number | null
          updated_at: string | null
          volume_gallons: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_weight_kg?: number | null
          min_weight_kg?: number | null
          name: string
          sku_code: string
          sort_order?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          volume_gallons: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_weight_kg?: number | null
          min_weight_kg?: number | null
          name?: string
          sku_code?: string
          sort_order?: number | null
          target_weight_kg?: number | null
          updated_at?: string | null
          volume_gallons?: number
        }
        Relationships: []
      }
      corrective_actions: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          capa_number: string
          capa_type: string
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          containment_actions: string | null
          containment_completed_at: string | null
          containment_due_date: string | null
          containment_verified_by: string | null
          corrective_action: string | null
          corrective_action_completed_at: string | null
          corrective_action_completed_by: string | null
          corrective_action_due_date: string | null
          corrective_actions_text: string | null
          cost_recovery_amount: number | null
          cost_recovery_source: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string
          discovery_date: string
          effectiveness_criteria: string | null
          effectiveness_results: string | null
          effectiveness_review_completed_at: string | null
          effectiveness_review_due_date: string | null
          effectiveness_review_notes: string | null
          effectiveness_review_result: string | null
          effectiveness_reviewed_by: string | null
          effectiveness_verified: boolean | null
          effectiveness_verified_at: string | null
          effectiveness_verified_by: string | null
          employee_id: string | null
          equipment_id: string | null
          estimated_cost: number | null
          id: string
          immediate_action: string | null
          immediate_action_by: string | null
          immediate_action_date: string | null
          implementation_evidence: string | null
          investigation_summary: string | null
          is_recurring: boolean | null
          location_id: string | null
          material_id: string | null
          occurrence_date: string
          preventive_action: string | null
          preventive_action_completed_at: string | null
          preventive_action_completed_by: string | null
          preventive_action_due_date: string | null
          preventive_actions_text: string | null
          product_id: string | null
          production_lot_id: string | null
          receiving_lot_id: string | null
          recurrence_check_date: string | null
          recurrence_found: boolean | null
          related_capa_id: string | null
          root_cause: string | null
          root_cause_category: string | null
          root_cause_completed_at: string | null
          root_cause_completed_by: string | null
          root_cause_due_date: string | null
          root_cause_method: string | null
          root_cause_verified: boolean | null
          severity: string
          source_id: string | null
          source_type: string | null
          status: string
          supplier_id: string | null
          title: string
          updated_at: string
          verification_completed_at: string | null
          verification_date: string | null
          verification_due_date: string | null
          verification_method: string | null
          verification_result: string | null
          verification_results: string | null
          verified_by: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          capa_number: string
          capa_type: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          containment_actions?: string | null
          containment_completed_at?: string | null
          containment_due_date?: string | null
          containment_verified_by?: string | null
          corrective_action?: string | null
          corrective_action_completed_at?: string | null
          corrective_action_completed_by?: string | null
          corrective_action_due_date?: string | null
          corrective_actions_text?: string | null
          cost_recovery_amount?: number | null
          cost_recovery_source?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description: string
          discovery_date?: string
          effectiveness_criteria?: string | null
          effectiveness_results?: string | null
          effectiveness_review_completed_at?: string | null
          effectiveness_review_due_date?: string | null
          effectiveness_review_notes?: string | null
          effectiveness_review_result?: string | null
          effectiveness_reviewed_by?: string | null
          effectiveness_verified?: boolean | null
          effectiveness_verified_at?: string | null
          effectiveness_verified_by?: string | null
          employee_id?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          immediate_action?: string | null
          immediate_action_by?: string | null
          immediate_action_date?: string | null
          implementation_evidence?: string | null
          investigation_summary?: string | null
          is_recurring?: boolean | null
          location_id?: string | null
          material_id?: string | null
          occurrence_date?: string
          preventive_action?: string | null
          preventive_action_completed_at?: string | null
          preventive_action_completed_by?: string | null
          preventive_action_due_date?: string | null
          preventive_actions_text?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          receiving_lot_id?: string | null
          recurrence_check_date?: string | null
          recurrence_found?: boolean | null
          related_capa_id?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          root_cause_completed_at?: string | null
          root_cause_completed_by?: string | null
          root_cause_due_date?: string | null
          root_cause_method?: string | null
          root_cause_verified?: boolean | null
          severity?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
          verification_completed_at?: string | null
          verification_date?: string | null
          verification_due_date?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verification_results?: string | null
          verified_by?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          capa_number?: string
          capa_type?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          containment_actions?: string | null
          containment_completed_at?: string | null
          containment_due_date?: string | null
          containment_verified_by?: string | null
          corrective_action?: string | null
          corrective_action_completed_at?: string | null
          corrective_action_completed_by?: string | null
          corrective_action_due_date?: string | null
          corrective_actions_text?: string | null
          cost_recovery_amount?: number | null
          cost_recovery_source?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string
          discovery_date?: string
          effectiveness_criteria?: string | null
          effectiveness_results?: string | null
          effectiveness_review_completed_at?: string | null
          effectiveness_review_due_date?: string | null
          effectiveness_review_notes?: string | null
          effectiveness_review_result?: string | null
          effectiveness_reviewed_by?: string | null
          effectiveness_verified?: boolean | null
          effectiveness_verified_at?: string | null
          effectiveness_verified_by?: string | null
          employee_id?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          immediate_action?: string | null
          immediate_action_by?: string | null
          immediate_action_date?: string | null
          implementation_evidence?: string | null
          investigation_summary?: string | null
          is_recurring?: boolean | null
          location_id?: string | null
          material_id?: string | null
          occurrence_date?: string
          preventive_action?: string | null
          preventive_action_completed_at?: string | null
          preventive_action_completed_by?: string | null
          preventive_action_due_date?: string | null
          preventive_actions_text?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          receiving_lot_id?: string | null
          recurrence_check_date?: string | null
          recurrence_found?: boolean | null
          related_capa_id?: string | null
          root_cause?: string | null
          root_cause_category?: string | null
          root_cause_completed_at?: string | null
          root_cause_completed_by?: string | null
          root_cause_due_date?: string | null
          root_cause_method?: string | null
          root_cause_verified?: boolean | null
          severity?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
          verification_completed_at?: string | null
          verification_date?: string | null
          verification_due_date?: string | null
          verification_method?: string | null
          verification_result?: string | null
          verification_results?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_containment_verified_by_fkey"
            columns: ["containment_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_corrective_action_completed_by_fkey"
            columns: ["corrective_action_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_effectiveness_reviewed_by_fkey"
            columns: ["effectiveness_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_effectiveness_verified_by_fkey"
            columns: ["effectiveness_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_immediate_action_by_fkey"
            columns: ["immediate_action_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_preventive_action_completed_by_fkey"
            columns: ["preventive_action_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "corrective_actions_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "corrective_actions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_related_capa_id_fkey"
            columns: ["related_capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_root_cause_completed_by_fkey"
            columns: ["root_cause_completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_complaints: {
        Row: {
          assigned_to: string | null
          best_by_date: string | null
          capa_id: string | null
          capa_required: boolean | null
          complaint_date: string
          complaint_number: string
          complaint_type: string
          created_at: string
          created_by: string | null
          customer_contact: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_satisfied: boolean | null
          description: string
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          investigation_notes: string | null
          product_id: string | null
          product_name: string | null
          product_sku: string | null
          production_lot_number: string | null
          purchase_date: string | null
          purchase_location: string | null
          received_date: string
          received_via: string | null
          refund_amount: number | null
          regulatory_report_date: string | null
          regulatory_report_filed: boolean | null
          replacement_cost: number | null
          reportable_event: boolean | null
          resolution_date: string | null
          resolution_details: string | null
          resolution_type: string | null
          resolved_by: string | null
          root_cause: string | null
          sample_condition: string | null
          sample_received: boolean | null
          sample_received_date: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          best_by_date?: string | null
          capa_id?: string | null
          capa_required?: boolean | null
          complaint_date?: string
          complaint_number: string
          complaint_type: string
          created_at?: string
          created_by?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_satisfied?: boolean | null
          description: string
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          investigation_notes?: string | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          production_lot_number?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          received_date?: string
          received_via?: string | null
          refund_amount?: number | null
          regulatory_report_date?: string | null
          regulatory_report_filed?: boolean | null
          replacement_cost?: number | null
          reportable_event?: boolean | null
          resolution_date?: string | null
          resolution_details?: string | null
          resolution_type?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          sample_condition?: string | null
          sample_received?: boolean | null
          sample_received_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          best_by_date?: string | null
          capa_id?: string | null
          capa_required?: boolean | null
          complaint_date?: string
          complaint_number?: string
          complaint_type?: string
          created_at?: string
          created_by?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_satisfied?: boolean | null
          description?: string
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          investigation_notes?: string | null
          product_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          production_lot_number?: string | null
          purchase_date?: string | null
          purchase_location?: string | null
          received_date?: string
          received_via?: string | null
          refund_amount?: number | null
          regulatory_report_date?: string | null
          regulatory_report_filed?: boolean | null
          replacement_cost?: number | null
          reportable_event?: boolean | null
          resolution_date?: string | null
          resolution_details?: string | null
          resolution_type?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          sample_condition?: string | null
          sample_received?: boolean | null
          sample_received_date?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "customer_complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_pricing: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          customer_item_number: string | null
          effective_date: string
          expiration_date: string | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          notes: string | null
          product_size_id: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          customer_item_number?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          notes?: string | null
          product_size_id: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          customer_item_number?: string | null
          effective_date?: string
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          notes?: string | null
          product_size_id?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_pricing_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_pricing_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          allow_backorders: boolean | null
          categories: string[] | null
          city: string | null
          code: string
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          customer_type: string | null
          early_pay_days: number | null
          early_pay_discount_percent: number | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          is_master_company: boolean | null
          location_name: string | null
          name: string
          notes: string | null
          parent_company_id: string | null
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
          allow_backorders?: boolean | null
          categories?: string[] | null
          city?: string | null
          code: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          customer_type?: string | null
          early_pay_days?: number | null
          early_pay_discount_percent?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_master_company?: boolean | null
          location_name?: string | null
          name: string
          notes?: string | null
          parent_company_id?: string | null
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
          allow_backorders?: boolean | null
          categories?: string[] | null
          city?: string | null
          code?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          customer_type?: string | null
          early_pay_days?: number | null
          early_pay_discount_percent?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          is_master_company?: boolean | null
          location_name?: string | null
          name?: string
          notes?: string | null
          parent_company_id?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          tax_exempt?: boolean | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_items: {
        Row: {
          adjustment_id: string | null
          approved_at: string | null
          approved_by: string | null
          count_notes: string | null
          counted_at: string | null
          counted_by: string | null
          created_at: string | null
          cycle_count_id: string
          found_different_location_id: string | null
          id: string
          item_not_found: boolean | null
          location_id: string
          material_id: string
          physical_quantity: number | null
          physical_unit_id: string | null
          receiving_lot_id: string | null
          requires_review: boolean | null
          status: string | null
          system_quantity: number
          system_unit_id: string | null
          system_value: number | null
          variance_percentage: number | null
          variance_quantity: number | null
          variance_value: number | null
        }
        Insert: {
          adjustment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          count_notes?: string | null
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string | null
          cycle_count_id: string
          found_different_location_id?: string | null
          id?: string
          item_not_found?: boolean | null
          location_id: string
          material_id: string
          physical_quantity?: number | null
          physical_unit_id?: string | null
          receiving_lot_id?: string | null
          requires_review?: boolean | null
          status?: string | null
          system_quantity: number
          system_unit_id?: string | null
          system_value?: number | null
          variance_percentage?: number | null
          variance_quantity?: number | null
          variance_value?: number | null
        }
        Update: {
          adjustment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          count_notes?: string | null
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string | null
          cycle_count_id?: string
          found_different_location_id?: string | null
          id?: string
          item_not_found?: boolean | null
          location_id?: string
          material_id?: string
          physical_quantity?: number | null
          physical_unit_id?: string | null
          receiving_lot_id?: string | null
          requires_review?: boolean | null
          status?: string | null
          system_quantity?: number
          system_unit_id?: string | null
          system_value?: number | null
          variance_percentage?: number | null
          variance_quantity?: number | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_count_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "inventory_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_cycle_count_id_fkey"
            columns: ["cycle_count_id"]
            isOneToOne: false
            referencedRelation: "cycle_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_found_different_location_id_fkey"
            columns: ["found_different_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_physical_unit_id_fkey"
            columns: ["physical_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "cycle_count_items_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_count_items_system_unit_id_fkey"
            columns: ["system_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_count_settings: {
        Row: {
          category: string | null
          created_at: string | null
          frequency_days: number
          id: string
          is_active: boolean | null
          updated_at: string | null
          value_manager_approval_threshold: number | null
          variance_auto_approve_percent: number | null
          variance_manager_approval_percent: number | null
          variance_supervisor_review_percent: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          value_manager_approval_threshold?: number | null
          variance_auto_approve_percent?: number | null
          variance_manager_approval_percent?: number | null
          variance_supervisor_review_percent?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          frequency_days?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          value_manager_approval_threshold?: number | null
          variance_auto_approve_percent?: number | null
          variance_manager_approval_percent?: number | null
          variance_supervisor_review_percent?: number | null
        }
        Relationships: []
      }
      cycle_counts: {
        Row: {
          assigned_to: string | null
          category_filter: string | null
          completed_at: string | null
          count_number: string
          count_type: string
          created_at: string | null
          created_by: string | null
          id: string
          include_open_containers: boolean | null
          items_counted: number | null
          items_with_variance: number | null
          location_ids: string[] | null
          material_ids: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_date: string
          started_at: string | null
          status: string | null
          total_items: number | null
          total_variance_value: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category_filter?: string | null
          completed_at?: string | null
          count_number: string
          count_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          include_open_containers?: boolean | null
          items_counted?: number | null
          items_with_variance?: number | null
          location_ids?: string[] | null
          material_ids?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_date: string
          started_at?: string | null
          status?: string | null
          total_items?: number | null
          total_variance_value?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category_filter?: string | null
          completed_at?: string | null
          count_number?: string
          count_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          include_open_containers?: boolean | null
          items_counted?: number | null
          items_with_variance?: number | null
          location_ids?: string[] | null
          material_ids?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_date?: string
          started_at?: string | null
          status?: string | null
          total_items?: number | null
          total_variance_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cycle_counts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_counts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_production_targets: {
        Row: {
          achievement_percentage: number | null
          actual_efficiency: number | null
          actual_labor_cost: number | null
          actual_labor_hours: number | null
          actual_quantity: number | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          production_line_id: string | null
          target_date: string
          target_efficiency: number | null
          target_labor_cost: number | null
          target_labor_hours: number | null
          target_quantity: number
          target_uom: string
          updated_at: string | null
        }
        Insert: {
          achievement_percentage?: number | null
          actual_efficiency?: number | null
          actual_labor_cost?: number | null
          actual_labor_hours?: number | null
          actual_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          production_line_id?: string | null
          target_date: string
          target_efficiency?: number | null
          target_labor_cost?: number | null
          target_labor_hours?: number | null
          target_quantity: number
          target_uom?: string
          updated_at?: string | null
        }
        Update: {
          achievement_percentage?: number | null
          actual_efficiency?: number | null
          actual_labor_cost?: number | null
          actual_labor_hours?: number | null
          actual_quantity?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          production_line_id?: string | null
          target_date?: string
          target_efficiency?: number | null
          target_labor_cost?: number | null
          target_labor_hours?: number | null
          target_quantity?: number
          target_uom?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_targets_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
        ]
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
      disposal_log: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          disposal_reason_code: string
          disposal_reason_notes: string | null
          disposed_at: string
          disposed_by: string | null
          gl_account_id: string | null
          id: string
          journal_entry_id: string | null
          material_id: string | null
          product_id: string | null
          production_lot_id: string | null
          quantity_disposed: number
          receiving_lot_id: string | null
          requires_approval: boolean | null
          source_reference_id: string | null
          source_type: string
          supplier_id: string | null
          supplier_points_assessed: number | null
          total_value: number
          unit_cost: number | null
          unit_id: string | null
          xero_synced_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disposal_reason_code: string
          disposal_reason_notes?: string | null
          disposed_at?: string
          disposed_by?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          material_id?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_disposed: number
          receiving_lot_id?: string | null
          requires_approval?: boolean | null
          source_reference_id?: string | null
          source_type: string
          supplier_id?: string | null
          supplier_points_assessed?: number | null
          total_value?: number
          unit_cost?: number | null
          unit_id?: string | null
          xero_synced_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disposal_reason_code?: string
          disposal_reason_notes?: string | null
          disposed_at?: string
          disposed_by?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          material_id?: string | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_disposed?: number
          receiving_lot_id?: string | null
          requires_approval?: boolean | null
          source_reference_id?: string | null
          source_type?: string
          supplier_id?: string | null
          supplier_points_assessed?: number | null
          total_value?: number
          unit_cost?: number | null
          unit_id?: string | null
          xero_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disposal_log_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_disposed_by_fkey"
            columns: ["disposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "disposal_log_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "disposal_log_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disposal_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
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
      email_settings: {
        Row: {
          created_at: string
          description: string | null
          email_type: string
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          reply_to: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email_type: string
          from_email: string
          from_name: string
          id?: string
          is_active?: boolean
          reply_to?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email_type?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          reply_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_account_invitations: {
        Row: {
          created_at: string
          email: string
          email_error: string | null
          email_sent: boolean
          employee_id: string
          id: string
          invitation_type: string
          invited_at: string
          invited_by: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_error?: string | null
          email_sent?: boolean
          employee_id: string
          id?: string
          invitation_type?: string
          invited_at?: string
          invited_by?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_error?: string | null
          email_sent?: boolean
          employee_id?: string
          id?: string
          invitation_type?: string
          invited_at?: string
          invited_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_account_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_account_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_account_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      employee_hr_documents: {
        Row: {
          created_at: string | null
          due_date: string | null
          employee_id: string
          id: string
          reminder_count: number | null
          reminder_sent_at: string | null
          signature_data: string | null
          signature_ip: string | null
          signed_at: string | null
          status: string | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          reminder_count?: number | null
          reminder_sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signed_at?: string | null
          status?: string | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          reminder_count?: number | null
          reminder_sent_at?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signed_at?: string | null
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_hr_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_hr_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "hr_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_personal_documents: {
        Row: {
          description: string | null
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          issue_date: string | null
          name: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          name: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_date?: string | null
          name?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_personal_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_personal_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pto_settings: {
        Row: {
          accrual_rate: number | null
          accrual_type: string | null
          annual_grant: number | null
          current_balance: number | null
          eligible_date: string | null
          employee_id: string
          id: string
          max_balance: number | null
          max_carryover: number | null
          pto_type_id: string
          updated_at: string | null
          year_accrued: number | null
          year_start_balance: number | null
          year_used: number | null
        }
        Insert: {
          accrual_rate?: number | null
          accrual_type?: string | null
          annual_grant?: number | null
          current_balance?: number | null
          eligible_date?: string | null
          employee_id: string
          id?: string
          max_balance?: number | null
          max_carryover?: number | null
          pto_type_id: string
          updated_at?: string | null
          year_accrued?: number | null
          year_start_balance?: number | null
          year_used?: number | null
        }
        Update: {
          accrual_rate?: number | null
          accrual_type?: string | null
          annual_grant?: number | null
          current_balance?: number | null
          eligible_date?: string | null
          employee_id?: string
          id?: string
          max_balance?: number | null
          max_carryover?: number | null
          pto_type_id?: string
          updated_at?: string | null
          year_accrued?: number | null
          year_start_balance?: number | null
          year_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_pto_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_pto_settings_pto_type_id_fkey"
            columns: ["pto_type_id"]
            isOneToOne: false
            referencedRelation: "pto_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_schedules: {
        Row: {
          absence_reason: string | null
          assigned_production_line_id: string | null
          assigned_task: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          hourly_rate: number
          id: string
          is_absent: boolean | null
          notes: string | null
          schedule_date: string
          schedule_status: string | null
          scheduled_hours: number
          shift_end_time: string
          shift_start_time: string
          updated_at: string | null
        }
        Insert: {
          absence_reason?: string | null
          assigned_production_line_id?: string | null
          assigned_task?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          hourly_rate?: number
          id?: string
          is_absent?: boolean | null
          notes?: string | null
          schedule_date: string
          schedule_status?: string | null
          scheduled_hours: number
          shift_end_time: string
          shift_start_time: string
          updated_at?: string | null
        }
        Update: {
          absence_reason?: string | null
          assigned_production_line_id?: string | null
          assigned_task?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          hourly_rate?: number
          id?: string
          is_absent?: boolean | null
          notes?: string | null
          schedule_date?: string
          schedule_status?: string | null
          scheduled_hours?: number
          shift_end_time?: string
          shift_start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_schedules_assigned_production_line_id_fkey"
            columns: ["assigned_production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
      employee_skills: {
        Row: {
          certification_expiry: string | null
          certification_number: string | null
          certified_date: string | null
          created_at: string | null
          employee_id: string
          id: string
          is_certified: boolean | null
          notes: string | null
          proficiency_level: string | null
          skill_category: string | null
          skill_name: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certification_expiry?: string | null
          certification_number?: string | null
          certified_date?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          is_certified?: boolean | null
          notes?: string | null
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certification_expiry?: string | null
          certification_number?: string | null
          certified_date?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          is_certified?: boolean | null
          notes?: string | null
          proficiency_level?: string | null
          skill_category?: string | null
          skill_name?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      employee_training_records: {
        Row: {
          certificate_file_path: string | null
          certificate_number: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          score: number | null
          sop_id: string | null
          status: string | null
          trainer_id: string | null
          trainer_name: string | null
          training_name: string
          training_type: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          certificate_file_path?: string | null
          certificate_number?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          score?: number | null
          sop_id?: string | null
          status?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          training_name: string
          training_type?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          certificate_file_path?: string | null
          certificate_number?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          score?: number | null
          sop_id?: string | null
          status?: string | null
          trainer_id?: string | null
          trainer_name?: string | null
          training_name?: string
          training_type?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_records_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      hold_reason_codes: {
        Row: {
          auto_trigger: boolean | null
          code: string
          created_at: string | null
          default_priority: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_capa: boolean | null
          sort_order: number | null
          supplier_points: number | null
          updated_at: string | null
        }
        Insert: {
          auto_trigger?: boolean | null
          code: string
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_capa?: boolean | null
          sort_order?: number | null
          supplier_points?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_trigger?: boolean | null
          code?: string
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_capa?: boolean | null
          sort_order?: number | null
          supplier_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hr_document_templates: {
        Row: {
          assign_to_all: boolean | null
          assign_to_new_hires: boolean | null
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string | null
          file_path: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_signature: boolean | null
          signature_text: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          assign_to_all?: boolean | null
          assign_to_new_hires?: boolean | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_signature?: boolean | null
          signature_text?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          assign_to_all?: boolean | null
          assign_to_new_hires?: boolean | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_signature?: boolean | null
          signature_text?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          current_value: number | null
          id: string
          material_id: string | null
          message: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          receiving_lot_id: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          threshold_value: number | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          material_id?: string | null
          message: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          receiving_lot_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string | null
          threshold_value?: number | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          material_id?: string | null
          message?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          receiving_lot_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_alerts_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_conversion_log: {
        Row: {
          calculated_open_expiry: string | null
          conversion_type: string
          created_at: string | null
          id: string
          performed_at: string | null
          performed_by: string | null
          reason_code: string
          reason_notes: string | null
          source_lot_id: string
          source_quantity: number
          source_unit_id: string | null
          target_lot_id: string | null
          target_quantity: number
          target_unit_id: string | null
        }
        Insert: {
          calculated_open_expiry?: string | null
          conversion_type: string
          created_at?: string | null
          id?: string
          performed_at?: string | null
          performed_by?: string | null
          reason_code: string
          reason_notes?: string | null
          source_lot_id: string
          source_quantity: number
          source_unit_id?: string | null
          target_lot_id?: string | null
          target_quantity: number
          target_unit_id?: string | null
        }
        Update: {
          calculated_open_expiry?: string | null
          conversion_type?: string
          created_at?: string | null
          id?: string
          performed_at?: string | null
          performed_by?: string | null
          reason_code?: string
          reason_notes?: string | null
          source_lot_id?: string
          source_quantity?: number
          source_unit_id?: string | null
          target_lot_id?: string | null
          target_quantity?: number
          target_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conversion_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_source_unit_id_fkey"
            columns: ["source_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_target_lot_id_fkey"
            columns: ["target_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_target_lot_id_fkey"
            columns: ["target_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversion_log_target_unit_id_fkey"
            columns: ["target_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_holds: {
        Row: {
          auto_hold: boolean | null
          capa_id: string | null
          created_at: string | null
          hold_placed_at: string
          hold_placed_by: string | null
          hold_reason_code_id: string
          hold_reason_description: string | null
          id: string
          priority: string | null
          qa_inspection_id: string | null
          receiving_lot_id: string
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          supplier_point_assessed: boolean | null
          supplier_point_reason: string | null
          updated_at: string | null
        }
        Insert: {
          auto_hold?: boolean | null
          capa_id?: string | null
          created_at?: string | null
          hold_placed_at?: string
          hold_placed_by?: string | null
          hold_reason_code_id: string
          hold_reason_description?: string | null
          id?: string
          priority?: string | null
          qa_inspection_id?: string | null
          receiving_lot_id: string
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          supplier_point_assessed?: boolean | null
          supplier_point_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_hold?: boolean | null
          capa_id?: string | null
          created_at?: string | null
          hold_placed_at?: string
          hold_placed_by?: string | null
          hold_reason_code_id?: string
          hold_reason_description?: string | null
          id?: string
          priority?: string | null
          qa_inspection_id?: string | null
          receiving_lot_id?: string
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          supplier_point_assessed?: boolean | null
          supplier_point_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_holds_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_hold_placed_by_fkey"
            columns: ["hold_placed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_hold_reason_code_id_fkey"
            columns: ["hold_reason_code_id"]
            isOneToOne: false
            referencedRelation: "hold_reason_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "inventory_holds_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "inventory_movement_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
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
      inventory_preferences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          preference_key: string
          preference_type: string | null
          preference_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          preference_key: string
          preference_type?: string | null
          preference_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          preference_key?: string
          preference_type?: string | null
          preference_value?: string
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
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
      listed_material_categories: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      listed_material_names: {
        Row: {
          category_id: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listed_material_names_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "listed_material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_3pl: boolean | null
          is_active: boolean
          location_barcode: string | null
          location_code: string
          location_type: string
          name: string
          requires_scan_confirmation: boolean | null
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
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_barcode?: string | null
          location_code: string
          location_type: string
          name: string
          requires_scan_confirmation?: boolean | null
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
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_3pl?: boolean | null
          is_active?: boolean
          location_barcode?: string | null
          location_code?: string
          location_type?: string
          name?: string
          requires_scan_confirmation?: boolean | null
          state?: string | null
          target_temperature_max?: number | null
          target_temperature_min?: number | null
          temperature_controlled?: boolean | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      lot_consumption: {
        Row: {
          actual_total_cost: number | null
          actual_unit_cost: number | null
          ai_validation_notes: string | null
          ai_validation_status: string | null
          consumed_lot_id: string | null
          consumption_method: string | null
          consumption_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          manually_entered_at: string | null
          manually_entered_by: string | null
          material_id: string | null
          notes: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          quantity_consumed: number
          quantity_uom: string
          scanned_at: string | null
          scanned_by: string | null
          stage: string | null
          supervisor_override: boolean | null
          work_order_id: string | null
        }
        Insert: {
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          consumed_lot_id?: string | null
          consumption_method?: string | null
          consumption_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          manually_entered_at?: string | null
          manually_entered_by?: string | null
          material_id?: string | null
          notes?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          quantity_consumed: number
          quantity_uom: string
          scanned_at?: string | null
          scanned_by?: string | null
          stage?: string | null
          supervisor_override?: boolean | null
          work_order_id?: string | null
        }
        Update: {
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          consumed_lot_id?: string | null
          consumption_method?: string | null
          consumption_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          manually_entered_at?: string | null
          manually_entered_by?: string | null
          material_id?: string | null
          notes?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          quantity_consumed?: number
          quantity_uom?: string
          scanned_at?: string | null
          scanned_by?: string | null
          stage?: string | null
          supervisor_override?: boolean | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_consumption_consumed_lot_id_fkey"
            columns: ["consumed_lot_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_consumption_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      lot_genealogy: {
        Row: {
          child_lot_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          parent_lot_id: string | null
          quantity_uom: string
          quantity_used: number
          stage: string | null
          usage_date: string | null
        }
        Insert: {
          child_lot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          parent_lot_id?: string | null
          quantity_uom: string
          quantity_used: number
          stage?: string | null
          usage_date?: string | null
        }
        Update: {
          child_lot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          parent_lot_id?: string | null
          quantity_uom?: string
          quantity_used?: number
          stage?: string | null
          usage_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lot_genealogy_child_lot_id_fkey"
            columns: ["child_lot_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lot_genealogy_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_lots"
            referencedColumns: ["id"]
          },
        ]
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
      manufacturing_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          field_name: string | null
          id: string
          ip_address: unknown
          new_value: string | null
          notes: string | null
          old_value: string | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string | null
          id?: string
          ip_address?: unknown
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string | null
          id?: string
          ip_address?: unknown
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      manufacturing_cost_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string | null
          expires_date: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_uom: string | null
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_uom?: string | null
          setting_value: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          expires_date?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_uom?: string | null
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      manufacturing_lots: {
        Row: {
          approved_by: string | null
          approved_date: string | null
          created_at: string | null
          created_by: string | null
          expiration_date: string | null
          hold_by: string | null
          hold_date: string | null
          hold_reason: string | null
          id: string
          is_opened: boolean | null
          lot_number: string
          lot_status: string
          lot_type: string
          material_id: string | null
          notes: string | null
          opened_by: string | null
          opened_date: string | null
          operator_id: string | null
          production_date: string
          production_line_id: string | null
          quantity: number
          quantity_remaining: number
          quantity_uom: string
          rejected_by: string | null
          rejected_date: string | null
          rejection_reason: string | null
          shift: string | null
          storage_location: string | null
          temperature_log: Json | null
          updated_at: string | null
          updated_by: string | null
          work_order_id: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expiration_date?: string | null
          hold_by?: string | null
          hold_date?: string | null
          hold_reason?: string | null
          id?: string
          is_opened?: boolean | null
          lot_number: string
          lot_status?: string
          lot_type: string
          material_id?: string | null
          notes?: string | null
          opened_by?: string | null
          opened_date?: string | null
          operator_id?: string | null
          production_date: string
          production_line_id?: string | null
          quantity: number
          quantity_remaining: number
          quantity_uom: string
          rejected_by?: string | null
          rejected_date?: string | null
          rejection_reason?: string | null
          shift?: string | null
          storage_location?: string | null
          temperature_log?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expiration_date?: string | null
          hold_by?: string | null
          hold_date?: string | null
          hold_reason?: string | null
          id?: string
          is_opened?: boolean | null
          lot_number?: string
          lot_status?: string
          lot_type?: string
          material_id?: string | null
          notes?: string | null
          opened_by?: string | null
          opened_date?: string | null
          operator_id?: string | null
          production_date?: string
          production_line_id?: string | null
          quantity?: number
          quantity_remaining?: number
          quantity_uom?: string
          rejected_by?: string | null
          rejected_date?: string | null
          rejection_reason?: string | null
          shift?: string | null
          storage_location?: string | null
          temperature_log?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_lots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_lots_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
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
      material_consumption_staging: {
        Row: {
          ai_validation_checks: Json | null
          ai_validation_notes: string | null
          ai_validation_status: string | null
          approved_at: string | null
          approved_by: string | null
          committed_at: string | null
          created_at: string | null
          id: string
          is_committed: boolean | null
          lot_id: string | null
          lot_total_cost: number | null
          lot_unit_cost: number | null
          material_id: string | null
          notes: string | null
          override_reason: string | null
          production_stage: string | null
          quantity_to_use: number
          quantity_uom: string
          requires_approval: boolean | null
          scan_method: string | null
          scanned_at: string | null
          scanned_by: string | null
          scanned_lot_number: string
          work_order_id: string | null
        }
        Insert: {
          ai_validation_checks?: Json | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committed_at?: string | null
          created_at?: string | null
          id?: string
          is_committed?: boolean | null
          lot_id?: string | null
          lot_total_cost?: number | null
          lot_unit_cost?: number | null
          material_id?: string | null
          notes?: string | null
          override_reason?: string | null
          production_stage?: string | null
          quantity_to_use: number
          quantity_uom: string
          requires_approval?: boolean | null
          scan_method?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_lot_number: string
          work_order_id?: string | null
        }
        Update: {
          ai_validation_checks?: Json | null
          ai_validation_notes?: string | null
          ai_validation_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          committed_at?: string | null
          created_at?: string | null
          id?: string
          is_committed?: boolean | null
          lot_id?: string | null
          lot_total_cost?: number | null
          lot_unit_cost?: number | null
          material_id?: string | null
          notes?: string | null
          override_reason?: string | null
          production_stage?: string | null
          quantity_to_use?: number
          quantity_uom?: string
          requires_approval?: boolean | null
          scan_method?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          scanned_lot_number?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_consumption_staging_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_staging_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_staging_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
          is_primary: boolean
          listed_material_id: string
          material_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          listed_material_id: string
          material_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
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
      material_nutrition: {
        Row: {
          added_sugars_g: number | null
          calcium_mg: number | null
          calories: number | null
          cholesterol_mg: number | null
          created_at: string
          data_source: string | null
          dietary_fiber_g: number | null
          extraction_confidence: number | null
          folate_mcg_dfe: number | null
          id: string
          iron_mg: number | null
          last_verified_at: string | null
          magnesium_mg: number | null
          material_id: string | null
          monounsaturated_fat_g: number | null
          niacin_mg: number | null
          notes: string | null
          phosphorus_mg: number | null
          polyunsaturated_fat_g: number | null
          potassium_mg: number | null
          protein_g: number | null
          riboflavin_mg: number | null
          saturated_fat_g: number | null
          selenium_mcg: number | null
          serving_size_description: string | null
          serving_size_g: number | null
          servings_per_container: number | null
          sodium_mg: number | null
          source_document_id: string | null
          sugar_alcohol_g: number | null
          thiamin_mg: number | null
          total_carbohydrate_g: number | null
          total_fat_g: number | null
          total_sugars_g: number | null
          trans_fat_g: number | null
          updated_at: string
          usda_fdc_id: string | null
          verified_by: string | null
          vitamin_a_mcg: number | null
          vitamin_b12_mcg: number | null
          vitamin_b6_mg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          vitamin_e_mg: number | null
          zinc_mg: number | null
        }
        Insert: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calories?: number | null
          cholesterol_mg?: number | null
          created_at?: string
          data_source?: string | null
          dietary_fiber_g?: number | null
          extraction_confidence?: number | null
          folate_mcg_dfe?: number | null
          id?: string
          iron_mg?: number | null
          last_verified_at?: string | null
          magnesium_mg?: number | null
          material_id?: string | null
          monounsaturated_fat_g?: number | null
          niacin_mg?: number | null
          notes?: string | null
          phosphorus_mg?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          riboflavin_mg?: number | null
          saturated_fat_g?: number | null
          selenium_mcg?: number | null
          serving_size_description?: string | null
          serving_size_g?: number | null
          servings_per_container?: number | null
          sodium_mg?: number | null
          source_document_id?: string | null
          sugar_alcohol_g?: number | null
          thiamin_mg?: number | null
          total_carbohydrate_g?: number | null
          total_fat_g?: number | null
          total_sugars_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          usda_fdc_id?: string | null
          verified_by?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calories?: number | null
          cholesterol_mg?: number | null
          created_at?: string
          data_source?: string | null
          dietary_fiber_g?: number | null
          extraction_confidence?: number | null
          folate_mcg_dfe?: number | null
          id?: string
          iron_mg?: number | null
          last_verified_at?: string | null
          magnesium_mg?: number | null
          material_id?: string | null
          monounsaturated_fat_g?: number | null
          niacin_mg?: number | null
          notes?: string | null
          phosphorus_mg?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          protein_g?: number | null
          riboflavin_mg?: number | null
          saturated_fat_g?: number | null
          selenium_mcg?: number | null
          serving_size_description?: string | null
          serving_size_g?: number | null
          servings_per_container?: number | null
          sodium_mg?: number | null
          source_document_id?: string | null
          sugar_alcohol_g?: number | null
          thiamin_mg?: number | null
          total_carbohydrate_g?: number | null
          total_fat_g?: number | null
          total_sugars_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          usda_fdc_id?: string | null
          verified_by?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          zinc_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_nutrition_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: true
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_nutrition_verified_by_fkey"
            columns: ["verified_by"]
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
          max_stock_level: number | null
          par_level: number | null
          photo_added_at: string | null
          photo_path: string | null
          photo_url: string | null
          reorder_point: number | null
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
          max_stock_level?: number | null
          par_level?: number | null
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          reorder_point?: number | null
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
          max_stock_level?: number | null
          par_level?: number | null
          photo_added_at?: string | null
          photo_path?: string | null
          photo_url?: string | null
          reorder_point?: number | null
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
          active_override_id: string | null
          allergens: string[] | null
          approval_status: string | null
          authentication_method: string[] | null
          base_unit_id: string
          box_allergen_free_adhesives: boolean | null
          box_dimensions_internal: string | null
          box_flute_type: string | null
          box_foreign_material_control: boolean | null
          box_heavy_metals_coneg: boolean | null
          box_height_in: number | null
          box_joint_style: string | null
          box_length_in: number | null
          box_recycled_content_verified: boolean | null
          box_strength_type: string | null
          box_strength_value: string | null
          box_style_code: string | null
          box_weight_kg: number | null
          box_width_in: number | null
          ca_prop65_prohibited: boolean | null
          category: string | null
          coa_critical_limits: Json | null
          coa_required: boolean | null
          coa_spec_template: Json | null
          code: string
          conditional_approval_at: string | null
          conditional_approval_by: string | null
          conditional_approval_expires_at: string | null
          conditional_approval_reason: string | null
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
          lead_time_days: number | null
          listed_material_id: string | null
          manufacturer: string | null
          material_status: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          open_shelf_life_days: number | null
          other_hazards: string | null
          par_level: number | null
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
          reorder_point: number | null
          requires_coa: boolean | null
          storage_temperature_max: number | null
          storage_temperature_min: number | null
          sub_category: string | null
          supply_chain_complexity: string | null
          updated_at: string
          usage_unit_conversion: number | null
          usage_unit_id: string | null
        }
        Insert: {
          active_override_id?: string | null
          allergens?: string[] | null
          approval_status?: string | null
          authentication_method?: string[] | null
          base_unit_id: string
          box_allergen_free_adhesives?: boolean | null
          box_dimensions_internal?: string | null
          box_flute_type?: string | null
          box_foreign_material_control?: boolean | null
          box_heavy_metals_coneg?: boolean | null
          box_height_in?: number | null
          box_joint_style?: string | null
          box_length_in?: number | null
          box_recycled_content_verified?: boolean | null
          box_strength_type?: string | null
          box_strength_value?: string | null
          box_style_code?: string | null
          box_weight_kg?: number | null
          box_width_in?: number | null
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_critical_limits?: Json | null
          coa_required?: boolean | null
          coa_spec_template?: Json | null
          code: string
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          conditional_approval_reason?: string | null
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
          lead_time_days?: number | null
          listed_material_id?: string | null
          manufacturer?: string | null
          material_status?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          open_shelf_life_days?: number | null
          other_hazards?: string | null
          par_level?: number | null
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
          reorder_point?: number | null
          requires_coa?: boolean | null
          storage_temperature_max?: number | null
          storage_temperature_min?: number | null
          sub_category?: string | null
          supply_chain_complexity?: string | null
          updated_at?: string
          usage_unit_conversion?: number | null
          usage_unit_id?: string | null
        }
        Update: {
          active_override_id?: string | null
          allergens?: string[] | null
          approval_status?: string | null
          authentication_method?: string[] | null
          base_unit_id?: string
          box_allergen_free_adhesives?: boolean | null
          box_dimensions_internal?: string | null
          box_flute_type?: string | null
          box_foreign_material_control?: boolean | null
          box_heavy_metals_coneg?: boolean | null
          box_height_in?: number | null
          box_joint_style?: string | null
          box_length_in?: number | null
          box_recycled_content_verified?: boolean | null
          box_strength_type?: string | null
          box_strength_value?: string | null
          box_style_code?: string | null
          box_weight_kg?: number | null
          box_width_in?: number | null
          ca_prop65_prohibited?: boolean | null
          category?: string | null
          coa_critical_limits?: Json | null
          coa_required?: boolean | null
          coa_spec_template?: Json | null
          code?: string
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          conditional_approval_reason?: string | null
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
          lead_time_days?: number | null
          listed_material_id?: string | null
          manufacturer?: string | null
          material_status?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          open_shelf_life_days?: number | null
          other_hazards?: string | null
          par_level?: number | null
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
          reorder_point?: number | null
          requires_coa?: boolean | null
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
            foreignKeyName: "materials_active_override_id_fkey"
            columns: ["active_override_id"]
            isOneToOne: false
            referencedRelation: "qa_override_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_conditional_approval_by_fkey"
            columns: ["conditional_approval_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      mock_recall_drills: {
        Row: {
          affected_lot_number: string | null
          affected_material_id: string | null
          affected_product_id: string | null
          corrective_actions: string | null
          created_at: string | null
          created_by: string | null
          customers_identified_count: number | null
          documentation_path: string | null
          drill_date: string
          drill_end_time: string | null
          drill_number: string
          drill_start_time: string | null
          drill_type: string
          findings: string | null
          id: string
          lead_by: string | null
          lots_traced_count: number | null
          participants: Json | null
          pass_fail: string | null
          product_recovered_percentage: number | null
          scenario_description: string
          signed_off_at: string | null
          signed_off_by: string | null
          simulated_recall_class: string | null
          status: string | null
          time_to_identify_customers_minutes: number | null
          time_to_identify_lots_minutes: number | null
          time_to_notify_contacts_minutes: number | null
          total_drill_time_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          affected_lot_number?: string | null
          affected_material_id?: string | null
          affected_product_id?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          customers_identified_count?: number | null
          documentation_path?: string | null
          drill_date: string
          drill_end_time?: string | null
          drill_number: string
          drill_start_time?: string | null
          drill_type: string
          findings?: string | null
          id?: string
          lead_by?: string | null
          lots_traced_count?: number | null
          participants?: Json | null
          pass_fail?: string | null
          product_recovered_percentage?: number | null
          scenario_description: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          simulated_recall_class?: string | null
          status?: string | null
          time_to_identify_customers_minutes?: number | null
          time_to_identify_lots_minutes?: number | null
          time_to_notify_contacts_minutes?: number | null
          total_drill_time_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          affected_lot_number?: string | null
          affected_material_id?: string | null
          affected_product_id?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          created_by?: string | null
          customers_identified_count?: number | null
          documentation_path?: string | null
          drill_date?: string
          drill_end_time?: string | null
          drill_number?: string
          drill_start_time?: string | null
          drill_type?: string
          findings?: string | null
          id?: string
          lead_by?: string | null
          lots_traced_count?: number | null
          participants?: Json | null
          pass_fail?: string | null
          product_recovered_percentage?: number | null
          scenario_description?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          simulated_recall_class?: string | null
          status?: string | null
          time_to_identify_customers_minutes?: number | null
          time_to_identify_lots_minutes?: number | null
          time_to_notify_contacts_minutes?: number | null
          total_drill_time_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_recall_drills_affected_material_id_fkey"
            columns: ["affected_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_recall_drills_affected_product_id_fkey"
            columns: ["affected_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_recall_drills_affected_product_id_fkey"
            columns: ["affected_product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mock_recall_drills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_recall_drills_lead_by_fkey"
            columns: ["lead_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_recall_drills_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_activity_log: {
        Row: {
          action: string
          comment: string | null
          field_changed: string | null
          id: string
          nc_id: string
          new_value: string | null
          old_value: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          comment?: string | null
          field_changed?: string | null
          id?: string
          nc_id: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          comment?: string | null
          field_changed?: string | null
          id?: string
          nc_id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nc_activity_log_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_attachments: {
        Row: {
          attachment_type: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          nc_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          nc_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          nc_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nc_attachments_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_cost_breakdown: {
        Row: {
          amount: number
          cost_category_id: string | null
          description: string | null
          id: string
          nc_id: string
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          cost_category_id?: string | null
          description?: string | null
          id?: string
          nc_id: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          cost_category_id?: string | null
          description?: string | null
          id?: string
          nc_id?: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nc_cost_breakdown_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "nc_cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_cost_breakdown_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_cost_breakdown_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_cost_categories: {
        Row: {
          category_name: string
          cost_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
        }
        Insert: {
          category_name: string
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      nc_disposition_actions: {
        Row: {
          action_type: string
          cost: number | null
          executed_at: string
          executed_by: string | null
          hold_log_id: string | null
          id: string
          inventory_adjustment_id: string | null
          nc_id: string
          notes: string | null
          quantity_affected: number | null
          unit: string | null
        }
        Insert: {
          action_type: string
          cost?: number | null
          executed_at?: string
          executed_by?: string | null
          hold_log_id?: string | null
          id?: string
          inventory_adjustment_id?: string | null
          nc_id: string
          notes?: string | null
          quantity_affected?: number | null
          unit?: string | null
        }
        Update: {
          action_type?: string
          cost?: number | null
          executed_at?: string
          executed_by?: string | null
          hold_log_id?: string | null
          id?: string
          inventory_adjustment_id?: string | null
          nc_id?: string
          notes?: string | null
          quantity_affected?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nc_disposition_actions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_disposition_actions_hold_log_id_fkey"
            columns: ["hold_log_id"]
            isOneToOne: false
            referencedRelation: "receiving_hold_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nc_disposition_actions_nc_id_fkey"
            columns: ["nc_id"]
            isOneToOne: false
            referencedRelation: "non_conformities"
            referencedColumns: ["id"]
          },
        ]
      }
      nc_disposition_rules: {
        Row: {
          approval_threshold_amount: number | null
          approver_role: string | null
          auto_create_hold_log: boolean | null
          auto_create_inventory_adjustment: boolean | null
          created_at: string
          disposition: string
          id: string
          requires_approval: boolean | null
          requires_justification: boolean | null
          severity: string
          updated_at: string
        }
        Insert: {
          approval_threshold_amount?: number | null
          approver_role?: string | null
          auto_create_hold_log?: boolean | null
          auto_create_inventory_adjustment?: boolean | null
          created_at?: string
          disposition: string
          id?: string
          requires_approval?: boolean | null
          requires_justification?: boolean | null
          severity: string
          updated_at?: string
        }
        Update: {
          approval_threshold_amount?: number | null
          approver_role?: string | null
          auto_create_hold_log?: boolean | null
          auto_create_inventory_adjustment?: boolean | null
          created_at?: string
          disposition?: string
          id?: string
          requires_approval?: boolean | null
          requires_justification?: boolean | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      non_conformities: {
        Row: {
          actual_cost: number | null
          capa_id: string | null
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          corrective_action_implemented: boolean | null
          created_at: string
          customer_notified_at: string | null
          description: string
          discovered_by: string | null
          discovered_date: string
          discovery_location_id: string | null
          disposition: string
          disposition_approved_at: string | null
          disposition_approved_by: string | null
          disposition_justification: string | null
          entity_id: string | null
          entity_type: string | null
          equipment_id: string | null
          estimated_cost: number | null
          id: string
          impact_level: string
          material_id: string | null
          nc_number: string
          nc_type: string
          preventive_action_implemented: boolean | null
          product_id: string | null
          production_lot_id: string | null
          quantity_affected: number | null
          quantity_affected_unit: string | null
          receiving_lot_id: string | null
          requires_capa: boolean | null
          requires_customer_notification: boolean | null
          root_cause_identified: boolean | null
          severity: string
          shift: string | null
          specification_reference: string | null
          status: string
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          capa_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          corrective_action_implemented?: boolean | null
          created_at?: string
          customer_notified_at?: string | null
          description: string
          discovered_by?: string | null
          discovered_date?: string
          discovery_location_id?: string | null
          disposition?: string
          disposition_approved_at?: string | null
          disposition_approved_by?: string | null
          disposition_justification?: string | null
          entity_id?: string | null
          entity_type?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          impact_level: string
          material_id?: string | null
          nc_number: string
          nc_type: string
          preventive_action_implemented?: boolean | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_affected?: number | null
          quantity_affected_unit?: string | null
          receiving_lot_id?: string | null
          requires_capa?: boolean | null
          requires_customer_notification?: boolean | null
          root_cause_identified?: boolean | null
          severity: string
          shift?: string | null
          specification_reference?: string | null
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          capa_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          corrective_action_implemented?: boolean | null
          created_at?: string
          customer_notified_at?: string | null
          description?: string
          discovered_by?: string | null
          discovered_date?: string
          discovery_location_id?: string | null
          disposition?: string
          disposition_approved_at?: string | null
          disposition_approved_by?: string | null
          disposition_justification?: string | null
          entity_id?: string | null
          entity_type?: string | null
          equipment_id?: string | null
          estimated_cost?: number | null
          id?: string
          impact_level?: string
          material_id?: string | null
          nc_number?: string
          nc_type?: string
          preventive_action_implemented?: boolean | null
          product_id?: string | null
          production_lot_id?: string | null
          quantity_affected?: number | null
          quantity_affected_unit?: string | null
          receiving_lot_id?: string | null
          requires_capa?: boolean | null
          requires_customer_notification?: boolean | null
          root_cause_identified?: boolean | null
          severity?: string
          shift?: string | null
          specification_reference?: string | null
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_discovered_by_fkey"
            columns: ["discovered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_discovery_location_id_fkey"
            columns: ["discovery_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_disposition_approved_by_fkey"
            columns: ["disposition_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "non_conformities_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "non_conformities_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean | null
          id: string
          in_app: boolean | null
          notification_type: string
          push: boolean | null
          quiet_end: string | null
          quiet_start: string | null
          user_id: string
        }
        Insert: {
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type: string
          push?: boolean | null
          quiet_end?: string | null
          quiet_start?: string | null
          user_id: string
        }
        Update: {
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type?: string
          push?: boolean | null
          quiet_end?: string | null
          quiet_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          delivered_via: string[] | null
          email_sent_at: string | null
          id: string
          is_read: boolean | null
          link_id: string | null
          link_type: string | null
          link_url: string | null
          message: string | null
          notification_type: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_via?: string[] | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          link_id?: string | null
          link_type?: string | null
          link_url?: string | null
          message?: string | null
          notification_type?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_via?: string[] | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          link_id?: string | null
          link_type?: string | null
          link_url?: string | null
          message?: string | null
          notification_type?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_daily_values: {
        Row: {
          created_at: string
          daily_value: number
          display_order: number | null
          id: string
          is_mandatory: boolean | null
          nutrient_code: string
          nutrient_name: string
          unit: string
        }
        Insert: {
          created_at?: string
          daily_value: number
          display_order?: number | null
          id?: string
          is_mandatory?: boolean | null
          nutrient_code: string
          nutrient_name: string
          unit: string
        }
        Update: {
          created_at?: string
          daily_value?: number
          display_order?: number | null
          id?: string
          is_mandatory?: boolean | null
          nutrient_code?: string
          nutrient_name?: string
          unit?: string
        }
        Relationships: []
      }
      nutrition_label_formats: {
        Row: {
          created_at: string
          description: string | null
          font_config: Json | null
          format_type: string | null
          height_inches: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          min_area_sq_inches: number | null
          name: string
          width_inches: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          font_config?: Json | null
          format_type?: string | null
          height_inches?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_area_sq_inches?: number | null
          name: string
          width_inches?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          font_config?: Json | null
          format_type?: string | null
          height_inches?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_area_sq_inches?: number | null
          name?: string
          width_inches?: number | null
        }
        Relationships: []
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
      packaging_indicator_mappings: {
        Row: {
          case_pack_size: number
          created_at: string
          description: string | null
          id: string
          indicator_digit: string
          updated_at: string
        }
        Insert: {
          case_pack_size: number
          created_at?: string
          description?: string | null
          id?: string
          indicator_digit: string
          updated_at?: string
        }
        Update: {
          case_pack_size?: number
          created_at?: string
          description?: string | null
          id?: string
          indicator_digit?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "pallet_cases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
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
          current_cases: number | null
          customer_id: string | null
          id: string
          location_id: string | null
          notes: string | null
          pallet_number: string
          purpose: string | null
          status: string | null
          total_cases: number | null
          updated_at: string
        }
        Insert: {
          build_date?: string
          created_at?: string
          created_by?: string | null
          current_cases?: number | null
          customer_id?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          pallet_number: string
          purpose?: string | null
          status?: string | null
          total_cases?: number | null
          updated_at?: string
        }
        Update: {
          build_date?: string
          created_at?: string
          created_by?: string | null
          current_cases?: number | null
          customer_id?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          pallet_number?: string
          purpose?: string | null
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
            foreignKeyName: "pallets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      payment_receipt_applications: {
        Row: {
          applied_amount: number
          applied_at: string
          applied_by: string | null
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          applied_amount?: number
          applied_at?: string
          applied_by?: string | null
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          applied_amount?: number
          applied_at?: string
          applied_by?: string | null
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipt_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipt_applications_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "payment_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          ai_processed: boolean | null
          amount: number
          applied_amount: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          early_pay_discount: number | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          receipt_number: string
          reference_number: string | null
          remittance_file_url: string | null
          status: string | null
          unapplied_amount: number | null
          updated_at: string
        }
        Insert: {
          ai_processed?: boolean | null
          amount?: number
          applied_amount?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          early_pay_discount?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number: string
          reference_number?: string | null
          remittance_file_url?: string | null
          status?: string | null
          unapplied_amount?: number | null
          updated_at?: string
        }
        Update: {
          ai_processed?: boolean | null
          amount?: number
          applied_amount?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          early_pay_discount?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string
          reference_number?: string | null
          remittance_file_url?: string | null
          status?: string | null
          unapplied_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_purchase_orders: {
        Row: {
          created_at: string
          created_sales_order_id: string | null
          customer_confidence: number | null
          email_from: string | null
          email_message_id: string | null
          email_subject: string | null
          extraction_error: string | null
          extraction_status: string | null
          id: string
          matched_customer_id: string | null
          notes: string | null
          pdf_filename: string | null
          pdf_storage_path: string | null
          raw_extracted_data: Json | null
          received_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_sales_order_id?: string | null
          customer_confidence?: number | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          id?: string
          matched_customer_id?: string | null
          notes?: string | null
          pdf_filename?: string | null
          pdf_storage_path?: string | null
          raw_extracted_data?: Json | null
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_sales_order_id?: string | null
          customer_confidence?: number | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          extraction_error?: string | null
          extraction_status?: string | null
          id?: string
          matched_customer_id?: string | null
          notes?: string | null
          pdf_filename?: string | null
          pdf_storage_path?: string | null
          raw_extracted_data?: Json | null
          received_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_purchase_orders_created_sales_order_id_fkey"
            columns: ["created_sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_purchase_orders_matched_customer_id_fkey"
            columns: ["matched_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_purchase_orders_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "pick_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
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
          release_email_sent_at: string | null
          request_date: string
          request_number: string
          requested_by: string | null
          source_type: string | null
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
          release_email_sent_at?: string | null
          request_date?: string
          request_number: string
          requested_by?: string | null
          source_type?: string | null
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
          release_email_sent_at?: string | null
          request_date?: string
          request_number?: string
          requested_by?: string | null
          source_type?: string | null
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
          capa_id: string | null
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
          rejection_category: string | null
          rejection_reason: string | null
          supplier_lot_number: string | null
          temperature_in_range: boolean | null
          temperature_reading: number | null
          temperature_unit: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          capa_id?: string | null
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
          rejection_category?: string | null
          rejection_reason?: string | null
          supplier_lot_number?: string | null
          temperature_in_range?: boolean | null
          temperature_reading?: number | null
          temperature_unit?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          capa_id?: string | null
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
          rejection_category?: string | null
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
            foreignKeyName: "po_receiving_items_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
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
          putaway_status: string | null
          qa_inspection_id: string | null
          qa_inspection_status: string | null
          qa_verified_at: string | null
          qa_verified_by: string | null
          received_by: string | null
          received_date: string
          receiving_number: string
          seal_intact: boolean | null
          seal_number: string | null
          status: string
          submitted_to_qa_at: string | null
          submitted_to_qa_by: string | null
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
          putaway_status?: string | null
          qa_inspection_id?: string | null
          qa_inspection_status?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          received_by?: string | null
          received_date?: string
          receiving_number: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          submitted_to_qa_at?: string | null
          submitted_to_qa_by?: string | null
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
          putaway_status?: string | null
          qa_inspection_id?: string | null
          qa_inspection_status?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          received_by?: string | null
          received_date?: string
          receiving_number?: string
          seal_intact?: boolean | null
          seal_number?: string | null
          status?: string
          submitted_to_qa_at?: string | null
          submitted_to_qa_by?: string | null
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
            foreignKeyName: "po_receiving_sessions_qa_inspection_id_fkey"
            columns: ["qa_inspection_id"]
            isOneToOne: false
            referencedRelation: "qa_receiving_inspections"
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
          {
            foreignKeyName: "po_receiving_sessions_submitted_to_qa_by_fkey"
            columns: ["submitted_to_qa_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sheet_items: {
        Row: {
          created_at: string
          discount_percent: number | null
          id: string
          max_quantity: number | null
          min_quantity: number | null
          price_sheet_id: string
          product_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          price_sheet_id: string
          product_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          price_sheet_id?: string
          product_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_sheet_items_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
        ]
      }
      price_sheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          name: string
          price_tier: string
          rejection_reason: string | null
          status: string
          submitted_by: string | null
          submitted_for_approval_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_tier?: string
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_tier?: string
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          submitted_for_approval_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_type: string
          attribute_value: string
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string
        }
        Insert: {
          attribute_type: string
          attribute_value: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id: string
        }
        Update: {
          attribute_type?: string
          attribute_value?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          qa_parameters: Json | null
          sku_prefix: string | null
          sort_order: number | null
          spec_sheet_sections: Json | null
          updated_at: string | null
          wip_uom: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          qa_parameters?: Json | null
          sku_prefix?: string | null
          sort_order?: number | null
          spec_sheet_sections?: Json | null
          updated_at?: string | null
          wip_uom?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          qa_parameters?: Json | null
          sku_prefix?: string | null
          sort_order?: number | null
          spec_sheet_sections?: Json | null
          updated_at?: string | null
          wip_uom?: string | null
        }
        Relationships: []
      }
      product_nutrition: {
        Row: {
          added_sugars_g: number | null
          calcium_mg: number | null
          calculated_by: string | null
          calculation_date: string | null
          calories: number | null
          cholesterol_mg: number | null
          created_at: string
          dietary_fiber_g: number | null
          id: string
          iron_mg: number | null
          is_verified: boolean | null
          monounsaturated_fat_g: number | null
          overrun_percent: number | null
          polyunsaturated_fat_g: number | null
          potassium_mg: number | null
          product_id: string | null
          protein_g: number | null
          recipe_id: string | null
          saturated_fat_g: number | null
          serving_size_description: string | null
          serving_size_g: number | null
          servings_per_container: number | null
          sodium_mg: number | null
          total_carbohydrate_g: number | null
          total_fat_g: number | null
          total_sugars_g: number | null
          trans_fat_g: number | null
          updated_at: string
          vitamin_a_mcg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          yield_loss_percent: number | null
        }
        Insert: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calculated_by?: string | null
          calculation_date?: string | null
          calories?: number | null
          cholesterol_mg?: number | null
          created_at?: string
          dietary_fiber_g?: number | null
          id?: string
          iron_mg?: number | null
          is_verified?: boolean | null
          monounsaturated_fat_g?: number | null
          overrun_percent?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          product_id?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          saturated_fat_g?: number | null
          serving_size_description?: string | null
          serving_size_g?: number | null
          servings_per_container?: number | null
          sodium_mg?: number | null
          total_carbohydrate_g?: number | null
          total_fat_g?: number | null
          total_sugars_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          yield_loss_percent?: number | null
        }
        Update: {
          added_sugars_g?: number | null
          calcium_mg?: number | null
          calculated_by?: string | null
          calculation_date?: string | null
          calories?: number | null
          cholesterol_mg?: number | null
          created_at?: string
          dietary_fiber_g?: number | null
          id?: string
          iron_mg?: number | null
          is_verified?: boolean | null
          monounsaturated_fat_g?: number | null
          overrun_percent?: number | null
          polyunsaturated_fat_g?: number | null
          potassium_mg?: number | null
          product_id?: string | null
          protein_g?: number | null
          recipe_id?: string | null
          saturated_fat_g?: number | null
          serving_size_description?: string | null
          serving_size_g?: number | null
          servings_per_container?: number | null
          sodium_mg?: number | null
          total_carbohydrate_g?: number | null
          total_fat_g?: number | null
          total_sugars_g?: number | null
          trans_fat_g?: number | null
          updated_at?: string
          vitamin_a_mcg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          yield_loss_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_nutrition_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_nutrition_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_nutrition_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_nutrition_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_qa_requirements: {
        Row: {
          created_at: string | null
          frequency: string | null
          id: string
          is_critical: boolean | null
          max_value: number | null
          min_value: number | null
          parameter_name: string
          product_id: string
          required_at_stage: string | null
          sample_size: string | null
          sort_order: number | null
          target_value: string | null
          test_method: string | null
          test_template_id: string | null
          uom: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          parameter_name: string
          product_id: string
          required_at_stage?: string | null
          sample_size?: string | null
          sort_order?: number | null
          target_value?: string | null
          test_method?: string | null
          test_template_id?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          parameter_name?: string
          product_id?: string
          required_at_stage?: string | null
          sample_size?: string | null
          sort_order?: number | null
          target_value?: string | null
          test_method?: string | null
          test_template_id?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_qa_requirements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qa_requirements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_qa_requirements_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "quality_test_templates"
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
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          batch_size: number
          batch_unit_id: string | null
          batch_volume: number | null
          batch_volume_unit: string | null
          batch_weight_kg: number
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          is_default: boolean | null
          labor_cost_per_batch: number | null
          material_cost_per_batch: number | null
          overhead_cost_per_batch: number | null
          parent_recipe_id: string | null
          product_id: string
          recipe_code: string | null
          recipe_name: string
          recipe_type: string
          recipe_version: string | null
          standard_labor_hours: number | null
          standard_machine_hours: number | null
          sub_recipe_number: number | null
          total_cost_per_batch: number | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_size?: number
          batch_unit_id?: string | null
          batch_volume?: number | null
          batch_volume_unit?: string | null
          batch_weight_kg?: number
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          labor_cost_per_batch?: number | null
          material_cost_per_batch?: number | null
          overhead_cost_per_batch?: number | null
          parent_recipe_id?: string | null
          product_id: string
          recipe_code?: string | null
          recipe_name: string
          recipe_type?: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          sub_recipe_number?: number | null
          total_cost_per_batch?: number | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_size?: number
          batch_unit_id?: string | null
          batch_volume?: number | null
          batch_volume_unit?: string | null
          batch_weight_kg?: number
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          labor_cost_per_batch?: number | null
          material_cost_per_batch?: number | null
          overhead_cost_per_batch?: number | null
          parent_recipe_id?: string | null
          product_id?: string
          recipe_code?: string | null
          recipe_name?: string
          recipe_type?: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          sub_recipe_number?: number | null
          total_cost_per_batch?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "product_recipes_parent_recipe_id_fkey"
            columns: ["parent_recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_size_par_levels: {
        Row: {
          created_at: string
          id: string
          inventory_type: string
          location_id: string
          max_stock: number | null
          par_level: number
          product_size_id: string
          reorder_point: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_type: string
          location_id: string
          max_stock?: number | null
          par_level?: number
          product_size_id: string
          reorder_point?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_type?: string
          location_id?: string
          max_stock?: number | null
          par_level?: number
          product_size_id?: string
          reorder_point?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_par_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_par_levels_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          box_material_id: string | null
          case_cube_m3: number | null
          case_upc_code: string | null
          case_weight_kg: number | null
          container_size_id: string | null
          created_at: string | null
          custom_pallet_length_in: number | null
          custom_pallet_width_in: number | null
          direct_price: number | null
          distributor_price: number | null
          hi_count: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_weight_kg: number | null
          min_weight_kg: number | null
          packaging_indicator: string | null
          packaging_material_id: string | null
          pallet_type: string | null
          parent_size_id: string | null
          product_id: string
          size_name: string
          size_type: string | null
          size_unit_id: string | null
          size_value: number
          sku: string | null
          sort_order: number | null
          target_weight_kg: number | null
          ti_count: number | null
          units_per_case: number | null
          upc_code: string | null
          updated_at: string | null
        }
        Insert: {
          box_material_id?: string | null
          case_cube_m3?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          container_size_id?: string | null
          created_at?: string | null
          custom_pallet_length_in?: number | null
          custom_pallet_width_in?: number | null
          direct_price?: number | null
          distributor_price?: number | null
          hi_count?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_weight_kg?: number | null
          min_weight_kg?: number | null
          packaging_indicator?: string | null
          packaging_material_id?: string | null
          pallet_type?: string | null
          parent_size_id?: string | null
          product_id: string
          size_name: string
          size_type?: string | null
          size_unit_id?: string | null
          size_value: number
          sku?: string | null
          sort_order?: number | null
          target_weight_kg?: number | null
          ti_count?: number | null
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string | null
        }
        Update: {
          box_material_id?: string | null
          case_cube_m3?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          container_size_id?: string | null
          created_at?: string | null
          custom_pallet_length_in?: number | null
          custom_pallet_width_in?: number | null
          direct_price?: number | null
          distributor_price?: number | null
          hi_count?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_weight_kg?: number | null
          min_weight_kg?: number | null
          packaging_indicator?: string | null
          packaging_material_id?: string | null
          pallet_type?: string | null
          parent_size_id?: string | null
          product_id?: string
          size_name?: string
          size_type?: string | null
          size_unit_id?: string | null
          size_value?: number
          sku?: string | null
          sort_order?: number | null
          target_weight_kg?: number | null
          ti_count?: number | null
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_box_material_id_fkey"
            columns: ["box_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_container_size_id_fkey"
            columns: ["container_size_id"]
            isOneToOne: false
            referencedRelation: "container_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_packaging_material_id_fkey"
            columns: ["packaging_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_parent_size_id_fkey"
            columns: ["parent_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_sizes_size_unit_id_fkey"
            columns: ["size_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      production_issue_request_items: {
        Row: {
          created_at: string | null
          disassemble_quantity: number | null
          disassemble_required: boolean | null
          fulfilled_at: string | null
          id: string
          issue_request_id: string
          material_id: string
          notes: string | null
          purchase_unit_id: string | null
          quantity_fulfilled: number | null
          quantity_purchase_uom: number | null
          quantity_requested: number
          remaining_after_use: number | null
          selected_lots: Json | null
          sort_order: number | null
          status: string | null
          usage_unit_id: string
        }
        Insert: {
          created_at?: string | null
          disassemble_quantity?: number | null
          disassemble_required?: boolean | null
          fulfilled_at?: string | null
          id?: string
          issue_request_id: string
          material_id: string
          notes?: string | null
          purchase_unit_id?: string | null
          quantity_fulfilled?: number | null
          quantity_purchase_uom?: number | null
          quantity_requested: number
          remaining_after_use?: number | null
          selected_lots?: Json | null
          sort_order?: number | null
          status?: string | null
          usage_unit_id: string
        }
        Update: {
          created_at?: string | null
          disassemble_quantity?: number | null
          disassemble_required?: boolean | null
          fulfilled_at?: string | null
          id?: string
          issue_request_id?: string
          material_id?: string
          notes?: string | null
          purchase_unit_id?: string | null
          quantity_fulfilled?: number | null
          quantity_purchase_uom?: number | null
          quantity_requested?: number
          remaining_after_use?: number | null
          selected_lots?: Json | null
          sort_order?: number | null
          status?: string | null
          usage_unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_issue_request_items_issue_request_id_fkey"
            columns: ["issue_request_id"]
            isOneToOne: false
            referencedRelation: "production_issue_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_request_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_request_items_purchase_unit_id_fkey"
            columns: ["purchase_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_request_items_usage_unit_id_fkey"
            columns: ["usage_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      production_issue_requests: {
        Row: {
          created_at: string | null
          delivery_location_id: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          needed_by: string
          notes: string | null
          priority: string | null
          production_batch_id: string | null
          request_number: string
          requested_at: string | null
          requested_by: string | null
          status: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_location_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          needed_by: string
          notes?: string | null
          priority?: string | null
          production_batch_id?: string | null
          request_number: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_location_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          needed_by?: string
          notes?: string | null
          priority?: string | null
          production_batch_id?: string | null
          request_number?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_issue_requests_delivery_location_id_fkey"
            columns: ["delivery_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_requests_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_requests_production_batch_id_fkey"
            columns: ["production_batch_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_issue_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_line_capacity_rules: {
        Row: {
          capacity_per_hour: number | null
          capacity_uom: string | null
          created_at: string | null
          created_by: string | null
          id: string
          material_id: string | null
          notes: string | null
          package_type: string | null
          production_line_id: string | null
          setup_time_minutes: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          capacity_per_hour?: number | null
          capacity_uom?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          package_type?: string | null
          production_line_id?: string | null
          setup_time_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          capacity_per_hour?: number | null
          capacity_uom?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          package_type?: string | null
          production_line_id?: string | null
          setup_time_minutes?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_line_capacity_rules_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_line_capacity_rules_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lines: {
        Row: {
          average_runtime_hours: number | null
          capacity_basis: string | null
          capacity_uom: string | null
          capacity_value: number | null
          changeover_time_minutes: number | null
          cleaning_time_minutes: number | null
          created_at: string | null
          created_by: string | null
          dedicated_allergen: string | null
          id: string
          is_active: boolean | null
          is_allergen_dedicated: boolean | null
          line_code: string
          line_name: string
          line_type: string
          notes: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          average_runtime_hours?: number | null
          capacity_basis?: string | null
          capacity_uom?: string | null
          capacity_value?: number | null
          changeover_time_minutes?: number | null
          cleaning_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          dedicated_allergen?: string | null
          id?: string
          is_active?: boolean | null
          is_allergen_dedicated?: boolean | null
          line_code: string
          line_name: string
          line_type: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          average_runtime_hours?: number | null
          capacity_basis?: string | null
          capacity_uom?: string | null
          capacity_value?: number | null
          changeover_time_minutes?: number | null
          cleaning_time_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          dedicated_allergen?: string | null
          id?: string
          is_active?: boolean | null
          is_allergen_dedicated?: boolean | null
          line_code?: string
          line_name?: string
          line_type?: string
          notes?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
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
      production_lot_qa_tests: {
        Row: {
          capa_id: string | null
          capa_required: boolean | null
          corrective_action: string | null
          created_at: string | null
          document_urls: string[] | null
          failure_category: string | null
          failure_notes: string | null
          id: string
          max_value: number | null
          min_value: number | null
          notes: string | null
          out_of_spec: boolean | null
          parameter_type: string
          passed: boolean | null
          photo_urls: string[] | null
          production_lot_id: string
          target_value: string | null
          test_name: string
          test_template_id: string | null
          test_value_numeric: number | null
          test_value_text: string | null
          tested_at: string
          tested_by: string | null
          uom: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          capa_id?: string | null
          capa_required?: boolean | null
          corrective_action?: string | null
          created_at?: string | null
          document_urls?: string[] | null
          failure_category?: string | null
          failure_notes?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          notes?: string | null
          out_of_spec?: boolean | null
          parameter_type: string
          passed?: boolean | null
          photo_urls?: string[] | null
          production_lot_id: string
          target_value?: string | null
          test_name: string
          test_template_id?: string | null
          test_value_numeric?: number | null
          test_value_text?: string | null
          tested_at?: string
          tested_by?: string | null
          uom?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          capa_id?: string | null
          capa_required?: boolean | null
          corrective_action?: string | null
          created_at?: string | null
          document_urls?: string[] | null
          failure_category?: string | null
          failure_notes?: string | null
          id?: string
          max_value?: number | null
          min_value?: number | null
          notes?: string | null
          out_of_spec?: boolean | null
          parameter_type?: string
          passed?: boolean | null
          photo_urls?: string[] | null
          production_lot_id?: string
          target_value?: string | null
          test_name?: string
          test_template_id?: string | null
          test_value_numeric?: number | null
          test_value_text?: string | null
          tested_at?: string
          tested_by?: string | null
          uom?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_lot_qa_tests_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lot_qa_tests_production_lot_id_fkey"
            columns: ["production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lot_qa_tests_test_template_id_fkey"
            columns: ["test_template_id"]
            isOneToOne: false
            referencedRelation: "quality_test_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lot_qa_tests_tested_by_fkey"
            columns: ["tested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lot_qa_tests_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_lots: {
        Row: {
          approval_status: string | null
          batch_number: number
          capa_id: string | null
          cases_produced: number | null
          cost_category: string | null
          created_at: string
          expiry_date: string | null
          failure_category: string | null
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
          parent_production_lot_id: string | null
          produced_by: string | null
          product_id: string
          product_size_id: string | null
          production_date: string
          production_stage: string | null
          qa_hold_reason: string | null
          qa_rejection_reason: string | null
          qa_verified_at: string | null
          qa_verified_by: string | null
          quantity_available: number
          quantity_consumed_from_parent: number | null
          quantity_produced: number
          quantity_volume: number | null
          recipe_id: string | null
          stage_released_at: string | null
          stage_released_by: string | null
          status: string | null
          synced_at: string | null
          total_cost: number | null
          trial_canvas_url: string | null
          trial_notes: Json | null
          updated_at: string
          volume_uom: string | null
          work_order_id: string | null
          xero_journal_id: string | null
        }
        Insert: {
          approval_status?: string | null
          batch_number: number
          capa_id?: string | null
          cases_produced?: number | null
          cost_category?: string | null
          created_at?: string
          expiry_date?: string | null
          failure_category?: string | null
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
          parent_production_lot_id?: string | null
          produced_by?: string | null
          product_id: string
          product_size_id?: string | null
          production_date?: string
          production_stage?: string | null
          qa_hold_reason?: string | null
          qa_rejection_reason?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          quantity_available: number
          quantity_consumed_from_parent?: number | null
          quantity_produced: number
          quantity_volume?: number | null
          recipe_id?: string | null
          stage_released_at?: string | null
          stage_released_by?: string | null
          status?: string | null
          synced_at?: string | null
          total_cost?: number | null
          trial_canvas_url?: string | null
          trial_notes?: Json | null
          updated_at?: string
          volume_uom?: string | null
          work_order_id?: string | null
          xero_journal_id?: string | null
        }
        Update: {
          approval_status?: string | null
          batch_number?: number
          capa_id?: string | null
          cases_produced?: number | null
          cost_category?: string | null
          created_at?: string
          expiry_date?: string | null
          failure_category?: string | null
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
          parent_production_lot_id?: string | null
          produced_by?: string | null
          product_id?: string
          product_size_id?: string | null
          production_date?: string
          production_stage?: string | null
          qa_hold_reason?: string | null
          qa_rejection_reason?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          quantity_available?: number
          quantity_consumed_from_parent?: number | null
          quantity_produced?: number
          quantity_volume?: number | null
          recipe_id?: string | null
          stage_released_at?: string | null
          stage_released_by?: string | null
          status?: string | null
          synced_at?: string | null
          total_cost?: number | null
          trial_canvas_url?: string | null
          trial_notes?: Json | null
          updated_at?: string
          volume_uom?: string | null
          work_order_id?: string | null
          xero_journal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_lots_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_lots_parent_production_lot_id_fkey"
            columns: ["parent_production_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
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
            foreignKeyName: "production_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_lots_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
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
          {
            foreignKeyName: "production_lots_stage_released_by_fkey"
            columns: ["stage_released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_schedule: {
        Row: {
          actual_quantity: number | null
          allergen_sequence_score: number | null
          allergens: string[] | null
          capacity_utilization_pct: number | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          estimated_cost_per_unit: number | null
          estimated_duration_hours: number | null
          estimated_labor_cost: number | null
          estimated_material_cost: number | null
          estimated_overhead_cost: number | null
          estimated_total_cost: number | null
          exceeds_line_capacity: boolean | null
          excess_labor: boolean | null
          id: string
          insufficient_labor: boolean | null
          labor_efficiency_target: number | null
          notes: string | null
          package_type: string | null
          planned_quantity: number
          planned_uom: string
          planned_volume: number | null
          planned_volume_uom: string | null
          priority: string | null
          product_id: string | null
          production_line_id: string
          recipe_id: string | null
          required_employees: number | null
          required_labor_hours: number | null
          schedule_date: string
          schedule_status: string | null
          sort_order: number | null
          special_instructions: string | null
          start_time: string | null
          updated_at: string | null
          updated_by: string | null
          visual_column: number | null
          work_order_id: string | null
        }
        Insert: {
          actual_quantity?: number | null
          allergen_sequence_score?: number | null
          allergens?: string[] | null
          capacity_utilization_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          estimated_cost_per_unit?: number | null
          estimated_duration_hours?: number | null
          estimated_labor_cost?: number | null
          estimated_material_cost?: number | null
          estimated_overhead_cost?: number | null
          estimated_total_cost?: number | null
          exceeds_line_capacity?: boolean | null
          excess_labor?: boolean | null
          id?: string
          insufficient_labor?: boolean | null
          labor_efficiency_target?: number | null
          notes?: string | null
          package_type?: string | null
          planned_quantity: number
          planned_uom?: string
          planned_volume?: number | null
          planned_volume_uom?: string | null
          priority?: string | null
          product_id?: string | null
          production_line_id: string
          recipe_id?: string | null
          required_employees?: number | null
          required_labor_hours?: number | null
          schedule_date: string
          schedule_status?: string | null
          sort_order?: number | null
          special_instructions?: string | null
          start_time?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visual_column?: number | null
          work_order_id?: string | null
        }
        Update: {
          actual_quantity?: number | null
          allergen_sequence_score?: number | null
          allergens?: string[] | null
          capacity_utilization_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          estimated_cost_per_unit?: number | null
          estimated_duration_hours?: number | null
          estimated_labor_cost?: number | null
          estimated_material_cost?: number | null
          estimated_overhead_cost?: number | null
          estimated_total_cost?: number | null
          exceeds_line_capacity?: boolean | null
          excess_labor?: boolean | null
          id?: string
          insufficient_labor?: boolean | null
          labor_efficiency_target?: number | null
          notes?: string | null
          package_type?: string | null
          planned_quantity?: number
          planned_uom?: string
          planned_volume?: number | null
          planned_volume_uom?: string | null
          priority?: string | null
          product_id?: string | null
          production_line_id?: string
          recipe_id?: string | null
          required_employees?: number | null
          required_labor_hours?: number | null
          schedule_date?: string
          schedule_status?: string | null
          sort_order?: number | null
          special_instructions?: string | null
          start_time?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visual_column?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_schedule_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_schedule_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "production_schedule_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_schedule_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_schedule_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages_master: {
        Row: {
          captures_labor_cost: boolean | null
          captures_material_cost: boolean | null
          captures_overhead: boolean | null
          created_at: string | null
          created_by: string | null
          creates_intermediate_lot: boolean | null
          default_line_id: string | null
          default_output_uom: string | null
          description: string | null
          id: string
          is_active: boolean | null
          requires_qc_approval: boolean | null
          sequence_order: number
          stage_code: string
          stage_name: string
          stage_type: string | null
          standard_labor_hours_per_unit: number | null
          updated_at: string | null
        }
        Insert: {
          captures_labor_cost?: boolean | null
          captures_material_cost?: boolean | null
          captures_overhead?: boolean | null
          created_at?: string | null
          created_by?: string | null
          creates_intermediate_lot?: boolean | null
          default_line_id?: string | null
          default_output_uom?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_qc_approval?: boolean | null
          sequence_order: number
          stage_code: string
          stage_name: string
          stage_type?: string | null
          standard_labor_hours_per_unit?: number | null
          updated_at?: string | null
        }
        Update: {
          captures_labor_cost?: boolean | null
          captures_material_cost?: boolean | null
          captures_overhead?: boolean | null
          created_at?: string | null
          created_by?: string | null
          creates_intermediate_lot?: boolean | null
          default_line_id?: string | null
          default_output_uom?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_qc_approval?: boolean | null
          sequence_order?: number
          stage_code?: string
          stage_name?: string
          stage_type?: string | null
          standard_labor_hours_per_unit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_master_default_line_id_fkey"
            columns: ["default_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_override_id: string | null
          approval_status: string | null
          base_product_id: string | null
          case_pack_quantity: number | null
          case_upc_code: string | null
          case_weight_kg: number | null
          category: string | null
          conditional_approval_at: string | null
          conditional_approval_by: string | null
          conditional_approval_expires_at: string | null
          created_at: string
          description: string | null
          family_head_id: string | null
          handling_instructions: string | null
          id: string
          is_active: boolean | null
          is_base_product: boolean | null
          is_family_head: boolean | null
          name: string
          nutritional_data: Json | null
          product_category_id: string | null
          qa_verified_at: string | null
          qa_verified_by: string | null
          requires_base_stage: boolean | null
          requires_upc: boolean
          shelf_life_days: number | null
          sku: string
          standard_labor_rate: number | null
          standard_overhead_rate: number | null
          storage_requirements: string | null
          unit_id: string
          units_per_case: number | null
          upc_code: string | null
          updated_at: string
        }
        Insert: {
          active_override_id?: string | null
          approval_status?: string | null
          base_product_id?: string | null
          case_pack_quantity?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          category?: string | null
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          created_at?: string
          description?: string | null
          family_head_id?: string | null
          handling_instructions?: string | null
          id?: string
          is_active?: boolean | null
          is_base_product?: boolean | null
          is_family_head?: boolean | null
          name: string
          nutritional_data?: Json | null
          product_category_id?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          requires_base_stage?: boolean | null
          requires_upc?: boolean
          shelf_life_days?: number | null
          sku: string
          standard_labor_rate?: number | null
          standard_overhead_rate?: number | null
          storage_requirements?: string | null
          unit_id: string
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string
        }
        Update: {
          active_override_id?: string | null
          approval_status?: string | null
          base_product_id?: string | null
          case_pack_quantity?: number | null
          case_upc_code?: string | null
          case_weight_kg?: number | null
          category?: string | null
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          created_at?: string
          description?: string | null
          family_head_id?: string | null
          handling_instructions?: string | null
          id?: string
          is_active?: boolean | null
          is_base_product?: boolean | null
          is_family_head?: boolean | null
          name?: string
          nutritional_data?: Json | null
          product_category_id?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          requires_base_stage?: boolean | null
          requires_upc?: boolean
          shelf_life_days?: number | null
          sku?: string
          standard_labor_rate?: number | null
          standard_overhead_rate?: number | null
          storage_requirements?: string | null
          unit_id?: string
          units_per_case?: number | null
          upc_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_active_override_id_fkey"
            columns: ["active_override_id"]
            isOneToOne: false
            referencedRelation: "qa_override_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_base_product_id_fkey"
            columns: ["base_product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_conditional_approval_by_fkey"
            columns: ["conditional_approval_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_head_id_fkey"
            columns: ["family_head_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_head_id_fkey"
            columns: ["family_head_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "products_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
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
      pto_accrual_log: {
        Row: {
          balance_after: number
          employee_id: string
          hours: number
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string | null
          pto_request_id: string | null
          pto_type_id: string
          transaction_type: string
        }
        Insert: {
          balance_after: number
          employee_id: string
          hours: number
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          pto_request_id?: string | null
          pto_type_id: string
          transaction_type: string
        }
        Update: {
          balance_after?: number
          employee_id?: string
          hours?: number
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string | null
          pto_request_id?: string | null
          pto_type_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_accrual_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_accrual_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_accrual_log_pto_request_id_fkey"
            columns: ["pto_request_id"]
            isOneToOne: false
            referencedRelation: "pto_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_accrual_log_pto_type_id_fkey"
            columns: ["pto_type_id"]
            isOneToOne: false
            referencedRelation: "pto_types"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_requests: {
        Row: {
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          pto_type_id: string
          request_number: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string | null
          total_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          pto_type_id: string
          request_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string | null
          total_hours: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          pto_type_id?: string
          request_number?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string | null
          total_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pto_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_requests_pto_type_id_fkey"
            columns: ["pto_type_id"]
            isOneToOne: false
            referencedRelation: "pto_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pto_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_types: {
        Row: {
          accrual_type: string | null
          advance_notice_days: number | null
          code: string
          color: string | null
          created_at: string | null
          default_accrual_rate: number | null
          default_annual_grant: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_balance: number | null
          max_carryover: number | null
          name: string
          requires_approval: boolean | null
          waiting_period_days: number | null
        }
        Insert: {
          accrual_type?: string | null
          advance_notice_days?: number | null
          code: string
          color?: string | null
          created_at?: string | null
          default_accrual_rate?: number | null
          default_annual_grant?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_balance?: number | null
          max_carryover?: number | null
          name: string
          requires_approval?: boolean | null
          waiting_period_days?: number | null
        }
        Update: {
          accrual_type?: string | null
          advance_notice_days?: number | null
          code?: string
          color?: string | null
          created_at?: string | null
          default_accrual_rate?: number | null
          default_annual_grant?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_balance?: number | null
          max_carryover?: number | null
          name?: string
          requires_approval?: boolean | null
          waiting_period_days?: number | null
        }
        Relationships: []
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
      putaway_tasks: {
        Row: {
          assigned_to: string | null
          available_at: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          id: string
          putaway_quantity: number | null
          receiving_lot_id: string
          receiving_session_id: string | null
          started_at: string | null
          status: string | null
          total_quantity: number
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          available_at?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          id?: string
          putaway_quantity?: number | null
          receiving_lot_id: string
          receiving_session_id?: string | null
          started_at?: string | null
          status?: string | null
          total_quantity: number
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          available_at?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          id?: string
          putaway_quantity?: number | null
          receiving_lot_id?: string
          receiving_session_id?: string | null
          started_at?: string | null
          status?: string | null
          total_quantity?: number
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "putaway_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_tasks_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "putaway_tasks_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_tasks_receiving_session_id_fkey"
            columns: ["receiving_session_id"]
            isOneToOne: false
            referencedRelation: "po_receiving_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      putaway_transactions: {
        Row: {
          created_at: string | null
          id: string
          location_barcode_scanned: string | null
          location_id: string
          lot_barcode_scanned: string | null
          performed_at: string | null
          performed_by: string | null
          putaway_task_id: string
          quantity: number
          receiving_lot_id: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_barcode_scanned?: string | null
          location_id: string
          lot_barcode_scanned?: string | null
          performed_at?: string | null
          performed_by?: string | null
          putaway_task_id: string
          quantity: number
          receiving_lot_id: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_barcode_scanned?: string | null
          location_id?: string
          lot_barcode_scanned?: string | null
          performed_at?: string | null
          performed_by?: string | null
          putaway_task_id?: string
          quantity?: number
          receiving_lot_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "putaway_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_transactions_putaway_task_id_fkey"
            columns: ["putaway_task_id"]
            isOneToOne: false
            referencedRelation: "putaway_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_transactions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "putaway_transactions_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "putaway_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_approval_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_check_definitions: {
        Row: {
          applicable_categories: string[] | null
          check_description: string | null
          check_key: string
          check_name: string
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          target_field: string | null
          target_tab: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          check_description?: string | null
          check_key: string
          check_name: string
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          target_field?: string | null
          target_tab?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          check_description?: string | null
          check_key?: string
          check_name?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          target_field?: string | null
          target_tab?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_override_requests: {
        Row: {
          blocked_checks: Json
          created_at: string | null
          follow_up_date: string
          id: string
          justification: string
          override_expires_at: string | null
          override_reason: string
          override_type: string | null
          related_record_id: string
          related_table_name: string
          requested_at: string | null
          requested_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          blocked_checks?: Json
          created_at?: string | null
          follow_up_date: string
          id?: string
          justification: string
          override_expires_at?: string | null
          override_reason: string
          override_type?: string | null
          related_record_id: string
          related_table_name: string
          requested_at?: string | null
          requested_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          blocked_checks?: Json
          created_at?: string | null
          follow_up_date?: string
          id?: string
          justification?: string
          override_expires_at?: string | null
          override_reason?: string
          override_type?: string | null
          related_record_id?: string
          related_table_name?: string
          requested_at?: string | null
          requested_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_override_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_override_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_override_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_receiving_inspections: {
        Row: {
          approved_lot_ids: string[] | null
          created_at: string | null
          id: string
          inspected_at: string
          inspection_notes: string | null
          inspector_id: string
          inspector_initials: string
          lot_codes_verified: boolean | null
          packaging_intact_verified: boolean | null
          quantities_verified: boolean | null
          receiving_session_id: string
          rejected_lot_ids: string[] | null
          rejection_reason: string | null
          result: string
          temperatures_verified: boolean | null
          updated_at: string | null
        }
        Insert: {
          approved_lot_ids?: string[] | null
          created_at?: string | null
          id?: string
          inspected_at?: string
          inspection_notes?: string | null
          inspector_id: string
          inspector_initials: string
          lot_codes_verified?: boolean | null
          packaging_intact_verified?: boolean | null
          quantities_verified?: boolean | null
          receiving_session_id: string
          rejected_lot_ids?: string[] | null
          rejection_reason?: string | null
          result: string
          temperatures_verified?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approved_lot_ids?: string[] | null
          created_at?: string | null
          id?: string
          inspected_at?: string
          inspection_notes?: string | null
          inspector_id?: string
          inspector_initials?: string
          lot_codes_verified?: boolean | null
          packaging_intact_verified?: boolean | null
          quantities_verified?: boolean | null
          receiving_session_id?: string
          rejected_lot_ids?: string[] | null
          rejection_reason?: string | null
          result?: string
          temperatures_verified?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_receiving_inspections_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_receiving_inspections_receiving_session_id_fkey"
            columns: ["receiving_session_id"]
            isOneToOne: false
            referencedRelation: "po_receiving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_complaints: {
        Row: {
          capa_id: string | null
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
          capa_id?: string | null
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
          capa_id?: string | null
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
            foreignKeyName: "quality_complaints_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "quality_complaints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
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
      quality_test_templates: {
        Row: {
          applicable_stages: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          default_for_category_ids: string[] | null
          description: string | null
          id: string
          is_active: boolean | null
          is_critical: boolean | null
          max_value: number | null
          min_value: number | null
          parameter_type: string
          required_equipment: string | null
          sort_order: number | null
          target_value: string | null
          test_code: string
          test_method: string | null
          test_name: string
          typical_duration_minutes: number | null
          uom: string | null
          updated_at: string | null
        }
        Insert: {
          applicable_stages?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_for_category_ids?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          parameter_type: string
          required_equipment?: string | null
          sort_order?: number | null
          target_value?: string | null
          test_code: string
          test_method?: string | null
          test_name: string
          typical_duration_minutes?: number | null
          uom?: string | null
          updated_at?: string | null
        }
        Update: {
          applicable_stages?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_for_category_ids?: string[] | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_critical?: boolean | null
          max_value?: number | null
          min_value?: number | null
          parameter_type?: string
          required_equipment?: string | null
          sort_order?: number | null
          target_value?: string | null
          test_code?: string
          test_method?: string | null
          test_name?: string
          typical_duration_minutes?: number | null
          uom?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_test_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      recall_contacts: {
        Row: {
          contact_name: string | null
          contact_type: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notification_order: number | null
          notify_by_email: boolean | null
          notify_by_phone: boolean | null
          notify_by_sms: boolean | null
          notify_class_1: boolean | null
          notify_class_2: boolean | null
          notify_class_3: boolean | null
          notify_mock_drill: boolean | null
          organization: string | null
          phone: string | null
          phone_secondary: string | null
          role_title: string
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_type: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notification_order?: number | null
          notify_by_email?: boolean | null
          notify_by_phone?: boolean | null
          notify_by_sms?: boolean | null
          notify_class_1?: boolean | null
          notify_class_2?: boolean | null
          notify_class_3?: boolean | null
          notify_mock_drill?: boolean | null
          organization?: string | null
          phone?: string | null
          phone_secondary?: string | null
          role_title: string
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notification_order?: number | null
          notify_by_email?: boolean | null
          notify_by_phone?: boolean | null
          notify_by_sms?: boolean | null
          notify_class_1?: boolean | null
          notify_class_2?: boolean | null
          notify_class_3?: boolean | null
          notify_mock_drill?: boolean | null
          organization?: string | null
          phone?: string | null
          phone_secondary?: string | null
          role_title?: string
          updated_at?: string | null
        }
        Relationships: []
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
      receiving_coa_documents: {
        Row: {
          ai_confidence_score: number | null
          ai_extracted_data: Json | null
          ai_processed: boolean | null
          ai_processed_at: string | null
          ai_validation_result: Json | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          lot_number_match: boolean | null
          mime_type: string | null
          page_count: number | null
          receiving_lot_id: string
          review_notes: string | null
          review_override: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          specs_match: boolean | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          validation_notes: string | null
          validation_status: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_extracted_data?: Json | null
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          ai_validation_result?: Json | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          lot_number_match?: boolean | null
          mime_type?: string | null
          page_count?: number | null
          receiving_lot_id: string
          review_notes?: string | null
          review_override?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specs_match?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validation_notes?: string | null
          validation_status?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_extracted_data?: Json | null
          ai_processed?: boolean | null
          ai_processed_at?: string | null
          ai_validation_result?: Json | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          lot_number_match?: boolean | null
          mime_type?: string | null
          page_count?: number | null
          receiving_lot_id?: string
          review_notes?: string | null
          review_override?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specs_match?: boolean | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          validation_notes?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_coa_documents_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "receiving_coa_documents_receiving_lot_id_fkey"
            columns: ["receiving_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_coa_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_coa_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          active_hold_id: string | null
          capa_id: string | null
          capa_required: boolean | null
          container_status: string | null
          cost_finalized: boolean | null
          cost_per_base_unit: number | null
          cost_total: number | null
          created_at: string
          current_location_id: string | null
          current_quantity: number | null
          expiry_date: string | null
          hold_status: string | null
          id: string
          internal_lot_number: string
          is_open_portion: boolean | null
          last_transaction_at: string | null
          location_id: string | null
          material_id: string
          notes: string | null
          open_expiry_date: string | null
          opened_date: string | null
          parent_lot_id: string | null
          putaway_complete: boolean | null
          putaway_completed_at: string | null
          putaway_task_id: string | null
          qa_approved_at: string | null
          qa_approved_by: string | null
          qa_notes: string | null
          qa_status: string | null
          quantity_in_base_unit: number
          quantity_received: number
          received_by: string | null
          received_date: string
          rejection_category: string | null
          rejection_reason: string | null
          status: string | null
          supplier_id: string | null
          supplier_lot_number: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          active_hold_id?: string | null
          capa_id?: string | null
          capa_required?: boolean | null
          container_status?: string | null
          cost_finalized?: boolean | null
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          current_location_id?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          hold_status?: string | null
          id?: string
          internal_lot_number: string
          is_open_portion?: boolean | null
          last_transaction_at?: string | null
          location_id?: string | null
          material_id: string
          notes?: string | null
          open_expiry_date?: string | null
          opened_date?: string | null
          parent_lot_id?: string | null
          putaway_complete?: boolean | null
          putaway_completed_at?: string | null
          putaway_task_id?: string | null
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_notes?: string | null
          qa_status?: string | null
          quantity_in_base_unit: number
          quantity_received: number
          received_by?: string | null
          received_date?: string
          rejection_category?: string | null
          rejection_reason?: string | null
          status?: string | null
          supplier_id?: string | null
          supplier_lot_number?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          active_hold_id?: string | null
          capa_id?: string | null
          capa_required?: boolean | null
          container_status?: string | null
          cost_finalized?: boolean | null
          cost_per_base_unit?: number | null
          cost_total?: number | null
          created_at?: string
          current_location_id?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          hold_status?: string | null
          id?: string
          internal_lot_number?: string
          is_open_portion?: boolean | null
          last_transaction_at?: string | null
          location_id?: string | null
          material_id?: string
          notes?: string | null
          open_expiry_date?: string | null
          opened_date?: string | null
          parent_lot_id?: string | null
          putaway_complete?: boolean | null
          putaway_completed_at?: string | null
          putaway_task_id?: string | null
          qa_approved_at?: string | null
          qa_approved_by?: string | null
          qa_notes?: string | null
          qa_status?: string | null
          quantity_in_base_unit?: number
          quantity_received?: number
          received_by?: string | null
          received_date?: string
          rejection_category?: string | null
          rejection_reason?: string | null
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
            foreignKeyName: "receiving_lots_capa_id_fkey"
            columns: ["capa_id"]
            isOneToOne: false
            referencedRelation: "corrective_actions"
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
            foreignKeyName: "receiving_lots_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_by_lot_location"
            referencedColumns: ["receiving_lot_id"]
          },
          {
            foreignKeyName: "receiving_lots_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "receiving_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_lots_putaway_task_id_fkey"
            columns: ["putaway_task_id"]
            isOneToOne: false
            referencedRelation: "putaway_tasks"
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
      recipe_bom_items: {
        Row: {
          created_at: string | null
          extended_cost: number | null
          id: string
          is_optional: boolean | null
          material_id: string | null
          notes: string | null
          quantity_required: number
          quantity_uom: string
          recipe_id: string | null
          sequence_order: number | null
          stage: string | null
          unit_cost: number | null
          updated_at: string | null
          waste_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          extended_cost?: number | null
          id?: string
          is_optional?: boolean | null
          material_id?: string | null
          notes?: string | null
          quantity_required: number
          quantity_uom: string
          recipe_id?: string | null
          sequence_order?: number | null
          stage?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          waste_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          extended_cost?: number | null
          id?: string
          is_optional?: boolean | null
          material_id?: string | null
          notes?: string | null
          quantity_required?: number
          quantity_uom?: string
          recipe_id?: string | null
          sequence_order?: number | null
          stage?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_bom_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_bom_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_cost_history: {
        Row: {
          calculated_at: string | null
          calculated_by: string | null
          calculation_reason: string | null
          cost_per_unit: number | null
          id: string
          labor_cost: number | null
          material_cost: number | null
          overhead_cost: number | null
          recipe_id: string | null
          total_cost: number | null
        }
        Insert: {
          calculated_at?: string | null
          calculated_by?: string | null
          calculation_reason?: string | null
          cost_per_unit?: number | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          overhead_cost?: number | null
          recipe_id?: string | null
          total_cost?: number | null
        }
        Update: {
          calculated_at?: string | null
          calculated_by?: string | null
          calculation_reason?: string | null
          cost_per_unit?: number | null
          id?: string
          labor_cost?: number | null
          material_cost?: number | null
          overhead_cost?: number | null
          recipe_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_cost_history_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_cost_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          batch_size: number
          batch_uom: string | null
          batch_volume: number | null
          batch_volume_unit: string | null
          batch_weight_kg: number
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          labor_cost_per_batch: number | null
          material_cost_per_batch: number | null
          notes: string | null
          overhead_cost_per_batch: number | null
          product_id: string | null
          recipe_code: string
          recipe_name: string
          recipe_version: string | null
          standard_labor_hours: number | null
          standard_machine_hours: number | null
          total_cost_per_batch: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_size?: number
          batch_uom?: string | null
          batch_volume?: number | null
          batch_volume_unit?: string | null
          batch_weight_kg?: number
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          labor_cost_per_batch?: number | null
          material_cost_per_batch?: number | null
          notes?: string | null
          overhead_cost_per_batch?: number | null
          product_id?: string | null
          recipe_code: string
          recipe_name: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          total_cost_per_batch?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_size?: number
          batch_uom?: string | null
          batch_volume?: number | null
          batch_volume_unit?: string | null
          batch_weight_kg?: number
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          labor_cost_per_batch?: number | null
          material_cost_per_batch?: number | null
          notes?: string | null
          overhead_cost_per_batch?: number | null
          product_id?: string | null
          recipe_code?: string
          recipe_name?: string
          recipe_version?: string | null
          standard_labor_hours?: number | null
          standard_machine_hours?: number | null
          total_cost_per_batch?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rma_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          rma_id: string
          unit_price: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reason?: string | null
          rma_id: string
          unit_price?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          rma_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rma_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rma_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "rma_items_rma_id_fkey"
            columns: ["rma_id"]
            isOneToOne: false
            referencedRelation: "rma_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rma_requests: {
        Row: {
          created_at: string
          created_by: string | null
          credit_amount: number | null
          customer_id: string
          description: string | null
          disposition: string | null
          id: string
          inspected_by: string | null
          inspection_notes: string | null
          invoice_id: string | null
          reason: string
          received_date: string | null
          request_date: string
          resolution: string | null
          restocking_fee: number | null
          rma_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          customer_id: string
          description?: string | null
          disposition?: string | null
          id?: string
          inspected_by?: string | null
          inspection_notes?: string | null
          invoice_id?: string | null
          reason: string
          received_date?: string | null
          request_date?: string
          resolution?: string | null
          restocking_fee?: number | null
          rma_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_amount?: number | null
          customer_id?: string
          description?: string | null
          disposition?: string | null
          id?: string
          inspected_by?: string | null
          inspection_notes?: string | null
          invoice_id?: string | null
          reason?: string
          received_date?: string | null
          request_date?: string
          resolution?: string | null
          restocking_fee?: number | null
          rma_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rma_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rma_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
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
      sales_invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          line_total: number | null
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          line_total?: number | null
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          line_total?: number | null
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          emailed_at: string | null
          emailed_to: string | null
          freight_amount: number | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: string
          last_printed_at: string | null
          master_company_id: string | null
          payment_status: string | null
          print_count: number | null
          sales_order_id: string | null
          shipment_id: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          emailed_at?: string | null
          emailed_to?: string | null
          freight_amount?: number | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type?: string
          last_printed_at?: string | null
          master_company_id?: string | null
          payment_status?: string | null
          print_count?: number | null
          sales_order_id?: string | null
          shipment_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          emailed_at?: string | null
          emailed_to?: string | null
          freight_amount?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: string
          last_printed_at?: string | null
          master_company_id?: string | null
          payment_status?: string | null
          print_count?: number | null
          sales_order_id?: string | null
          shipment_id?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_master_company_id_fkey"
            columns: ["master_company_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "pending_deliveries"
            referencedColumns: ["shipment_id"]
          },
          {
            foreignKeyName: "sales_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "sales_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number | null
          notes: string | null
          product_id: string
          product_size_id: string | null
          quantity_invoiced: number | null
          quantity_ordered: number
          quantity_packed: number | null
          quantity_picked: number | null
          quantity_shipped: number | null
          sales_order_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id: string
          product_size_id?: string | null
          quantity_invoiced?: number | null
          quantity_ordered?: number
          quantity_packed?: number | null
          quantity_picked?: number | null
          quantity_shipped?: number | null
          sales_order_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id?: string
          product_size_id?: string | null
          quantity_invoiced?: number | null
          quantity_ordered?: number
          quantity_packed?: number | null
          quantity_picked?: number | null
          quantity_shipped?: number | null
          sales_order_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          allow_backorders: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string
          customer_po_number: string | null
          has_backorders: boolean | null
          id: string
          is_partially_shipped: boolean | null
          notes: string | null
          order_date: string
          order_number: string
          payment_terms: string | null
          pick_request_id: string | null
          requested_delivery_date: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_country: string | null
          ship_to_name: string | null
          ship_to_state: string | null
          ship_to_zip: string | null
          shipment_count: number | null
          shipping_charge: number | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          allow_backorders?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_po_number?: string | null
          has_backorders?: boolean | null
          id?: string
          is_partially_shipped?: boolean | null
          notes?: string | null
          order_date?: string
          order_number: string
          payment_terms?: string | null
          pick_request_id?: string | null
          requested_delivery_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_zip?: string | null
          shipment_count?: number | null
          shipping_charge?: number | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          allow_backorders?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_po_number?: string | null
          has_backorders?: boolean | null
          id?: string
          is_partially_shipped?: boolean | null
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_terms?: string | null
          pick_request_id?: string | null
          requested_delivery_date?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_country?: string | null
          ship_to_name?: string | null
          ship_to_state?: string | null
          ship_to_zip?: string | null
          shipment_count?: number | null
          shipping_charge?: number | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_shipment_items: {
        Row: {
          created_at: string
          id: string
          quantity_shipped: number
          sales_order_item_id: string
          shipment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantity_shipped?: number
          sales_order_item_id: string
          shipment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantity_shipped?: number
          sales_order_item_id?: string
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_shipment_items_sales_order_item_id_fkey"
            columns: ["sales_order_item_id"]
            isOneToOne: false
            referencedRelation: "sales_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "pending_deliveries"
            referencedColumns: ["shipment_id"]
          },
          {
            foreignKeyName: "sales_shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "sales_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_shipments: {
        Row: {
          carrier: string | null
          created_at: string
          freight_cost: number | null
          id: string
          sales_order_id: string
          ship_date: string
          shipment_number: string
          shipped_by: string | null
          status: string | null
          total_cases: number | null
          total_weight: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          freight_cost?: number | null
          id?: string
          sales_order_id: string
          ship_date?: string
          shipment_number: string
          shipped_by?: string | null
          status?: string | null
          total_cases?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          freight_cost?: number | null
          id?: string
          sales_order_id?: string
          ship_date?: string
          shipment_number?: string
          shipped_by?: string | null
          status?: string | null
          total_cases?: number | null
          total_weight?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_shipments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_optimization_suggestions: {
        Row: {
          created_at: string | null
          current_situation: string
          dismissed_at: string | null
          dismissed_by: string | null
          expected_benefit: string | null
          id: string
          is_applied: boolean | null
          is_dismissed: boolean | null
          production_schedule_id: string | null
          schedule_date: string
          severity: string | null
          suggestion: string
          suggestion_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_situation: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expected_benefit?: string | null
          id?: string
          is_applied?: boolean | null
          is_dismissed?: boolean | null
          production_schedule_id?: string | null
          schedule_date: string
          severity?: string | null
          suggestion: string
          suggestion_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_situation?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expected_benefit?: string | null
          id?: string
          is_applied?: boolean | null
          is_dismissed?: boolean | null
          production_schedule_id?: string | null
          schedule_date?: string
          severity?: string | null
          suggestion?: string
          suggestion_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_optimization_suggestions_production_schedule_id_fkey"
            columns: ["production_schedule_id"]
            isOneToOne: false
            referencedRelation: "production_schedule"
            referencedColumns: ["id"]
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
      stage_category_mapping: {
        Row: {
          category_code: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          stage_code: string
        }
        Insert: {
          category_code: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          stage_code: string
        }
        Update: {
          category_code?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          stage_code?: string
        }
        Relationships: []
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
      supplier_performance_metrics: {
        Row: {
          avg_capa_closure_days: number | null
          base_score: number
          calculated_at: string
          calculated_by: string | null
          closed_capas: number
          critical_capas: number
          document_compliance_rate: number
          documentation_failures: number
          expired_documents: number
          expiring_soon_documents: number
          final_score: number
          id: string
          late_deliveries: number
          lots_accepted: number
          lots_on_hold: number
          lots_rejected: number
          major_capas: number
          minor_capas: number
          missing_documents: number
          notes: string | null
          on_time_deliveries: number
          on_time_rate: number
          open_capas: number
          period_end: string
          period_start: string
          probation_triggered: boolean
          rejection_rate: number
          review_required: boolean
          rolling_months: number
          score_grade: string
          spec_failures: number
          supplier_id: string
          temperature_failures: number
          total_capas: number
          total_deductions: number
          total_deliveries: number
          total_lots_received: number
          total_required_documents: number
          trigger_reasons: Json | null
          valid_documents: number
        }
        Insert: {
          avg_capa_closure_days?: number | null
          base_score?: number
          calculated_at?: string
          calculated_by?: string | null
          closed_capas?: number
          critical_capas?: number
          document_compliance_rate?: number
          documentation_failures?: number
          expired_documents?: number
          expiring_soon_documents?: number
          final_score?: number
          id?: string
          late_deliveries?: number
          lots_accepted?: number
          lots_on_hold?: number
          lots_rejected?: number
          major_capas?: number
          minor_capas?: number
          missing_documents?: number
          notes?: string | null
          on_time_deliveries?: number
          on_time_rate?: number
          open_capas?: number
          period_end: string
          period_start: string
          probation_triggered?: boolean
          rejection_rate?: number
          review_required?: boolean
          rolling_months?: number
          score_grade?: string
          spec_failures?: number
          supplier_id: string
          temperature_failures?: number
          total_capas?: number
          total_deductions?: number
          total_deliveries?: number
          total_lots_received?: number
          total_required_documents?: number
          trigger_reasons?: Json | null
          valid_documents?: number
        }
        Update: {
          avg_capa_closure_days?: number | null
          base_score?: number
          calculated_at?: string
          calculated_by?: string | null
          closed_capas?: number
          critical_capas?: number
          document_compliance_rate?: number
          documentation_failures?: number
          expired_documents?: number
          expiring_soon_documents?: number
          final_score?: number
          id?: string
          late_deliveries?: number
          lots_accepted?: number
          lots_on_hold?: number
          lots_rejected?: number
          major_capas?: number
          minor_capas?: number
          missing_documents?: number
          notes?: string | null
          on_time_deliveries?: number
          on_time_rate?: number
          open_capas?: number
          period_end?: string
          period_start?: string
          probation_triggered?: boolean
          rejection_rate?: number
          review_required?: boolean
          rolling_months?: number
          score_grade?: string
          spec_failures?: number
          supplier_id?: string
          temperature_failures?: number
          total_capas?: number
          total_deductions?: number
          total_deliveries?: number
          total_lots_received?: number
          total_required_documents?: number
          trigger_reasons?: Json | null
          valid_documents?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_performance_metrics_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_scoring_rules: {
        Row: {
          action_type: string | null
          created_at: string
          created_by: string | null
          deduction_per_unit: number | null
          description: string | null
          id: string
          is_active: boolean
          max_deduction: number | null
          metric_key: string
          priority: number
          rule_code: string
          rule_name: string
          rule_type: string
          threshold_operator: string | null
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          created_by?: string | null
          deduction_per_unit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_deduction?: number | null
          metric_key: string
          priority?: number
          rule_code: string
          rule_name: string
          rule_type: string
          threshold_operator?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          action_type?: string | null
          created_at?: string
          created_by?: string | null
          deduction_per_unit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_deduction?: number | null
          metric_key?: string
          priority?: number
          rule_code?: string
          rule_name?: string
          rule_type?: string
          threshold_operator?: string | null
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_scoring_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_status_history: {
        Row: {
          change_reason: string
          created_at: string
          effective_date: string
          id: string
          metrics_snapshot_id: string | null
          new_status: string
          notes: string | null
          performance_score_at_change: number | null
          previous_status: string | null
          supplier_id: string
          trigger_details: Json | null
          triggered_by: string
          triggered_by_user_id: string | null
        }
        Insert: {
          change_reason: string
          created_at?: string
          effective_date?: string
          id?: string
          metrics_snapshot_id?: string | null
          new_status: string
          notes?: string | null
          performance_score_at_change?: number | null
          previous_status?: string | null
          supplier_id: string
          trigger_details?: Json | null
          triggered_by: string
          triggered_by_user_id?: string | null
        }
        Update: {
          change_reason?: string
          created_at?: string
          effective_date?: string
          id?: string
          metrics_snapshot_id?: string | null
          new_status?: string
          notes?: string | null
          performance_score_at_change?: number | null
          previous_status?: string | null
          supplier_id?: string
          trigger_details?: Json | null
          triggered_by?: string
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_status_history_metrics_snapshot_id_fkey"
            columns: ["metrics_snapshot_id"]
            isOneToOne: false
            referencedRelation: "supplier_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_status_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_status_history_triggered_by_user_id_fkey"
            columns: ["triggered_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active_override_id: string | null
          address: string | null
          approval_date: string | null
          approval_status: string | null
          approved_by: string | null
          audit_score: number | null
          categories: string[] | null
          certification_expiry_date: string | null
          city: string | null
          code: string
          conditional_approval_at: string | null
          conditional_approval_by: string | null
          conditional_approval_expires_at: string | null
          conditional_notes: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          credit_limit: number | null
          current_grade: string | null
          current_score: number | null
          email: string | null
          fax: string | null
          food_safety_certification: string | null
          gfsi_certified: boolean | null
          id: string
          is_active: boolean | null
          last_audit_date: string | null
          last_score_date: string | null
          name: string
          next_review_date: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          probation_end_date: string | null
          probation_review_date: string | null
          probation_start_date: string | null
          qa_verified_at: string | null
          qa_verified_by: string | null
          risk_level: string | null
          score_trend: string | null
          state: string | null
          supplier_type: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          active_override_id?: string | null
          address?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          audit_score?: number | null
          categories?: string[] | null
          certification_expiry_date?: string | null
          city?: string | null
          code: string
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          conditional_notes?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          current_grade?: string | null
          current_score?: number | null
          email?: string | null
          fax?: string | null
          food_safety_certification?: string | null
          gfsi_certified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          last_score_date?: string | null
          name: string
          next_review_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          probation_end_date?: string | null
          probation_review_date?: string | null
          probation_start_date?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          risk_level?: string | null
          score_trend?: string | null
          state?: string | null
          supplier_type?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          active_override_id?: string | null
          address?: string | null
          approval_date?: string | null
          approval_status?: string | null
          approved_by?: string | null
          audit_score?: number | null
          categories?: string[] | null
          certification_expiry_date?: string | null
          city?: string | null
          code?: string
          conditional_approval_at?: string | null
          conditional_approval_by?: string | null
          conditional_approval_expires_at?: string | null
          conditional_notes?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          credit_limit?: number | null
          current_grade?: string | null
          current_score?: number | null
          email?: string | null
          fax?: string | null
          food_safety_certification?: string | null
          gfsi_certified?: boolean | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          last_score_date?: string | null
          name?: string
          next_review_date?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          probation_end_date?: string | null
          probation_review_date?: string | null
          probation_start_date?: string | null
          qa_verified_at?: string | null
          qa_verified_by?: string | null
          risk_level?: string | null
          score_trend?: string | null
          state?: string | null
          supplier_type?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_active_override_id_fkey"
            columns: ["active_override_id"]
            isOneToOne: false
            referencedRelation: "qa_override_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_conditional_approval_by_fkey"
            columns: ["conditional_approval_by"]
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
      task_activity_log: {
        Row: {
          action: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_at: string | null
          performed_by: string | null
          task_id: string
        }
        Insert: {
          action: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
          task_id: string
        }
        Update: {
          action?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          attachment_type: string | null
          caption: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          task_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attachment_type?: string | null
          caption?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          task_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string | null
          caption?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          task_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_auto_assignment_rules: {
        Row: {
          category_id: string | null
          created_at: string | null
          escalate_to_id: string | null
          escalate_to_role: string | null
          escalate_to_type: string | null
          id: string
          is_active: boolean | null
          notify_manager: boolean | null
          template_id: string | null
          unclaimed_hours_threshold: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          escalate_to_id?: string | null
          escalate_to_role?: string | null
          escalate_to_type?: string | null
          id?: string
          is_active?: boolean | null
          notify_manager?: boolean | null
          template_id?: string | null
          unclaimed_hours_threshold?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          escalate_to_id?: string | null
          escalate_to_role?: string | null
          escalate_to_type?: string | null
          id?: string
          is_active?: boolean | null
          notify_manager?: boolean | null
          template_id?: string | null
          unclaimed_hours_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_auto_assignment_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_auto_assignment_rules_escalate_to_id_fkey"
            columns: ["escalate_to_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_auto_assignment_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_food_safety: boolean | null
          name: string
          requires_photo: boolean | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_food_safety?: boolean | null
          name: string
          requires_photo?: boolean | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_food_safety?: boolean | null
          name?: string
          requires_photo?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          created_by: string | null
          id: string
          task_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          task_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category_id: string | null
          checklist_items: Json | null
          created_at: string | null
          created_by: string | null
          default_assignee_id: string | null
          default_assignee_type: string | null
          default_department_id: string | null
          default_priority: string | null
          default_role: string | null
          description: string | null
          estimated_duration_minutes: number | null
          food_safety_type: string | null
          id: string
          is_active: boolean | null
          is_food_safety: boolean | null
          is_recurring: boolean | null
          name: string
          photo_min_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: number[] | null
          recurrence_pattern: string | null
          recurrence_time: string | null
          requires_notes: boolean | null
          requires_photo: boolean | null
          requires_signature: boolean | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_assignee_id?: string | null
          default_assignee_type?: string | null
          default_department_id?: string | null
          default_priority?: string | null
          default_role?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          food_safety_type?: string | null
          id?: string
          is_active?: boolean | null
          is_food_safety?: boolean | null
          is_recurring?: boolean | null
          name: string
          photo_min_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_pattern?: string | null
          recurrence_time?: string | null
          requires_notes?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_assignee_id?: string | null
          default_assignee_type?: string | null
          default_department_id?: string | null
          default_priority?: string | null
          default_role?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          food_safety_type?: string | null
          id?: string
          is_active?: boolean | null
          is_food_safety?: boolean | null
          is_recurring?: boolean | null
          name?: string
          photo_min_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_pattern?: string | null
          recurrence_time?: string | null
          requires_notes?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_default_department_id_fkey"
            columns: ["default_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_department_id: string | null
          assigned_role: string | null
          assigned_to: string | null
          assignment_type: string | null
          category_id: string | null
          checklist_completed: Json | null
          checklist_items: Json | null
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          completion_signature: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_duration_minutes: number | null
          food_safety_data: Json | null
          id: string
          is_food_safety: boolean | null
          location_id: string | null
          photo_min_count: number | null
          priority: string | null
          requires_notes: boolean | null
          requires_photo: boolean | null
          requires_signature: boolean | null
          source_module: string | null
          source_record_id: string | null
          source_type: string | null
          started_at: string | null
          status: string | null
          task_number: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_department_id?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          assignment_type?: string | null
          category_id?: string | null
          checklist_completed?: Json | null
          checklist_items?: Json | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_signature?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_duration_minutes?: number | null
          food_safety_data?: Json | null
          id?: string
          is_food_safety?: boolean | null
          location_id?: string | null
          photo_min_count?: number | null
          priority?: string | null
          requires_notes?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          source_module?: string | null
          source_record_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          task_number?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_department_id?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          assignment_type?: string | null
          category_id?: string | null
          checklist_completed?: Json | null
          checklist_items?: Json | null
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          completion_signature?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_duration_minutes?: number | null
          food_safety_data?: Json | null
          id?: string
          is_food_safety?: boolean | null
          location_id?: string | null
          photo_min_count?: number | null
          priority?: string | null
          requires_notes?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          source_module?: string | null
          source_record_id?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          task_number?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_department_id_fkey"
            columns: ["assigned_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      unfulfilled_so_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string
          id: string
          notes: string | null
          unfulfilled_items_snapshot: Json
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          unfulfilled_items_snapshot: Json
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          unfulfilled_items_snapshot?: Json
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unfulfilled_so_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unfulfilled_so_acknowledgments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
      wip_valuation_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          gl_entry_id: string | null
          gl_entry_posted: boolean | null
          id: string
          snapshot_date: string
          total_labor_cost: number | null
          total_material_cost: number | null
          total_overhead_cost: number | null
          total_wip_value: number
          wip_by_stage: Json | null
          work_order_count: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gl_entry_id?: string | null
          gl_entry_posted?: boolean | null
          id?: string
          snapshot_date: string
          total_labor_cost?: number | null
          total_material_cost?: number | null
          total_overhead_cost?: number | null
          total_wip_value: number
          wip_by_stage?: Json | null
          work_order_count: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gl_entry_id?: string | null
          gl_entry_posted?: boolean | null
          id?: string
          snapshot_date?: string
          total_labor_cost?: number | null
          total_material_cost?: number | null
          total_overhead_cost?: number | null
          total_wip_value?: number
          wip_by_stage?: Json | null
          work_order_count?: number
        }
        Relationships: []
      }
      work_order_labor: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string | null
          hourly_rate: number
          hours_worked: number
          id: string
          is_overtime: boolean | null
          labor_cost: number
          labor_date: string
          notes: string | null
          overtime_multiplier: number | null
          stage: string | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          hourly_rate: number
          hours_worked: number
          id?: string
          is_overtime?: boolean | null
          labor_cost: number
          labor_date: string
          notes?: string | null
          overtime_multiplier?: number | null
          stage?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string | null
          hourly_rate?: number
          hours_worked?: number
          id?: string
          is_overtime?: boolean | null
          labor_cost?: number
          labor_date?: string
          notes?: string | null
          overtime_multiplier?: number | null
          stage?: string | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_labor_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_materials: {
        Row: {
          actual_quantity: number | null
          actual_total_cost: number | null
          actual_unit_cost: number | null
          actual_uom: string | null
          consumed_at: string | null
          consumed_from_lot_id: string | null
          consumed_lot_ids: string[] | null
          consumption_complete: boolean | null
          cost_variance: number | null
          created_at: string | null
          id: string
          is_consumed: boolean | null
          material_id: string | null
          planned_quantity: number
          planned_total_cost: number | null
          planned_unit_cost: number | null
          planned_uom: string
          quantity_variance: number | null
          work_order_id: string | null
        }
        Insert: {
          actual_quantity?: number | null
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          actual_uom?: string | null
          consumed_at?: string | null
          consumed_from_lot_id?: string | null
          consumed_lot_ids?: string[] | null
          consumption_complete?: boolean | null
          cost_variance?: number | null
          created_at?: string | null
          id?: string
          is_consumed?: boolean | null
          material_id?: string | null
          planned_quantity: number
          planned_total_cost?: number | null
          planned_unit_cost?: number | null
          planned_uom: string
          quantity_variance?: number | null
          work_order_id?: string | null
        }
        Update: {
          actual_quantity?: number | null
          actual_total_cost?: number | null
          actual_unit_cost?: number | null
          actual_uom?: string | null
          consumed_at?: string | null
          consumed_from_lot_id?: string | null
          consumed_lot_ids?: string[] | null
          consumption_complete?: boolean | null
          cost_variance?: number | null
          created_at?: string | null
          id?: string
          is_consumed?: boolean | null
          material_id?: string | null
          planned_quantity?: number
          planned_total_cost?: number | null
          planned_unit_cost?: number | null
          planned_uom?: string
          quantity_variance?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_materials_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_overhead: {
        Row: {
          allocated_amount: number | null
          allocation_basis: number | null
          allocation_date: string | null
          allocation_method: string | null
          allocation_rate: number | null
          created_at: string | null
          created_by: string | null
          fixed_cost_allocation: number | null
          id: string
          notes: string | null
          work_order_id: string | null
        }
        Insert: {
          allocated_amount?: number | null
          allocation_basis?: number | null
          allocation_date?: string | null
          allocation_method?: string | null
          allocation_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_cost_allocation?: number | null
          id?: string
          notes?: string | null
          work_order_id?: string | null
        }
        Update: {
          allocated_amount?: number | null
          allocation_basis?: number | null
          allocation_date?: string | null
          allocation_method?: string | null
          allocation_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          fixed_cost_allocation?: number | null
          id?: string
          notes?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_overhead_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_stage_progress: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          cumulative_labor_cost: number | null
          cumulative_material_cost: number | null
          cumulative_overhead_cost: number | null
          cumulative_total_cost: number | null
          id: string
          input_quantity: number | null
          labor_cost_this_stage: number | null
          material_cost_this_stage: number | null
          notes: string | null
          output_product_size_id: string | null
          output_quantity: number | null
          overhead_cost_this_stage: number | null
          qc_approved: boolean | null
          qc_approved_at: string | null
          qc_approved_by: string | null
          qc_notes: string | null
          stage_id: string | null
          stage_status: string | null
          started_at: string | null
          started_by: string | null
          total_cost_this_stage: number | null
          updated_at: string | null
          waste_quantity: number | null
          wip_lot_id: string | null
          work_order_id: string | null
          yield_percentage: number | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          cumulative_labor_cost?: number | null
          cumulative_material_cost?: number | null
          cumulative_overhead_cost?: number | null
          cumulative_total_cost?: number | null
          id?: string
          input_quantity?: number | null
          labor_cost_this_stage?: number | null
          material_cost_this_stage?: number | null
          notes?: string | null
          output_product_size_id?: string | null
          output_quantity?: number | null
          overhead_cost_this_stage?: number | null
          qc_approved?: boolean | null
          qc_approved_at?: string | null
          qc_approved_by?: string | null
          qc_notes?: string | null
          stage_id?: string | null
          stage_status?: string | null
          started_at?: string | null
          started_by?: string | null
          total_cost_this_stage?: number | null
          updated_at?: string | null
          waste_quantity?: number | null
          wip_lot_id?: string | null
          work_order_id?: string | null
          yield_percentage?: number | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          cumulative_labor_cost?: number | null
          cumulative_material_cost?: number | null
          cumulative_overhead_cost?: number | null
          cumulative_total_cost?: number | null
          id?: string
          input_quantity?: number | null
          labor_cost_this_stage?: number | null
          material_cost_this_stage?: number | null
          notes?: string | null
          output_product_size_id?: string | null
          output_quantity?: number | null
          overhead_cost_this_stage?: number | null
          qc_approved?: boolean | null
          qc_approved_at?: string | null
          qc_approved_by?: string | null
          qc_notes?: string | null
          stage_id?: string | null
          stage_status?: string | null
          started_at?: string | null
          started_by?: string | null
          total_cost_this_stage?: number | null
          updated_at?: string | null
          waste_quantity?: number | null
          wip_lot_id?: string | null
          work_order_id?: string | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_stage_progress_output_product_size_id_fkey"
            columns: ["output_product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_stage_progress_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_stage_progress_wip_lot_id_fkey"
            columns: ["wip_lot_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_stage_progress_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          work_order_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          work_order_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_order_status_history_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          acknowledged_unfulfilled_items: boolean | null
          actual_cost_per_unit: number | null
          actual_labor_cost: number | null
          actual_labor_hours: number | null
          actual_material_cost: number | null
          actual_overhead_cost: number | null
          actual_quantity: number | null
          actual_total_cost: number | null
          actual_uom: string | null
          allergen_warnings: string[] | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          customer_po: string | null
          customer_reference: string | null
          due_date: string | null
          estimated_labor_hours: number | null
          id: string
          input_lot_id: string | null
          is_rework: boolean | null
          labor_rate_per_hour: number | null
          labor_variance: number | null
          material_variance: number | null
          original_wo_id: string | null
          overhead_allocation_method: string | null
          overhead_rate: number | null
          overhead_variance: number | null
          planned_cost_per_unit: number | null
          planned_labor_cost: number | null
          planned_material_cost: number | null
          planned_overhead_cost: number | null
          planned_total_cost: number | null
          priority: string | null
          product_id: string | null
          product_size_id: string | null
          production_line_id: string | null
          recipe_id: string | null
          released_at: string | null
          released_by: string | null
          scheduled_date: string | null
          special_instructions: string | null
          started_at: string | null
          target_quantity: number
          target_stage_code: string | null
          target_uom: string
          target_volume: number | null
          target_volume_uom: string | null
          total_variance: number | null
          updated_at: string | null
          updated_by: string | null
          wo_number: string
          wo_status: string
          wo_type: string
          yield_percentage: number | null
        }
        Insert: {
          acknowledged_unfulfilled_items?: boolean | null
          actual_cost_per_unit?: number | null
          actual_labor_cost?: number | null
          actual_labor_hours?: number | null
          actual_material_cost?: number | null
          actual_overhead_cost?: number | null
          actual_quantity?: number | null
          actual_total_cost?: number | null
          actual_uom?: string | null
          allergen_warnings?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_po?: string | null
          customer_reference?: string | null
          due_date?: string | null
          estimated_labor_hours?: number | null
          id?: string
          input_lot_id?: string | null
          is_rework?: boolean | null
          labor_rate_per_hour?: number | null
          labor_variance?: number | null
          material_variance?: number | null
          original_wo_id?: string | null
          overhead_allocation_method?: string | null
          overhead_rate?: number | null
          overhead_variance?: number | null
          planned_cost_per_unit?: number | null
          planned_labor_cost?: number | null
          planned_material_cost?: number | null
          planned_overhead_cost?: number | null
          planned_total_cost?: number | null
          priority?: string | null
          product_id?: string | null
          product_size_id?: string | null
          production_line_id?: string | null
          recipe_id?: string | null
          released_at?: string | null
          released_by?: string | null
          scheduled_date?: string | null
          special_instructions?: string | null
          started_at?: string | null
          target_quantity: number
          target_stage_code?: string | null
          target_uom: string
          target_volume?: number | null
          target_volume_uom?: string | null
          total_variance?: number | null
          updated_at?: string | null
          updated_by?: string | null
          wo_number: string
          wo_status?: string
          wo_type: string
          yield_percentage?: number | null
        }
        Update: {
          acknowledged_unfulfilled_items?: boolean | null
          actual_cost_per_unit?: number | null
          actual_labor_cost?: number | null
          actual_labor_hours?: number | null
          actual_material_cost?: number | null
          actual_overhead_cost?: number | null
          actual_quantity?: number | null
          actual_total_cost?: number | null
          actual_uom?: string | null
          allergen_warnings?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_po?: string | null
          customer_reference?: string | null
          due_date?: string | null
          estimated_labor_hours?: number | null
          id?: string
          input_lot_id?: string | null
          is_rework?: boolean | null
          labor_rate_per_hour?: number | null
          labor_variance?: number | null
          material_variance?: number | null
          original_wo_id?: string | null
          overhead_allocation_method?: string | null
          overhead_rate?: number | null
          overhead_variance?: number | null
          planned_cost_per_unit?: number | null
          planned_labor_cost?: number | null
          planned_material_cost?: number | null
          planned_overhead_cost?: number | null
          planned_total_cost?: number | null
          priority?: string | null
          product_id?: string | null
          product_size_id?: string | null
          production_line_id?: string | null
          recipe_id?: string | null
          released_at?: string | null
          released_by?: string | null
          scheduled_date?: string | null
          special_instructions?: string | null
          started_at?: string | null
          target_quantity?: number
          target_stage_code?: string | null
          target_uom?: string
          target_volume?: number | null
          target_volume_uom?: string | null
          total_variance?: number | null
          updated_at?: string | null
          updated_by?: string | null
          wo_number?: string
          wo_status?: string
          wo_type?: string
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_input_lot_id_fkey"
            columns: ["input_lot_id"]
            isOneToOne: false
            referencedRelation: "production_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_original_wo_id_fkey"
            columns: ["original_wo_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "work_orders_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_production_line_id_fkey"
            columns: ["production_line_id"]
            isOneToOne: false
            referencedRelation: "production_lines"
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
      nc_analytics_summary: {
        Row: {
          avg_days_to_close: number | null
          avg_estimated_cost: number | null
          capa_created_count: number | null
          capa_required_count: number | null
          closed_count: number | null
          discovery_location_id: string | null
          disposition: string | null
          equipment_id: string | null
          impact_level: string | null
          material_id: string | null
          month: string | null
          nc_count: number | null
          nc_type: string | null
          open_count: number | null
          product_id: string | null
          severity: string | null
          status: string | null
          supplier_id: string | null
          total_actual_cost: number | null
          total_estimated_cost: number | null
          week: string | null
          year: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformities_discovery_location_id_fkey"
            columns: ["discovery_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unfulfilled_sales_order_items"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "non_conformities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_deliveries: {
        Row: {
          bol_number: string | null
          customer_code: string | null
          customer_name: string | null
          notes: string | null
          order_number: string | null
          ship_date: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_state: string | null
          ship_to_zip: string | null
          shipment_id: string | null
          shipment_number: string | null
          status: string | null
          total_cases: number | null
          tracking_number: string | null
        }
        Relationships: []
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
      vw_unfulfilled_sales_order_items: {
        Row: {
          due_date_factor: number | null
          earliest_due_date: string | null
          number_of_sales_orders: number | null
          product_code: string | null
          product_description: string | null
          product_id: string | null
          product_size_id: string | null
          sales_order_numbers: string[] | null
          shortage_quantity: number | null
          total_available_stock: number | null
          total_quantity_needed: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_nc_disposition: {
        Args: {
          p_approved_by?: string
          p_disposition: string
          p_justification?: string
          p_nc_id: string
        }
        Returns: Json
      }
      apply_payment_to_invoices: {
        Args: { p_applications: Json; p_receipt_id: string }
        Returns: undefined
      }
      approve_price_sheet: {
        Args: { p_price_sheet_id: string }
        Returns: undefined
      }
      calculate_actual_wo_costs: {
        Args: { p_work_order_id: string }
        Returns: Json
      }
      calculate_landed_costs: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      calculate_planned_wo_costs: {
        Args: { p_work_order_id: string }
        Returns: Json
      }
      calculate_recipe_cost: { Args: { p_recipe_id: string }; Returns: Json }
      calculate_score_grade: { Args: { score: number }; Returns: string }
      can_ship_production_lot: { Args: { p_lot_id: string }; Returns: boolean }
      check_capacity_warnings: {
        Args: { p_production_line_id: string; p_schedule_date: string }
        Returns: Json
      }
      check_labor_balance: {
        Args: { p_date: string; p_production_line_id?: string }
        Returns: Json
      }
      check_nc_disposition_approval_required: {
        Args: {
          p_disposition: string
          p_estimated_cost?: number
          p_severity: string
        }
        Returns: Json
      }
      check_permission: {
        Args: {
          _required_level?: string
          _resource_key: string
          _user_id: string
        }
        Returns: boolean
      }
      check_wo_input_availability: {
        Args: {
          p_product_id: string
          p_recipe_id?: string
          p_stage_code: string
        }
        Returns: Json
      }
      cleanup_stale_editors: { Args: never; Returns: undefined }
      commit_staged_materials: {
        Args: { p_work_order_id: string }
        Returns: Json
      }
      complete_production_stage: {
        Args: {
          p_output_quantity: number
          p_stage_code: string
          p_waste_quantity?: number
          p_work_order_id: string
        }
        Returns: Json
      }
      complete_production_stage_v2: {
        Args: {
          p_output_product_size_id?: string
          p_output_quantity: number
          p_stage_code: string
          p_waste_quantity?: number
          p_work_order_id: string
        }
        Returns: Json
      }
      create_capa_from_nc: { Args: { p_nc_id: string }; Returns: string }
      delete_work_order_safe:
        | { Args: { p_work_order_id: string }; Returns: Json }
        | {
            Args: {
              p_admin_override?: boolean
              p_override_reason?: string
              p_work_order_id: string
            }
            Returns: Json
          }
      evaluate_nc_capa_trigger: { Args: { p_nc_id: string }; Returns: Json }
      generate_capa_number: { Args: never; Returns: string }
      generate_complaint_number: { Args: never; Returns: string }
      generate_employee_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_listed_material_code: { Args: never; Returns: string }
      generate_lot_number: {
        Args: { p_material_id: string; p_production_date?: string }
        Returns: string
      }
      generate_material_code: { Args: { p_category: string }; Returns: string }
      generate_nc_number: { Args: never; Returns: string }
      generate_pallet_number: {
        Args: { p_build_date?: string }
        Returns: string
      }
      generate_payment_receipt_number: { Args: never; Returns: string }
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
      generate_rma_number: { Args: never; Returns: string }
      generate_sales_order_number: { Args: never; Returns: string }
      generate_shipment_number: { Args: never; Returns: string }
      generate_sqf_nc_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      generate_supplier_code: { Args: never; Returns: string }
      generate_wo_number: { Args: { p_wo_type?: string }; Returns: string }
      generate_work_order_number: {
        Args: {
          p_date?: string
          p_type: Database["public"]["Enums"]["work_order_type"]
        }
        Returns: string
      }
      get_customer_balance: { Args: { p_customer_id: string }; Returns: number }
      get_customer_price: {
        Args: {
          p_customer_id: string
          p_order_date?: string
          p_product_id: string
          p_quantity?: number
        }
        Returns: number
      }
      get_lot_genealogy_tree: {
        Args: { p_direction?: string; p_lot_id: string }
        Returns: {
          depth: number
          lot_id: string
          lot_number: string
          lot_status: string
          lot_type: string
          material_name: string
          production_date: string
          quantity: number
          quantity_uom: string
          relationship: string
        }[]
      }
      get_master_company: { Args: { p_customer_id: string }; Returns: string }
      get_nc_metrics: {
        Args: {
          p_end_date: string
          p_location_id?: string
          p_nc_type?: string
          p_severity?: string
          p_start_date: string
        }
        Returns: Json
      }
      get_nc_pareto_analysis: {
        Args: { p_end_date: string; p_group_by?: string; p_start_date: string }
        Returns: {
          category: string
          cumulative_percentage: number
          nc_count: number
          percentage: number
          total_cost: number
        }[]
      }
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
      increment_lot_quantity: {
        Args: { amount: number; lot_id: string }
        Returns: undefined
      }
      initialize_wo_stages: {
        Args: { p_work_order_id: string }
        Returns: undefined
      }
      is_admin_or_hr: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_material_approved: {
        Args: { p_material_id: string }
        Returns: boolean
      }
      mark_overdue_tasks: { Args: never; Returns: number }
      record_delivery_signature: {
        Args: {
          p_delivery_notes?: string
          p_shipment_id: string
          p_signature_data: string
          p_signer_name: string
        }
        Returns: undefined
      }
      record_invoice_email: {
        Args: { p_email_to: string; p_invoice_id: string }
        Returns: undefined
      }
      record_invoice_print: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      refresh_nc_analytics: { Args: never; Returns: undefined }
      reject_price_sheet: {
        Args: { p_price_sheet_id: string; p_rejection_reason: string }
        Returns: undefined
      }
      stage_material_for_consumption: {
        Args: {
          p_lot_number: string
          p_material_id: string
          p_production_stage?: string
          p_quantity: number
          p_scan_method?: string
          p_work_order_id: string
        }
        Returns: Json
      }
      start_production_stage: {
        Args: { p_stage_code: string; p_work_order_id: string }
        Returns: Json
      }
      submit_price_sheet_for_approval: {
        Args: { p_price_sheet_id: string }
        Returns: undefined
      }
      supplier_has_valid_documents: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
      validate_lot_number_format: {
        Args: { p_lot_number: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "supervisor" | "employee" | "hr"
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
      production_stage: "base" | "flavoring" | "finished"
      template_category:
        | "purchase"
        | "sale"
        | "inventory"
        | "production"
        | "crm"
        | "financial"
      template_type: "document" | "email"
      user_status: "active" | "inactive" | "pending"
      work_order_status:
        | "draft"
        | "scheduled"
        | "in_progress"
        | "pending_qa"
        | "completed"
        | "cancelled"
      work_order_type: "base" | "flavoring" | "freezing" | "case_pack"
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
      app_role: ["admin", "manager", "supervisor", "employee", "hr"],
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
      production_stage: ["base", "flavoring", "finished"],
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
      work_order_status: [
        "draft",
        "scheduled",
        "in_progress",
        "pending_qa",
        "completed",
        "cancelled",
      ],
      work_order_type: ["base", "flavoring", "freezing", "case_pack"],
    },
  },
} as const
