import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'FREE' | 'PLUS' | 'LEGACY';
  timezone: string;
  image?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Removed demo account functions - Supabase only

function isAdminEmail(email: string): boolean {
  const adminEmails = ['davwez@gmail.com', 'admin@legacyscheduler.com'];
  return adminEmails.includes(email.toLowerCase()) || email.toLowerCase().includes('davwez');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const hasLoadedProfileRef = useRef(false);

  useEffect(() => {
    // Try Supabase first, fallback to localStorage
    initializeAuth();

        // Listen for auth state changes
        if (supabase) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('=== AUTH STATE CHANGE ===');
            console.log('Event:', event);
            console.log('Session user email:', session?.user?.email);
            console.log('Session user id:', session?.user?.id);
            console.log('Session exists:', !!session);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('User signed in, loading profile...');
              console.log('About to call loadUserProfile with id:', session.user.id);
              // Avoid duplicate loads on refresh (INITIAL_SESSION will also fire)
              if (!hasLoadedProfileRef.current) {
                hasLoadedProfileRef.current = true;
                // Set a fast, non-blocking user snapshot from session to render UI immediately
                const fastUser: User = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: (session.user.user_metadata as any)?.name || (session.user.email || '').split('@')[0] || 'User',
                  plan: (session.user.email?.includes('davwez') ? 'LEGACY' : 'FREE') as 'FREE' | 'PLUS' | 'LEGACY',
                  timezone: 'Europe/London',
                  createdAt: new Date().toISOString(),
                };
                setUser(fastUser);
                setIsLoading(false);
                // Load/ensure profile in background without blocking UI
                loadUserProfile(session.user.id).catch((e) => console.error('Background profile load error:', e));
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
              setUser(null);
              setIsLoading(false);
            } else {
              console.log('Other auth event:', event);
            }
            console.log('=== AUTH STATE CHANGE END ===');
          });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Removed demo accounts - Supabase only

  const initializeAuth = async () => {
    try {
      // Try Supabase first
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fast-path: set user immediately from session and render, then reconcile in background
          if (!hasLoadedProfileRef.current) {
            hasLoadedProfileRef.current = true;
            const fastUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: (session.user.user_metadata as any)?.name || (session.user.email || '').split('@')[0] || 'User',
              plan: (session.user.email?.includes('davwez') ? 'LEGACY' : 'FREE') as 'FREE' | 'PLUS' | 'LEGACY',
              timezone: 'Europe/London',
              createdAt: new Date().toISOString(),
            };
            setUser(fastUser);
            setIsLoading(false);
            // Background ensure/load profile
            loadUserProfile(session.user.id).catch((e) => console.error('Background profile load error:', e));
            return;
          }
        }
      }
    } catch (error) {
      console.log('Supabase not available');
    }

    // NO FALLBACK - Supabase only
    setIsLoading(false);
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('=== LOAD USER PROFILE START ===');
      console.log('Loading user profile for:', userId);
      
      if (!supabase) {
        console.error('Supabase not configured');
        setIsLoading(false);
        return;
      }

      console.log('Supabase is configured, proceeding with query...');
      
      // Try to get user profile from users table
      console.log('Checking if user exists in database...');
      console.log('Querying users table for userId:', userId);
      
      const queryStart = Date.now();
      
      // Query profile
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await queryPromise as any;
      const queryEnd = Date.now();
        
      console.log(`Database query completed in ${queryEnd - queryStart}ms`);
      console.log('Database query result:', { data, error });
      console.log('Error details:', error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : 'No error');

      if (error && (error.code === 'PGRST116' || error.message.includes('timeout'))) {
        // User doesn't exist in users table or query timed out, create one
        console.log('User not found in database or query timed out, creating new profile...');
        const { data: authUser } = await supabase.auth.getUser();
        console.log('Auth user data:', authUser);
        
        if (authUser.user) {
          const newUser = {
            id: authUser.user.id,
            email: authUser.user.email!,
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
            plan: (authUser.user.email?.includes('davwez') ? 'LEGACY' : 'FREE') as 'FREE' | 'PLUS' | 'LEGACY',
            timezone: 'Europe/London',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          console.log('Creating user profile:', newUser);
          const insertStart = Date.now();
          const { error: insertError } = await supabase
            .from('users')
            .insert(newUser);
          const insertEnd = Date.now();
          
          console.log(`User insert completed in ${insertEnd - insertStart}ms`);
          console.log('Insert error:', insertError);

          if (!insertError) {
            console.log('Created user profile in database successfully');
            setUser(newUser);
          } else {
            console.error('Failed to create user profile:', insertError);
            // Still set the user even if database insert fails
            console.log('Setting user anyway due to database error');
            setUser(newUser);
          }
        } else {
          console.error('No auth user data available');
        }
      } else if (data) {
        console.log('Loaded existing user profile from database:', data);
        setUser(data);
      } else if (error) {
        console.error('Error loading user profile:', error);
        // Fallback: create user from auth data
        console.log('Attempting fallback user creation...');
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const fallbackUser = {
            id: authUser.user.id,
            email: authUser.user.email!,
            name: authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User',
            plan: (authUser.user.email?.includes('davwez') ? 'LEGACY' : 'FREE') as 'FREE' | 'PLUS' | 'LEGACY',
            timezone: 'Europe/London',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          console.log('Setting fallback user:', fallbackUser);
          setUser(fallbackUser);
        }
      }
      
      console.log('=== LOAD USER PROFILE END ===');
    } catch (error) {
      console.error('Error loading user profile:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('=== LOGIN START ===');
    console.log('Login attempt for email:', email);
    setIsLoading(true);
    try {
      if (!supabase) {
        console.error('Supabase not configured');
        throw new Error('Supabase not configured');
      }

      console.log('Attempting Supabase login...');
      
      // Try Supabase first with timeout
      const supabasePromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase login timeout')), 5000)
      );
      
      console.log('Starting login promise race...');
      const loginStart = Date.now();
      const { error } = await Promise.race([supabasePromise, timeoutPromise]) as any;
      const loginEnd = Date.now();
      
      console.log(`Login completed in ${loginEnd - loginStart}ms`);
      console.log('Login error:', error);

      if (!error) {
        console.log('Supabase login successful');
        return; // Success, user will be loaded by auth state change
      } else {
        console.log('Supabase login error:', error.message);
        // NO FALLBACK - Supabase only
        throw new Error(`Login failed: ${error.message}`);
      }
    } catch (error) {
      console.log('Supabase login failed:', error);
      console.log('Login error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsLoading(false);
      throw new Error('Login failed. Please check your credentials or create an account first.');
    }
    console.log('=== LOGIN END ===');
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      // Create Supabase account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      if (data.user) {
        console.log('Supabase registration successful');
        // User will be automatically signed in after email confirmation
        return;
      }
    } catch (error) {
      console.log('Supabase registration failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.log('Supabase logout failed');
    }
    
    setUser(null);
    // Supabase only - no localStorage
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    
    try {
      // Try Supabase first
      if (supabase) {
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', user.id);

        if (!error) {
          setUser({ ...user, ...userData });
          return;
        }
      }
    } catch (error) {
      console.log('Supabase update failed');
      throw error; // NO FALLBACK - Supabase only
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}