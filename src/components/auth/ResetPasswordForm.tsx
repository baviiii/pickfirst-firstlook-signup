import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';
import { rateLimitService } from '@/services/rateLimitService';

export const ResetPasswordForm = () => {
  const { resetPassword, user, toggleRecoverySession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
  const [recoveryTokens, setRecoveryTokens] = useState<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate password strength
  const validatePasswordStrength = useCallback((password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, []);

  useEffect(() => {
    const score = validatePasswordStrength(formData.password);
    setPasswordScore(score);
  }, [formData.password, validatePasswordStrength]);

  useEffect(() => {
    const validateResetToken = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      
      // Skip validation if we're not on the reset password page
      // (component might be pre-loaded by React Router)
      if (!accessToken && !refreshToken && !type) {
        console.debug('Reset password form loaded but no reset params present, skipping validation');
        setValidatingToken(false);
        setHasValidToken(false);
        return;
      }
      
      // Basic URL parameter validation
      if (!accessToken || !refreshToken || type !== 'recovery') {
        setValidatingToken(false);
        setHasValidToken(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error || !data.user) {
          throw error || new Error('Unable to validate recovery token');
        }

        setRecoveryTokens({
          accessToken,
          refreshToken,
        });

        setHasValidToken(true);
        setValidatingToken(false);
      } catch (error) {
        console.error('Token validation error:', error);
        setHasValidToken(false);
        setValidatingToken(false);
      }
    };

    validateResetToken();
  }, [searchParams]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordScore < 3) {
      newErrors.password = 'Please choose a stronger password';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!recoveryTokens) {
      toast.error('Recovery link is invalid or has expired. Please request a new one.');
      return;
    }
    
    // Check rate limit
    const rateLimitResult = await rateLimitService.checkRateLimit(
      user?.id || 'unknown',
      'password_reset'
    );
    
    if (!rateLimitResult.allowed) {
      toast.error('Too many attempts. Please try again later.', {
        icon: <ShieldAlert className="w-5 h-5" />
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: recoveryTokens.accessToken,
        refresh_token: recoveryTokens.refreshToken,
      });

      if (sessionError) {
        throw sessionError;
      }

      toggleRecoverySession(true);

      const { error } = await resetPassword(formData.password);
      
      if (error) {
        throw error;
      }
      
      // Log successful password reset
      await auditService.log(user?.id || 'unknown', 'PASSWORD_RESET_SUCCESS', 'password_reset', {
        userAgent: navigator.userAgent,
        ipAddress: await getClientIP()
      });
      
      toast.success('Password updated successfully! Please log in with your new password.');
      
      // Clear sensitive data from state
      setFormData({ password: '', confirmPassword: '' });
      setRecoveryTokens(null);
      toggleRecoverySession(false);
      navigate('/auth', { replace: true });
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      
      // Log failed attempt
      await auditService.log(user?.id || 'unknown', 'PASSWORD_RESET_FAILED', 'password_reset', {
        newValues: {
          error: error.message,
          userAgent: navigator.userAgent,
          ipAddress: await getClientIP()
        }
      });
      toggleRecoverySession(false);
      await supabase.auth.signOut().catch(() => {});
      
      toast.error(error.message || 'Failed to reset password. Please try again.', {
        icon: <ShieldAlert className="w-5 h-5" />
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordScore <= 1) return 'bg-red-500';
    if (passwordScore <= 2) return 'bg-yellow-500';
    if (passwordScore <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (!formData.password) return '';
    if (passwordScore <= 1) return 'Weak';
    if (passwordScore <= 2) return 'Moderate';
    if (passwordScore <= 3) return 'Strong';
    return 'Very Strong';
  };

  // Show loading state while validating token
  if (validatingToken) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-3 text-center">
          <img
            src="https://pickfirst.com.au/logo.jpg"
            alt="PickFirst Real Estate"
            className="mx-auto h-16 w-auto drop-shadow-lg"
            loading="lazy"
          />
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Validating your reset link...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-gray-500">Please wait...</p>
        </CardContent>
      </Card>
    );
  }

  // Show error state if token is invalid
  if (!hasValidToken) {
    return (
      <Card className="w-full max-w-md mx-auto border-red-200">
        <CardHeader className="space-y-3 text-center">
          <img
            src="https://pickfirst.com.au/logo.jpg"
            alt="PickFirst Real Estate"
            className="mx-auto h-16 w-auto drop-shadow-lg"
            loading="lazy"
          />
          <div className="flex items-center gap-2 justify-center">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            <CardTitle className="text-2xl font-bold text-red-600">Invalid Reset Link</CardTitle>
          </div>
          <CardDescription className="text-red-600">
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Why am I seeing this?</h3>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>The reset link has expired (links are valid for 1 hour)</li>
              <li>The link has already been used</li>
              <li>The link was copied incorrectly</li>
              <li>You don't have an account with us yet</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/forgot-password')}
              className="w-full"
              variant="default"
            >
              Request New Reset Link
            </Button>
            
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
              variant="outline"
            >
              Back to Login
            </Button>
            
            <Button 
              onClick={() => navigate('/signup')}
              className="w-full"
              variant="ghost"
            >
              Don't have an account? Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the reset password form only if token is valid
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-3 text-center">
        <img
          src="https://pickfirst.com.au/logo.jpg"
          alt="PickFirst Real Estate"
          className="mx-auto h-16 w-auto drop-shadow-lg"
          loading="lazy"
        />
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {formData.password && (
              <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getPasswordStrengthColor()}`} 
                    style={{ width: `${(passwordScore / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-gray-500">
                  Password strength: {getPasswordStrengthText()}
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
        
        <div className="mt-4 text-center text-sm">
          <button
            onClick={() => navigate('/auth')}
            className="text-primary hover:underline"
            disabled={loading}
          >
            Back to Login
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get client IP (you may need to adjust this based on your setup)
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return 'unknown';
  }
}