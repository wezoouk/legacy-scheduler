import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { isUuid } from './utils';

export interface AuthUser {
  id: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
}

export const useAuthUserId = (): AuthUser => {
  const [authUser, setAuthUser] = useState<AuthUser>({
    id: null,
    email: null,
    isAuthenticated: false,
    isDemoMode: false,
  });

  useEffect(() => {
    const getAuthUser = async () => {
      try {
        // Supabase only - no demo accounts
        if (!supabase) {
          console.log('Supabase not configured');
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
          return;
        }
        
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          // No auth session - user not logged in
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
          return;
        }

        const user = data.user;
        if (user && isUuid(user.id)) {
          setAuthUser({
            id: user.id,
            email: user.email,
            isAuthenticated: true,
            isDemoMode: false,
          });
        } else {
          // User exists but ID is not a valid UUID - not authenticated
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
        }
      } catch (error) {
        console.error('Error in useAuthUserId:', error);
        // No fallback - Supabase only
        setAuthUser({
          id: null,
          email: null,
          isAuthenticated: false,
          isDemoMode: false,
        });
      }
    };

    getAuthUser();

    // Listen for auth changes
    if (!supabase) {
      return; // No cleanup needed if no supabase
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (isUuid(session.user.id)) {
          setAuthUser({
            id: session.user.id,
            email: session.user.email,
            isAuthenticated: true,
            isDemoMode: false,
          });
        } else {
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out - no fallback
        setAuthUser({
          id: null,
          email: null,
          isAuthenticated: false,
          isDemoMode: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return authUser;
};
