import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle, User, Mail, Lock, Phone, Building, Shield } from 'lucide-react';

const Registration = () => {
  const { signUp, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: '',
    company: '',
    phone: ''
  });

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!formData.userType) {
      toast.error('Please select your user type');
      return;
    }
    
    setLoading(true);
    let error;
    if (formData.userType) {
      // First sign up, then update profile with userType
      const result = await signUp(formData.email, formData.password, formData.fullName);
      error = result.error;
      if (!error) {
        // Try to update profile with userType
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for profile to be created
        await updateProfile({ role: formData.userType });
      }
    } else {
      const result = await signUp(formData.email, formData.password, formData.fullName);
      error = result.error;
    }
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Registration successful! Please check your email to verify your account.');
    }
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getUserTypeDescription = (type: string) => {
    switch (type) {
      case 'buyer':
        return 'I want to find and purchase properties';
      case 'agent':
        return 'I am a real estate agent looking to list properties';
      case 'broker':
        return 'I am a broker managing multiple agents and properties';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full pickfirst-gradient-yellow-amber opacity-20 blur-3xl animate-pulse"></div>
        
        {/* Secondary glow */}
        <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full pickfirst-gradient-yellow-amber opacity-15 blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Accent glow */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pickfirst-yellow opacity-10 blur-xl animate-bounce" style={{animationDuration: '4s'}}></div>
        
        {/* Moving orbs */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full pickfirst-yellow opacity-5 blur-lg animate-pulse" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-24 h-24 rounded-full pickfirst-amber opacity-8 blur-md animate-pulse" style={{animationDuration: '2s', animationDelay: '0.5s'}}></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="relative z-10 backdrop-blur-sm bg-black/20 border-b border-pickfirst-yellow/20 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl pickfirst-gradient-yellow-amber flex items-center justify-center shadow-xl shadow-pickfirst-yellow/30 transition-all duration-300 hover:shadow-pickfirst-yellow/50 hover:scale-105">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">
                  PickFirst
                </h1>
                <p className="text-sm text-gray-400">Off-Market Property Access</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Registration Card */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] py-12 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="mb-6 self-start hover:bg-pickfirst-yellow/10 hover:text-pickfirst-yellow text-gray-300 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="w-full max-w-lg bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-pickfirst-yellow/20 shadow-2xl shadow-pickfirst-yellow/10 hover:shadow-pickfirst-yellow/20 transition-all duration-500 hover:scale-[1.02]">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 pickfirst-gradient-yellow-amber rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-black" />
            </div>
            <CardTitle className="text-3xl font-bold pickfirst-gradient-yellow-amber-text">
              Sign Up for PickFirst
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Choose your account type to access off-market properties
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="userType" className="text-white font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-pickfirst-yellow" />
                  Account Type
                </Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
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
                    <SelectItem value="broker" className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-pickfirst-yellow" />
                        Broker
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.userType && (
                  <p className="text-sm text-pickfirst-yellow/70 bg-pickfirst-yellow/10 p-2 rounded-lg border border-pickfirst-yellow/20">
                    {getUserTypeDescription(formData.userType)}
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-white font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-pickfirst-yellow" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>

              {/* Company (for agents/brokers) */}
              {(formData.userType === 'agent' || formData.userType === 'broker') && (
                <div className="space-y-3">
                  <Label htmlFor="company" className="text-white font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4 text-pickfirst-yellow" />
                    Company Name
                  </Label>
                  <Input
                    id="company"
                    placeholder="Enter your company name"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-white font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-pickfirst-yellow" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                />
              </div>
              
              {/* Email */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-white font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-pickfirst-yellow" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              {/* Password */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-white font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pickfirst-yellow" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
                <p className="text-xs text-gray-400">
                  Must be at least 6 characters long
                </p>
              </div>
              
              {/* Confirm Password */}
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-white font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pickfirst-yellow" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="h-12 bg-white/5 border border-white/20 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>

              {/* Benefits Section */}
              <div className="space-y-4 pt-4 bg-gradient-to-r from-pickfirst-yellow/5 to-pickfirst-amber/5 p-4 rounded-xl border border-pickfirst-yellow/20">
                <h3 className="text-lg font-semibold text-pickfirst-yellow flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Member Benefits
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-pickfirst-yellow rounded-full"></div>
                    <span>Exclusive access to off-market properties</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-pickfirst-yellow rounded-full"></div>
                    <span>Direct messaging with property owners</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-pickfirst-yellow rounded-full"></div>
                    <span>Advanced search and filtering tools</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-2 h-2 bg-pickfirst-yellow rounded-full"></div>
                    <span>Priority notifications for new listings</span>
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                onClick={handleRegistration}
                className="w-full h-14 pickfirst-gradient-yellow-amber text-black font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-pickfirst-yellow/25 rounded-xl border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Create Account & Verify Email
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-400 pt-4">
                Already have an account?{' '}
                <button 
                  type="button"
                  className="text-pickfirst-yellow hover:text-pickfirst-yellow-hover font-semibold hover:underline transition-all duration-300"
                  onClick={() => navigate('/auth')}
                >
                  Sign in here
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registration;