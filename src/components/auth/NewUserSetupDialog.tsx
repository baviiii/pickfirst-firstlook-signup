import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const NewUserSetupDialog = () => {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkNewUser = async () => {
      if (!profile?.id) return;
      
      // Check if we've shown this dialog before
      const hasSeenSetup = sessionStorage.getItem('hasSeenSetup');
      if (hasSeenSetup) return;

      // Check if user has preferences set up
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (!preferences) {
        setOpen(true);
        sessionStorage.setItem('hasSeenSetup', 'true');
      }
    };

    checkNewUser();
  }, [profile]);

  const handleSetupNow = () => {
    setOpen(false);
    navigate('/buyer-account-settings?tab=search');
  };

  const handleLater = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900/95 to-black/95 border border-pickfirst-yellow/30">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Star className="h-6 w-6 text-pickfirst-yellow" />
            Welcome to PickFirst!
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            Let's get you set up to find your dream property
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-pickfirst-yellow/10 border border-pickfirst-yellow/20">
            <Settings className="h-5 w-5 text-pickfirst-yellow shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-medium mb-1">Set Your Preferences</h4>
              <p className="text-sm text-gray-400">
                Tell us about your ideal property - budget, location, bedrooms, and more
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-pickfirst-yellow/10 border border-pickfirst-yellow/20">
            <Bell className="h-5 w-5 text-pickfirst-yellow shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-medium mb-1">Enable Property Alerts</h4>
              <p className="text-sm text-gray-400">
                Get notified when new on-market properties match your criteria
              </p>
              <p className="text-xs text-yellow-400 mt-1">
                Premium members also receive exclusive off-market alerts! 🔐
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleLater}
            className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            I'll Do This Later
          </Button>
          <Button
            onClick={handleSetupNow}
            className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber font-medium"
          >
            Set Up Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
