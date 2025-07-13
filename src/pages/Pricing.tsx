
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
        <div className="absolute top-40 left-20 w-60 h-60 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce" style={{backgroundColor: 'rgb(255, 204, 0)'}}></div>
      </div>
      {/* Nav Bar */}
      <nav className="relative z-10 backdrop-blur-sm bg-black/20 border-b border-pickfirst-yellow/20 shadow-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl pickfirst-gradient-yellow-amber flex items-center justify-center shadow-xl shadow-pickfirst-yellow/30 transition-all duration-300 hover:shadow-pickfirst-yellow/50 hover:scale-105 cursor-pointer" onClick={() => navigate('/') }>
                <Home className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold pickfirst-gradient-yellow-amber-text">PickFirst</h1>
                <p className="text-sm text-gray-400">Off-Market Property Access</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}
              className="text-gray-300 hover:text-pickfirst-yellow hover:bg-pickfirst-yellow/10 transition-all duration-300 border border-transparent hover:border-pickfirst-yellow/30 rounded-lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="relative z-10">
        <SubscriptionPlans />
      </div>
    </div>
  );
};

export default Pricing;
