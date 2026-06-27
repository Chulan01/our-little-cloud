export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type DbRecord<T extends object> = T & Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      couples: {
        Row: DbRecord<{
          id: string;
          name: string;
          anniversary_date: string | null;
          invite_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          name: string;
          anniversary_date?: string | null;
          invite_code?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["couples"]["Insert"]>>;
        Relationships: [];
      };
      profiles: {
        Row: DbRecord<{
          id: string;
          couple_id: string | null;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id: string;
          couple_id?: string | null;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["profiles"]["Insert"]>>;
        Relationships: [];
      };
      memories: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          author_id: string;
          memory_date: string;
          title: string;
          body: string;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          couple_id: string;
          author_id: string;
          memory_date: string;
          title: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["memories"]["Insert"]>>;
        Relationships: [];
      };
      memory_photos: {
        Row: DbRecord<{
          id: string;
          memory_id: string;
          couple_id: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          position: number;
          created_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          memory_id: string;
          couple_id: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          position?: number;
          created_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["memory_photos"]["Insert"]>>;
        Relationships: [];
      };
      love_reasons: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          author_id: string;
          number: number;
          text: string;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          couple_id: string;
          author_id: string;
          number: number;
          text: string;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["love_reasons"]["Insert"]>>;
        Relationships: [];
      };
      time_capsules: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          author_id: string;
          title: string;
          body: string;
          open_at: string;
          is_opened: boolean;
          opened_at: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          couple_id: string;
          author_id: string;
          title: string;
          body: string;
          open_at: string;
          is_opened?: boolean;
          opened_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["time_capsules"]["Insert"]>>;
        Relationships: [];
      };
      time_capsule_photos: {
        Row: DbRecord<Omit<Database["public"]["Tables"]["memory_photos"]["Row"], "memory_id"> & { capsule_id: string }>;
        Insert: DbRecord<Omit<Database["public"]["Tables"]["memory_photos"]["Insert"], "memory_id"> & { capsule_id: string }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["time_capsule_photos"]["Insert"]>>;
        Relationships: [];
      };
      love_counters: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          label: string;
          emoji: string | null;
          value: number;
          is_auto: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          couple_id: string;
          label: string;
          emoji?: string | null;
          value?: number;
          is_auto?: boolean;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["love_counters"]["Insert"]>>;
        Relationships: [];
      };
      counter_history: {
        Row: DbRecord<{
          id: string;
          counter_id: string;
          couple_id: string;
          changed_by: string;
          delta: number;
          new_value: number;
          created_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          counter_id: string;
          couple_id: string;
          changed_by: string;
          delta: number;
          new_value: number;
          created_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["counter_history"]["Insert"]>>;
        Relationships: [];
      };
      secret_messages: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          reveal_at: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        }>;
        Insert: DbRecord<{
          id?: string;
          couple_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          reveal_at?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        }>;
        Update: DbRecord<Partial<Database["public"]["Tables"]["secret_messages"]["Insert"]>>;
        Relationships: [];
      };
    };
    Views: {
      time_capsules_safe: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          author_id: string;
          title: string;
          body: string | null;
          open_at: string;
          is_opened: boolean;
          opened_at: string | null;
          created_at: string;
          updated_at: string;
          can_open: boolean;
        }>;
        Relationships: [];
      };
      secret_messages_safe: {
        Row: DbRecord<{
          id: string;
          couple_id: string;
          sender_id: string;
          recipient_id: string;
          body: string | null;
          reveal_at: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          is_revealed: boolean;
        }>;
        Relationships: [];
      };
    };
    Functions: {
      join_couple_by_invite: {
        Args: { p_invite_code: string };
        Returns: Database["public"]["Tables"]["couples"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
