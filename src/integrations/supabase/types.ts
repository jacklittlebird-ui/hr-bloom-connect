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
      advances: {
        Row: {
          amount: number
          created_at: string
          deduction_month: string
          employee_id: string
          id: string
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          deduction_month: string
          employee_id: string
          id?: string
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_month?: string
          employee_id?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      area_manager_stations: {
        Row: {
          created_at: string
          id: string
          station_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          station_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          station_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_manager_stations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_acknowledgments: {
        Row: {
          acknowledged_at: string
          asset_id: string
          employee_id: string
          id: string
        }
        Insert: {
          acknowledged_at?: string
          asset_id: string
          employee_id: string
          id?: string
        }
        Update: {
          acknowledged_at?: string
          asset_id?: string
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_acknowledgments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string
          assigned_to: string | null
          brand: string | null
          category: string
          condition: string | null
          created_at: string
          id: string
          location: string | null
          model: string | null
          name_ar: string
          name_en: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          status: string
        }
        Insert: {
          asset_code: string
          assigned_to?: string | null
          brand?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name_ar: string
          name_en: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
        }
        Update: {
          asset_code?: string
          assigned_to?: string | null
          brand?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          location?: string | null
          model?: string | null
          name_ar?: string
          name_en?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_assignments: {
        Row: {
          created_at: string
          effective_from: string
          employee_id: string
          id: string
          is_active: boolean
          rule_id: string
          shift_id: string | null
          station_id: string | null
        }
        Insert: {
          created_at?: string
          effective_from?: string
          employee_id: string
          id?: string
          is_active?: boolean
          rule_id: string
          shift_id?: string | null
          station_id?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          rule_id?: string
          shift_id?: string | null
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_assignments_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "attendance_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_assignments_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          device_id: string
          employee_id: string | null
          event_type: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          location_id: string | null
          scan_time: string
          token_ts: string
          user_id: string
        }
        Insert: {
          device_id: string
          employee_id?: string | null
          event_type: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location_id?: string | null
          scan_time?: string
          token_ts: string
          user_id: string
        }
        Update: {
          device_id?: string
          employee_id?: string | null
          event_type?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location_id?: string | null
          scan_time?: string
          token_ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "qr_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          is_late: boolean | null
          notes: string | null
          status: string
          work_hours: number | null
          work_minutes: number | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          status?: string
          work_hours?: number | null
          work_minutes?: number | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          status?: string
          work_hours?: number | null
          work_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rules: {
        Row: {
          created_at: string
          description: string | null
          description_ar: string | null
          fixed_schedule: Json | null
          flexible_schedule: Json | null
          fully_flexible_schedule: Json | null
          id: string
          is_active: boolean
          max_overtime_hours_daily: number | null
          max_overtime_hours_weekly: number | null
          name: string
          name_ar: string
          schedule_type: string
          shift_schedule: Json | null
          weekend_days: Json | null
          working_days_per_week: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          fixed_schedule?: Json | null
          flexible_schedule?: Json | null
          fully_flexible_schedule?: Json | null
          id?: string
          is_active?: boolean
          max_overtime_hours_daily?: number | null
          max_overtime_hours_weekly?: number | null
          name: string
          name_ar: string
          schedule_type?: string
          shift_schedule?: Json | null
          weekend_days?: Json | null
          working_days_per_week?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          description_ar?: string | null
          fixed_schedule?: Json | null
          flexible_schedule?: Json | null
          fully_flexible_schedule?: Json | null
          id?: string
          is_active?: boolean
          max_overtime_hours_daily?: number | null
          max_overtime_hours_weekly?: number | null
          name?: string
          name_ar?: string
          schedule_type?: string
          shift_schedule?: Json | null
          weekend_days?: Json | null
          working_days_per_week?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          affected_table: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          affected_table: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          affected_table?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bonus_records: {
        Row: {
          amount: number
          bank_account_number: string | null
          bank_account_type: string | null
          bank_id_number: string | null
          bank_name: string | null
          bonus_number: number
          created_at: string
          department_name: string | null
          employee_code: string | null
          employee_id: string
          employee_name: string | null
          gross_salary: number
          hire_date: string | null
          id: string
          job_level: string | null
          job_title: string | null
          percentage: number
          station_name: string | null
          year: string
        }
        Insert: {
          amount?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          bonus_number: number
          created_at?: string
          department_name?: string | null
          employee_code?: string | null
          employee_id: string
          employee_name?: string | null
          gross_salary?: number
          hire_date?: string | null
          id?: string
          job_level?: string | null
          job_title?: string | null
          percentage?: number
          station_name?: string | null
          year: string
        }
        Update: {
          amount?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          bonus_number?: number
          created_at?: string
          department_name?: string | null
          employee_code?: string | null
          employee_id?: string
          employee_name?: string | null
          gross_salary?: number
          hire_date?: string | null
          id?: string
          job_level?: string | null
          job_title?: string | null
          percentage?: number
          station_name?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      device_alerts: {
        Row: {
          device_id: string
          id: string
          meta: Json | null
          reason: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          id?: string
          meta?: Json | null
          reason: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          id?: string
          meta?: Json | null
          reason?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      eid_bonuses: {
        Row: {
          amount: number
          bank_account_number: string | null
          bank_account_type: string | null
          bank_id_number: string | null
          bank_name: string | null
          bonus_number: number
          created_at: string
          department_name: string | null
          employee_code: string | null
          employee_id: string
          employee_name: string | null
          hire_date: string | null
          id: string
          job_level: string | null
          job_title: string | null
          station_name: string | null
          year: string
        }
        Insert: {
          amount?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          bonus_number: number
          created_at?: string
          department_name?: string | null
          employee_code?: string | null
          employee_id: string
          employee_name?: string | null
          hire_date?: string | null
          id?: string
          job_level?: string | null
          job_title?: string | null
          station_name?: string | null
          year: string
        }
        Update: {
          amount?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          bonus_number?: number
          created_at?: string
          department_name?: string | null
          employee_code?: string | null
          employee_id?: string
          employee_name?: string | null
          hire_date?: string | null
          id?: string
          job_level?: string | null
          job_title?: string | null
          station_name?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "eid_bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eid_bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          employee_id: string
          file_url: string | null
          id: string
          name: string
          type: string | null
          uploaded_at: string
        }
        Insert: {
          employee_id: string
          file_url?: string | null
          id?: string
          name: string
          type?: string | null
          uploaded_at?: string
        }
        Update: {
          employee_id?: string
          file_url?: string | null
          id?: string
          name?: string
          type?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          reason: string | null
          status: string
          type_ar: string
          type_en: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          reason?: string | null
          status?: string
          type_ar: string
          type_en: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          reason?: string | null
          status?: string
          type_ar?: string
          type_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          airports_annual_permit_no: string | null
          airports_permit_type: string | null
          airports_temp_permit_no: string | null
          annual_leave_balance: number | null
          annual_permit_no: string | null
          attachments: string | null
          avatar: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_id_number: string | null
          bank_name: string | null
          basic_salary: number | null
          birth_date: string | null
          birth_governorate: string | null
          birth_place: string | null
          children_count: number | null
          city: string | null
          contract_type: string | null
          created_at: string
          department_id: string | null
          dept_code: string | null
          education_ar: string | null
          email: string | null
          emergency_contact_mobile1: string | null
          emergency_contact_mobile2: string | null
          emergency_contact_name1: string | null
          emergency_contact_name2: string | null
          employee_code: string
          employment_status: string | null
          family_name: string | null
          father_name: string | null
          first_name: string | null
          gender: string | null
          governorate: string | null
          graduation_year: string | null
          has_airports_annual_permit: boolean | null
          has_airports_temp_permit: boolean | null
          has_birth_cert: boolean | null
          has_cairo_airport_annual_permit: boolean | null
          has_cairo_airport_temp_permit: boolean | null
          has_contract: boolean | null
          has_gov_health_insurance: boolean | null
          has_health_insurance: boolean | null
          has_id_copy: boolean | null
          has_military_service_cert: boolean | null
          has_pledge: boolean | null
          has_qualification_cert: boolean | null
          has_receipt: boolean | null
          has_social_insurance: boolean | null
          health_insurance_card_no: string | null
          hire_date: string | null
          home_phone: string | null
          id: string
          id_expiry_date: string | null
          id_issue_date: string | null
          issuing_authority: string | null
          issuing_governorate: string | null
          job_degree: string | null
          job_level: string | null
          job_title_ar: string | null
          job_title_en: string | null
          marital_status: string | null
          military_status: string | null
          name_ar: string
          name_en: string
          national_id: string | null
          nationality: string | null
          notes: string | null
          permit_name_ar: string | null
          permit_name_en: string | null
          phone: string | null
          recruited_by: string | null
          religion: string | null
          resignation_date: string | null
          resignation_reason: string | null
          resigned: boolean | null
          sick_leave_balance: number | null
          social_insurance_end_date: string | null
          social_insurance_no: string | null
          social_insurance_start_date: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          temp_permit_no: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          airports_annual_permit_no?: string | null
          airports_permit_type?: string | null
          airports_temp_permit_no?: string | null
          annual_leave_balance?: number | null
          annual_permit_no?: string | null
          attachments?: string | null
          avatar?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          birth_date?: string | null
          birth_governorate?: string | null
          birth_place?: string | null
          children_count?: number | null
          city?: string | null
          contract_type?: string | null
          created_at?: string
          department_id?: string | null
          dept_code?: string | null
          education_ar?: string | null
          email?: string | null
          emergency_contact_mobile1?: string | null
          emergency_contact_mobile2?: string | null
          emergency_contact_name1?: string | null
          emergency_contact_name2?: string | null
          employee_code: string
          employment_status?: string | null
          family_name?: string | null
          father_name?: string | null
          first_name?: string | null
          gender?: string | null
          governorate?: string | null
          graduation_year?: string | null
          has_airports_annual_permit?: boolean | null
          has_airports_temp_permit?: boolean | null
          has_birth_cert?: boolean | null
          has_cairo_airport_annual_permit?: boolean | null
          has_cairo_airport_temp_permit?: boolean | null
          has_contract?: boolean | null
          has_gov_health_insurance?: boolean | null
          has_health_insurance?: boolean | null
          has_id_copy?: boolean | null
          has_military_service_cert?: boolean | null
          has_pledge?: boolean | null
          has_qualification_cert?: boolean | null
          has_receipt?: boolean | null
          has_social_insurance?: boolean | null
          health_insurance_card_no?: string | null
          hire_date?: string | null
          home_phone?: string | null
          id?: string
          id_expiry_date?: string | null
          id_issue_date?: string | null
          issuing_authority?: string | null
          issuing_governorate?: string | null
          job_degree?: string | null
          job_level?: string | null
          job_title_ar?: string | null
          job_title_en?: string | null
          marital_status?: string | null
          military_status?: string | null
          name_ar: string
          name_en: string
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          permit_name_ar?: string | null
          permit_name_en?: string | null
          phone?: string | null
          recruited_by?: string | null
          religion?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          resigned?: boolean | null
          sick_leave_balance?: number | null
          social_insurance_end_date?: string | null
          social_insurance_no?: string | null
          social_insurance_start_date?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          temp_permit_no?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          airports_annual_permit_no?: string | null
          airports_permit_type?: string | null
          airports_temp_permit_no?: string | null
          annual_leave_balance?: number | null
          annual_permit_no?: string | null
          attachments?: string | null
          avatar?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_id_number?: string | null
          bank_name?: string | null
          basic_salary?: number | null
          birth_date?: string | null
          birth_governorate?: string | null
          birth_place?: string | null
          children_count?: number | null
          city?: string | null
          contract_type?: string | null
          created_at?: string
          department_id?: string | null
          dept_code?: string | null
          education_ar?: string | null
          email?: string | null
          emergency_contact_mobile1?: string | null
          emergency_contact_mobile2?: string | null
          emergency_contact_name1?: string | null
          emergency_contact_name2?: string | null
          employee_code?: string
          employment_status?: string | null
          family_name?: string | null
          father_name?: string | null
          first_name?: string | null
          gender?: string | null
          governorate?: string | null
          graduation_year?: string | null
          has_airports_annual_permit?: boolean | null
          has_airports_temp_permit?: boolean | null
          has_birth_cert?: boolean | null
          has_cairo_airport_annual_permit?: boolean | null
          has_cairo_airport_temp_permit?: boolean | null
          has_contract?: boolean | null
          has_gov_health_insurance?: boolean | null
          has_health_insurance?: boolean | null
          has_id_copy?: boolean | null
          has_military_service_cert?: boolean | null
          has_pledge?: boolean | null
          has_qualification_cert?: boolean | null
          has_receipt?: boolean | null
          has_social_insurance?: boolean | null
          health_insurance_card_no?: string | null
          hire_date?: string | null
          home_phone?: string | null
          id?: string
          id_expiry_date?: string | null
          id_issue_date?: string | null
          issuing_authority?: string | null
          issuing_governorate?: string | null
          job_degree?: string | null
          job_level?: string | null
          job_title_ar?: string | null
          job_title_en?: string | null
          marital_status?: string | null
          military_status?: string | null
          name_ar?: string
          name_en?: string
          national_id?: string | null
          nationality?: string | null
          notes?: string | null
          permit_name_ar?: string | null
          permit_name_en?: string | null
          phone?: string | null
          recruited_by?: string | null
          religion?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          resigned?: boolean | null
          sick_leave_balance?: number | null
          social_insurance_end_date?: string | null
          social_insurance_no?: string | null
          social_insurance_start_date?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          temp_permit_no?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          annual_total: number
          annual_used: number
          casual_total: number
          casual_used: number
          created_at: string
          employee_id: string
          id: string
          permissions_total: number
          permissions_used: number
          sick_total: number
          sick_used: number
          year: number
        }
        Insert: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          employee_id: string
          id?: string
          permissions_total?: number
          permissions_used?: number
          sick_total?: number
          sick_used?: number
          year: number
        }
        Update: {
          annual_total?: number
          annual_used?: number
          casual_total?: number
          casual_used?: number
          created_at?: string
          employee_id?: string
          id?: string
          permissions_total?: number
          permissions_used?: number
          sick_total?: number
          sick_used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          employee_id: string
          id: string
          installment_number: number
          loan_id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          employee_id: string
          id?: string
          installment_number: number
          loan_id: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          employee_id?: string
          id?: string
          installment_number?: number
          loan_id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_installments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_installments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          installments_count: number
          monthly_installment: number | null
          paid_count: number | null
          reason: string | null
          remaining: number | null
          start_date: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          installments_count?: number
          monthly_installment?: number | null
          paid_count?: number | null
          reason?: string | null
          remaining?: number | null
          start_date?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          installments_count?: number
          monthly_installment?: number | null
          paid_count?: number | null
          reason?: string | null
          remaining?: number | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          approved_by: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          destination: string | null
          employee_id: string
          hours: number | null
          id: string
          mission_type: string
          reason: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          destination?: string | null
          employee_id: string
          hours?: number | null
          id?: string
          mission_type?: string
          reason?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          destination?: string | null
          employee_id?: string
          hours?: number | null
          id?: string
          mission_type?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_bills: {
        Row: {
          amount: number
          created_at: string
          deduction_month: string
          employee_id: string
          id: string
          status: string
          uploaded_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          deduction_month: string
          employee_id: string
          id?: string
          status?: string
          uploaded_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          deduction_month?: string
          employee_id?: string
          id?: string
          status?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_bills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_bills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          department_id: string | null
          desc_ar: string | null
          desc_en: string | null
          employee_id: string | null
          id: string
          is_read: boolean
          module: string
          sender_name: string | null
          station_id: string | null
          target_type: string | null
          title_ar: string
          title_en: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          desc_ar?: string | null
          desc_en?: string | null
          employee_id?: string | null
          id?: string
          is_read?: boolean
          module?: string
          sender_name?: string | null
          station_id?: string | null
          target_type?: string | null
          title_ar: string
          title_en: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          desc_ar?: string | null
          desc_en?: string | null
          employee_id?: string | null
          id?: string
          is_read?: boolean
          module?: string
          sender_name?: string | null
          station_id?: string | null
          target_type?: string | null
          title_ar?: string
          title_en?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          hours: number
          id: string
          overtime_type: string
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          hours?: number
          id?: string
          overtime_type?: string
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          hours?: number
          id?: string
          overtime_type?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          advance_amount: number | null
          basic_salary: number | null
          bonus_amount: number | null
          bonus_type: string | null
          bonus_value: number | null
          employee_id: string
          employee_insurance: number | null
          employer_social_insurance: number | null
          gross: number | null
          health_insurance: number | null
          id: string
          incentives: number | null
          income_tax: number | null
          leave_days: number | null
          leave_deduction: number | null
          living_allowance: number | null
          loan_payment: number | null
          mobile_allowance: number | null
          mobile_bill: number | null
          month: string
          net_salary: number | null
          overtime_pay: number | null
          penalty_amount: number | null
          penalty_type: string | null
          penalty_value: number | null
          processed_at: string
          station_allowance: number | null
          total_deductions: number | null
          transport_allowance: number | null
          year: string
        }
        Insert: {
          advance_amount?: number | null
          basic_salary?: number | null
          bonus_amount?: number | null
          bonus_type?: string | null
          bonus_value?: number | null
          employee_id: string
          employee_insurance?: number | null
          employer_social_insurance?: number | null
          gross?: number | null
          health_insurance?: number | null
          id?: string
          incentives?: number | null
          income_tax?: number | null
          leave_days?: number | null
          leave_deduction?: number | null
          living_allowance?: number | null
          loan_payment?: number | null
          mobile_allowance?: number | null
          mobile_bill?: number | null
          month: string
          net_salary?: number | null
          overtime_pay?: number | null
          penalty_amount?: number | null
          penalty_type?: string | null
          penalty_value?: number | null
          processed_at?: string
          station_allowance?: number | null
          total_deductions?: number | null
          transport_allowance?: number | null
          year: string
        }
        Update: {
          advance_amount?: number | null
          basic_salary?: number | null
          bonus_amount?: number | null
          bonus_type?: string | null
          bonus_value?: number | null
          employee_id?: string
          employee_insurance?: number | null
          employer_social_insurance?: number | null
          gross?: number | null
          health_insurance?: number | null
          id?: string
          incentives?: number | null
          income_tax?: number | null
          leave_days?: number | null
          leave_deduction?: number | null
          living_allowance?: number | null
          loan_payment?: number | null
          mobile_allowance?: number | null
          mobile_bill?: number | null
          month?: string
          net_salary?: number | null
          overtime_pay?: number | null
          penalty_amount?: number | null
          penalty_type?: string | null
          penalty_value?: number | null
          processed_at?: string
          station_allowance?: number | null
          total_deductions?: number | null
          transport_allowance?: number | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          created_at: string
          criteria: Json | null
          employee_id: string
          goals: string | null
          id: string
          improvements: string | null
          manager_comments: string | null
          quarter: string
          review_date: string | null
          reviewer_id: string | null
          score: number | null
          status: string
          strengths: string | null
          year: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          employee_id: string
          goals?: string | null
          id?: string
          improvements?: string | null
          manager_comments?: string | null
          quarter: string
          review_date?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string
          strengths?: string | null
          year: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          employee_id?: string
          goals?: string | null
          id?: string
          improvements?: string | null
          manager_comments?: string | null
          quarter?: string
          review_date?: string | null
          reviewer_id?: string | null
          score?: number | null
          status?: string
          strengths?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_system: boolean
          modules: Json
          name_ar: string
          name_en: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_system?: boolean
          modules?: Json
          name_ar: string
          name_en: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_system?: boolean
          modules?: Json
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      permission_requests: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          end_time: string
          hours: number | null
          id: string
          permission_type: string
          reason: string | null
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          end_time: string
          hours?: number | null
          id?: string
          permission_type: string
          reason?: string | null
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          end_time?: string
          hours?: number | null
          id?: string
          permission_type?: string
          reason?: string | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_course_assignments: {
        Row: {
          actual_date: string | null
          created_at: string
          employee_id: string
          id: string
          planned_course_id: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          employee_id: string
          id?: string
          planned_course_id: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          planned_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_course_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_course_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_course_assignments_planned_course_id_fkey"
            columns: ["planned_course_id"]
            isOneToOne: false
            referencedRelation: "planned_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_courses: {
        Row: {
          cost: number | null
          course_code: string
          course_id: string | null
          course_name: string
          created_at: string
          duration: string | null
          id: string
          location: string | null
          participants: number | null
          planned_date: string | null
          provider: string | null
          status: string
          trainer: string | null
        }
        Insert: {
          cost?: number | null
          course_code?: string
          course_id?: string | null
          course_name?: string
          created_at?: string
          duration?: string | null
          id?: string
          location?: string | null
          participants?: number | null
          planned_date?: string | null
          provider?: string | null
          status?: string
          trainer?: string | null
        }
        Update: {
          cost?: number | null
          course_code?: string
          course_id?: string | null
          course_name?: string
          created_at?: string
          duration?: string | null
          id?: string
          location?: string | null
          participants?: number | null
          planned_date?: string | null
          provider?: string | null
          status?: string
          trainer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      property_taxes: {
        Row: {
          address: string | null
          amount: number
          area_sqm: number | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          property_type: string | null
          receipt_number: string | null
          rental_value: number | null
          station_id: string | null
          status: string
          tax_period: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount?: number
          area_sqm?: number | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          property_type?: string | null
          receipt_number?: string | null
          rental_value?: number | null
          station_id?: string | null
          status?: string
          tax_period?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount?: number
          area_sqm?: number | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          property_type?: string | null
          receipt_number?: string | null
          rental_value?: number | null
          station_id?: string | null
          status?: string
          tax_period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_taxes_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_location_stations: {
        Row: {
          created_at: string
          id: string
          location_id: string
          station_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          station_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_location_stations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "qr_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_location_stations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name_ar: string
          name_en: string
          radius_m: number | null
          station_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name_ar: string
          name_en: string
          radius_m?: number | null
          station_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name_ar?: string
          name_en?: string
          radius_m?: number | null
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_locations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          basic_salary: number | null
          created_at: string
          employee_id: string
          employee_insurance: number | null
          employer_social_insurance: number | null
          health_insurance: number | null
          id: string
          incentives: number | null
          income_tax: number | null
          living_allowance: number | null
          mobile_allowance: number | null
          roster_allowance: number | null
          station_allowance: number | null
          transport_allowance: number | null
          year: string
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string
          employee_id: string
          employee_insurance?: number | null
          employer_social_insurance?: number | null
          health_insurance?: number | null
          id?: string
          incentives?: number | null
          income_tax?: number | null
          living_allowance?: number | null
          mobile_allowance?: number | null
          roster_allowance?: number | null
          station_allowance?: number | null
          transport_allowance?: number | null
          year: string
        }
        Update: {
          basic_salary?: number | null
          created_at?: string
          employee_id?: string
          employee_insurance?: number | null
          employer_social_insurance?: number | null
          health_insurance?: number | null
          id?: string
          incentives?: number | null
          income_tax?: number | null
          living_allowance?: number | null
          mobile_allowance?: number | null
          roster_allowance?: number | null
          station_allowance?: number | null
          transport_allowance?: number | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          checkin_method: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          timezone: string
        }
        Insert: {
          checkin_method?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          timezone?: string
        }
        Update: {
          checkin_method?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          timezone?: string
        }
        Relationships: []
      }
      training_acknowledgments: {
        Row: {
          acknowledged_at: string
          employee_id: string
          id: string
          training_record_id: string
        }
        Insert: {
          acknowledged_at?: string
          employee_id: string
          id?: string
          training_record_id: string
        }
        Update: {
          acknowledged_at?: string
          employee_id?: string
          id?: string
          training_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_acknowledgments_training_record_id_fkey"
            columns: ["training_record_id"]
            isOneToOne: false
            referencedRelation: "training_records"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          advanced_topics: string | null
          basic_topics: string | null
          course_administration: string | null
          course_code: string | null
          course_duration: string | null
          course_objective: string | null
          created_at: string
          description: string | null
          duration_hours: number | null
          edited_by: string | null
          examination: string | null
          exercises: string | null
          id: string
          intermediate_topics: string | null
          is_active: boolean | null
          name_ar: string
          name_en: string
          provider: string | null
          reference_material: string | null
          validity_years: number | null
        }
        Insert: {
          advanced_topics?: string | null
          basic_topics?: string | null
          course_administration?: string | null
          course_code?: string | null
          course_duration?: string | null
          course_objective?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          edited_by?: string | null
          examination?: string | null
          exercises?: string | null
          id?: string
          intermediate_topics?: string | null
          is_active?: boolean | null
          name_ar: string
          name_en: string
          provider?: string | null
          reference_material?: string | null
          validity_years?: number | null
        }
        Update: {
          advanced_topics?: string | null
          basic_topics?: string | null
          course_administration?: string | null
          course_code?: string | null
          course_duration?: string | null
          course_objective?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          edited_by?: string | null
          examination?: string | null
          exercises?: string | null
          id?: string
          intermediate_topics?: string | null
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          provider?: string | null
          reference_material?: string | null
          validity_years?: number | null
        }
        Relationships: []
      }
      training_debts: {
        Row: {
          actual_date: string
          cost: number
          course_name: string
          created_at: string
          employee_id: string
          expiry_date: string
          id: string
        }
        Insert: {
          actual_date: string
          cost?: number
          course_name: string
          created_at?: string
          employee_id: string
          expiry_date: string
          id?: string
        }
        Update: {
          actual_date?: string
          cost?: number
          course_name?: string
          created_at?: string
          employee_id?: string
          expiry_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_debts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_debts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          cost: number | null
          course_id: string | null
          created_at: string
          employee_id: string
          end_date: string | null
          has_cb: boolean | null
          has_cert: boolean | null
          has_cr: boolean | null
          has_ss: boolean | null
          id: string
          is_favorite: boolean | null
          location: string | null
          planned_date: string | null
          provider: string | null
          score: number | null
          start_date: string | null
          status: string
          total_cost: number | null
        }
        Insert: {
          cost?: number | null
          course_id?: string | null
          created_at?: string
          employee_id: string
          end_date?: string | null
          has_cb?: boolean | null
          has_cert?: boolean | null
          has_cr?: boolean | null
          has_ss?: boolean | null
          id?: string
          is_favorite?: boolean | null
          location?: string | null
          planned_date?: string | null
          provider?: string | null
          score?: number | null
          start_date?: string | null
          status?: string
          total_cost?: number | null
        }
        Update: {
          cost?: number | null
          course_id?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string | null
          has_cb?: boolean | null
          has_cert?: boolean | null
          has_cr?: boolean | null
          has_ss?: boolean | null
          id?: string
          is_favorite?: boolean | null
          location?: string | null
          planned_date?: string | null
          provider?: string | null
          score?: number | null
          start_date?: string | null
          status?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      uniform_acknowledgments: {
        Row: {
          acknowledged_at: string
          employee_id: string
          id: string
          uniform_id: string
        }
        Insert: {
          acknowledged_at?: string
          employee_id: string
          id?: string
          uniform_id: string
        }
        Update: {
          acknowledged_at?: string
          employee_id?: string
          id?: string
          uniform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uniform_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniform_acknowledgments_uniform_id_fkey"
            columns: ["uniform_id"]
            isOneToOne: false
            referencedRelation: "uniforms"
            referencedColumns: ["id"]
          },
        ]
      }
      uniforms: {
        Row: {
          created_at: string
          delivery_date: string
          employee_id: string
          id: string
          notes: string | null
          quantity: number
          total_price: number | null
          type_ar: string
          type_en: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          delivery_date: string
          employee_id: string
          id?: string
          notes?: string | null
          quantity?: number
          total_price?: number | null
          type_ar: string
          type_en: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          delivery_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          quantity?: number
          total_price?: number | null
          type_ar?: string
          type_en?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uniforms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniforms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          bound_at: string
          browser: string | null
          device_id: string
          device_type: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          bound_at?: string
          browser?: string | null
          device_id: string
          device_type?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          bound_at?: string
          browser?: string | null
          device_id?: string
          device_type?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          created_at: string
          custom_modules: Json | null
          id: string
          profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_modules?: Json | null
          id?: string
          profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_modules?: Json | null
          id?: string
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          employee_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          station_id: string | null
          user_id: string
        }
        Insert: {
          employee_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          station_id?: string | null
          user_id: string
        }
        Update: {
          employee_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          station_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_roles_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          odometer_reading: number | null
          provider: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          provider?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          odometer_reading?: number | null
          provider?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          chassis_number: string | null
          color: string | null
          created_at: string
          curtains_license_end: string | null
          curtains_license_start: string | null
          engine_number: string | null
          id: string
          insurance_number: string | null
          insured_driver_name: string | null
          license_end_date: string | null
          license_start_date: string | null
          model: string
          notes: string | null
          plate_number: string
          station_id: string | null
          status: string
          transport_license_end: string | null
          transport_license_start: string | null
          updated_at: string
          vehicle_code: string
          year: number
        }
        Insert: {
          brand: string
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          curtains_license_end?: string | null
          curtains_license_start?: string | null
          engine_number?: string | null
          id?: string
          insurance_number?: string | null
          insured_driver_name?: string | null
          license_end_date?: string | null
          license_start_date?: string | null
          model: string
          notes?: string | null
          plate_number: string
          station_id?: string | null
          status?: string
          transport_license_end?: string | null
          transport_license_start?: string | null
          updated_at?: string
          vehicle_code: string
          year: number
        }
        Update: {
          brand?: string
          chassis_number?: string | null
          color?: string | null
          created_at?: string
          curtains_license_end?: string | null
          curtains_license_start?: string | null
          engine_number?: string | null
          id?: string
          insurance_number?: string | null
          insured_driver_name?: string | null
          license_end_date?: string | null
          license_start_date?: string | null
          model?: string
          notes?: string | null
          plate_number?: string
          station_id?: string | null
          status?: string
          transport_license_end?: string | null
          transport_license_start?: string | null
          updated_at?: string
          vehicle_code?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          employee_id: string
          id: string
          penalty: string | null
          status: string
          type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          employee_id: string
          id?: string
          penalty?: string | null
          status?: string
          type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          employee_id?: string
          id?: string
          penalty?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_limited_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_limited_view: {
        Row: {
          avatar: string | null
          contract_type: string | null
          created_at: string | null
          department_id: string | null
          dept_code: string | null
          email: string | null
          employee_code: string | null
          employment_status: string | null
          family_name: string | null
          father_name: string | null
          first_name: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          job_degree: string | null
          job_level: string | null
          job_title_ar: string | null
          job_title_en: string | null
          name_ar: string | null
          name_en: string | null
          phone: string | null
          resignation_date: string | null
          resigned: boolean | null
          station_id: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          contract_type?: string | null
          created_at?: string | null
          department_id?: string | null
          dept_code?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?: string | null
          family_name?: string | null
          father_name?: string | null
          first_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          job_degree?: string | null
          job_level?: string | null
          job_title_ar?: string | null
          job_title_en?: string | null
          name_ar?: string | null
          name_en?: string | null
          phone?: string | null
          resignation_date?: string | null
          resigned?: boolean | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          contract_type?: string | null
          created_at?: string | null
          department_id?: string | null
          dept_code?: string | null
          email?: string | null
          employee_code?: string | null
          employment_status?: string | null
          family_name?: string | null
          father_name?: string | null
          first_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          job_degree?: string | null
          job_level?: string | null
          job_title_ar?: string | null
          job_title_en?: string | null
          name_ar?: string | null
          name_en?: string | null
          phone?: string | null
          resignation_date?: string | null
          resigned?: boolean | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_area_manager_station_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_employee_id: { Args: { _user_id: string }; Returns: string }
      get_user_station_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_employee_and_admins: {
        Args: {
          p_desc_ar?: string
          p_desc_en?: string
          p_employee_id: string
          p_module?: string
          p_title_ar: string
          p_title_en: string
          p_type?: string
        }
        Returns: undefined
      }
      upsert_mobile_bill: {
        Args: {
          p_amount: number
          p_deduction_month: string
          p_employee_id: string
          p_uploaded_by: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "station_manager"
        | "employee"
        | "kiosk"
        | "training_manager"
        | "hr"
        | "area_manager"
      employee_status:
        | "active"
        | "inactive"
        | "suspended"
        | "external_stations"
        | "stopped"
        | "absent"
        | "pending_hire"
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
        "station_manager",
        "employee",
        "kiosk",
        "training_manager",
        "hr",
        "area_manager",
      ],
      employee_status: [
        "active",
        "inactive",
        "suspended",
        "external_stations",
        "stopped",
        "absent",
        "pending_hire",
      ],
    },
  },
} as const
