import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';
import { rateLimitService } from '@/services/rateLimitService';

export const ResetPasswordForm = () => {
  const { resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordScore, setPasswordScore] = useState(0);
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
      
      // Basic URL parameter validation
      if (!accessToken || !refreshToken || type !== 'recovery') {
        handleInvalidToken();
        return;
      }

      try {
        // Verify the reset token with Supabase
        const { error } = await supabase.auth.verifyOtp({
          token: accessToken,
          type: 'recovery',
          token_hash: accessToken
        });

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error('Token validation error:', error);
        handleInvalidToken();
      }
    };

    validateResetToken();
  }, [searchParams]);

  const handleInvalidToken = () => {
    auditService.log('anonymous', 'PASSWORD_RESET_TOKEN_INVALID', 'password_reset', {
      newValues: {
        reason: 'Invalid or expired reset token',
        hasAccessToken: !!searchParams.get('access_token'),
        hasRefreshToken: !!searchParams.get('refresh_token'),
        type: searchParams.get('type')
      }
    });
    
    toast.error('Invalid or expired reset link. Please request a new one.', {
      icon: <ShieldAlert className="w-5 h-5" />
    });
    navigate('/forgot-password');
  };

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
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
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