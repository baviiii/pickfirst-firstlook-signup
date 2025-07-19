
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, User, Building, Shield } from 'lucide-react';

export const AuthForm = () => {
  const { signIn, signUp, updateProfile } = useAuth();
  const navigate = useNavigate();
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
    userType: 'buyer'
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(signInData.email, signInData.password);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (signUpData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    const { error } = await signUp(
      signUpData.email, 
      signUpData.password, 
      signUpData.fullName, 
      signUpData.userType
    );
    
    if (error) {
      toast.error(error.message);
    } else {
      // Wait for profile creation and ensure role is set correctly
      setTimeout(async () => {
        const updateResult = await updateProfile({ role: signUpData.userType });
        if (updateResult.error) {
          console.error('Failed to update profile role:', updateResult.error);
        }
      }, 2000);
      toast.success('Registration successful! Please check your email to verify your account.');
    }
    setLoading(false);
  };

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
    <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl shadow-pickfirst-yellow/10 hover:shadow-pickfirst-yellow/20 transition-all duration-500 hover:scale-[1.02]">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold pickfirst-gradient-yellow-amber-text">
          PickFirst
        </CardTitle>
        <CardDescription className="text-gray-300 text-lg">
          Sign in to access exclusive real estate opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/20">
            <TabsTrigger value="signin" className="text-white data-[state=active]:bg-pickfirst-yellow/20 data-[state=active]:text-pickfirst-yellow">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-white data-[state=active]:bg-pickfirst-yellow/20 data-[state=active]:text-pickfirst-yellow">
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-white font-semibold">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signInData.email}
                  onChange={(e) => handleSignInInputChange('email', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-white font-semibold">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signInData.password}
                  onChange={(e) => handleSignInInputChange('password', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              <Button type="submit" className="w-full pickfirst-gradient-yellow-amber text-black font-bold h-12 rounded-xl" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-white font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-pickfirst-yellow" />
                  Account Type
                </Label>
                <Select value={signUpData.userType} onValueChange={(value) => handleSignUpInputChange('userType', value)}>
                  <SelectTrigger className="h-12 bg-white/5 border border-pickfirst-yellow/30 text-white rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring">
                    <SelectValue placeholder="Select your user type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border border-white/20">
                    <SelectItem value="buyer" className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-pickfirst-yellow" />
                        Property Buyer
                      </div>
                    </SelectItem>
                    <SelectItem value="agent" className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-pickfirst-yellow" />
                        Real Estate Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin" className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-pickfirst-yellow" />
                        Super Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {signUpData.userType && (
                  <p className="text-sm text-pickfirst-yellow/70 bg-pickfirst-yellow/10 p-2 rounded-lg border border-pickfirst-yellow/20">
                    {getUserTypeDescription(signUpData.userType)}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-fullName" className="text-white font-semibold">Full Name</Label>
                <Input
                  id="signup-fullName"
                  placeholder="Enter your full name"
                  value={signUpData.fullName}
                  onChange={(e) => handleSignUpInputChange('fullName', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-white font-semibold">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={signUpData.email}
                  onChange={(e) => handleSignUpInputChange('email', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-white font-semibold">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a secure password"
                  value={signUpData.password}
                  onChange={(e) => handleSignUpInputChange('password', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
                <p className="text-xs text-gray-400">
                  Must be at least 6 characters long
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-confirmPassword" className="text-white font-semibold">Confirm Password</Label>
                <Input
                  id="signup-confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={signUpData.confirmPassword}
                  onChange={(e) => handleSignUpInputChange('confirmPassword', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full pickfirst-gradient-yellow-amber text-black font-bold h-12 rounded-xl" disabled={loading}>
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
