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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backTo)}
            className="text-gray-300 hover:text-pickfirst-yellow transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backText}
          </Button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          {title}
        </h1>
      </div>
      {/* Content */}
      {children}
    </div>
  );
};