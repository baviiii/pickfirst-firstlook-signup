import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Home, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AgentLayoutProps {
  children: ReactNode;
}

export const AgentLayout = ({ children }: AgentLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-black/20 border-b border-pickfirst-yellow/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-10 h-10 rounded-xl pickfirst-gradient-yellow-amber flex items-center justify-center shadow-xl shadow-pickfirst-yellow/30">
                <Home className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold pickfirst-gradient-yellow-amber-text">
                  PickFirst
                </h1>
                <p className="text-xs text-gray-400">Agent Portal</p>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-300 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
};
