import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { useAuth } from '@/hooks/useAuth';
import AuthLayout from '@/components/layouts/AuthLayout';

const ResetPassword = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Don't auto-redirect logged in users during password reset flow
  // They need to complete the password reset first

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
      <ResetPasswordForm />
    </AuthLayout>
  );
};

export default ResetPassword;