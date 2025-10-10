import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthUserId } from './useAuthUserId';
import { supabase, isSupabaseConfigured } from './supabase';
import { onceWarn } from './onceWarn';

export interface Recipient {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  timezone: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to generate UUIDs compatible with Supabase UUID columns
function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  // Fallback for older environments
  const hex = [...Array(36)].map((_, i) =>
    [8, 13, 18, 23].includes(i) ? '-' : Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

// Fetch function that React Query will cache
const fetchRecipientsFromDB = async (userId: string): Promise<Recipient[]> => {
  console.log('🔍 fetchRecipientsFromDB called with userId:', userId);
  
  if (!supabase || !userId) {
    console.log('❌ Missing supabase or userId');
    return [];
  }
  
  const isSupabaseUser = userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if (!isSupabaseUser) {
    console.log('❌ Invalid UUID format for userId:', userId);
    return [];
  }

  console.log('📡 Fetching recipients from Supabase...');
  const { data, error } = await supabase
    .from('recipients')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('❌ Error fetching recipients:', error);
    if (error.code === 'PGRST205') {
      console.log('ℹ️ No recipients found (PGRST205)');
      return [];
    }
    throw error;
  }
  
  console.log('✅ Fetched recipients from DB:', data?.length || 0);

  return (data || []).map((recipient: any) => ({
    id: recipient.id,
    userId: recipient.userId,
    name: recipient.name,
    email: recipient.email,
    phone: recipient.phone,
    timezone: recipient.timezone,
    verified: !!recipient.verified,
    createdAt: new Date(recipient.createdAt),
    updatedAt: new Date(recipient.updatedAt),
  }));
};

export function useRecipients() {
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const authUser = useAuthUserId();
  const queryClient = useQueryClient();

  // Use React Query for automatic caching and deduplication
  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['recipients', authUser.id],
    queryFn: () => fetchRecipientsFromDB(authUser.id || ''),
    enabled: !!authUser.id && authUser.isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const loadFromDatabase = async () => {
    // This function is kept for compatibility but now uses the cache
    if (!authUser.id || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('userId', authUser.id)
        .order('createdAt', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('No recipients found (PGRST205)');
          setRecipients([]);
          return;
        }
        console.error('Error fetching recipients from database:', error);
        throw error;
      }

      const formattedRecipients = (data || []).map((recipient: any) => ({
        id: recipient.id,
        userId: recipient.userId,
        name: recipient.name,
        email: recipient.email,
        phone: recipient.phone,
        timezone: recipient.timezone,
        verified: !!recipient.verified,
        createdAt: new Date(recipient.createdAt),
        updatedAt: new Date(recipient.updatedAt),
      }));

      console.log(`Loaded ${formattedRecipients.length} recipients from database`);
      setRecipients(formattedRecipients);
    } catch (error) {
      console.error('Error loading recipients from database:', error);
      throw error;
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(`recipients_${authUser.id}`);
      if (stored) {
        const parsedRecipients = JSON.parse(stored).map((recipient: any) => ({
          ...recipient,
          createdAt: new Date(recipient.createdAt),
          updatedAt: new Date(recipient.updatedAt),
        }));
        setRecipients(parsedRecipients);
      } else {
        setRecipients([]);
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      setRecipients([]);
    }
  };

  const saveToDatabase = async (recipient: Recipient) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Build insert data with only essential fields first
    const insertData: any = {
      id: recipient.id,
      userId: recipient.userId,
      name: recipient.name,
      email: recipient.email,
      timezone: recipient.timezone,
      createdAt: recipient.createdAt.toISOString(),
      updatedAt: recipient.updatedAt.toISOString(),
    };

    // Add optional fields if they exist
    if (recipient.phone) insertData.phone = recipient.phone;
    if (typeof recipient.verified !== 'undefined') insertData.verified = recipient.verified;

    console.log('Inserting recipient with data:', insertData);

    const { error } = await supabase
      .from('recipients')
      .insert(insertData);

    if (error) {
      console.error('Error saving recipient to database:', {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint,
      });
      throw error;
    }

    console.log('Recipient saved to database successfully');
    
    // Invalidate the cache to trigger a refresh
    queryClient.invalidateQueries({ queryKey: ['recipients', authUser.id] });
  };

  const saveToLocalStorage = async (recipient: Recipient) => {
    try {
      const updatedRecipients = [recipient, ...recipients];
      setRecipients(updatedRecipients);
      localStorage.setItem(`recipients_${authUser.id}`, JSON.stringify(updatedRecipients));
      console.log('Recipient saved to localStorage successfully');
      
      // Refresh recipients to ensure consistency
      loadFromLocalStorage();
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      throw err;
    }
  };

