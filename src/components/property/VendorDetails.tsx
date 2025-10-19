import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  FileText, 
  Handshake, 
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface VendorDetailsProps {
  propertyId: string;
  ownershipDuration?: number; // months
  specialConditions?: string;
  favorableContracts?: string;
  motivation?: string;
  className?: string;
}

export const VendorDetails = ({ 
  propertyId, 
  ownershipDuration, 
  specialConditions, 
  favorableContracts, 
  motivation,
  className = ""
}: VendorDetailsProps) => {
  return (
    <Card className={`bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Handshake className="w-6 h-6 text-yellow-400" />
          Vendor Details
          <Badge className="bg-yellow-400 text-black ml-2">
            Premium
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ownership Duration */}
        {ownershipDuration && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">Ownership Duration</h4>
              <p className="text-gray-300 text-sm">
                {ownershipDuration < 12 
                  ? `${ownershipDuration} months` 
                  : `${Math.floor(ownershipDuration / 12)} years ${ownershipDuration % 12} months`
                }
              </p>
            </div>
          </div>
        )}

        {/* Special Conditions */}
        {specialConditions && (
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">Special Conditions</h4>
              <p className="text-gray-300 text-sm">{specialConditions}</p>
            </div>
          </div>
        )}

        {/* Favorable Contracts */}
        {favorableContracts && (
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">Favorable Contracts</h4>
              <p className="text-gray-300 text-sm">{favorableContracts}</p>
            </div>
          </div>
        )}

        {/* Vendor Motivation */}
        {motivation && (
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">Vendor Motivation</h4>
              <p className="text-gray-300 text-sm">{motivation}</p>
            </div>
          </div>
        )}

        {/* No vendor details available */}
        {!ownershipDuration && !specialConditions && !favorableContracts && !motivation && (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              Vendor details not yet available for this property
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
