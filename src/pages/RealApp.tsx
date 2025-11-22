import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PublicPreview } from '@/components/public/PublicPreview';
import { Button } from '@/components/ui/button';
import { AdvancedSearchDropdown } from '@/components/search/AdvancedSearchDropdown';
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
                  src="/logo.jpg" 
                  alt="PickFirst Logo" 
                  className="w-full h-full object-contain"
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
                variant="outline"
                onClick={handleSignInClick}
                className="text-pickfirst-yellow border-pickfirst-yellow/50 hover:bg-pickfirst-yellow/10 hover:border-pickfirst-yellow transition-all duration-300 rounded-lg"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
              
              <Button
                onClick={handleSignUpClick}
                className="pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-pickfirst-yellow/50 rounded-xl border-0 hover:pickfirst-yellow-hover px-6 py-2"
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
                  variant="outline"
                  onClick={() => {
                    handleSignInClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start text-pickfirst-yellow border-pickfirst-yellow/50 hover:bg-pickfirst-yellow/10 hover:border-pickfirst-yellow transition-all duration-300"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                
                <Button
                  onClick={() => {
                    handleSignUpClick();
                    closeMobileMenu();
                  }}
                  className="w-full justify-start pickfirst-gradient-yellow-amber text-black font-bold transition-all duration-300 shadow-xl hover:shadow-pickfirst-yellow/50 rounded-lg border-0"
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
        <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 shadow-2xl shadow-yellow-500/15 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0">
              <img
                src="/@syndey-habour.jpg"
                alt="Sydney Harbour"
                className="w-full h-full object-cover object-center brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/60 to-transparent"></div>
              <div className="absolute -top-16 right-6 h-28 w-28 rounded-full bg-pickfirst-yellow/40 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-primary/30 blur-3xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-4 px-6 py-10 lg:px-12 lg:py-16 items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Guest Access
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
                Browse live and off-market listings as a guest
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use the same intelligent search bar as our buyers to explore curated properties with the new white + yellow theme before logging in.
              </p>
              <div className="w-full max-w-4xl rounded-2xl border border-pickfirst-yellow/40 bg-white p-3 shadow-lg shadow-yellow-500/10">
                <AdvancedSearchDropdown />
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleSignInClick} className="bg-primary text-primary-foreground hover:bg-pickfirst-amber">
                  Sign In
                </Button>
                <Button variant="outline" className="border border-border text-foreground" onClick={handleSignUpClick}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
          <PublicPreview onSignUpClick={handleSignUpClick} onSignInClick={handleSignInClick} />
        </section>
      </main>
    </div>
  );
};

export default Index;