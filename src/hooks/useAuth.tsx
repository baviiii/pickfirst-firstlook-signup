import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, clearAuthTokens, handleAuthError } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

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
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { 
          full_name: fullName,
          user_type: userType || 'buyer'
        }
      }
    });
    
    // Send welcome email for new users (async, don't wait for it)
    if (!error && data.user && !data.user.email_confirmed_at) {
      // Use setTimeout to send email without blocking the signup process
      setTimeout(async () => {
        try {
          const { EmailService } = await import('@/services/emailService');
          await EmailService.sendWelcomeEmail(
            data.user.id, 
            email, 
            fullName
          );
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }, 2000); // Send after 2 seconds to ensure profile is created
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        await handleAuthError(error);
      }
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      await handleAuthError(error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      clearAuthTokens(); // Clear any remaining tokens
    } catch (error) {
      console.error('Sign out error:', error);
      clearAuthTokens(); // Clear tokens even if signout fails
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return { error };
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
      refetchProfile
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
