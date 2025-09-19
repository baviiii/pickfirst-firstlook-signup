import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  title?: string;
  description?: string;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback, 
  showUpgrade = true,
  title,
  description 
}: FeatureGateProps) => {
  const { isFeatureEnabled } = useSubscription();
  const navigate = useNavigate();

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-lg">
          {title || 'Premium Feature'}
        </CardTitle>
        <CardDescription>
          {description || 'This feature is available with a premium subscription'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1" />
          Premium Only
        </Badge>
        <div className="space-y-2">
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
          >
            Upgrade to Premium
          </Button>
          <p className="text-xs text-muted-foreground">
            Start your premium subscription today
          </p>
        </div>
      </CardContent>
    </Card>
  );
};