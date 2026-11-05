import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserAccount, UserProfile, VerificationChannel } from '../types';

export interface SupabaseAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  requiresOtp?: boolean;
  message?: string;
  error?: string;
}

export const supabaseAuthService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // Get currently active session
  async getSession() {
    if (!this.isConfigured()) return { session: null, error: null };
    try {
      const { data, error } = await supabase.auth.getSession();
      return { session: data?.session || null, error };
    } catch (err: any) {
      console.warn('Supabase getSession exception:', err);
      return { session: null, error: err };
    }
  },

  // Get authenticated user
  async getUser() {
    if (!this.isConfigured()) return { user: null, error: null };
    try {
      const { data, error } = await supabase.auth.getUser();
      return { user: data?.user || null, error };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  // Listen to auth state transitions
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!this.isConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Register with Email and Password
  async signUp(params: {
    email: string;
    password: string;
    fullName: string;
    username: string;
    phone?: string;
    dateOfBirth: string;
    preferredLanguage: string;
    parentName?: string;
    parentContact?: string;
  }): Promise<SupabaseAuthResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
            username: params.username.toLowerCase(),
            phone: params.phone,
            date_of_birth: params.dateOfBirth,
            preferred_language: params.preferredLanguage,
            parent_name: params.parentName,
            parent_contact: params.parentContact,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      const user = data.user;
      const requiresOtp = !data.session && Boolean(user && !user.confirmed_at);

      return {
        success: true,
        user,
        session: data.session,
        requiresOtp,
        message: requiresOtp 
          ? 'Confirmation code sent. Please check your inbox and verify OTP.'
          : 'Registration successful and session established.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  },

  // Request Email or Phone OTP
  async sendOtp(contact: string, channel: VerificationChannel): Promise<SupabaseAuthResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const cleanContact = contact.trim();
    try {
      if (channel === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: cleanContact.toLowerCase(),
          options: {
            shouldCreateUser: true,
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, requiresOtp: true, message: `OTP sent to email ${cleanContact}` };
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: cleanContact,
          options: {
            channel: 'sms',
            shouldCreateUser: true,
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true, requiresOtp: true, message: `SMS code sent to ${cleanContact}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to dispatch OTP.' };
    }
  },

  // Verify OTP for Email or Phone
  async verifyOtp(contact: string, token: string, channel: VerificationChannel): Promise<SupabaseAuthResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const cleanContact = contact.trim();
    const cleanToken = token.trim();

    try {
      if (channel === 'email') {
        // Try type: 'signup' first, then 'email'
        let { data, error } = await supabase.auth.verifyOtp({
          email: cleanContact.toLowerCase(),
          token: cleanToken,
          type: 'signup',
        });

        if (error) {
          // Fallback to type: 'email' (magic-link / login OTP)
          const retry = await supabase.auth.verifyOtp({
            email: cleanContact.toLowerCase(),
            token: cleanToken,
            type: 'email',
          });
          if (retry.error) {
            return { success: false, error: retry.error.message || error.message };
          }
          data = retry.data;
        }

        return {
          success: true,
          user: data?.user,
          session: data?.session,
          message: 'Email OTP verified successfully.',
        };
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: cleanContact,
          token: cleanToken,
          type: 'sms',
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return {
          success: true,
          user: data?.user,
          session: data?.session,
          message: 'Phone OTP verified successfully.',
        };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'OTP verification failed.' };
    }
  },

  // Password Sign In (supports email, phone, or username)
  async signInWithPassword(identifier: string, password: string): Promise<SupabaseAuthResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const cleanId = identifier.trim();

    try {
      // 1. If email format
      if (cleanId.includes('@')) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanId.toLowerCase(),
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            return {
              success: false,
              requiresOtp: true,
              error: 'Email address has not been confirmed yet. Please verify your OTP code.',
            };
          }
          return { success: false, error: error.message };
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
        };
      }

      // 2. If phone format
      if (cleanId.startsWith('+') || /^[0-9\-\(\)\s]{8,15}$/.test(cleanId)) {
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: cleanId,
          password,
        });

        if (error) return { success: false, error: error.message };
        return { success: true, user: data.user, session: data.session };
      }

      // 3. Username lookup in profiles table
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', cleanId.toLowerCase())
          .maybeSingle();

        if (profile?.email) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password,
          });
          if (error) return { success: false, error: error.message };
          return { success: true, user: data.user, session: data.session };
        }
      } catch (lookupErr) {
        // Table may not exist yet, continue to standard fallback
      }

      return {
        success: false,
        error: 'Unable to authenticate. Please sign in using your registered email address.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Sign in failed.' };
    }
  },

  // Password Reset via Email
  async resetPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin,
      });

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        message: 'Password reset link dispatched to your email address.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  },

  // Logout
  async signOut(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) return { success: true };
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
