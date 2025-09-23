import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, clearAuthTokens, handleAuthError } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ipTrackingService } from '@/services/ipTrackingService';
import { rateLimitService } from '@/services/rateLimitService';
import { InputSanitizer } from '@/utils/inputSanitization';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, userType?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refetchProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile(data);
    }
  };

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Set up auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              fetchProfile(session.user.id);
            }, 0);
          } else {
            setProfile(null);
          }
          setLoading(false);
        } catch (error) {
          console.error('Auth state change error:', error);
          await handleAuthError(error);
          setLoading(false);
        }
      }
    );

    // Check for existing session with error handling
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      try {
        if (error) {
          console.error('Session retrieval error:', error);
          await handleAuthError(error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('Session setup error:', error);
        await handleAuthError(error);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, userType?: string) => {
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      return { error: new Error(emailValidation.error || 'Invalid email address') };
    }

    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      return { error: new Error(passwordValidation.error || 'Invalid password') };
    }

    const fullNameValidation = fullName ? InputSanitizer.sanitizeText(fullName, 100) : { isValid: true, sanitizedValue: undefined };
    if (!fullNameValidation.isValid) {
      return { error: new Error(fullNameValidation.error || 'Invalid full name') };
    }

    const userTypeValidation = userType ? InputSanitizer.sanitizeText(userType, 20) : { isValid: true, sanitizedValue: 'buyer' };
    if (!userTypeValidation.isValid) {
      return { error: new Error('Invalid user type') };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email: emailValidation.sanitizedValue!,
      password: passwordValidation.sanitizedValue!,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          full_name: fullNameValidation.sanitizedValue,
          user_type: userTypeValidation.sanitizedValue || 'buyer'
        }
      }
    });
    
    // Log signup attempt
    await ipTrackingService.logLoginActivity({
      user_id: data.user?.id,
      email: emailValidation.sanitizedValue!,
      login_type: 'signup',
      success: !error,
      failure_reason: error?.message,
      session_id: data.session?.access_token
    });
    
    // Send welcome email for new users (async, don't wait for it)
    if (!error && data.user && !data.user.email_confirmed_at) {
      // Use setTimeout to send email without blocking the signup process
      setTimeout(async () => {
        try {
          const { EmailService } = await import('@/services/emailService');
          await EmailService.sendWelcomeEmail(
            data.user.id, 
            emailValidation.sanitizedValue!, 
            fullNameValidation.sanitizedValue
          );
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }, 2000); // Send after 2 seconds to ensure profile is created
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      return { error: new Error(emailValidation.error || 'Invalid email address') };
    }

    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      return { error: new Error(passwordValidation.error || 'Invalid password') };
    }

    try {
      const rateLimitResult = await rateLimitService.checkRateLimit(emailValidation.sanitizedValue!, 'signIn');
      if (!rateLimitResult.allowed) {
        return { error: new Error('Too many login attempts. Please try again later.') };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValidation.sanitizedValue!,
        password: passwordValidation.sanitizedValue!
      });
      
      // Log signin attempt
      await ipTrackingService.logLoginActivity({
        user_id: data.user?.id,
        email: emailValidation.sanitizedValue!,
        login_type: 'signin',
        success: !error,
        failure_reason: error?.message,
        session_id: data.session?.access_token
      });
      
      if (error) {
        await handleAuthError(error);
      }
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      // Log failed signin attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'signin',
        success: false,
        failure_reason: error.message
      });
      await handleAuthError(error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Get current user before signing out
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      await supabase.auth.signOut();
      clearAuthTokens(); // Clear any remaining tokens
      
      // Log signout attempt
      await ipTrackingService.logLoginActivity({
        user_id: currentUser?.id,
        email: currentUser?.email || '',
        login_type: 'logout',
        success: true
      });
    } catch (error) {
      console.error('Sign out error:', error);
      clearAuthTokens(); // Clear tokens even if signout fails
      
      // Log failed signout attempt
      await ipTrackingService.logLoginActivity({
        user_id: user?.id,
        email: user?.email || '',
        login_type: 'logout',
        success: false,
        failure_reason: error.message
      });
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    // Sanitize profile updates
    const sanitizedUpdates: Partial<Profile> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        const validation = InputSanitizer.sanitizeText(value, 500);
        if (!validation.isValid) {
          return { error: new Error(`Invalid ${key}: ${validation.error}`) };
        }
        sanitizedUpdates[key as keyof Profile] = validation.sanitizedValue as any;
      } else {
        sanitizedUpdates[key as keyof Profile] = value;
      }
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...sanitizedUpdates } : null);
    }
    
    return { error };
  };

  const forgotPassword = async (email: string) => {
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      return { error: new Error(emailValidation.error || 'Invalid email address') };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(emailValidation.sanitizedValue!, {
        redirectTo: redirectUrl
      });
      
      // Log forgot password attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'forgot_password',
        success: !error,
        failure_reason: error?.message
      });
      
      // Send custom password reset email for better branding
      if (!error) {
        setTimeout(async () => {
          try {
            const { EmailService } = await import('@/services/emailService');
            await EmailService.sendPasswordResetEmail(emailValidation.sanitizedValue!);
          } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
          }
        }, 1000);
      }
      
      return { error };
    } catch (error) {
      console.error('Forgot password error:', error);
      // Log forgot password attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'forgot_password',
        success: false,
        failure_reason: error.message
      });
      return { error };
    }
  };

  const resetPassword = async (password: string) => {
    // Input validation and sanitization
    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      return { error: new Error(passwordValidation.error || 'Invalid password') };
    }

    try {
      // Get current user before password reset
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.updateUser({
        password: passwordValidation.sanitizedValue!
      });
      
      // Log reset password attempt
      await ipTrackingService.logLoginActivity({
        user_id: currentUser?.id,
        email: currentUser?.email || '',
        login_type: 'password_reset',
        success: !error,
        failure_reason: error?.message
      });
      
      if (error) {
        await handleAuthError(error);
      }
      
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Log failed reset password attempt
      await ipTrackingService.logLoginActivity({
        user_id: user?.id,
        email: user?.email || '',
        login_type: 'password_reset',
        success: false,
        failure_reason: error.message
      });
      await handleAuthError(error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refetchProfile,
      forgotPassword,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
