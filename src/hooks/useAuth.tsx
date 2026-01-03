import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, clearAuthTokens, handleAuthError } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ipTrackingService } from '@/services/ipTrackingService';
import { rateLimitService } from '@/services/rateLimitService';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';
import { EmailService } from '@/services/emailService';

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
  isRecoverySession: boolean;
  toggleRecoverySession: (active: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState({
    signUp: null,
    signIn: null,
    updateProfile: null,
    forgotPassword: null,
    resetPassword: null,
  });
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data);
        return data;
      } else if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - user might have been deleted
          console.warn('[useAuth] Profile not found for user:', userId);
        } else {
          // Other error - log it
          console.error('[useAuth] Error fetching profile:', error);
        }
        setProfile(null);
        return null;
      }
      return null;
    } catch (error) {
      console.error('[useAuth] Exception in fetchProfile:', error);
      setProfile(null);
      return null;
    }
  };

  const refetchProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout - ensure loading is always set to false after 5 seconds maximum
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[useAuth] Safety timeout - forcing loading to false after 5 seconds');
        setLoading(false);
      }
    }, 5000);

    // Set up auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        try {
          // Check if we're in a recovery session (password reset flow)
          const isOnResetPasswordPage = window.location.pathname.includes('/reset-password');
          
          if (isOnResetPasswordPage && isRecoverySession) {
            setLoading(false);
            return;
          }
          
          if (isRecoverySession && !isOnResetPasswordPage) {
            console.log('Recovery session detected outside reset password flow, signing out...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user && !isRecoverySession) {
            // Fetch profile with timeout (3 seconds max)
            try {
              const profileData = await Promise.race([
                fetchProfile(session.user.id),
                new Promise<null>((resolve) => setTimeout(() => {
                  console.warn('[useAuth] Profile fetch timeout after 3 seconds');
                  resolve(null);
                }, 3000))
              ]);
              
              // Always set loading to false after profile fetch attempt
              if (mounted) {
                setLoading(false);
              }
            } catch (error) {
              console.error('[useAuth] Error in profile fetch:', error);
              if (mounted) {
                setLoading(false);
              }
            }
          } else {
            setProfile(null);
            if (mounted) {
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('[useAuth] Error in auth state change:', error);
          if (mounted) {
            await handleAuthError(error);
            setLoading(false);
          }
        }
      }
    );

    // Check for existing session with error handling
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      try {
        if (error) {
          await handleAuthError(error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile with timeout (3 seconds max)
          try {
            const profileData = await Promise.race([
              fetchProfile(session.user.id),
              new Promise<null>((resolve) => setTimeout(() => {
                console.warn('[useAuth] Profile fetch timeout after 3 seconds');
                resolve(null);
              }, 3000))
            ]);
            
            // Check if user is suspended or IP is blocked AFTER authentication
            if (profileData) {
              // Check if account is suspended
              if (profileData.subscription_status === 'suspended') {
                console.warn('[useAuth] User account is suspended, signing out');
                await supabase.auth.signOut();
                setError(prev => ({ 
                  ...prev, 
                  signIn: new Error('Your account has been suspended. Contact support for assistance.') 
                }));
                if (mounted) {
                  setLoading(false);
                  clearTimeout(safetyTimeout);
                }
                return;
              }

              // Check if IP is blocked
              const clientInfo = await ipTrackingService.getClientInfo();
              if (clientInfo?.ip) {
                const isBlocked = await EmailService.isIPBlocked(clientInfo.ip);
                if (isBlocked) {
                  console.warn('[useAuth] IP address is blocked, signing out');
                  await supabase.auth.signOut();
                  setError(prev => ({ 
                    ...prev, 
                    signIn: new Error('Access denied. Your IP has been blocked due to suspicious activity. Contact support for assistance.') 
                  }));
                  if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                  }
                  return;
                }
              }
            }
            
            // Always set loading to false after profile fetch attempt
            if (mounted) {
              setLoading(false);
              clearTimeout(safetyTimeout);
            }
          } catch (error) {
            console.error('[useAuth] Error in profile fetch:', error);
            if (mounted) {
              setLoading(false);
              clearTimeout(safetyTimeout);
            }
          }
        } else {
          if (mounted) {
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        }
      } catch (error) {
        console.error('[useAuth] Error in getSession:', error);
        if (mounted) {
          await handleAuthError(error);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
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

    const redirectUrl = `${window.location.origin}/dashboard`;
    
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
      // Check if IP is blocked
      const clientInfo = await ipTrackingService.getClientInfo();
      if (clientInfo?.ip) {
        const isBlocked = await EmailService.isIPBlocked(clientInfo.ip);
        if (isBlocked) {
          const blockError = new Error('Access denied. Your IP has been blocked due to suspicious activity. Contact support for assistance.');
          setError(prev => ({ ...prev, signIn: blockError }));
          
          // Log the blocked IP attempt for audit trail
          await ipTrackingService.logLoginActivity({
            email: emailValidation.sanitizedValue!,
            login_type: 'signin',
            success: false,
            failure_reason: 'IP address blocked'
          });
          
          return { error: blockError };
        }
      }

      // Check if user account is suspended
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('email', emailValidation.sanitizedValue!)
        .single();

      if (userProfile?.subscription_status === 'suspended') {
        const suspendedError = new Error('Your account has been suspended. Contact support for assistance.');
        setError(prev => ({ ...prev, signIn: suspendedError }));
        
        // Log the blocked attempt
        await ipTrackingService.logLoginActivity({
          email: emailValidation.sanitizedValue!,
          login_type: 'signin',
          success: false,
          failure_reason: 'Account suspended'
        });
        
        return { error: suspendedError };
      }

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
      setIsRecoverySession(false);
      
      // Clear session storage to allow welcome toast on next login
      sessionStorage.removeItem('hasShownWelcome');
      
      // Log signout attempt
      await ipTrackingService.logLoginActivity({
        user_id: currentUser?.id,
        email: currentUser?.email || '',
        login_type: 'logout',
        success: true
      });
    } catch (error) {
      clearAuthTokens(); // Clear tokens even if signout fails
      sessionStorage.removeItem('hasShownWelcome'); // Clear welcome flag even on error
      setIsRecoverySession(false);
      
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
    const sanitizedUpdates: Partial<Profile> = {} as Partial<Profile>;
    
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        const validation = InputSanitizer.sanitizeText(value, 500);
        if (!validation.isValid) {
          setError(prev => ({ ...prev, updateProfile: new Error(`Invalid ${key}: ${validation.error}`) }));
          return { error: new Error(`Invalid ${key}: ${validation.error}`) };
        }
        (sanitizedUpdates as Record<string, any>)[key] = validation.sanitizedValue;
      } else {
        (sanitizedUpdates as Record<string, any>)[key] = value;
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
        login_type: 'password_reset',
        success: !error,
        failure_reason: error?.message
      });
      
      if (error) {
        const normalizedMessage = error.message?.toLowerCase() || '';
        const accountNotFound = normalizedMessage.includes('user') && normalizedMessage.includes('not') && normalizedMessage.includes('found');
        const finalError = accountNotFound
          ? new Error('No account found with this email address. Please check your email or sign up.')
          : error;
        setError(prev => ({ ...prev, forgotPassword: finalError }));
        return { error: finalError };
      }

      setError(prev => ({ ...prev, forgotPassword: null }));
      return { error: null };
    } catch (error) {
      // Log forgot password attempt
      await ipTrackingService.logLoginActivity({
        email: emailValidation.sanitizedValue!,
        login_type: 'password_reset',
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

      // Log successful password reset
      await auditService.log(user?.id, 'UPDATE', 'authentication', {
        recordId: user?.id,
        newValues: {
          timestamp: new Date().toISOString()
        },
        userAgent: navigator.userAgent,
        ipAddress: await getClientIP(),
      });

      // End the recovery session so tokens cannot be reused / user is not auto logged-in
      await supabase.auth.signOut();
      toggleRecoverySession(false);
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

  const toggleRecoverySession = (active: boolean) => {
    setIsRecoverySession(active);
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
      resetPassword,
      isRecoverySession,
      toggleRecoverySession
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
