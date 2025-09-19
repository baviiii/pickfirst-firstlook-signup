import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { InputSanitizer } from '@/utils/inputSanitization';
import { auditService } from '@/services/auditService';
import { rateLimitService } from '@/services/rateLimitService';

export const ForgotPasswordForm = () => {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation and sanitization
    const emailValidation = InputSanitizer.validateEmail(email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Invalid email address');
      await auditService.log('anonymous', 'VALIDATION_ERROR', 'password_reset', {
        newValues: { error: 'Invalid email format', email: email.substring(0, 5) + '***' }
      });
      return;
    }

    // Rate limiting check
    const rateCheck = await rateLimitService.checkRateLimit(
      emailValidation.sanitizedValue || email, 
      'password_reset'
    );
    
    if (!rateCheck.allowed) {
      toast.error(`Too many password reset attempts. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / (60 * 60 * 1000))} hours.`);
      await auditService.log('anonymous', 'RATE_LIMIT_EXCEEDED', 'password_reset', {
        newValues: { 
          email: emailValidation.sanitizedValue!.substring(0, 5) + '***',
          remaining: rateCheck.remaining,
          resetTime: rateCheck.resetTime
        }
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await forgotPassword(emailValidation.sanitizedValue!);
      
      if (error) {
        await auditService.log('anonymous', 'PASSWORD_RESET_FAILED', 'password_reset', {
          newValues: { 
            error: error.message,
            email: emailValidation.sanitizedValue!.substring(0, 5) + '***'
          }
        });
        toast.error(error.message || 'Failed to send reset email');
      } else {
        await auditService.log('anonymous', 'PASSWORD_RESET_REQUEST', 'password_reset', {
          newValues: { 
            email: emailValidation.sanitizedValue!.substring(0, 5) + '***',
            timestamp: new Date().toISOString()
          }
        });
        setEmailSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      await auditService.log('anonymous', 'SYSTEM_ERROR', 'password_reset', {
        newValues: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          email: emailValidation.sanitizedValue!.substring(0, 5) + '***'
        }
      });
      toast.error('An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  if (emailSent) {
    return (
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl shadow-pickfirst-yellow/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-pickfirst-yellow/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-pickfirst-yellow" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-gray-300">
            We've sent a password reset link to <span className="text-pickfirst-yellow font-semibold">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-400">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button 
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full border-pickfirst-yellow/30 text-pickfirst-yellow hover:bg-pickfirst-yellow/10"
            >
              Try Again
            </Button>
            <Link 
              to="/auth" 
              className="flex items-center justify-center gap-2 text-pickfirst-yellow hover:text-pickfirst-yellow/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl shadow-pickfirst-yellow/10">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-white">
          Reset Password
        </CardTitle>
        <CardDescription className="text-gray-300">
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white font-semibold">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full pickfirst-gradient-yellow-amber text-black font-bold h-12 rounded-xl" 
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <Link 
            to="/auth" 
            className="flex items-center justify-center gap-2 text-pickfirst-yellow hover:text-pickfirst-yellow/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};