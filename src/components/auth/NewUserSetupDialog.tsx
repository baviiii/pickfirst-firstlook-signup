import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const NewUserSetupDialog = () => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { profile, refetchProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.has_completed_onboarding) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [profile]);

  const markOnboardingComplete = async () => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          has_completed_onboarding: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      await refetchProfile();
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      toast.error('Could not update onboarding status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupNow = async () => {
    await markOnboardingComplete();
    setOpen(false);
    navigate('/buyer-account-settings?tab=search');
  };

  const handleLater = async () => {
    await markOnboardingComplete();
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
            disabled={submitting}
          >
            I'll Do This Later
          </Button>
          <Button
            onClick={handleSetupNow}
            className="flex-1 bg-pickfirst-yellow text-black hover:bg-pickfirst-amber font-medium"
            disabled={submitting}
          >
            Set Up Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
