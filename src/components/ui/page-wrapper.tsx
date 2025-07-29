import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, User, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  backText?: string;
}

export const PageWrapper = ({ 
  title, 
  children, 
  showBackButton = true, 
  backTo = '/dashboard',
  backText = 'Back to Dashboard'
}: PageWrapperProps) => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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

      {/* Navigation/Header */}
      <nav className="relative z-10 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl pickfirst-gradient-yellow-amber flex items-center justify-center shadow-xl shadow-pickfirst-yellow/30 transition-all duration-300 hover:shadow-pickfirst-yellow/50 hover:scale-105">
                <Home className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">PickFirst</h1>
                <p className="text-sm text-gray-400">Real Estate Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-white" />
                <span className="hidden sm:inline text-white">{profile?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/about')}
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
              >
                About Us
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSignOut} 
                className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 py-12 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {showBackButton && (
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(backTo)}
                className="text-gray-300 hover:text-pickfirst-yellow border-white/20 hover:border-pickfirst-yellow/30 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backText}
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold pickfirst-gradient-yellow-amber-text">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}; 