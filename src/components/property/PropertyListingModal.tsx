import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PropertyListingForm } from './PropertyListingForm';
import { withErrorBoundary } from '@/components/ui/error-boundary';

interface PropertyListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PropertyListingModalComponent = ({ open, onOpenChange, onSuccess }: PropertyListingModalProps) => {
  const handleSuccess = () => {
        onSuccess?.();
        onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-900/95 to-black/95 border border-pickfirst-yellow/20 text-white p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl pickfirst-gradient-yellow-amber-text">Create New Property Listing</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4">
          <PropertyListingForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            />
          </div>
      </DialogContent>
    </Dialog>
  );
};

// Export with error boundary
export const PropertyListingModal = withErrorBoundary(PropertyListingModalComponent);