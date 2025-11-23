import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Home, 
  Bed, 
  Bath, 
  Square,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react';
import { PropertyService, PropertyListing } from '@/services/propertyService';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface AdvancedSearchDropdownProps {
  onClose?: () => void;
}

export const AdvancedSearchDropdown = ({ onClose }: AdvancedSearchDropdownProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    'Luxury homes',
    'Waterfront properties',
    'Family homes',
    'Investment properties',
    'New listings'
  ]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search properties with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await PropertyService.getApprovedListings();
        
        if (data) {
          // Advanced search logic
          const query = searchQuery.toLowerCase();
          const filtered = data.filter(property => {
            // Search in multiple fields
            const searchableText = [
              property.title,
              property.description,
              property.address,
              property.city,
              property.state,
              property.zip_code,
              property.property_type,
              ...(property.features || [])
            ].join(' ').toLowerCase();

            // Check for price mentions (e.g., "under 500k", "500000")
            const priceMatch = query.match(/(\d+)k?/);
            if (priceMatch) {
              const searchPrice = parseInt(priceMatch[1]) * (query.includes('k') ? 1000 : 1);
              if (query.includes('under') || query.includes('below')) {
                return parseFloat(property.price.toString()) <= searchPrice;
              } else if (query.includes('over') || query.includes('above')) {
                return parseFloat(property.price.toString()) >= searchPrice;
              }
            }

            // Check for bedroom/bathroom mentions
            const bedroomMatch = query.match(/(\d+)\s*(bed|bedroom)/);
            if (bedroomMatch && property.bedrooms) {
              return property.bedrooms >= parseInt(bedroomMatch[1]);
            }

            const bathroomMatch = query.match(/(\d+)\s*(bath|bathroom)/);
            if (bathroomMatch && property.bathrooms) {
              return property.bathrooms >= parseInt(bathroomMatch[1]);
            }

            // General text search
            return searchableText.includes(query);
          });

          setResults(filtered.slice(0, 8)); // Limit to 8 results
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    saveSearch(query);
    navigate(`/browse-properties?search=${encodeURIComponent(query)}`);
    setIsOpen(false);
    onClose?.();
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
    setIsOpen(false);
    onClose?.();
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search by location, type, price, features..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              handleSearch(searchQuery);
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className="pl-10 pr-10 bg-card border border-pickfirst-yellow/20 text-foreground placeholder:text-muted-foreground focus:border-pickfirst-yellow/50 focus:ring-pickfirst-yellow/20 h-11"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-2xl overflow-hidden z-[99999] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Loading State */}
          {loading && (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-pickfirst-yellow" />
              <span className="ml-2 text-gray-400 text-sm">Searching properties...</span>
            </div>
          )}

          {/* Search Results */}
          {!loading && searchQuery && results.length > 0 && (
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-pickfirst-yellow/20 scrollbar-track-transparent">
              <div className="p-3 border-b border-pickfirst-yellow/10 bg-pickfirst-yellow/5">
                <p className="text-xs text-gray-400">
                  Found {results.length} propert{results.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {results.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handlePropertyClick(property.id)}
                    className="w-full p-4 hover:bg-pickfirst-yellow/10 transition-all duration-200 text-left group"
                  >
                    <div className="flex gap-4">
                      {/* Property Image */}
                      <div className="flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-gray-800">
                        {property.images && property.images.length > 0 ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-8 w-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-pickfirst-yellow transition-colors">
                            {property.title}
                          </h4>
                          <span className="text-sm font-bold text-pickfirst-yellow flex-shrink-0">
                            {formatPrice(property.price)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{property.city}, {property.state}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {property.bedrooms && (
                            <div className="flex items-center gap-1 text-xs text-gray-300">
                              <Bed className="h-3 w-3" />
                              <span>{property.bedrooms}</span>
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1 text-xs text-gray-300">
                              <Bath className="h-3 w-3" />
                              <span>{property.bathrooms}</span>
                            </div>
                          )}
                          {property.square_feet && (
                            <div className="flex items-center gap-1 text-xs text-gray-300">
                              <Square className="h-3 w-3" />
                              <span>{property.square_feet.toLocaleString()} sqft</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs bg-pickfirst-yellow/20 text-pickfirst-yellow border-pickfirst-yellow/30">
                            {property.property_type}
                          </Badge>
                          {property.created_at && (
                            <span className="text-xs text-gray-500">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDistanceToNow(new Date(property.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="flex-shrink-0 flex items-center">
                        <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-pickfirst-yellow group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* View All Results */}
              <div className="p-3 border-t border-pickfirst-yellow/10 bg-gradient-to-r from-pickfirst-yellow/5 to-transparent">
                <Button
                  onClick={() => handleSearch(searchQuery)}
                  className="w-full bg-pickfirst-yellow hover:bg-amber-500 text-black font-semibold"
                  size="sm"
                >
                  View All {results.length} Results
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && searchQuery && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-600 mx-auto mb-3 opacity-50" />
              <p className="text-gray-400 text-sm">No properties found for "{searchQuery}"</p>
              <p className="text-gray-500 text-xs mt-1">Try different keywords or filters</p>
            </div>
          )}

          {/* Recent & Popular Searches (when no query) */}
          {!loading && !searchQuery && (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Searches</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(search);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-pickfirst-yellow/10 border border-white/10 hover:border-pickfirst-yellow/30 rounded-lg text-xs text-gray-300 hover:text-pickfirst-yellow transition-all"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-pickfirst-yellow" />
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Popular Searches</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(search);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 bg-pickfirst-yellow/10 hover:bg-pickfirst-yellow/20 border border-pickfirst-yellow/30 hover:border-pickfirst-yellow/50 rounded-lg text-xs text-pickfirst-yellow hover:text-amber-400 transition-all"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Tips */}
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300 font-medium mb-1">💡 Search Tips:</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Try "3 bedroom house" or "under 500k"</li>
                  <li>• Search by city, zip code, or neighborhood</li>
                  <li>• Use features like "pool", "garage", "waterfront"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
