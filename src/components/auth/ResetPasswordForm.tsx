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
      console.log('[ResetPassword] Starting token validation...');
      console.log('[ResetPassword] Hash:', window.location.hash);
      console.log('[ResetPassword] Search:', window.location.search);
      
      // Method 1: PKCE flow - Check for 'code' parameter (modern Supabase)
      const code = searchParams.get('code');
      if (code) {
        console.log('[ResetPassword] Found PKCE code, exchanging...');
        try {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('[ResetPassword] PKCE code exchange error:', error);
            setHasValidToken(false);
            setValidatingToken(false);
            return;
          }
          
          if (data.session) {
            console.log('[ResetPassword] PKCE session created successfully');
            setRecoveryTokens({
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            });
            setHasValidToken(true);
            setValidatingToken(false);
            // Clear the code from URL to prevent reuse
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        } catch (error) {
          console.error('[ResetPassword] PKCE exchange exception:', error);
          setHasValidToken(false);
          setValidatingToken(false);
          return;
        }
      }
      
      // Method 2: Check URL hash for recovery tokens (legacy/implicit flow)
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let type: string | null = null;

      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        type = hashParams.get('type');
        
        console.log('[ResetPassword] Hash params - type:', type, 'hasAccessToken:', !!accessToken);
        
        if (accessToken && refreshToken && type === 'recovery') {
          const tokens = { accessToken, refreshToken };
          
          // Clear hash immediately
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          
          // Sign out any existing session
          await supabase.auth.signOut();
          await new Promise(resolve => setTimeout(resolve, 100));

          try {
            // Validate token
            const { data, error } = await supabase.auth.getUser(tokens.accessToken);

            if (error || !data.user) {
              throw error || new Error('Unable to validate recovery token');
            }

            console.log('[ResetPassword] Hash token validated successfully');
            setRecoveryTokens(tokens);
            setHasValidToken(true);
            setValidatingToken(false);
            return;
          } catch (error) {
            console.error('[ResetPassword] Hash token validation error:', error);
            setHasValidToken(false);
            setValidatingToken(false);
            return;
          }
        }
      }

      // Method 3: Check search params for tokens (direct navigation/fallback)
      accessToken = searchParams.get('access_token');
      refreshToken = searchParams.get('refresh_token');
      type = searchParams.get('type');
      
      // Skip validation if no reset params present
      if (!accessToken && !refreshToken && !type && !code) {
        console.debug('[ResetPassword] No reset params present');
        setValidatingToken(false);
        setHasValidToken(false);
        return;
      }
      
      if (!accessToken || !refreshToken || type !== 'recovery') {
        console.debug('[ResetPassword] Invalid params - missing required fields');
        setValidatingToken(false);
        setHasValidToken(false);
        return;
      }

      await supabase.auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error || !data.user) {
          throw error || new Error('Unable to validate recovery token');
        }

        console.log('[ResetPassword] Search param token validated successfully');
        setRecoveryTokens({
          accessToken,
          refreshToken,
        });

        setHasValidToken(true);
        setValidatingToken(false);
      } catch (error) {
        console.error('[ResetPassword] Search param token validation error:', error);
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

    // For PKCE flow, check if session is already active (no recoveryTokens needed)
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    
    if (!recoveryTokens && !existingSession) {
      toast.error('Recovery link is invalid or has expired. Please request a new one.');
      return;
    }
    
    // Check rate limit
    const rateLimitResult = await rateLimitService.checkRateLimit(
      existingSession?.user?.id || user?.id || 'unknown',
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
      let sessionData: { session: any } = { session: existingSession };
      
      // If we have recovery tokens (legacy/implicit flow), set session manually
      // For PKCE flow, session is already active from exchangeCodeForSession
      if (recoveryTokens && !existingSession) {
        const { error: sessionError, data } = await supabase.auth.setSession({
          access_token: recoveryTokens.accessToken,
          refresh_token: recoveryTokens.refreshToken,
        });

        if (sessionError || !data.session) {
          throw sessionError || new Error('Failed to establish recovery session');
        }
        sessionData = data;
      }

      toggleRecoverySession(true);

      // Update password using the active session
      const { error } = await resetPassword(formData.password);
      
      if (error) {
        // Sign out on error to prevent any session from persisting
        await supabase.auth.signOut().catch(() => {});
        throw error;
      }
      
      // Get user ID before signing out (for audit log)
      const userId = sessionData.session?.user?.id || existingSession?.user?.id || user?.id || 'unknown';
      
      // Log successful password reset
      await auditService.log(userId, 'PASSWORD_RESET_SUCCESS', 'password_reset', {
        userAgent: navigator.userAgent,
        ipAddress: await getClientIP()
      });
      
      // Clear sensitive data immediately
      setFormData({ password: '', confirmPassword: '' });
      setRecoveryTokens(null);
      toggleRecoverySession(false);
      
      // Sign out IMMEDIATELY and FORCEFULLY to prevent auto-login
      // Clear all auth state and session data
      await supabase.auth.signOut();
      
      // Clear any remaining session data
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Force another sign out to be sure
      await supabase.auth.signOut().catch(() => {});
      
      toast.success('Password updated successfully! Please log in with your new password.');
      
      // Navigate to login page immediately
      navigate('/auth?tab=signin', { replace: true });
      
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
      <Card className="w-full max-w-md mx-auto pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
        <CardHeader className="space-y-3 text-center">
          <img
            src="https://pickfirst.com.au/logo.jpg"
            alt="PickFirst Real Estate"
            className="mx-auto h-16 w-auto drop-shadow-lg"
            loading="lazy"
          />
          <CardTitle className="text-2xl font-bold text-foreground">Reset Password</CardTitle>
          <CardDescription className="text-muted-foreground">
            Validating your reset link...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Please wait...</p>
        </CardContent>
      </Card>
    );
  }

  // Show error state if token is invalid
  if (!hasValidToken) {
    return (
      <Card className="w-full max-w-md mx-auto pickfirst-glass bg-card/90 text-card-foreground border border-red-300">
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
              className="w-full bg-primary text-primary-foreground hover:bg-pickfirst-amber"
              variant="default"
            >
              Request New Reset Link
            </Button>
            
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full border-border text-muted-foreground hover:bg-muted"
              variant="outline"
            >
              Back to Login
            </Button>
            
            <Button 
              onClick={() => navigate('/signup')}
              className="w-full text-primary hover:bg-primary/10"
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
    <Card className="w-full max-w-md mx-auto pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30">
      <CardHeader className="space-y-3 text-center">
        <img
          src="https://pickfirst.com.au/logo.jpg"
          alt="PickFirst Real Estate"
          className="mx-auto h-16 w-auto drop-shadow-lg"
          loading="lazy"
        />
        <CardTitle className="text-2xl font-bold text-foreground">Reset Password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={`pr-10 bg-card border ${errors.password ? 'border-red-500' : 'border-border'} text-foreground`}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
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
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getPasswordStrengthColor()}`} 
                    style={{ width: `${(passwordScore / 4) * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  Password strength: {getPasswordStrengthText()}
                </p>
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`pr-10 bg-card border ${errors.confirmPassword ? 'border-red-500' : 'border-border'} text-foreground`}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
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
            className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground"
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
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
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