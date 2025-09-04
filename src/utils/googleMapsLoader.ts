// Google Maps API loader utility
let googleMapsLoaded = false;
let googleMapsLoading = false;
let googleMapsCallbacks: (() => void)[] = [];

export const loadGoogleMapsAPI = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (googleMapsLoaded && window.google && window.google.maps) {
      resolve();
      return;
    }

    // If already loading, add to callbacks
    if (googleMapsLoading) {
      googleMapsCallbacks.push(resolve);
      return;
    }

    googleMapsLoading = true;

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      
      // Resolve all pending callbacks
      googleMapsCallbacks.forEach(callback => callback());
      googleMapsCallbacks = [];
      
      resolve();
    };

    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add to document
    document.head.appendChild(script);
  });
};

export const isGoogleMapsLoaded = (): boolean => {
  return googleMapsLoaded && !!window.google && !!window.google.maps;
};

// Get API key from environment or use a placeholder
export const getGoogleMapsAPIKey = (): string => {
  // In production, you should get this from your environment variables
  // For now, we'll use a placeholder that should be replaced with your actual key
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
};
