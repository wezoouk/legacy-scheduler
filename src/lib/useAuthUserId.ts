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
        // Check for dev admin mode first
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_ADMIN_MODE === '1') {
          console.log('Development admin mode enabled');
          setAuthUser({
            id: 'admin-user-id',
            email: 'admin@example.com',
            isAuthenticated: true,
            isDemoMode: true,
          });
          return;
        }

        // Try to get real Supabase auth user
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          // If no auth session, check if we have a legacy user in localStorage
          const legacyUser = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
          if (legacyUser.id) {
            setAuthUser({
              id: legacyUser.id,
              email: legacyUser.email,
              isAuthenticated: false,
              isDemoMode: true,
            });
            return;
          }
          
          console.error('Error getting auth user:', error);
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
          // User exists but ID is not a valid UUID (demo mode)
          setAuthUser({
            id: user?.id || null,
            email: user?.email || null,
            isAuthenticated: false,
            isDemoMode: true,
          });
        }
      } catch (error) {
        console.error('Error in useAuthUserId:', error);
        // Fallback to legacy user if available
        const legacyUser = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
        if (legacyUser.id) {
          setAuthUser({
            id: legacyUser.id,
            email: legacyUser.email,
            isAuthenticated: false,
            isDemoMode: true,
          });
        } else {
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
        }
      }
    };

    getAuthUser();

    // Listen for auth changes
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
            id: session.user.id,
            email: session.user.email,
            isAuthenticated: false,
            isDemoMode: true,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        // Check if we have a legacy user to fall back to
        const legacyUser = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
        if (legacyUser.id) {
          setAuthUser({
            id: legacyUser.id,
            email: legacyUser.email,
            isAuthenticated: false,
            isDemoMode: true,
          });
        } else {
          setAuthUser({
            id: null,
            email: null,
            isAuthenticated: false,
            isDemoMode: false,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return authUser;
};
