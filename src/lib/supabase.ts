import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly configured
const isConfigured = url && 
                     anon && 
                     !url.includes('YOUR-PROJECT') && 
                     !url.includes('placeholder') &&
                     !anon.includes('YOUR-ANON') && 
                     !anon.includes('placeholder') && 
                     anon.length > 20;

// Fail fast with clear console errors if env vars are missing or placeholders
if (!isConfigured) {
  console.error('[Supabase] Missing environment variables!');
  console.error('- VITE_SUPABASE_URL:', url ? 'present' : 'MISSING');
  console.error('- VITE_SUPABASE_ANON_KEY:', anon ? 'present' : 'MISSING');
  console.error('Please create a .env file from .env.example and update with your Supabase credentials.');
  console.error('Then restart the dev server.');
}

// Log masked key for debugging (only in dev)
if (import.meta.env.DEV && isConfigured) {
  console.log('[Supabase] Using anon key (masked):', anon.slice(0, 6) + '…' + anon.slice(-4));
  console.log('[Supabase] Using URL:', url);
}

// Only create client if properly configured
export const supabase = isConfigured ? createClient(url, anon) : null;
export const isSupabaseConfigured = isConfigured;

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          emailVerified: string | null;
          passwordHash: string | null;
          mfaEnabled: boolean;
          plan: 'FREE' | 'PLUS' | 'LEGACY';
          timezone: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          image?: string | null;
          emailVerified?: string | null;
          passwordHash?: string | null;
          mfaEnabled?: boolean;
          plan?: 'FREE' | 'PLUS' | 'LEGACY';
          timezone?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          emailVerified?: string | null;
          passwordHash?: string | null;
          mfaEnabled?: boolean;
          plan?: 'FREE' | 'PLUS' | 'LEGACY';
          timezone?: string;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          userId: string;
          scope: 'NORMAL' | 'DMS';
          types: string[];
          title: string;
          content: string;
          status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          scheduledFor: string | null;
          recipientIds: string[];
          cipherBlobUrl: string | null;
          thumbnailUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          scope?: 'NORMAL' | 'DMS';
          types: string[];
          title: string;
          content: string;
          status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          scheduledFor?: string | null;
          recipientIds?: string[];
          cipherBlobUrl?: string | null;
          thumbnailUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          scope?: 'NORMAL' | 'DMS';
          types?: string[];
          title?: string;
          content?: string;
          status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
          scheduledFor?: string | null;
          recipientIds?: string[];
          cipherBlobUrl?: string | null;
          thumbnailUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      recipients: {
        Row: {
          id: string;
          userId: string;
          email: string;
          name: string | null;
          verified: boolean;
          timezone: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          email: string;
          name?: string | null;
          verified?: boolean;
          timezone?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          email?: string;
          name?: string | null;
          verified?: boolean;
          timezone?: string;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      dms_configs: {
        Row: {
          id: string;
          userId: string;
          frequencyDays: number;
          graceDays: number;
          channels: Record<string, any>;
          escalationContactId: string | null;
          status: 'INACTIVE' | 'ACTIVE' | 'PAUSED';
          cooldownUntil: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          frequencyDays: number;
          graceDays: number;
          channels: Record<string, any>;
          escalationContactId?: string | null;
          status?: 'INACTIVE' | 'ACTIVE' | 'PAUSED';
          cooldownUntil?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          frequencyDays?: number;
          graceDays?: number;
          channels?: Record<string, any>;
          escalationContactId?: string | null;
          status?: 'INACTIVE' | 'ACTIVE' | 'PAUSED';
          cooldownUntil?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      dms_cycles: {
        Row: {
          id: string;
          configId: string;
          nextCheckinAt: string;
          reminders: Record<string, any>;
          state: 'ACTIVE' | 'GRACE' | 'PENDING_RELEASE' | 'RELEASED' | 'PAUSED';
          updatedAt: string;
        };
        Insert: {
          id?: string;
          configId: string;
          nextCheckinAt: string;
          reminders: Record<string, any>;
          state?: 'ACTIVE' | 'GRACE' | 'PENDING_RELEASE' | 'RELEASED' | 'PAUSED';
          updatedAt?: string;
        };
        Update: {
          id?: string;
          configId?: string;
          nextCheckinAt?: string;
          reminders?: Record<string, any>;
          state?: 'ACTIVE' | 'GRACE' | 'PENDING_RELEASE' | 'RELEASED' | 'PAUSED';
          updatedAt?: string;
        };
      };
      site_settings: {
        Row: {
          id: string;
          heroVideoUrl: string | null;
          heroBackgroundColor: string;
          heroTextColor: string;
          heroSubtextColor: string;
          primaryFont: string;
          primaryColor: string;
          logoUrl: string | null;
          siteName: string;
          heroTitle: string;
          heroSubtitle: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          heroVideoUrl?: string | null;
          heroBackgroundColor?: string;
          heroTextColor?: string;
          heroSubtextColor?: string;
          primaryFont?: string;
          primaryColor?: string;
          logoUrl?: string | null;
          siteName?: string;
          heroTitle?: string;
          heroSubtitle?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          heroVideoUrl?: string | null;
          heroBackgroundColor?: string;
          heroTextColor?: string;
          heroSubtextColor?: string;
          primaryFont?: string;
          primaryColor?: string;
          logoUrl?: string | null;
          siteName?: string;
          heroTitle?: string;
          heroSubtitle?: string;
          updatedAt?: string;
        };
      };
    };
  };
}