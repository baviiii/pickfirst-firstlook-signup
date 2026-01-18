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
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'signup' ? 'signup' : 'signin';
  });
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

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup' || tabParam === 'signin') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
      default:
        return '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg text-gray-800 border border-amber-200/50 shadow-2xl shadow-amber-100/30 transition-all duration-500">
      <CardHeader className="text-center space-y-2 sm:space-y-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <img
          src="https://pickfirst.com.au/logo.jpg"
          alt="PickFirst Real Estate"
          className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-xl drop-shadow-lg object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/logo.jpg') {
              target.src = '/logo.jpg';
            }
          }}
        />
        <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">
          PickFirst
        </CardTitle>
        <CardDescription className="text-gray-600 text-sm sm:text-lg">
          Sign in to access exclusive real estate opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          const params = new URLSearchParams(searchParams);
          params.set('tab', value);
          setSearchParams(params, { replace: true });
        }} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-amber-50/80 border border-amber-200/50 h-10 sm:h-11">
            <TabsTrigger value="signin" className="text-gray-600 text-sm sm:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-gray-600 text-sm sm:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md">
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4">
              <input type="hidden" name="csrfToken" value={csrf.token} />

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signin-email" className="text-gray-700 font-semibold text-sm sm:text-base">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signInData.email}
                  onChange={(e) => handleSignInInputChange('email', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signin-password" className="text-gray-700 font-semibold text-sm sm:text-base">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => handleSignInInputChange('password', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-11 sm:h-12 rounded-xl shadow-lg shadow-amber-300/30 text-sm sm:text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
              <input type="hidden" name="csrfToken" value={csrf.token} />

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="userType" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Account Type
                </Label>
                <Select value={signUpData.userType} onValueChange={(value) => handleSignUpInputChange('userType', value)}>
                  <SelectTrigger className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400">
                    <SelectValue placeholder="Select your user type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-amber-200/50 text-gray-800">
                    <SelectItem value="buyer" className="hover:bg-amber-50">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-600" />
                        Property Buyer
                      </div>
                    </SelectItem>
                    <SelectItem value="agent" className="hover:bg-amber-50">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-amber-600" />
                        Real Estate Agent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {signUpData.userType && (
                  <p className="text-xs sm:text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                    {getUserTypeDescription(signUpData.userType)}
                  </p>
                )}
              </div>

              {/* Organisation / Business (agents only) */}
              {signUpData.userType === 'agent' && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="signup-company" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-600" />
                    Organisation / Business
                  </Label>
                  <Input
                    id="signup-company"
                    placeholder="Enter your organisation or business name"
                    value={signUpData.company}
                    onChange={(e) => handleSignUpInputChange('company', e.target.value)}
                    className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                    required={signUpData.userType === 'agent'}
                  />
                </div>
              )}

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-fullName" className="text-gray-700 font-semibold text-sm sm:text-base">Full Name</Label>
                <Input
                  id="signup-fullName"
                  placeholder="Enter your full name"
                  value={signUpData.fullName}
                  onChange={(e) => handleSignUpInputChange('fullName', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-email" className="text-gray-700 font-semibold text-sm sm:text-base">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpData.email}
                  onChange={(e) => handleSignUpInputChange('email', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-password" className="text-gray-700 font-semibold text-sm sm:text-base">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a secure password"
                  value={signUpData.password}
                  onChange={(e) => handleSignUpInputChange('password', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
                <p className="text-xs text-gray-500">
                  Must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-confirmPassword" className="text-gray-700 font-semibold text-sm sm:text-base">Confirm Password</Label>
                <Input
                  id="signup-confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => handleSignUpInputChange('confirmPassword', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              <p className="text-xs text-gray-500 text-center">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-amber-600 hover:text-amber-700 font-medium hover:underline">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-amber-600 hover:text-amber-700 font-medium hover:underline">
                  Privacy Policy
                </Link>
              </p>

              <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold h-11 sm:h-12 rounded-xl shadow-lg shadow-amber-300/30 text-sm sm:text-base" disabled={loading}>
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
