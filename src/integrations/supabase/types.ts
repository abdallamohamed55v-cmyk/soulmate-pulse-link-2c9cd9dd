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
      ai_personalization: {
        Row: {
          about: string | null
          ai_traits: string | null
          call_name: string | null
          created_at: string | null
          custom_instructions: string | null
          id: string
          interests: string[]
          language_style: string
          preferred_tier: string
          profession: string | null
          tone_creativity: number
          tone_formality: number
          tone_verbosity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          about?: string | null
          ai_traits?: string | null
          call_name?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          id?: string
          interests?: string[]
          language_style?: string
          preferred_tier?: string
          profession?: string | null
          tone_creativity?: number
          tone_formality?: number
          tone_verbosity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          about?: string | null
          ai_traits?: string | null
          call_name?: string | null
          created_at?: string | null
          custom_instructions?: string | null
          id?: string
          interests?: string[]
          language_style?: string
          preferred_tier?: string
          profession?: string | null
          tone_creativity?: number
          tone_formality?: number
          tone_verbosity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          block_reason: string | null
          created_at: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          label: string | null
          last_error_at: string | null
          last_used_at: string | null
          service: string
          usage_count: number | null
        }
        Insert: {
          api_key: string
          block_reason?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          service: string
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          block_reason?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          service?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      attachment_chunks: {
        Row: {
          chunk_index: number
          content: string
          conversation_id: string | null
          created_at: string
          embedding: string | null
          file_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          chunk_index?: number
          content: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          file_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          content: Json | null
          cover_url: string | null
          created_at: string
          credits_used: number | null
          id: string
          language: string
          outline: Json | null
          pages_count: number
          pdf_url: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          language?: string
          outline?: Json | null
          pages_count?: number
          pdf_url?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json | null
          cover_url?: string | null
          created_at?: string
          credits_used?: number | null
          id?: string
          language?: string
          outline?: Json | null
          pages_count?: number
          pdf_url?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_admins: {
        Row: {
          added_by: number | null
          created_at: string | null
          id: string
          telegram_chat_id: number
        }
        Insert: {
          added_by?: number | null
          created_at?: string | null
          id?: string
          telegram_chat_id: number
        }
        Update: {
          added_by?: number | null
          created_at?: string | null
          id?: string
          telegram_chat_id?: number
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          calendar_email: string | null
          created_at: string
          id: string
          provider: string
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_email?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_citations: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          index_num: number
          message_id: string | null
          snippet: string | null
          source_type: string | null
          title: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          index_num: number
          message_id?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          index_num?: number
          message_id?: string | null
          snippet?: string | null
          source_type?: string | null
          title?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_citations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_citations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_followups: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          questions: Json
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          questions?: Json
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          questions?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_followups_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_followups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_router_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          latency_ms: number | null
          routed: Json
          user_id: string | null
          user_text: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          routed?: Json
          user_id?: string | null
          user_text?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          routed?: Json
          user_id?: string | null
          user_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_router_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_router_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_semantic_cache: {
        Row: {
          created_at: string
          expires_at: string
          hits: number
          id: string
          model: string | null
          query_embedding: Json | null
          query_hash: string
          query_text: string
          response: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hits?: number
          id?: string
          model?: string | null
          query_embedding?: Json | null
          query_hash: string
          query_text: string
          response: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hits?: number
          id?: string
          model?: string | null
          query_embedding?: Json | null
          query_hash?: string
          query_text?: string
          response?: string
        }
        Relationships: []
      }
      code_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          project_id: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          project_id?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          project_id?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          ai_reply: string | null
          created_at: string
          email: string
          form_type: string
          id: string
          message: string
          name: string
          reply_sent: boolean
          subject: string | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          email: string
          form_type?: string
          id?: string
          message: string
          name: string
          reply_sent?: boolean
          subject?: string | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          email?: string
          form_type?: string
          id?: string
          message?: string
          name?: string
          reply_sent?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      conversation_invites: {
        Row: {
          accepted_by: string | null
          conversation_id: string
          created_at: string
          expires_at: string
          id: string
          invite_email: string | null
          invite_token: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_by?: string | null
          conversation_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_email?: string | null
          invite_token?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_by?: string | null
          conversation_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_email?: string | null
          invite_token?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_invites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          key_points: Json
          last_message_at: string | null
          metadata: Json
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          key_points?: Json
          last_message_at?: string | null
          metadata?: Json
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          key_points?: Json
          last_message_at?: string | null
          metadata?: Json
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          is_shared: boolean | null
          mode: string
          model: string | null
          pinned_at: string | null
          share_id: string | null
          title: string
          ui_state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_shared?: boolean | null
          mode?: string
          model?: string | null
          pinned_at?: string | null
          share_id?: string | null
          title?: string
          ui_state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_shared?: boolean | null
          mode?: string
          model?: string | null
          pinned_at?: string | null
          share_id?: string | null
          title?: string
          ui_state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_type: string
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_free_usage: {
        Row: {
          created_at: string
          id: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      deapi_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          last_used_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      document_premium_usage: {
        Row: {
          id: string
          kind: string | null
          template_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          kind?: string | null
          template_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          kind?: string | null
          template_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_template_images: {
        Row: {
          created_at: string
          image_url: string
          source: string
          template_id: string
          updated_at: string
          uploaded_by_chat_id: number | null
        }
        Insert: {
          created_at?: string
          image_url: string
          source?: string
          template_id: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Update: {
          created_at?: string
          image_url?: string
          source?: string
          template_id?: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_template_images_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: true
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          preview_url: string | null
          sort_order: number
          structure: Json
          style: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id: string
          kind: string
          name: string
          preview_url?: string | null
          sort_order?: number
          structure?: Json
          style?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          preview_url?: string | null
          sort_order?: number
          structure?: Json
          style?: Json
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          to_email: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          to_email: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          to_email?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_seconds: number
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          planned_minutes: number
          status: string
          task_name: string
          user_id: string
        }
        Insert: {
          actual_seconds?: number
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          status?: string
          task_name: string
          user_id: string
        }
        Update: {
          actual_seconds?: number
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          planned_minutes?: number
          status?: string
          task_name?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_sites: {
        Row: {
          created_at: string
          error_message: string | null
          html_compiled: string | null
          id: string
          is_public: boolean
          jsx_code: string | null
          model_used: string | null
          prompt: string
          share_slug: string | null
          status: string
          title: string
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          html_compiled?: string | null
          id?: string
          is_public?: boolean
          jsx_code?: string | null
          model_used?: string | null
          prompt: string
          share_slug?: string | null
          status?: string
          title?: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          html_compiled?: string | null
          id?: string
          is_public?: boolean
          jsx_code?: string | null
          model_used?: string | null
          prompt?: string
          share_slug?: string | null
          status?: string
          title?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_songs: {
        Row: {
          audio_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          prompt: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          prompt?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_data: Json
          job_type: string
          progress: number | null
          result_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json
          job_type?: string
          progress?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      headshot_templates: {
        Row: {
          created_at: string | null
          display_order: number | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          prompt: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          prompt: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          prompt?: string
        }
        Relationships: []
      }
      image_templates: {
        Row: {
          created_at: string
          display_order: number
          example_image_url: string | null
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          prompt: string
          type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          example_image_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          prompt: string
          type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          example_image_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          prompt?: string
          type?: string
        }
        Relationships: []
      }
      learn_profile: {
        Row: {
          analogy_style: string | null
          created_at: string
          interests: string[] | null
          level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analogy_style?: string | null
          created_at?: string
          interests?: string[] | null
          level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analogy_style?: string | null
          created_at?: string
          interests?: string[] | null
          level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learn_sessions: {
        Row: {
          conversation_id: string | null
          created_at: string
          duration_min: number | null
          id: string
          mastered_topics: Json | null
          questions_correct: number | null
          questions_total: number | null
          topic: string | null
          user_id: string
          weak_topics: Json | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          mastered_topics?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          topic?: string | null
          user_id: string
          weak_topics?: Json | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          duration_min?: number | null
          id?: string
          mastered_topics?: Json | null
          questions_correct?: number | null
          questions_total?: number | null
          topic?: string | null
          user_id?: string
          weak_topics?: Json | null
        }
        Relationships: []
      }
      lemondata_keys: {
        Row: {
          api_key: string
          block_reason: string | null
          created_at: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          is_blocked: boolean | null
          label: string | null
          last_error_at: string | null
          last_used_at: string | null
          usage_count: number | null
        }
        Insert: {
          api_key: string
          block_reason?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          usage_count?: number | null
        }
        Update: {
          api_key?: string
          block_reason?: string | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          is_blocked?: boolean | null
          label?: string | null
          last_error_at?: string | null
          last_used_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      meeting_recordings: {
        Row: {
          action_items: Json | null
          audio_url: string | null
          created_at: string
          credits_used: number | null
          decisions: Json | null
          duration_minutes: number | null
          id: string
          key_points: Json | null
          meeting_id: string
          status: string
          summary: string | null
          transcript: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          key_points?: Json | null
          meeting_id: string
          status?: string
          summary?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          audio_url?: string | null
          created_at?: string
          credits_used?: number | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          key_points?: Json | null
          meeting_id?: string
          status?: string
          summary?: string | null
          transcript?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_recordings_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          bot_enabled: boolean
          bot_id: string | null
          calendar_event_id: string | null
          created_at: string
          end_time: string
          id: string
          meeting_url: string | null
          platform: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_enabled?: boolean
          bot_id?: string | null
          calendar_event_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          meeting_url?: string | null
          platform?: string | null
          start_time: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_enabled?: boolean
          bot_id?: string | null
          calendar_event_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          meeting_url?: string | null
          platform?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          conversation_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          conversation_id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          images: string[] | null
          liked: boolean | null
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          images?: string[] | null
          liked?: boolean | null
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          images?: string[] | null
          liked?: boolean | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          model_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          media_url: string
          model_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          model_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          app_credits: boolean
          app_generation: boolean
          app_referral: boolean
          app_system: boolean
          created_at: string
          email_low_balance: boolean
          email_newsletter: boolean
          email_transactions: boolean
          email_welcome: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_credits?: boolean
          app_generation?: boolean
          app_referral?: boolean
          app_system?: boolean
          created_at?: string
          email_low_balance?: boolean
          email_newsletter?: boolean
          email_transactions?: boolean
          email_welcome?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_credits?: boolean
          app_generation?: boolean
          app_referral?: boolean
          app_system?: boolean
          created_at?: string
          email_low_balance?: boolean
          email_newsletter?: boolean
          email_transactions?: boolean
          email_welcome?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret_hash: string
          created_at: string | null
          id: string
          is_public: boolean | null
          logo_url: string | null
          name: string
          redirect_uris: string[]
          user_id: string
        }
        Insert: {
          client_id: string
          client_secret_hash: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          redirect_uris?: string[]
          user_id: string
        }
        Update: {
          client_id?: string
          client_secret_hash?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          redirect_uris?: string[]
          user_id?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          client_id: string
          code: string
          created_at: string | null
          expires_at: string
          id: string
          redirect_uri: string
          scope: string | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          redirect_uri: string
          scope?: string | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          redirect_uri?: string
          scope?: string | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_tokens: {
        Row: {
          access_token: string
          client_id: string
          created_at: string | null
          expires_at: string
          id: string
          scope: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          scope?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          scope?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          polar_event_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          polar_event_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          polar_event_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      premium_usage: {
        Row: {
          id: string
          template_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          template_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_orders: {
        Row: {
          created_at: string
          credits: number
          id: string
          plan: string | null
          polar_order_id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          plan?: string | null
          polar_order_id: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          plan?: string | null
          polar_order_id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          id: string
          plan: string
          two_factor_enabled: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id: string
          plan?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          plan?: string
          two_factor_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string | null
          files_snapshot: Json | null
          fly_app_name: string | null
          fly_machine_id: string | null
          id: string
          name: string
          preview_url: string | null
          repo_url: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          webly_project_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          files_snapshot?: Json | null
          fly_app_name?: string | null
          fly_machine_id?: string | null
          id?: string
          name?: string
          preview_url?: string | null
          repo_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          webly_project_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          files_snapshot?: Json | null
          fly_app_name?: string | null
          fly_machine_id?: string | null
          id?: string
          name?: string
          preview_url?: string | null
          repo_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          webly_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          source_action: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          source_action: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          source_action?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      research_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      research_reports: {
        Row: {
          created_at: string
          id: string
          images: Json
          query: string
          report: string
          session_key: string
          share_token: string | null
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images?: Json
          query: string
          report?: string
          session_key: string
          share_token?: string | null
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images?: Json
          query?: string
          report?: string
          session_key?: string
          share_token?: string | null
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_sessions: {
        Row: {
          created_at: string
          depth: string
          id: string
          plan: Json | null
          query: string
          report: string | null
          sources_count: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: string
          id?: string
          plan?: Json | null
          query: string
          report?: string | null
          sources_count?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: string
          id?: string
          plan?: Json | null
          query?: string
          report?: string | null
          sources_count?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_sources: {
        Row: {
          created_at: string
          id: string
          reliability: string | null
          session_id: string
          snippet: string | null
          source_type: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reliability?: string | null
          session_id: string
          snippet?: string | null
          source_type?: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reliability?: string | null
          session_id?: string
          snippet?: string | null
          source_type?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rp_portal_settings: {
        Row: {
          created_at: string
          id: string
          notify_on_earning: boolean | null
          notify_on_signup: boolean | null
          payment_details: string | null
          payment_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_on_earning?: boolean | null
          notify_on_signup?: boolean | null
          payment_details?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_on_earning?: boolean | null
          notify_on_signup?: boolean | null
          payment_details?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rp_referral_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          id: string
          ip_hash: string | null
          referral_code: string
          referrer_url: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip_hash?: string | null
          referral_code: string
          referrer_url?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          country?: string | null
          id?: string
          ip_hash?: string | null
          referral_code?: string
          referrer_url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      service_incidents: {
        Row: {
          created_at: string
          id: string
          message: string | null
          resolved_at: string | null
          service_name: string
          started_at: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          service_name: string
          started_at?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          service_name?: string
          started_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      service_status: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          response_time_ms: number | null
          service_name: string
          service_url: string
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_name: string
          service_url: string
          status?: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          service_name?: string
          service_url?: string
          status?: string
        }
        Relationships: []
      }
      shopping_product_reports: {
        Row: {
          ai_report: string
          created_at: string
          currency: string
          id: string
          product_data: Json
          product_key: string
          user_id: string
        }
        Insert: {
          ai_report?: string
          created_at?: string
          currency?: string
          id?: string
          product_data?: Json
          product_key: string
          user_id: string
        }
        Update: {
          ai_report?: string
          created_at?: string
          currency?: string
          id?: string
          product_data?: Json
          product_key?: string
          user_id?: string
        }
        Relationships: []
      }
      showcase_items: {
        Row: {
          aspect_ratio: string
          created_at: string
          display_order: number
          duration: string | null
          id: string
          media_type: string
          media_url: string
          model_id: string
          model_name: string
          prompt: string
          quality: string
          style: string | null
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          display_order?: number
          duration?: string | null
          id?: string
          media_type?: string
          media_url: string
          model_id?: string
          model_name?: string
          prompt?: string
          quality?: string
          style?: string | null
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          display_order?: number
          duration?: string | null
          id?: string
          media_type?: string
          media_url?: string
          model_id?: string
          model_name?: string
          prompt?: string
          quality?: string
          style?: string | null
        }
        Relationships: []
      }
      skill_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          path: string
          size_bytes: number
          skill_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string
          path: string
          size_bytes?: number
          skill_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          path?: string
          size_bytes?: number
          skill_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_files_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          body: string
          created_at: string
          description: string
          enabled_tools: string[]
          icon: string | null
          id: string
          instructions: string
          is_active: boolean
          is_enabled: boolean
          name: string
          preferred_model: string | null
          triggers: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          is_enabled?: boolean
          name: string
          preferred_model?: string | null
          triggers?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          is_enabled?: boolean
          name?: string
          preferred_model?: string | null
          triggers?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slide_projects: {
        Row: {
          created_at: string
          id: string
          pptx_url: string | null
          slide_count: number
          slides_data: Json | null
          status: string
          style: string
          template_id: string | null
          title: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pptx_url?: string | null
          slide_count?: number
          slides_data?: Json | null
          status?: string
          style?: string
          template_id?: string | null
          title?: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pptx_url?: string | null
          slide_count?: number
          slides_data?: Json | null
          status?: string
          style?: string
          template_id?: string | null
          title?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      slide_templates: {
        Row: {
          component_name: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string | null
          template_engine: string
          template_id: string
        }
        Insert: {
          component_name?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          template_engine?: string
          template_id: string
        }
        Update: {
          component_name?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string | null
          template_engine?: string
          template_id?: string
        }
        Relationships: []
      }
      spreadsheet_projects: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          sheet_data: Json | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sheet_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          sheet_data?: Json | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_subscribers: {
        Row: {
          channel: string
          contact: string
          created_at: string
          id: string
        }
        Insert: {
          channel?: string
          contact: string
          created_at?: string
          id?: string
        }
        Update: {
          channel?: string
          contact?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      student_exams: {
        Row: {
          answers: Json
          created_at: string
          difficulty: string
          duration_seconds: number
          id: string
          questions: Json
          score: number
          subject: string
          topic: string | null
          total_questions: number
          user_id: string
          weak_areas: Json
        }
        Insert: {
          answers?: Json
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          questions?: Json
          score?: number
          subject: string
          topic?: string | null
          total_questions?: number
          user_id: string
          weak_areas?: Json
        }
        Update: {
          answers?: Json
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          questions?: Json
          score?: number
          subject?: string
          topic?: string | null
          total_questions?: number
          user_id?: string
          weak_areas?: Json
        }
        Relationships: []
      }
      student_mistakes: {
        Row: {
          concept: string
          created_at: string
          id: string
          mistake_count: number
          mistake_type: string
          next_review_at: string
          resolved: boolean
          review_stage: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept: string
          created_at?: string
          id?: string
          mistake_count?: number
          mistake_type?: string
          next_review_at?: string
          resolved?: boolean
          review_stage?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept?: string
          created_at?: string
          id?: string
          mistake_count?: number
          mistake_type?: string
          next_review_at?: string
          resolved?: boolean
          review_stage?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          age: number | null
          country: string | null
          created_at: string
          id: string
          learning_style: string | null
          native_language: string | null
          preferred_study_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          learning_style?: string | null
          native_language?: string | null
          preferred_study_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          country?: string | null
          created_at?: string
          id?: string
          learning_style?: string | null
          native_language?: string | null
          preferred_study_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_topics: {
        Row: {
          created_at: string
          curriculum_map: Json
          id: string
          last_position: string | null
          last_studied_at: string | null
          level: string
          progress: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curriculum_map?: Json
          id?: string
          last_position?: string | null
          last_studied_at?: string | null
          level?: string
          progress?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          curriculum_map?: Json
          id?: string
          last_position?: string | null
          last_studied_at?: string | null
          level?: string
          progress?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          exam_date: string | null
          hours_per_day: number
          id: string
          is_active: boolean
          level: string
          plan_content: string
          subjects: string
          tasks: Json
          updated_at: string
          user_id: string
          weak_areas: string | null
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          level?: string
          plan_content?: string
          subjects: string
          tasks?: Json
          updated_at?: string
          user_id: string
          weak_areas?: string | null
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          hours_per_day?: number
          id?: string
          is_active?: boolean
          level?: string
          plan_content?: string
          subjects?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
          weak_areas?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          id: string
          plan: string
          polar_customer_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_skills: {
        Row: {
          body: string
          created_at: string
          description: string
          display_order: number
          enabled_tools: string[]
          icon: string | null
          id: string
          instructions: string
          is_active: boolean
          name: string
          preferred_model: string | null
          triggers: string[]
        }
        Insert: {
          body?: string
          created_at?: string
          description?: string
          display_order?: number
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          name: string
          preferred_model?: string | null
          triggers?: string[]
        }
        Update: {
          body?: string
          created_at?: string
          description?: string
          display_order?: number
          enabled_tools?: string[]
          icon?: string | null
          id?: string
          instructions?: string
          is_active?: boolean
          name?: string
          preferred_model?: string | null
          triggers?: string[]
        }
        Relationships: []
      }
      template_images: {
        Row: {
          created_at: string
          image_url: string
          source: string
          template_id: string
          updated_at: string
          uploaded_by_chat_id: number | null
        }
        Insert: {
          created_at?: string
          image_url: string
          source?: string
          template_id: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Update: {
          created_at?: string
          image_url?: string
          source?: string
          template_id?: string
          updated_at?: string
          uploaded_by_chat_id?: number | null
        }
        Relationships: []
      }
      tool_landing_images: {
        Row: {
          description: string | null
          image_url: string | null
          tool_id: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          image_url?: string | null
          tool_id: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          image_url?: string | null
          tool_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_templates: {
        Row: {
          created_at: string | null
          display_order: number | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_url: string | null
          prompt: string | null
          tool_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_url?: string | null
          prompt?: string | null
          tool_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_url?: string | null
          prompt?: string | null
          tool_id?: string
        }
        Relationships: []
      }
      tts_voices: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          preview_audio_url: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_audio_url: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_audio_url?: string
          voice_id?: string | null
        }
        Relationships: []
      }
      user_chat_settings: {
        Row: {
          created_at: string
          custom_instructions: string | null
          enable_citations: boolean
          enable_followups: boolean
          enable_pii_redaction: boolean
          enable_semantic_cache: boolean
          learning_mode_default: boolean
          persona: string
          preferred_dialect: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          enable_citations?: boolean
          enable_followups?: boolean
          enable_pii_redaction?: boolean
          enable_semantic_cache?: boolean
          learning_mode_default?: boolean
          persona?: string
          preferred_dialect?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          enable_citations?: boolean
          enable_followups?: boolean
          enable_pii_redaction?: boolean
          enable_semantic_cache?: boolean
          learning_mode_default?: boolean
          persona?: string
          preferred_dialect?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_chat_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          source_type: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          source_type?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          source_type?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gallery_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "image_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_knowledge_graph: {
        Row: {
          confidence: number
          created_at: string
          entity: string
          entity_type: string
          id: string
          metadata: Json
          relation: string | null
          source_message_id: string | null
          target_entity: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          entity: string
          entity_type: string
          id?: string
          metadata?: Json
          relation?: string | null
          source_message_id?: string | null
          target_entity?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entity?: string
          entity_type?: string
          id?: string
          metadata?: Json
          relation?: string | null
          source_message_id?: string | null
          target_entity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_knowledge_graph_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memories: {
        Row: {
          created_at: string
          embedding: string | null
          fact: string
          id: string
          importance: number
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          fact: string
          id?: string
          importance?: number
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          fact?: string
          id?: string
          importance?: number
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memory_entries: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          relevance_score: number
          scope: Database["public"]["Enums"]["memory_scope"]
          source_conversation_id: string | null
          source_project_id: string | null
          summary: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          relevance_score?: number
          scope: Database["public"]["Enums"]["memory_scope"]
          source_conversation_id?: string | null
          source_project_id?: string | null
          summary: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          relevance_score?: number
          scope?: Database["public"]["Enums"]["memory_scope"]
          source_conversation_id?: string | null
          source_project_id?: string | null
          summary?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_entries_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memory_entries_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memory_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memory_profiles: {
        Row: {
          account_summary: string | null
          created_at: string
          id: string
          preferences: Json
          profile_snapshot: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          account_summary?: string | null
          created_at?: string
          id?: string
          preferences?: Json
          profile_snapshot?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          account_summary?: string | null
          created_at?: string
          id?: string
          preferences?: Json
          profile_snapshot?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_music_tracks: {
        Row: {
          created_at: string
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_templates: {
        Row: {
          audio_file_url: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
        }
        Insert: {
          audio_file_url: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
        }
        Update: {
          audio_file_url?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          payment_details: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          payment_details?: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payment_details?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_conversations: {
        Row: {
          channel_name: string | null
          created_at: string
          duration: string | null
          id: string
          thumbnail_url: string | null
          transcript: string | null
          updated_at: string
          user_id: string
          video_id: string
          video_title: string | null
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
          video_id: string
          video_title?: string | null
          video_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
          video_title?: string | null
          video_url?: string
        }
        Relationships: []
      }
      youtube_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "youtube_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      yt_video_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "yt_video_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "yt_video_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      yt_video_chats: {
        Row: {
          channel_name: string | null
          created_at: string
          id: string
          session_id: string
          thumbnail_url: string | null
          transcript: string | null
          updated_at: string
          user_id: string | null
          video_id: string
          video_title: string | null
          video_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          id?: string
          session_id: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
          video_id?: string
          video_title?: string | null
          video_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          id?: string
          session_id?: string
          thumbnail_url?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string | null
          video_id?: string
          video_title?: string | null
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      service_status_public: {
        Row: {
          checked_at: string | null
          response_time_ms: number | null
          service_name: string | null
          status: string | null
        }
        Insert: {
          checked_at?: string | null
          response_time_ms?: number | null
          service_name?: string | null
          status?: string | null
        }
        Update: {
          checked_at?: string | null
          response_time_ms?: number | null
          service_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_conversation_invite: { Args: { p_token: string }; Returns: Json }
      add_credits: {
        Args: { p_amount: number; p_description?: string; p_user_id: string }
        Returns: Json
      }
      bump_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      check_profile_update_safe_policy: {
        Args: { profile_row: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: boolean
      }
      cleanup_old_research_reports: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      deduct_credits: {
        Args: {
          p_action_type: string
          p_amount: number
          p_description?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_invite_details: { Args: { p_token: string }; Returns: Json }
      is_conversation_member: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_invite_for_current_user: {
        Args: { p_invite_email: string }
        Returns: boolean
      }
      mark_notifications_read: {
        Args: { p_notification_ids?: string[]; p_user_id: string }
        Returns: undefined
      }
      owns_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      process_polar_order: {
        Args: {
          p_credits: number
          p_order_id: string
          p_plan: string
          p_product_id: string
          p_user_id: string
        }
        Returns: Json
      }
      search_attachment_chunks: {
        Args: {
          p_conversation_id: string
          p_match_count?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          chunk_index: number
          content: string
          file_name: string
          id: string
          similarity: number
        }[]
      }
      search_user_memories: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_user_id: string
        }
        Returns: {
          fact: string
          id: string
          importance: number
          similarity: number
        }[]
      }
      update_profile_safe: {
        Args: {
          p_avatar_url?: string
          p_display_name?: string
          p_two_factor_enabled?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      memory_scope:
        | "account"
        | "conversation"
        | "project"
        | "file"
        | "preference"
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
      memory_scope: [
        "account",
        "conversation",
        "project",
        "file",
        "preference",
      ],
    },
  },
} as const
