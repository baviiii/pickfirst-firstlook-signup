import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Filter, DollarSign, Home, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SearchFiltersPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
    location: '',
    squareFootage: '',
    yearBuilt: '',
    features: [] as string[]
  });

  const propertyTypes = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land'];
  const bedroomOptions = ['1+', '2+', '3+', '4+', '5+'];
  const bathroomOptions = ['1+', '1.5+', '2+', '2.5+', '3+', '4+'];
  const features = [
    'Pool', 'Garage', 'Fireplace', 'Garden', 'Balcony', 'Gym', 
    'Air Conditioning', 'Heating', 'Dishwasher', 'Washer/Dryer'
  ];

  const handleFeatureToggle = (feature: string) => {
    setFilters(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-primary border-white/20 hover:border-primary/30"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Search Filters</h1>
        </div>

        {/* Price Range */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Price Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Price</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Maximum Price</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={filters.priceMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Property Type</label>
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Any Type</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bedrooms</label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Any</option>
                  {bedroomOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bathrooms</label>
                <select
                  value={filters.bathrooms}
                  onChange={(e) => setFilters(prev => ({ ...prev, bathrooms: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Any</option>
                  {bathroomOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Square Footage (min)</label>
                <input
                  type="number"
                  placeholder="Any size"
                  value={filters.squareFootage}
                  onChange={(e) => setFilters(prev => ({ ...prev, squareFootage: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Year Built (min)</label>
                <input
                  type="number"
                  placeholder="Any year"
                  value={filters.yearBuilt}
                  onChange={(e) => setFilters(prev => ({ ...prev, yearBuilt: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City, State or ZIP Code</label>
              <input
                type="text"
                placeholder="Enter location..."
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Features & Amenities */}
        <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-primary/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Features & Amenities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {features.map(feature => (
                <button
                  key={feature}
                  onClick={() => handleFeatureToggle(feature)}
                  className={`p-3 rounded-lg border transition-all text-sm ${
                    filters.features.includes(feature)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {feature}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            className="flex-1"
            onClick={() => {
              // Apply filters logic here
              navigate('/browse-properties');
            }}
          >
            Apply Filters & Search
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setFilters({
              priceMin: '',
              priceMax: '',
              bedrooms: '',
              bathrooms: '',
              propertyType: '',
              location: '',
              squareFootage: '',
              yearBuilt: '',
              features: []
            })}
            className="text-gray-300 hover:text-primary"
          >
            Clear All Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchFiltersPage;