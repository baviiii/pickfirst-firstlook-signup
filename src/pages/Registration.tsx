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
      case 'super_admin':
        return 'I am a system administrator';
      default:
        return '';
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-lg mx-auto py-12 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="mb-6 self-start hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="w-full pickfirst-glass bg-card/90 text-card-foreground border border-pickfirst-yellow/30 shadow-2xl hover:shadow-pickfirst-yellow/30 transition-all duration-500 hover:scale-[1.02]">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-primary/10 border border-primary/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Sign Up for PickFirst
            </CardTitle>
            <CardDescription className="text-muted-foreground text-lg">
              Choose your account type to access off-market properties
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {/* User Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="userType" className="text-foreground font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Account Type
                </Label>
                <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
                  <SelectTrigger className="h-12 bg-card border border-border text-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring">
                    <SelectValue placeholder="Select your user type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border text-foreground">
                    <SelectItem value="buyer" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Property Buyer
                      </div>
                    </SelectItem>
                    <SelectItem value="agent" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary" />
                        Real Estate Agent
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin" className="hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Super Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.userType && (
                  <p className="text-sm text-primary bg-primary/5 p-2 rounded-lg border border-primary/30">
                    {getUserTypeDescription(formData.userType)}
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-foreground font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>

              {/* Organisation / Business (for agents and admins) */}
              {(formData.userType === 'agent' || formData.userType === 'super_admin') && (
                <div className="space-y-3">
                  <Label htmlFor="company" className="text-foreground font-semibold flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    Organisation / Business
                  </Label>
                  <Input
                    id="company"
                    placeholder="Enter your company name"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  />
                </div>
              )}

              {/* Phone Number */}
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-foreground font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                />
              </div>
              
              {/* Email */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-foreground font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>
              
              {/* Password */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-foreground font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
                </p>
              </div>
              
              {/* Confirm Password */}
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-foreground font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl focus:ring-2 focus:ring-offset-0 pickfirst-yellow-border pickfirst-yellow-ring"
                  required
                />
              </div>

              {/* Benefits Section */}
              <div className="space-y-4 pt-4 bg-card/80 p-4 rounded-xl border border-border">
                <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Member Benefits
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Exclusive access to off-market properties</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Direct messaging with property owners</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Advanced search and filtering tools</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
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
              
              <div className="text-center text-sm text-muted-foreground pt-4">
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
    </AuthLayout>
  );
};

export default Registration;