  const updateInDatabase = async (id: string, updatedRecipient: Recipient) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('recipients')
      .update({
        name: updatedRecipient.name,
        email: updatedRecipient.email,
        phone: updatedRecipient.phone,
        timezone: updatedRecipient.timezone,
        verified: updatedRecipient.verified,
        updatedAt: updatedRecipient.updatedAt.toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating recipient in database:', error);
      throw error;
    }

    console.log('Recipient updated in database successfully');
    
    // Invalidate the cache to trigger a refresh
    queryClient.invalidateQueries({ queryKey: ['recipients', authUser.id] });
  };

  const updateInLocalStorage = async (id: string, updatedRecipient: Recipient) => {
    const updatedRecipients = recipients.map(recipient => 
      recipient.id === id ? updatedRecipient : recipient
    );
    setRecipients(updatedRecipients);
    localStorage.setItem(`recipients_${authUser.id}`, JSON.stringify(updatedRecipients));
  };

  const createRecipient = async (recipientData: Omit<Recipient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!authUser.id) throw new Error('User not authenticated');

    const newRecipient: Recipient = {
      ...recipientData,
      id: generateId(),
      userId: authUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Check if user has a valid UUID (Supabase user) and Supabase is configured
      const isSupabaseUser = authUser.id && authUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      if (isSupabaseConfigured && supabase && isSupabaseUser) {
        console.log('Saving recipient to Supabase database for user:', authUser.id);
        await saveToDatabase(newRecipient);
      } else {
        console.log('Saving to localStorage - Supabase not configured or not a Supabase user');
        await saveToLocalStorage(newRecipient);
      }
    } catch (error) {
      console.error('Error creating recipient:', error);
      // Do NOT fall back to localStorage for authenticated Supabase users
      if (isSupabaseConfigured) {
        throw error;
      } else {
        console.log('Supabase not configured, saving to localStorage');
        await saveToLocalStorage(newRecipient);
      }
    }

    return newRecipient;
  };

  const updateRecipient = async (id: string, updates: Partial<Recipient>) => {
    if (!authUser.id) throw new Error('User not authenticated');

    const recipientToUpdate = recipients.find(r => r.id === id);
    if (!recipientToUpdate) throw new Error('Recipient not found');

    const updatedRecipient = {
      ...recipientToUpdate,
      ...updates,
      updatedAt: new Date(),
    };

    try {
      // Check if user has a valid UUID (Supabase user) and Supabase is configured
      const isSupabaseUser = authUser.id && authUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      if (isSupabaseConfigured && supabase && isSupabaseUser) {
        console.log('Updating recipient in Supabase database');
        await updateInDatabase(id, updatedRecipient);
      } else {
        console.log('Supabase not configured or not a Supabase user, updating in localStorage');
        await updateInLocalStorage(id, updatedRecipient);
      }
    } catch (error) {
      console.error('Error updating recipient:', error);
      console.log('Falling back to localStorage');
      await updateInLocalStorage(id, updatedRecipient);
    }
  };

  const deleteRecipient = async (id: string) => {
    if (!authUser.id) throw new Error('User not authenticated');

    try {
      // Check if user has a valid UUID (Supabase user) and Supabase is configured
      const isSupabaseUser = authUser.id && authUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      if (isSupabaseConfigured && supabase && isSupabaseUser) {
        console.log('Deleting recipient from Supabase database');
        await deleteFromDatabase(id);
      } else {
        console.log('Supabase not configured or user not authenticated, deleting from localStorage');
        await deleteFromLocalStorage(id);
      }
    } catch (error) {
      console.error('Error deleting recipient:', error);
      console.log('Falling back to localStorage');
      await deleteFromLocalStorage(id);
    }
  };

  const deleteFromDatabase = async (id: string) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('recipients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recipient from database:', error);
      throw error;
    }

    console.log('Recipient deleted from database successfully');
    
    // Invalidate the cache to trigger a refresh
    queryClient.invalidateQueries({ queryKey: ['recipients', authUser.id] });
  };

  const deleteFromLocalStorage = async (id: string) => {
    const updatedRecipients = recipients.filter(recipient => recipient.id !== id);
    setRecipients(updatedRecipients);
    localStorage.setItem(`recipients_${authUser.id}`, JSON.stringify(updatedRecipients));
  };

  const refreshRecipients = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recipients', authUser.id] });
  };

  // Minimal debug (toggle with localStorage flag)
  const verboseDebug = localStorage.getItem('debug_verbose') === '1';
  if (verboseDebug) {
    if (!isLoading && recipients.length > 0) {
      console.log('✅ Recipients loaded from cache:', recipients.length);
    }
    console.log('🔍 Recipients Debug:', {
      authUserId: authUser.id,
      isAuthenticated: authUser.isAuthenticated,
      isLoading,
      recipientsCount: recipients.length,
      supabaseConfigured: !!supabase
    });
  }

  return {
    recipients,
    isLoading,
    showDemoBanner,
    createRecipient,
    updateRecipient,
    deleteRecipient,
    refreshRecipients,
  };
}