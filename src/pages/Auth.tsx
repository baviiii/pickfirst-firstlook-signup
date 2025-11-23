
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/layouts/AuthLayout';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if this is an email verification flow - do this immediately, before user state loads
    const hashParams = typeof window !== 'undefined' && window.location.hash 
      ? new URLSearchParams(window.location.hash.replace('#', '?'))
      : null;
    const type = hashParams?.get('type');
    const isVerificationFlow = type === 'signup' || type === 'invite' || type === 'email';
    const showConfirm = searchParams.get('showConfirm');

    // If this is a verification flow, sign out immediately (even before user state loads)
    // This prevents Supabase from auto-creating a session
    if (isVerificationFlow && !showConfirm) {
      supabase.auth.signOut().catch(console.error);
      // Clear hash to prevent Supabase from processing it
      if (window.location.hash) {
        const newUrl = window.location.pathname + window.location.search + '?showConfirm=1';
        window.history.replaceState({}, '', newUrl);
      }
    }

    // If user is logged in but this is a verification flow, sign them out to force manual login
    if (user && !loading && (isVerificationFlow || showConfirm)) {
      supabase.auth.signOut().then(() => {
        // User will stay on auth page to sign in manually
      }).catch(console.error);
      return; // Don't redirect to dashboard
    }

    // Normal flow: redirect authenticated users to dashboard (unless it's a verification flow)
    if (user && !loading && !isVerificationFlow && !showConfirm) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate, searchParams]);

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-24">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pickfirst-yellow"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-pickfirst-yellow/30"></div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthForm />
    </AuthLayout>
  );
};

export default Auth;
