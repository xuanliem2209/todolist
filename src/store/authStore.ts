import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  fetchProfile: () => Promise<void>;
}

// Email validation regex
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!email.trim()) {
            throw new Error('Email is required');
          }
          if (!password) {
            throw new Error('Password is required');
          }
          if (!isValidEmail(email.trim())) {
            throw new Error('Please enter a valid email address');
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (error) {
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Invalid email or password. Please check your credentials.');
            }
            throw new Error(error.message);
          }

          if (data.user) {
            set({ user: data.user });
            await get().fetchProfile();
          }
          
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Login error:', error);
          set({ 
            error: error.message || 'Login failed. Please check your credentials.', 
            isLoading: false 
          });
        }
      },

      signup: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          if (!email.trim()) {
            throw new Error('Email is required');
          }
          if (!password) {
            throw new Error('Password is required');
          }
          if (!isValidEmail(email.trim())) {
            throw new Error('Please enter a valid email address');
          }
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
          }

          // Sign up without email confirmation
          const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              emailRedirectTo: undefined, // Remove email redirect
            },
          });

          if (error) {
            if (error.message.includes('email_address_invalid')) {
              throw new Error('Please enter a valid email address');
            }
            if (error.message.includes('User already registered')) {
              throw new Error('An account with this email already exists. Please sign in instead.');
            }
            throw new Error(error.message);
          }

          if (data.user) {
            // Directly set the user and session
            set({ user: data.user });
            
            // Wait for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              await get().fetchProfile();
            } catch (profileError) {
              console.warn('Profile not found, creating manually:', profileError);
              
              // Create profile manually if trigger failed
              const { error: profileCreateError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email!,
                  name: data.user.email!.split('@')[0], // Use email prefix as default name
                });
              
              if (profileCreateError) {
                console.warn('Manual profile creation failed:', profileCreateError);
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await get().fetchProfile();
              }
            }
          }
          
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Signup error:', error);
          set({ 
            error: error.message || 'Signup failed. Please try again.', 
            isLoading: false 
          });
        }
      },

      updatePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { user } = get();
          if (!user) {
            throw new Error('Not authenticated');
          }

          // First verify current password by attempting to sign in
          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword,
          });

          if (verifyError) {
            throw new Error('Current password is incorrect');
          }

          // Update password
          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (error) {
            throw error;
          }

          set({ isLoading: false });
          alert('Password updated successfully!');
        } catch (error: any) {
          console.error('Password update error:', error);
          set({ 
            error: error.message || 'Failed to update password', 
            isLoading: false 
          });
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({ user: null, profile: null, error: null });
        } catch (error: any) {
          console.error('Logout error:', error);
          set({ error: error.message || 'Logout failed' });
        }
      },

      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(); // Changed from .single() to .maybeSingle()

          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }

          if (data) {
            set({ profile: data });
          } else {
            console.log('No profile found for user:', user.id);
            // Profile doesn't exist yet, this is okay
          }
        } catch (error: any) {
          console.error('Error fetching profile:', error);
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile 
      }),
    }
  )
);

// Initialize auth state
supabase.auth.onAuthStateChange(async (event, session) => {
  const { fetchProfile } = useAuthStore.getState();
  
  if (event === 'SIGNED_IN' && session?.user) {
    useAuthStore.setState({ user: session.user });
    await fetchProfile();
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, profile: null });
  }
});