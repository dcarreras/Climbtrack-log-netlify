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
      attachments: {
        Row: {
          climb_id: string | null
          created_at: string
          file_url: string
          id: string
          session_id: string | null
          type: Database["public"]["Enums"]["attachment_type"]
          user_id: string
        }
        Insert: {
          climb_id?: string | null
          created_at?: string
          file_url: string
          id?: string
          session_id?: string | null
          type: Database["public"]["Enums"]["attachment_type"]
          user_id: string
        }
        Update: {
          climb_id?: string | null
          created_at?: string
          file_url?: string
          id?: string
          session_id?: string | null
          type?: Database["public"]["Enums"]["attachment_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_climb_id_fkey"
            columns: ["climb_id"]
            isOneToOne: false
            referencedRelation: "climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      climbs: {
        Row: {
          attempts: number
          color_band: Database["public"]["Enums"]["color_band"] | null
          created_at: string
          discipline: Database["public"]["Enums"]["discipline"]
          fall_count: number | null
          flash: boolean
          grade_system: Database["public"]["Enums"]["grade_system"] | null
          grade_value: string | null
          hold_type: Database["public"]["Enums"]["hold_type"] | null
          id: string
          notes: string | null
          sent: boolean
          session_id: string
          style: Database["public"]["Enums"]["climb_style"] | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          color_band?: Database["public"]["Enums"]["color_band"] | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          fall_count?: number | null
          flash?: boolean
          grade_system?: Database["public"]["Enums"]["grade_system"] | null
          grade_value?: string | null
          hold_type?: Database["public"]["Enums"]["hold_type"] | null
          id?: string
          notes?: string | null
          sent?: boolean
          session_id: string
          style?: Database["public"]["Enums"]["climb_style"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          color_band?: Database["public"]["Enums"]["color_band"] | null
          created_at?: string
          discipline?: Database["public"]["Enums"]["discipline"]
          fall_count?: number | null
          flash?: boolean
          grade_system?: Database["public"]["Enums"]["grade_system"] | null
          grade_value?: string | null
          hold_type?: Database["public"]["Enums"]["hold_type"] | null
          id?: string
          notes?: string | null
          sent?: boolean
          session_id?: string
          style?: Database["public"]["Enums"]["climb_style"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climbs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      hangboard_protocols: {
        Row: {
          created_at: string
          description: string | null
          grip_type: string
          hang_time: number
          id: string
          name: string
          reps_per_set: number
          rest_between_sets: number
          rest_time: number
          sets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grip_type?: string
          hang_time?: number
          id?: string
          name: string
          reps_per_set?: number
          rest_between_sets?: number
          rest_time?: number
          sets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grip_type?: string
          hang_time?: number
          id?: string
          name?: string
          reps_per_set?: number
          rest_between_sets?: number
          rest_time?: number
          sets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_sessions: {
        Row: {
          completed: boolean
          completed_session_id: string | null
          created_at: string
          date: string
          distance_km: number | null
          gym_id: string | null
          id: string
          notes: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          time_min: number | null
          trainer_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_session_id?: string | null
          created_at?: string
          date: string
          distance_km?: number | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          time_min?: number | null
          trainer_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_session_id?: string | null
          created_at?: string
          date?: string
          distance_km?: number | null
          gym_id?: string | null
          id?: string
          notes?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          time_min?: number | null
          trainer_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_sessions_completed_session_id_fkey"
            columns: ["completed_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_grade_system:
            | Database["public"]["Enums"]["grade_system"]
            | null
          display_name: string | null
          id: string
          units: string | null
          updated_at: string
          weekly_running_km_goal: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_grade_system?:
            | Database["public"]["Enums"]["grade_system"]
            | null
          display_name?: string | null
          id: string
          units?: string | null
          updated_at?: string
          weekly_running_km_goal?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_grade_system?:
            | Database["public"]["Enums"]["grade_system"]
            | null
          display_name?: string | null
          id?: string
          units?: string | null
          updated_at?: string
          weekly_running_km_goal?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          body_weight_kg: number | null
          created_at: string
          date: string
          description: string | null
          distance_km: number | null
          duration_min: number | null
          elevation_gain_m: number | null
          gym_id: string | null
          id: string
          mood: string | null
          notes: string | null
          rpe_1_10: number | null
          session_type: Database["public"]["Enums"]["session_type"]
          time_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_weight_kg?: number | null
          created_at?: string
          date?: string
          description?: string | null
          distance_km?: number | null
          duration_min?: number | null
          elevation_gain_m?: number | null
          gym_id?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          rpe_1_10?: number | null
          session_type?: Database["public"]["Enums"]["session_type"]
          time_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_weight_kg?: number | null
          created_at?: string
          date?: string
          description?: string | null
          distance_km?: number | null
          duration_min?: number | null
          elevation_gain_m?: number | null
          gym_id?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          rpe_1_10?: number | null
          session_type?: Database["public"]["Enums"]["session_type"]
          time_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_activities: {
        Row: {
          average_heartrate: number | null
          average_speed: number | null
          calories: number | null
          created_at: string
          distance_meters: number | null
          elapsed_time_seconds: number | null
          id: string
          max_heartrate: number | null
          max_speed: number | null
          moving_time_seconds: number | null
          name: string
          raw_data: Json | null
          sport_type: string | null
          start_date: string
          strava_id: number
          synced_to_session_id: string | null
          total_elevation_gain: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_heartrate?: number | null
          average_speed?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          elapsed_time_seconds?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time_seconds?: number | null
          name: string
          raw_data?: Json | null
          sport_type?: string | null
          start_date: string
          strava_id: number
          synced_to_session_id?: string | null
          total_elevation_gain?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_heartrate?: number | null
          average_speed?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          elapsed_time_seconds?: number | null
          id?: string
          max_heartrate?: number | null
          max_speed?: number | null
          moving_time_seconds?: number | null
          name?: string
          raw_data?: Json | null
          sport_type?: string | null
          start_date?: string
          strava_id?: number
          synced_to_session_id?: string | null
          total_elevation_gain?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strava_activities_synced_to_session_id_fkey"
            columns: ["synced_to_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_id: number
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_id: number
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_id?: number
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_blocks: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          protocol: string | null
          reps: number | null
          rest_sec: number | null
          session_id: string
          sets: number | null
          work_sec: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          protocol?: string | null
          reps?: number | null
          rest_sec?: number | null
          session_id: string
          sets?: number | null
          work_sec?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          protocol?: string | null
          reps?: number | null
          rest_sec?: number | null
          session_id?: string
          sets?: number | null
          work_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          added_weight_kg: number | null
          completed_at: string
          created_at: string
          duration_seconds: number | null
          grip_type: string | null
          hang_time: number | null
          id: string
          notes: string | null
          protocol_name: string
          rest_time: number | null
          session_type: string
          sets_completed: number
          total_sets: number
          user_id: string
        }
        Insert: {
          added_weight_kg?: number | null
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          grip_type?: string | null
          hang_time?: number | null
          id?: string
          notes?: string | null
          protocol_name: string
          rest_time?: number | null
          session_type: string
          sets_completed?: number
          total_sets?: number
          user_id: string
        }
        Update: {
          added_weight_kg?: number | null
          completed_at?: string
          created_at?: string
          duration_seconds?: number | null
          grip_type?: string | null
          hang_time?: number | null
          id?: string
          notes?: string | null
          protocol_name?: string
          rest_time?: number | null
          session_type?: string
          sets_completed?: number
          total_sets?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attachment_type: "photo" | "video"
      climb_style: "slab" | "vertical" | "overhang" | "roof"
      color_band:
        | "white"
        | "blue"
        | "green"
        | "yellow"
        | "red"
        | "black"
        | "orange"
        | "purple"
        | "pink"
      discipline: "boulder" | "route"
      grade_system: "font" | "v-grade" | "french" | "yds"
      hold_type: "jugs" | "crimps" | "slopers" | "pinches" | "mixed"
      session_type: "boulder" | "rope" | "hybrid" | "training" | "running"
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
      attachment_type: ["photo", "video"],
      climb_style: ["slab", "vertical", "overhang", "roof"],
      color_band: [
        "white",
        "blue",
        "green",
        "yellow",
        "red",
        "black",
        "orange",
        "purple",
        "pink",
      ],
      discipline: ["boulder", "route"],
      grade_system: ["font", "v-grade", "french", "yds"],
      hold_type: ["jugs", "crimps", "slopers", "pinches", "mixed"],
      session_type: ["boulder", "rope", "hybrid", "training", "running"],
    },
  },
} as const
