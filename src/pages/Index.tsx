import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PublicPreview } from '@/components/public/PublicPreview';
import { Button } from '@/components/ui/button';
import { User, LogIn, Menu, X } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignUpClick = () => {
    navigate('/signup');
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pickfirst-bg-enhanced flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pickfirst-yellow"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-pickfirst-yellow/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pickfirst-bg-enhanced relative overflow-hidden">
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

      {/* Enhanced Navigation with Mobile Optimization */}
      <nav className="relative z-10 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo Section */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black/20 border border-pickfirst-yellow/30 flex items-center justify-center shadow-xl shadow-pickfirst-yellow/20 transition-all duration-300 hover:shadow-pickfirst-yellow/40 hover:scale-105 hover:border-pickfirst-yellow/50 p-2">
                <img 
                  src="https://pickfirst.com.au/logo.jpg" 
                  alt="PickFirst Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/logo.jpg') {
                      target.src = '/logo.jpg';
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold pickfirst-gradient-yellow-amber-text">
                  PickFirst
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Off-Market Property Access</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/about')}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg"
              >
                About Us
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate('/pricing')}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg"
              >
                Pricing
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/faq')}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg"
              >
                FAQ
              </Button>

              <Button
                variant="outline"
                onClick={handleSignInClick}
                className="text-white bg-pickfirst-yellow/30 border-2 border-pickfirst-yellow hover:bg-pickfirst-yellow/40 hover:border-pickfirst-yellow hover:text-white font-bold transition-all duration-300 rounded-lg shadow-xl shadow-pickfirst-yellow/30 px-5 py-2.5"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              
              <Button
                onClick={handleSignUpClick}
                className="pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-pickfirst-yellow/50 hover:shadow-pickfirst-yellow/70 rounded-xl border-0 hover:pickfirst-yellow-hover px-6 py-2.5"
              >
                <User className="h-4 w-4 mr-2" />
                Sign Up
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 p-2"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl">
              <div className="px-4 py-4 space-y-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/about');
                    closeMobileMenu();
                  }}
                  className="w-full text-left justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
                >
                  About Us
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/pricing');
                    closeMobileMenu();
                  }}
                  className="w-full text-left justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
                >
                  Pricing
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/faq');
                    closeMobileMenu();
                  }}
                  className="w-full text-left justify-start text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
                >
                  FAQ
                </Button>

                <div className="border-t border-pickfirst-yellow/20 pt-3 mt-3 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/terms');
                      closeMobileMenu();
                    }}
                    className="w-full text-left justify-start text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 text-sm"
                  >
                    Terms and Conditions
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/privacy');
                      closeMobileMenu();
                    }}
                    className="w-full text-left justify-start text-gray-400 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 text-sm"
                  >
                    Privacy Policy
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    handleSignInClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start text-white bg-pickfirst-yellow/20 border-2 border-pickfirst-yellow hover:bg-pickfirst-yellow/30 hover:border-pickfirst-yellow hover:text-white font-semibold transition-all duration-300 shadow-lg shadow-pickfirst-yellow/20"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                
                <Button
                  onClick={() => {
                    handleSignUpClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 shadow-xl shadow-pickfirst-yellow/40 hover:shadow-2xl hover:shadow-pickfirst-yellow/60 rounded-lg border-0"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>
      
      {/* Enhanced Main Content */}
      <main className="relative z-10">
        <PublicPreview onSignUpClick={handleSignUpClick} onSignInClick={handleSignInClick} />
      </main>

      {/* Footer with Terms and Privacy */}
      <footer className="relative z-10 border-t border-pickfirst-yellow/20 bg-black/40 backdrop-blur-lg mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} PickFirst. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/terms')}
                className="text-sm text-gray-400 hover:text-pickfirst-yellow transition-colors underline-offset-4 hover:underline"
              >
                Terms and Conditions
              </button>
              <button
                onClick={() => navigate('/privacy')}
                className="text-sm text-gray-400 hover:text-pickfirst-yellow transition-colors underline-offset-4 hover:underline"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;