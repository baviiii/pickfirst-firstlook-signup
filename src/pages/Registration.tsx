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
import { Link } from 'react-router-dom';
import AuthLayout from '@/components/layouts/AuthLayout';

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

    // Require organisation / business name when signing up as an agent
    if (formData.userType === 'agent' && !formData.company.trim()) {
      toast.error('Please enter your organisation / business name');
      return;
    }
    
    setLoading(true);
    let error;
    
    // Sign up with user type in metadata
    const result = await signUp(formData.email, formData.password, formData.fullName, formData.userType);
    error = result.error;
    
    if (!error) {
      // Wait a bit for the profile to be created, then ensure the role and company are correct
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const updateResult = await updateProfile({
        role: formData.userType,
        // Store organisation / business name on profile when provided
        company: formData.company?.trim() || undefined,
      });
      if (updateResult.error) {
        console.error('Failed to update profile after registration:', updateResult.error);
      }
    }
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Account created! Please check your email to verify your account before signing in.', {
        duration: 5000,
      });
      
      setLoading(false);
      
      // Redirect to sign-in page after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
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
      default:
        return '';
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-lg mx-auto py-4 sm:py-8 md:py-12 px-3 sm:px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 sm:mb-6 self-start hover:bg-amber-50 hover:text-amber-700 text-gray-600 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="w-full bg-white/90 backdrop-blur-lg text-gray-800 border border-amber-200/50 shadow-2xl shadow-amber-100/30 transition-all duration-500">
          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-amber-300/30 overflow-hidden">
              <img
                src="https://pickfirst.com.au/logo.jpg"
                alt="PickFirst"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/logo.jpg') {
                    target.src = '/logo.jpg';
                  }
                }}
              />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800">
              Sign Up for PickFirst
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm sm:text-lg">
              Choose your account type to access off-market properties
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              {/* User Type Selection */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="userType" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Account Type
                </Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
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
                {formData.userType && (
                  <p className="text-xs sm:text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/50">
                    {getUserTypeDescription(formData.userType)}
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fullName" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              {/* Organisation / Business (for agents) */}
              {formData.userType === 'agent' && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-600" />
                    Organisation / Business
                  </Label>
                  <Input
                    id="company"
                    placeholder="Enter your company name"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-600" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
                <p className="text-xs text-gray-500">
                  Must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="h-11 sm:h-12 bg-white border border-amber-200/50 text-gray-800 placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 text-base"
                  required
                />
              </div>

              {/* Benefits Section */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 bg-amber-50/80 p-3 sm:p-4 rounded-xl border border-amber-200/50">
                <h3 className="text-base sm:text-lg font-semibold text-amber-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Member Benefits
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                    <span>Exclusive access to off-market properties</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                    <span>Direct messaging with property owners</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                    <span>Advanced search and filtering tools</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                    <span>Priority notifications for new listings</span>
                  </div>
                </div>
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

              <Button
                type="submit"
                onClick={handleRegistration}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm sm:text-lg transition-all duration-300 shadow-xl shadow-amber-300/30 hover:shadow-amber-400/40 rounded-xl border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Create Account & Verify Email
                  </>
                )}
              </Button>

              <div className="text-center text-xs sm:text-sm text-gray-600 pt-2 sm:pt-4">
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-amber-600 hover:text-amber-700 font-semibold hover:underline transition-all duration-300"
                  onClick={() => navigate('/auth')}
                >
                  Sign in here
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default Registration;