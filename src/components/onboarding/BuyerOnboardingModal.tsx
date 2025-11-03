import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Search, Heart, Settings, ChevronRight, X } from 'lucide-react';

interface BuyerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export const BuyerOnboardingModal = ({ isOpen, onClose, userName }: BuyerOnboardingModalProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: `Welcome to PickFirst, ${userName}! 🎉`,
      description: "Let's get you set up to find your perfect property",
      icon: <Settings className="w-16 h-16 text-pickfirst-yellow mx-auto mb-4" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-gray-600">
            We'll help you customize your experience in just a few steps.
          </p>
          <p className="text-sm text-gray-500">
            This will only take a minute, or you can skip and do it later.
          </p>
        </div>
      )
    },
    {
      title: "Set Your Preferences 🏡",
      description: "Tell us what you're looking for",
      icon: <Search className="w-16 h-16 text-blue-500 mx-auto mb-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Why set preferences?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Get personalized property recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Filter by location, price, bedrooms, and more</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Save time by seeing only relevant properties</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Property Alerts 🔔",
      description: "Never miss your dream home",
      icon: <Bell className="w-16 h-16 text-green-500 mx-auto mb-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">How Property Alerts Work:</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Get instant email notifications for new listings</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Alerts match your saved preferences automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Be the first to know about price changes</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Control notification frequency in settings</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-pickfirst-yellow/10 border border-pickfirst-yellow/30 rounded-lg p-3">
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pickfirst-yellow" />
              <span><strong>Pro Tip:</strong> Everyone gets unlimited on-market alerts! Premium members also get exclusive off-market property alerts! 🔐</span>
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSetupNow();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleSetupNow = () => {
    onClose();
    navigate('/buyer-account-settings?tab=search&onboarding=true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {steps[currentStep].icon}
          {steps[currentStep].content}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-pickfirst-yellow'
                  : index < currentStep
                  ? 'w-2 bg-pickfirst-yellow/50'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1 order-2 sm:order-1"
          >
            {currentStep === steps.length - 1 ? 'Maybe Later' : 'Skip for Now'}
          </Button>
          
          <Button
            onClick={handleNext}
            className="flex-1 order-1 sm:order-2 pickfirst-gradient-yellow-amber text-black font-semibold"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Set Up Now
                <Settings className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Skip all link */}
        {currentStep < steps.length - 1 && (
          <div className="text-center mt-2">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip introduction
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
