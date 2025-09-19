import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';
import { rateLimitService } from '@/services/rateLimitService';

export const ResetPasswordForm = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if we have the required tokens from the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');
    
    // Validate URL parameters for security
    const tokenValidation = InputSanitizer.validateUrlParam(accessToken || '', 'access_token');
    const refreshValidation = InputSanitizer.validateUrlParam(refreshToken || '', 'refresh_token');
    
    if (!tokenValidation.isValid || !refreshValidation.isValid || type !== 'recovery') {
      auditService.log('anonymous', 'PASSWORD_RESET_TOKEN_INVALID', 'password_reset', {
        newValues: { 
          reason: 'Invalid or missing tokens in URL',
          type,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        }
      });
      toast.error('Invalid or expired reset link');
      navigate('/forgot-password');
      return;
    }

    // Set the session but don't consider user as fully authenticated until password is updated
    const setSessionWithTokens = async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Failed to set session:', error);
          await auditService.log('anonymous', 'PASSWORD_RESET_TOKEN_INVALID', 'password_reset', {
            newValues: { 
              reason: 'Session setup failed',
              error: error.message 
            }
          });
          toast.error('Invalid or expired reset link');
          navigate('/forgot-password');
        }
      } catch (error) {
        console.error('Session setup error:', error);
        await auditService.log('anonymous', 'SYSTEM_ERROR', 'password_reset', {
          newValues: { 
            error: error instanceof Error ? error.message : 'Unknown session error'
          }
        });
        toast.error('An error occurred. Please try again.');
        navigate('/forgot-password');
      }
    };

    setSessionWithTokens();
  }, [searchParams, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validatePasswords = (password: string, confirmPassword: string) => {
    // Use comprehensive input sanitization
    const passwordValidation = InputSanitizer.validatePassword(password);
    if (!passwordValidation.isValid) {
      return passwordValidation.error || 'Invalid password';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { password, confirmPassword } = formData;
    
    // Input validation
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    // Comprehensive password validation
    const passwordError = validatePasswords(password, confirmPassword);
    if (passwordError) {
      toast.error(passwordError);
      await auditService.log('anonymous', 'VALIDATION_ERROR', 'password_reset', {
        newValues: { error: passwordError }
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';
      
      // Rate limiting check
      const rateCheck = await rateLimitService.checkRateLimit(userId, 'password_update');
      if (!rateCheck.allowed) {
        toast.error(`Too many password update attempts. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / (60 * 1000))} minutes.`);
        await auditService.log(userId, 'RATE_LIMIT_EXCEEDED', 'password_reset', {
          newValues: { 
            action: 'password_update',
            remaining: rateCheck.remaining,
            resetTime: rateCheck.resetTime
          }
        });
        setLoading(false);
        return;
      }
      
      const { error } = await resetPassword(password);
      
      if (error) {
        await auditService.log(userId, 'PASSWORD_RESET_FAILED', 'password_reset', {
          newValues: { 
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
        toast.error(error.message || 'Failed to reset password');
      } else {
        await auditService.log(userId, 'PASSWORD_RESET_SUCCESS', 'password_reset', {
          newValues: { 
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
        toast.success('Password updated successfully! Signing you in...');
        
        // Small delay to show success message, then redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      }
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      await auditService.log(user?.id || 'anonymous', 'SYSTEM_ERROR', 'password_reset', {
        newValues: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
      toast.error('An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl shadow-pickfirst-yellow/10">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-pickfirst-yellow/20 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-pickfirst-yellow" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          Set New Password
        </CardTitle>
        <CardDescription className="text-gray-300">
          Choose a strong password for your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>At least 8 characters long</li>
                <li>One uppercase and one lowercase letter</li>
                <li>At least one number</li>
              </ul>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white font-semibold">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full pickfirst-gradient-yellow-amber text-black font-bold h-12 rounded-xl" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};