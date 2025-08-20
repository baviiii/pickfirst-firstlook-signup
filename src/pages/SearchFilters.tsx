import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Filter, DollarSign, Home, MapPin, Calendar, Square, Bed, Bath, Car, TreePine, Flame, Waves, Dumbbell, Wifi, X, ChevronDown, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const EnhancedSearchFiltersPage = () => {
  const navigate = useNavigate();
  
  // Enhanced filter state with more complex options
  const [filters, setFilters] = useState({
    // Basic filters
    priceMin: '',
    priceMax: '',
    priceRange: [0, 1000000],
    bedrooms: '',
    bathrooms: '',
    propertyType: '',
    location: '',
    squareFootage: '',
    squareFootageRange: [0, 10000],
    yearBuilt: '',
    yearBuiltRange: [1900, 2024],
    
    // Advanced filters
    lotSize: '',
    lotSizeRange: [0, 10],
    garageSpaces: '',
    hoa: '',
    hoaRange: [0, 1000],
    daysOnMarket: '',
    propertyStatus: '',
    listingType: '',
    
    // Features & Amenities (organized by category)
    interiorFeatures: [] as string[],
    exteriorFeatures: [] as string[],
    communityFeatures: [] as string[],
    utilities: [] as string[],
    
    // Advanced search options
    keywords: '',
    excludeKeywords: '',
    agentName: '',
    mlsNumber: '',
    
    // Map/Location filters
    school: '',
    schoolRating: [0, 10],
    walkScore: [0, 100],
    commute: {
      address: '',
      maxTime: 30,
      transport: 'driving'
    }
  });

  const [expandedSections, setExpandedSections] = useState({
    price: true,
    property: true,
    location: true,
    features: false,
    advanced: false,
    schools: false
  });

  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [filterName, setFilterName] = useState('');

  // Property options
  const propertyTypes = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land', 'Commercial', 'Multi-Family'];
  const propertyStatuses = ['Active', 'Pending', 'Sold', 'Off Market'];
  const listingTypes = ['For Sale', 'For Rent', 'Weekly Rental', 'Monthly Rental'];
  const bedroomOptions = ['1', '2', '3', '4', '5', '6+'];
  const bathroomOptions = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '5+'];
  const garageOptions = ['1', '2', '3', '4+'];
  
  // Feature categories
  const interiorFeatures = [
    'Hardwood Floors', 'Carpet', 'Tile Floors', 'Granite Counters', 'Stainless Appliances',
    'Updated Kitchen', 'Master Suite', 'Walk-in Closet', 'Fireplace', 'Vaulted Ceilings',
    'Crown Molding', 'Bay Window', 'Skylight', 'Wine Cellar', 'Home Office',
    'Breakfast Nook', 'Pantry', 'Laundry Room', 'Mudroom', 'Central Vacuum'
  ];

  const exteriorFeatures = [
    'Pool', 'Spa/Hot Tub', 'Deck', 'Patio', 'Balcony', 'Garden', 'Landscaping',
    'Sprinkler System', 'Outdoor Kitchen', 'Fire Pit', 'Gazebo', 'Shed',
    'RV Parking', 'Boat Dock', 'Tennis Court', 'Basketball Court'
  ];

  const communityFeatures = [
    'Gated Community', 'HOA', 'Clubhouse', 'Fitness Center', 'Pool', 'Tennis Courts',
    'Golf Course', 'Walking Trails', 'Playground', 'Dog Park', 'Community Garden',
    'Concierge', 'Security', 'Elevator', 'Storage Units'
  ];

  const utilities = [
    'Central Air', 'Central Heat', 'Gas Heat', 'Electric Heat', 'Solar Panels',
    'Energy Efficient', 'Smart Home', 'High Speed Internet', 'Cable Ready',
    'Satellite', 'Well Water', 'City Water', 'Septic', 'Sewer'
  ];

  const transportModes = ['driving', 'walking', 'transit', 'bicycling'];

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFeatureToggle = (category: 'interiorFeatures' | 'exteriorFeatures' | 'communityFeatures' | 'utilities', feature: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(feature)
        ? prev[category].filter(f => f !== feature)
        : [...prev[category], feature]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      priceMin: '',
      priceMax: '',
      priceRange: [0, 1000000],
      bedrooms: '',
      bathrooms: '',
      propertyType: '',
      location: '',
      squareFootage: '',
      squareFootageRange: [0, 10000],
      yearBuilt: '',
      yearBuiltRange: [1900, 2024],
      lotSize: '',
      lotSizeRange: [0, 10],
      garageSpaces: '',
      hoa: '',
      hoaRange: [0, 1000],
      daysOnMarket: '',
      propertyStatus: '',
      listingType: '',
      interiorFeatures: [],
      exteriorFeatures: [],
      communityFeatures: [],
      utilities: [],
      keywords: '',
      excludeKeywords: '',
      agentName: '',
      mlsNumber: '',
      school: '',
      schoolRating: [0, 10],
      walkScore: [0, 100],
      commute: {
        address: '',
        maxTime: 30,
        transport: 'driving'
      }
    });
  };

  const saveCurrentFilters = () => {
    if (!filterName.trim()) return;
    
    const newSavedFilter = {
      id: Date.now(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };
    
    setSavedFilters(prev => [...prev, newSavedFilter]);
    setFilterName('');
  };

  const loadSavedFilters = (savedFilter: any) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id: number) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.propertyType) count++;
    if (filters.location) count++;
    if (filters.squareFootage) count++;
    if (filters.yearBuilt) count++;
    if (filters.garageSpaces) count++;
    if (filters.propertyStatus) count++;
    if (filters.listingType) count++;
    count += filters.interiorFeatures.length;
    count += filters.exteriorFeatures.length;
    count += filters.communityFeatures.length;
    count += filters.utilities.length;
    if (filters.keywords) count++;
    if (filters.school) count++;
    return count;
  };

  const ExpandableSection = ({ title, icon, sectionKey, children }: {
    title: string;
    icon: React.ReactNode;
    sectionKey: keyof typeof expandedSections;
    children: React.ReactNode;
  }) => (
    <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
      <CardHeader 
        className="cursor-pointer hover:bg-yellow-400/5 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <ChevronDown 
            className={`h-5 w-5 text-yellow-400 transition-transform ${
              expandedSections[sectionKey] ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </CardHeader>
      {expandedSections[sectionKey] && (
        <CardContent className="border-t border-yellow-400/10">
          {children}
        </CardContent>
      )}
    </Card>
  );

  const FeatureGrid = ({ features, category, selectedFeatures }: {
    features: string[];
    category: 'interiorFeatures' | 'exteriorFeatures' | 'communityFeatures' | 'utilities';
    selectedFeatures: string[];
  }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {features.map(feature => (
        <button
          key={feature}
          onClick={() => handleFeatureToggle(category, feature)}
          className={`p-3 rounded-lg border transition-all text-sm text-left hover:scale-105 ${
            selectedFeatures.includes(feature)
              ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-lg shadow-yellow-400/25'
              : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-yellow-400/50 hover:bg-gray-700/50'
          }`}
        >
          {feature}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-gradient-to-r from-yellow-400/15 to-amber-500/15 opacity-15 blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-yellow-400/10 opacity-10 blur-xl animate-bounce" style={{animationDuration: '4s'}}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-yellow-400/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Filter className="h-6 w-6 text-yellow-400" />
                  Advanced Search Filters
                </h1>
                <p className="text-sm text-yellow-400/80">
                  {getActiveFilterCount()} active filters
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-300 hover:text-yellow-400 border-gray-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          
          {/* Quick Search */}
          <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Enter keywords, MLS number, or agent name..."
                  value={filters.keywords}
                  onChange={(e) => setFilters(prev => ({ ...prev, keywords: e.target.value }))}
                  className="pl-12 pr-4 py-4 bg-gray-900/50 border border-yellow-400/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 focus:border-transparent text-lg backdrop-blur-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5 text-yellow-400" />
                  Saved Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map(savedFilter => (
                    <div key={savedFilter.id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadSavedFilters(savedFilter)}
                        className="text-yellow-400 hover:text-amber-500"
                      >
                        {savedFilter.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSavedFilter(savedFilter.id)}
                        className="h-6 w-6 text-gray-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Range */}
          <ExpandableSection
            title="Price Range"
            icon={<DollarSign className="h-5 w-5 text-yellow-400" />}
            sectionKey="price"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Minimum Price</Label>
                  <Input
                    type="number"
                    placeholder="$0"
                    value={filters.priceMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Maximum Price</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={filters.priceMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300 mb-4 block">
                  Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  max={1000000}
                  step={10000}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Listing Type</Label>
                  <select
                    value={filters.listingType}
                    onChange={(e) => setFilters(prev => ({ ...prev, listingType: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any Type</option>
                    {listingTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Property Status</Label>
                  <select
                    value={filters.propertyStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, propertyStatus: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any Status</option>
                    {propertyStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Days on Market</Label>
                  <Input
                    type="number"
                    placeholder="Any"
                    value={filters.daysOnMarket}
                    onChange={(e) => setFilters(prev => ({ ...prev, daysOnMarket: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Property Details */}
          <ExpandableSection
            title="Property Details"
            icon={<Home className="h-5 w-5 text-yellow-400" />}
            sectionKey="property"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Property Type</Label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any Type</option>
                    {propertyTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Bedrooms</Label>
                  <select
                    value={filters.bedrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any</option>
                    {bedroomOptions.map(option => (
                      <option key={option} value={option}>{option} bed{option !== '1' ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Bathrooms</Label>
                  <select
                    value={filters.bathrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, bathrooms: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any</option>
                    {bathroomOptions.map(option => (
                      <option key={option} value={option}>{option} bath{option !== '1' ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Garage Spaces</Label>
                  <select
                    value={filters.garageSpaces}
                    onChange={(e) => setFilters(prev => ({ ...prev, garageSpaces: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Any</option>
                    {garageOptions.map(option => (
                      <option key={option} value={option}>{option} space{option !== '1' ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    Square Footage: {filters.squareFootageRange[0].toLocaleString()} - {filters.squareFootageRange[1].toLocaleString()} sq ft
                  </Label>
                  <Slider
                    value={filters.squareFootageRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, squareFootageRange: value }))}
                    max={10000}
                    step={100}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    Year Built: {filters.yearBuiltRange[0]} - {filters.yearBuiltRange[1]}
                  </Label>
                  <Slider
                    value={filters.yearBuiltRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, yearBuiltRange: value }))}
                    min={1900}
                    max={2024}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    Lot Size: {filters.lotSizeRange[0]} - {filters.lotSizeRange[1]} acres
                  </Label>
                  <Slider
                    value={filters.lotSizeRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, lotSizeRange: value }))}
                    max={10}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    HOA Fee: $0 - ${filters.hoaRange[1]} per month
                  </Label>
                  <Slider
                    value={filters.hoaRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, hoaRange: value }))}
                    max={1000}
                    step={25}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Location */}
          <ExpandableSection
            title="Location & Neighborhood"
            icon={<MapPin className="h-5 w-5 text-yellow-400" />}
            sectionKey="location"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">City, State or ZIP Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter location..."
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">School District</Label>
                  <Input
                    type="text"
                    placeholder="Enter school name or district..."
                    value={filters.school}
                    onChange={(e) => setFilters(prev => ({ ...prev, school: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    School Rating: {filters.schoolRating[0]} - {filters.schoolRating[1]}/10
                  </Label>
                  <Slider
                    value={filters.schoolRating}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, schoolRating: value }))}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-4 block">
                    Walk Score: {filters.walkScore[0]} - {filters.walkScore[1]}
                  </Label>
                  <Slider
                    value={filters.walkScore}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, walkScore: value }))}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Commute Filter */}
              <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg">
                <h4 className="text-yellow-400 font-semibold">Commute Calculator</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">To Address</Label>
                    <Input
                      type="text"
                      placeholder="Work address..."
                      value={filters.commute.address}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        commute: { ...prev.commute, address: e.target.value }
                      }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Max Time (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={filters.commute.maxTime}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        commute: { ...prev.commute, maxTime: parseInt(e.target.value) || 30 }
                      }))}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Transport Mode</Label>
                    <select
                      value={filters.commute.transport}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        commute: { ...prev.commute, transport: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                    >
                      {transportModes.map(mode => (
                        <option key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Features & Amenities */}
          <ExpandableSection
            title="Features & Amenities"
            icon={<Filter className="h-5 w-5 text-yellow-400" />}
            sectionKey="features"
          >
            <div className="space-y-8">
              {/* Interior Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Interior Features</h4>
                  {filters.interiorFeatures.length > 0 && (
                    <Badge className="bg-yellow-400/20 text-yellow-400">
                      {filters.interiorFeatures.length} selected
                    </Badge>
                  )}
                </div>
                <FeatureGrid 
                  features={interiorFeatures} 
                  category="interiorFeatures" 
                  selectedFeatures={filters.interiorFeatures} 
                />
              </div>

              {/* Exterior Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TreePine className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Exterior Features</h4>
                  {filters.exteriorFeatures.length > 0 && (
                    <Badge className="bg-yellow-400/20 text-yellow-400">
                      {filters.exteriorFeatures.length} selected
                    </Badge>
                  )}
                </div>
                <FeatureGrid 
                  features={exteriorFeatures} 
                  category="exteriorFeatures" 
                  selectedFeatures={filters.exteriorFeatures} 
                />
              </div>

              {/* Community Features */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Dumbbell className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Community Features</h4>
                  {filters.communityFeatures.length > 0 && (
                    <Badge className="bg-yellow-400/20 text-yellow-400">
                      {filters.communityFeatures.length} selected
                    </Badge>
                  )}
                </div>
                <FeatureGrid 
                  features={communityFeatures} 
                  category="communityFeatures" 
                  selectedFeatures={filters.communityFeatures} 
                />
              </div>

              {/* Utilities & Technology */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Wifi className="h-5 w-5 text-yellow-400" />
                  <h4 className="text-lg font-semibold text-white">Utilities & Technology</h4>
                  {filters.utilities.length > 0 && (
                    <Badge className="bg-yellow-400/20 text-yellow-400">
                      {filters.utilities.length} selected
                    </Badge>
                  )}
                </div>
                <FeatureGrid 
                  features={utilities} 
                  category="utilities" 
                  selectedFeatures={filters.utilities} 
                />
              </div>
            </div>
          </ExpandableSection>

          {/* Advanced Search Options */}
          <ExpandableSection
            title="Advanced Search Options"
            icon={<Search className="h-5 w-5 text-yellow-400" />}
            sectionKey="advanced"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Exclude Keywords</Label>
                  <Input
                    type="text"
                    placeholder="Words to exclude from search..."
                    value={filters.excludeKeywords}
                    onChange={(e) => setFilters(prev => ({ ...prev, excludeKeywords: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Agent Name</Label>
                  <Input
                    type="text"
                    placeholder="Search by agent name..."
                    value={filters.agentName}
                    onChange={(e) => setFilters(prev => ({ ...prev, agentName: e.target.value }))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">MLS Number</Label>
                <Input
                  type="text"
                  placeholder="Enter MLS/ID number..."
                  value={filters.mlsNumber}
                  onChange={(e) => setFilters(prev => ({ ...prev, mlsNumber: e.target.value }))}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                />
              </div>

              {/* Save Filter Section */}
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-4">Save This Search</h4>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Enter filter name..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="flex-1 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={saveCurrentFilters}
                    disabled={!filterName.trim()}
                    className="bg-yellow-400 hover:bg-amber-500 text-black"
                  >
                    Save Filter
                  </Button>
                </div>
              </div>
            </div>
          </ExpandableSection>

          {/* Action Buttons */}
          <div className="sticky bottom-0 z-50 bg-black/80 backdrop-blur-xl border-t border-yellow-400/20 p-4 -mx-4 sm:-mx-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="flex-1 bg-yellow-400 hover:bg-amber-500 text-black py-4 text-lg font-semibold shadow-lg shadow-yellow-400/25 hover:shadow-yellow-400/40 transition-all"
                  onClick={() => {
                    // Apply filters logic here
                    navigate('/browse-properties', { state: { filters } });
                  }}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search Properties ({getActiveFilterCount()} filters)
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={clearAllFilters}
                  className="text-gray-300 hover:text-yellow-400 border-gray-600 hover:border-yellow-400/50 py-4"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Clear All Filters
                </Button>
              </div>
              
              {/* Active Filters Summary */}
              {getActiveFilterCount() > 0 && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-300 text-sm">Active filters:</span>
                    {filters.priceMin && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        Min: ${parseInt(filters.priceMin).toLocaleString()}
                      </Badge>
                    )}
                    {filters.priceMax && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        Max: ${parseInt(filters.priceMax).toLocaleString()}
                      </Badge>
                    )}
                    {filters.propertyType && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        {filters.propertyType}
                      </Badge>
                    )}
                    {filters.bedrooms && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        {filters.bedrooms} bed{filters.bedrooms !== '1' ? 's' : ''}
                      </Badge>
                    )}
                    {filters.bathrooms && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        {filters.bathrooms} bath{filters.bathrooms !== '1' ? 's' : ''}
                      </Badge>
                    )}
                    {filters.location && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        {filters.location}
                      </Badge>
                    )}
                    {(filters.interiorFeatures.length + filters.exteriorFeatures.length + 
                      filters.communityFeatures.length + filters.utilities.length) > 0 && (
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">
                        {filters.interiorFeatures.length + filters.exteriorFeatures.length + 
                         filters.communityFeatures.length + filters.utilities.length} features
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSearchFiltersPage;