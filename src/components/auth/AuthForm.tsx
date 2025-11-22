import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';
import { signInSchema, signUpSchema } from '@/utils/validationSchemas';
import { toast } from 'sonner';
import { Loader2, User, Building, Shield, Lock } from 'lucide-react';
import { z } from 'zod';

export const AuthForm = () => {
  const { signIn, signUp, updateProfile } = useAuth();
  const navigate = useNavigate();
  const csrf = useCSRFProtection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'buyer',
    company: '',
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Zod validation for type safety and input validation
      const validated = signInSchema.parse({
        ...signInData,
        csrfToken: csrf.token
      });

      const { error } = await signIn(validated.email, validated.password);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back! 🎉');
        csrf.regenerate(); // Regenerate CSRF token after successful login
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('An error occurred during sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Require organisation / business name when signing up as an agent
    if (signUpData.userType === 'agent' && !signUpData.company.trim()) {
      toast.error('Please enter your organisation / business name');
      return;
    }
    
    setLoading(true);
    
    try {
      // Zod validation for type safety and input validation
      const validated = signUpSchema.parse({
        email: signUpData.email,
        password: signUpData.password,
        fullName: signUpData.fullName,
        userType: signUpData.userType,
        csrfToken: csrf.token
      });

      const { error } = await signUp(
        validated.email, 
        validated.password, 
        validated.fullName, 
        validated.userType
      );
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
      } else {
        const toastId = toast.success(
          'Account created! Please check your email to verify your account before signing in.',
          {
            duration: Infinity,
            action: {
              label: 'Dismiss',
              onClick: () => toast.dismiss(toastId),
            },
          },
        );
        
        csrf.regenerate();
        setLoading(false);
        navigate('/auth?tab=signin&showConfirm=1');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('An error occurred during sign up');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const showConfirm = searchParams.get('showConfirm');
    if (showConfirm) {
      const toastId = toast.success(
        'Check your inbox to confirm your email before signing in.',
        {
          duration: Infinity,
          action: {
            label: 'Dismiss',
            onClick: () => toast.dismiss(toastId),
          },
        },
      );
      const params = new URLSearchParams(searchParams);
      params.delete('showConfirm');
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSignInInputChange = (field: string, value: string) => {
    setSignInData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignUpInputChange = (field: string, value: string) => {
    setSignUpData(prev => ({ ...prev, [field]: value }));
  };

  const getUserTypeDescription = (type: string) => {
    switch (type) {
      case 'buyer':
        return 'I want to find and purchase properties';
      case 'agent':
        return 'I am a real estate agent looking to list properties';
      case 'super_admin':
        return 'I am a system administrator';
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-md pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-2xl hover:shadow-pickfirst-yellow/30 transition-all duration-500 hover:scale-[1.02]">
      <CardHeader className="text-center space-y-3">
        <img
          src="https://pickfirst.com.au/logo.jpg"
          alt="PickFirst Real Estate"
          className="mx-auto h-16 w-auto drop-shadow-lg"
          loading="lazy"
        />
        <CardTitle className="text-3xl font-bold text-foreground">
          PickFirst
        </CardTitle>
        <CardDescription className="text-muted-foreground text-lg">
          Sign in to access exclusive real estate opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-card/80 border border-border">
            <TabsTrigger value="signin" className="text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <input type="hidden" name="csrfToken" value={csrf.token} />
              
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-foreground font-semibold">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signInData.email}
                  onChange={(e) => handleSignInInputChange('email', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-foreground font-semibold">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => handleSignInInputChange('password', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground font-bold h-12 rounded-xl" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              
              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-pickfirst-yellow hover:text-pickfirst-yellow/80 text-sm font-medium transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <input type="hidden" name="csrfToken" value={csrf.token} />
              
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-foreground font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-pickfirst-yellow" />
                  Account Type
                </Label>
                <Select value={signUpData.userType} onValueChange={(value) => handleSignUpInputChange('userType', value)}>
                  <SelectTrigger className="h-12 bg-card border border-border text-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring">
                    <SelectValue placeholder="Select your user type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border text-foreground">
                    <SelectItem value="buyer" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-pickfirst-yellow" />
                        Property Buyer
                      </div>
                    </SelectItem>
                    <SelectItem value="agent" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-pickfirst-yellow" />
                        Real Estate Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-pickfirst-yellow" />
                        Super Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {signUpData.userType && (
                  <p className="text-sm text-primary bg-primary/5 p-2 rounded-lg border border-primary/30">
                    {getUserTypeDescription(signUpData.userType)}
                  </p>
                )}
              </div>

              {/* Organisation / Business (agents only) */}
              {signUpData.userType === 'agent' && (
                <div className="space-y-2">
                  <Label htmlFor="signup-company" className="text-foreground font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4 text-pickfirst-yellow" />
                    Organisation / Business
                  </Label>
                  <Input
                    id="signup-company"
                    placeholder="Enter your organisation or business name"
                    value={signUpData.company}
                    onChange={(e) => handleSignUpInputChange('company', e.target.value)}
                    className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                    required={signUpData.userType === 'agent'}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="signup-fullName" className="text-foreground font-semibold">Full Name</Label>
                <Input
                  id="signup-fullName"
                  placeholder="Enter your full name"
                  value={signUpData.fullName}
                  onChange={(e) => handleSignUpInputChange('fullName', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground font-semibold">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpData.email}
                  onChange={(e) => handleSignUpInputChange('email', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground font-semibold">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a secure password"
                  value={signUpData.password}
                  onChange={(e) => handleSignUpInputChange('password', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirmPassword" className="text-foreground font-semibold">Confirm Password</Label>
                <Input
                  id="signup-confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => handleSignUpInputChange('confirmPassword', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-pickfirst-amber text-primary-foreground font-bold h-12 rounded-xl" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
