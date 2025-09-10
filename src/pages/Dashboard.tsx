import { useAuth } from '@/hooks/useAuth';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { Button } from '@/components/ui/button';
import { LogOut, User, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute top-40 left-20 w-60 h-60 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
      </div>
      {/* Navigation/Header */}
      <nav className="relative z-10 pickfirst-glass border-b border-pickfirst-yellow/20 shadow-xl">
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
                <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Dashboard</p>
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
                className="text-white"
              >
                About Us
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-white">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Dashboard Content */}
      <main className="relative z-10 py-12 px-4">
        <UserDashboard />
      </main>
    </div>
  );
};

export default Dashboard;
