import { supabase } from '@/integrations/supabase/client';

export interface AuthDebugInfo {
  hasSession: boolean;
  sessionExpiry?: string;
  refreshTokenExists: boolean;
  localStorageKeys: string[];
  supabaseAuthKeys: string[];
  errors: string[];
}

export const debugAuthState = (): AuthDebugInfo => {
  const debug: AuthDebugInfo = {
    hasSession: false,
    refreshTokenExists: false,
    localStorageKeys: [],
    supabaseAuthKeys: [],
    errors: []
  };

  try {
    // Check localStorage for auth-related keys
    const keys = Object.keys(localStorage);
    debug.localStorageKeys = keys.filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );

    // Check for specific Supabase auth keys
    debug.supabaseAuthKeys = keys.filter(key => 
      key.startsWith('sb-') || key.includes('supabase.auth')
    );

    // Check if refresh token exists
    const authToken = localStorage.getItem('sb-rkwvgqozbpqgmpbvujgz-auth-token');
    if (authToken) {
      try {
        const parsed = JSON.parse(authToken);
        debug.refreshTokenExists = !!parsed.refresh_token;
        if (parsed.expires_at) {
          debug.sessionExpiry = new Date(parsed.expires_at * 1000).toISOString();
        }
      } catch (e) {
        debug.errors.push('Failed to parse auth token');
      }
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        debug.errors.push(`Session error: ${error.message}`);
      } else {
        debug.hasSession = !!session;
      }
    }).catch(e => {
      debug.errors.push(`Session check failed: ${e.message}`);
    });

  } catch (error) {
    debug.errors.push(`Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return debug;
};

export const clearAllAuthData = () => {
  try {
    // Clear all Supabase-related localStorage items
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.startsWith('sb-')) {
        localStorage.removeItem(key);
        console.log(`Cleared: ${key}`);
      }
    });

    // Clear session cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      if (name.trim().includes('supabase') || name.trim().includes('auth')) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        console.log(`Cleared cookie: ${name.trim()}`);
      }
    });

    console.log('All auth data cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

export const forceReauth = async () => {
  try {
    // Clear all auth data
    clearAllAuthData();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Redirect to auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  } catch (error) {
    console.error('Error during force reauth:', error);
    // Still redirect even if there's an error
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
  }
};

// Console utility for debugging
export const logAuthDebug = () => {
  const debug = debugAuthState();
  console.group('🔍 Auth Debug Info');
  console.log('Has Session:', debug.hasSession);
  console.log('Session Expiry:', debug.sessionExpiry);
  console.log('Refresh Token Exists:', debug.refreshTokenExists);
  console.log('LocalStorage Keys:', debug.localStorageKeys);
  console.log('Supabase Auth Keys:', debug.supabaseAuthKeys);
  if (debug.errors.length > 0) {
    console.error('Errors:', debug.errors);
  }
  console.groupEnd();
  
  return debug;
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    debug: logAuthDebug,
    clear: clearAllAuthData,
    reauth: forceReauth
  };
}
