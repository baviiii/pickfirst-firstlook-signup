import { ReactNode } from 'react';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated beige/yellow background borrowed from BuyerLayoutImproved */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-orange-50" />

      {/* Flowing gradient waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
          style={{
            background:
              'radial-gradient(circle at 30% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)',
            animation: 'flow1 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[200%] h-[200%] -top-1/2 -right-1/2"
          style={{
            background:
              'radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.25) 0%, transparent 50%)',
            animation: 'flow2 30s ease-in-out infinite',
            animationDelay: '5s',
          }}
        />
        <div
          className="absolute w-[200%] h-[200%] -bottom-1/2 -left-1/2"
          style={{
            background:
              'radial-gradient(circle at 40% 50%, rgba(249, 115, 22, 0.2) 0%, transparent 50%)',
            animation: 'flow3 35s ease-in-out infinite',
            animationDelay: '10s',
          }}
        />
      </div>

      {/* Floating blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.2) 40%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'floatBlob1 20s ease-in-out infinite',
            top: '10%',
            left: '20%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(249, 115, 22, 0.2) 40%, transparent 70%)',
            filter: 'blur(50px)',
            animation: 'floatBlob2 25s ease-in-out infinite',
            bottom: '15%',
            right: '15%',
            animationDelay: '7s',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(252, 211, 77, 0.3) 0%, rgba(251, 191, 36, 0.15) 40%, transparent 70%)',
            filter: 'blur(40px)',
            animation: 'floatBlob3 18s ease-in-out infinite',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animationDelay: '3s',
          }}
        />
      </div>

      {/* Texture + shimmer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.03) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 15s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(180,83,9,0.02)_1px,transparent_0)] bg-[length:32px_32px] pointer-events-none" />

      {/* Keyframes for background animation */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes flow1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30%, 20%) rotate(120deg); }
          66% { transform: translate(-20%, 30%) rotate(240deg); }
        }
        @keyframes flow2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-25%, -15%) rotate(-120deg); }
          66% { transform: translate(25%, -25%) rotate(-240deg); }
        }
        @keyframes flow3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(20%, -20%) rotate(180deg); }
        }
        @keyframes floatBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -80px) scale(1.1); }
          66% { transform: translate(-80px, 50px) scale(0.9); }
        }
        @keyframes floatBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, 70px) scale(1.15); }
          66% { transform: translate(70px, -60px) scale(0.95); }
        }
        @keyframes floatBlob3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(calc(-50% + 40px), calc(-50% - 40px)) scale(1.1); }
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `,
        }}
      />

      {/* Top nav / logo */}
      <nav className="relative z-10 backdrop-blur-sm bg-card/80 border-b border-pickfirst-yellow/20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/40 flex items-center justify-center shadow-lg shadow-pickfirst-yellow/20 transition-all duration-300 hover:shadow-pickfirst-yellow/40 hover:scale-105 hover:border-pickfirst-yellow/50"
              >
                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  PickFirst
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Off-Market Property Access
                </p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[80vh] py-10 px-4">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;


