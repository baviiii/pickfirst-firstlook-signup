import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, clearAuthTokens, handleAuthError } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ipTrackingService } from '@/services/ipTrackingService';
import { rateLimitService } from '@/services/rateLimitService';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: {
    signUp: any;
    signIn: any;
    updateProfile: any;
    forgotPassword: any;
    resetPassword: any;
  };
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
  const [error, setError] = useState({
    signUp: null,
    signIn: null,
    updateProfile: null,
    forgotPassword: null,
    resetPassword: null,
  });

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
          await handleAuthError(error);
          setLoading(false);
        }
      }
    );

    // Check for existing session with error handling
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      try {
        if (error) {
          await handleAuthError(error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
        setLoading(false);
      } catch (error) {
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
      setError(prev => ({ ...prev, signUp: new Error(emailValidation.error || 'Invalid email address') }));
      return { error: new Error(emailValidation.error || 'Invalid email address') };
    }

    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(prev => ({ ...prev, signUp: new Error(passwordValidation.error || 'Invalid password') }));
      return { error: new Error(passwordValidation.error || 'Invalid password') };
    }

    const fullNameValidation = fullName ? InputSanitizer.sanitizeText(fullName, 100) : { isValid: true, sanitizedValue: undefined };
    if (!fullNameValidation.isValid) {
      setError(prev => ({ ...prev, signUp: new Error(fullNameValidation.error || 'Invalid full name') }));
      return { error: new Error(fullNameValidation.error || 'Invalid full name') };
    }

    const userTypeValidation = userType ? InputSanitizer.sanitizeText(userType, 20) : { isValid: true, sanitizedValue: 'buyer' };
    if (!userTypeValidation.isValid) {
      setError(prev => ({ ...prev, signUp: new Error('Invalid user type') }));
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
    
    setError(prev => ({ ...prev, signUp: error }));
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      setError(prev => ({ ...prev, signIn: new Error(emailValidation.error || 'Invalid email address') }));
      return { error: new Error(emailValidation.error || 'Invalid email address') };
    }

    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(prev => ({ ...prev, signIn: new Error(passwordValidation.error || 'Invalid password') }));
      return { error: new Error(passwordValidation.error || 'Invalid password') };
    }

    try {
      const rateLimitResult = await rateLimitService.checkRateLimit(emailValidation.sanitizedValue!, 'signIn');
      if (!rateLimitResult.allowed) {
        setError(prev => ({ ...prev, signIn: new Error('Too many login attempts. Please try again later.') }));
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
      
      setError(prev => ({ ...prev, signIn: error }));
      return { error };
    } catch (error) {
      // Log failed signin attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'signin',
        success: false,
        failure_reason: error.message
      });
      await handleAuthError(error);
      setError(prev => ({ ...prev, signIn: error }));
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
          setError(prev => ({ ...prev, updateProfile: new Error(`Invalid ${key}: ${validation.error}`) }));
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
    
    setError(prev => ({ ...prev, updateProfile: error }));
    return { error };
  };

  const forgotPassword = async (email: string) => {
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      setError(prev => ({ ...prev, forgotPassword: new Error(emailValidation.error || 'Invalid email address') }));
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
            // Email sending failed silently
          }
        }, 1000);
      }
      
      setError(prev => ({ ...prev, forgotPassword: error }));
      return { error };
    } catch (error) {
      // Log forgot password attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'forgot_password',
        success: false,
        failure_reason: error.message
      });
      setError(prev => ({ ...prev, forgotPassword: error }));
      return { error };
    }
  };

  const resetPassword = async (password: string) => {
    // Input validation and sanitization
    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(prev => ({ ...prev, resetPassword: new Error(passwordValidation.error || 'Invalid password format') }));
      return { error: new Error(passwordValidation.error || 'Invalid password format') };
    }

    try {
      // Get current user before password reset
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        throw new Error('User not authenticated');
      }

      // Check rate limit for password reset attempts
      const rateLimitResult = await rateLimitService.checkRateLimit(currentUser.id, 'password_reset');
      const isRateLimited = !rateLimitResult.allowed;

      if (isRateLimited) {
        throw new Error('Too many password reset attempts. Please try again later.');
      }
      
      // Check password against previous passwords (last 5)
      const { data: passwordHistory, error: historyError } = await supabase
        .from('user_password_history')
        .select('password_hash')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!historyError && passwordHistory) {
        let isReused = false;
        try {
          const promises = passwordHistory.map(async (record) => {
            return await verifyPassword(password, record.password_hash);
          });
          const results = await Promise.allSettled(promises);
          isReused = results.some(result => result.status === 'fulfilled' && result.value === true);
        } catch (error) {
          // Password history check failed, proceed anyway
        }

        if (isReused) {
          throw new Error('You cannot reuse a previous password');
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordValidation.sanitizedValue!,
      });

      if (updateError) {
        throw updateError;
      }

      // Log the new password hash in history
      const hashedPassword = await hashPassword(password);
      await supabase
        .from('user_password_history')
        .insert([
          { 
            user_id: user?.id, 
            password_hash: hashedPassword,
            changed_at: new Date().toISOString()
          }
        ]);

      // Invalidate all active sessions except current one
      await supabase.auth.signOut({ scope: 'others' });

      // Log successful password reset
      await auditService.log(user?.id, 'UPDATE', 'authentication', {
        recordId: user?.id,
        newValues: {
          timestamp: new Date().toISOString()
        },
        userAgent: navigator.userAgent,
        ipAddress: await getClientIP(),
      });

      // Invalidate all refresh tokens for the user
      if (user?.id) {
        await supabase.auth.admin.signOut(user.id);
      }

      setError(prev => ({ ...prev, resetPassword: null }));
      return { error: null };

    } catch (error) {
      // Log failed attempt
      if (user?.id) {
        await auditService.log(user.id, 'PASSWORD_UPDATE_FAILED', 'authentication', {
          recordId: user.id,
          newValues: {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          },
          userAgent: navigator.userAgent,
          ipAddress: await getClientIP(),
        });
      }

      setError(prev => ({ ...prev, resetPassword: error }));
      return { 
        error: error instanceof Error ? error : new Error('Failed to reset password') 
      };
    }
  };

  async function hashPassword(password: string): Promise<string> {
    // This is a simplified example - in production, use a proper password hashing library
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const hashedPassword = await hashPassword(password);
    return hashedPassword === hash;
  }

  async function getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      error,
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
