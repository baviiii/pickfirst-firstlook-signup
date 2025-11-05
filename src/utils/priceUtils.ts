/**
 * Utility functions for handling price display and formatting
 */

// Format price for display - handles ranges, text, and numbers
export function formatPriceForDisplay(price: string | number | undefined, priceDisplay?: string): string {
  // If we have the original display text, use that
  if (priceDisplay && priceDisplay.trim()) {
    return priceDisplay.trim();
  }
  if (typeof price === 'string') {
    const trimmed = price.trim();
    
    // If it's already a formatted string (like "Best Offers" or "900k-1.2M"), return as-is
    if (trimmed.toLowerCase().includes('offer') || 
        trimmed.toLowerCase().includes('poa') || 
        trimmed.toLowerCase().includes('contact') ||
        trimmed.includes('-')) {
      return trimmed;
    }
    
    // Try to parse as number for formatting
    const numericValue = parseFloat(trimmed.replace(/[,$]/g, ''));
    if (!isNaN(numericValue)) {
      return formatNumericPrice(numericValue);
    }
    
    return trimmed;
  }
  
  if (typeof price === 'number') {
    return formatNumericPrice(price);
  }
  
  return 'Price on Application';
}

// Format numeric price with proper commas and currency
export function formatNumericPrice(price: number): string {
  if (price === 0) return 'Price on Application';
  
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Parse price input for examples and validation
export function getPriceExamples(): string[] {
  return [
    '750,000',
    '900,000-1,200,000', 
    '1.2M-1.5M',
    'Best Offers',
    'Price on Application',
    'Contact Agent'
  ];
}

// Validate if price input is acceptable
export function isValidPriceInput(input: string): boolean {
  if (!input || input.trim().length === 0) return false;
  
  const trimmed = input.trim();
  
  // Allow text-based prices
  const textPrices = ['best offers', 'poa', 'price on application', 'contact agent', 'contact', 'offers'];
  if (textPrices.some(text => trimmed.toLowerCase().includes(text))) {
    return true;
  }
  
  // Allow ranges
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 2) {
      return parts.every(part => isValidNumericPrice(part.trim()));
    }
  }
  
  // Allow single numeric values
  return isValidNumericPrice(trimmed);
}

// Helper to validate numeric price parts
function isValidNumericPrice(priceStr: string): boolean {
  const cleaned = priceStr.replace(/[,$\s]/g, '').toLowerCase();
  
  // Handle K/M suffixes
  if (cleaned.endsWith('k') || cleaned.endsWith('m')) {
    const num = parseFloat(cleaned.slice(0, -1));
    return !isNaN(num) && num > 0;
  }
  
  const num = parseFloat(cleaned);
  return !isNaN(num) && num > 0;
}
