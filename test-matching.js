// Test the matching logic with the actual data
console.log('🧪 Testing Property Matching Logic\n');

// Test data from user's message
const property = {
  id: "c341ea28-7d18-480a-92c0-820809469ded",
  title: "testing-home-for-alerts",
  property_type: "house",
  city: "Mawson Lakes",
  state: "SA",
  address: "10 The Mall",
  price: 750000,
  bedrooms: 1,
  bathrooms: 2.0,
  garages: 3
};

const preferences = {
  preferred_areas: ["Mawson Lakes SA, Australia", "garages:0"],
  property_type_preferences: ["House"],
  budget_range: "0-1000000"
};

console.log('Property:', {
  title: property.title,
  type: property.property_type,
  city: property.city,
  state: property.state,
  address: property.address,
  price: property.price
});

console.log('\nPreferences:', {
  areas: preferences.preferred_areas,
  types: preferences.property_type_preferences,
  budget: preferences.budget_range
});

// Test location matching
console.log('\n🏠 Location Matching Test:');
const propertyLocation = `${property.city}, ${property.state}`.toLowerCase();
const propertyCity = property.city.toLowerCase();
const propertyAddress = property.address.toLowerCase();

console.log('Property location:', propertyLocation);
console.log('Property city:', propertyCity);
console.log('Property address:', propertyAddress);

const locationAreas = preferences.preferred_areas.filter(area => 
  !area.startsWith('bedrooms:') && 
  !area.startsWith('bathrooms:') && 
  !area.startsWith('garages:')
);

console.log('Location areas to check:', locationAreas);

let locationMatch = false;
locationAreas.forEach(area => {
  const areaLower = area.toLowerCase().trim();
  console.log(`\nChecking area: "${areaLower}"`);
  
  // Remove common suffixes
  const cleanArea = areaLower
    .replace(/,?\s*(australia|sa|nsw|vic|qld|wa|tas|nt|act)\s*$/g, '')
    .trim();
  console.log(`Clean area: "${cleanArea}"`);
  
  // Test exact matches
  const cityIncludes = propertyCity.includes(cleanArea);
  const locationIncludes = propertyLocation.includes(cleanArea);
  const cleanIncludesCity = cleanArea.includes(propertyCity);
  const addressIncludes = propertyAddress.includes(cleanArea);
  
  console.log(`City includes clean area: ${cityIncludes}`);
  console.log(`Location includes clean area: ${locationIncludes}`);
  console.log(`Clean area includes city: ${cleanIncludesCity}`);
  console.log(`Address includes clean area: ${addressIncludes}`);
  
  if (cityIncludes || locationIncludes || cleanIncludesCity || addressIncludes) {
    console.log('✅ LOCATION MATCH FOUND!');
    locationMatch = true;
  }
  
  // Test word matching
  const areaWords = cleanArea.split(/\s+/).filter(word => word.length > 2);
  const cityWords = propertyCity.split(/\s+/).filter(word => word.length > 2);
  
  console.log(`Area words: [${areaWords.join(', ')}]`);
  console.log(`City words: [${cityWords.join(', ')}]`);
  
  const allWordsMatch = areaWords.length > 0 && areaWords.every(word => 
    cityWords.some(cityWord => 
      cityWord.includes(word) || word.includes(cityWord)
    )
  );
  
  console.log(`All words match: ${allWordsMatch}`);
  
  if (allWordsMatch) {
    console.log('✅ WORD-BASED LOCATION MATCH FOUND!');
    locationMatch = true;
  }
});

console.log(`\n🎯 Final Location Match: ${locationMatch ? '✅ YES' : '❌ NO'}`);

// Test property type matching
console.log('\n🏘️ Property Type Matching Test:');
const propertyTypeLower = property.property_type.toLowerCase();
console.log('Property type (lowercase):', propertyTypeLower);
console.log('Preferred types:', preferences.property_type_preferences);

const typeMatch = preferences.property_type_preferences.some(prefType => 
  prefType.toLowerCase() === propertyTypeLower
);

console.log(`🎯 Property Type Match: ${typeMatch ? '✅ YES' : '❌ NO'}`);

// Test budget matching
console.log('\n💰 Budget Matching Test:');
const [minBudget, maxBudget] = preferences.budget_range.split('-').map(Number);
console.log('Budget range:', minBudget, '-', maxBudget);
console.log('Property price:', property.price);

const budgetMatch = property.price >= minBudget && property.price <= maxBudget;
console.log(`🎯 Budget Match: ${budgetMatch ? '✅ YES' : '❌ NO'}`);

// Overall matching
console.log('\n📊 OVERALL MATCHING RESULTS:');
console.log(`Location Match: ${locationMatch ? '✅' : '❌'}`);
console.log(`Property Type Match: ${typeMatch ? '✅' : '❌'}`);
console.log(`Budget Match: ${budgetMatch ? '✅' : '❌'}`);

const totalMatches = [locationMatch, typeMatch, budgetMatch].filter(Boolean).length;
const matchPercentage = (totalMatches / 3) * 100;

console.log(`\n🎯 MATCH SCORE: ${totalMatches}/3 (${matchPercentage.toFixed(1)}%)`);
console.log(`Should show in recommendations: ${matchPercentage >= 30 ? '✅ YES' : '❌ NO'}`);
