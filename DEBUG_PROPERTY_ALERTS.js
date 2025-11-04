// ========================================
// 🔧 DEBUG PROPERTY ALERTS & RECOMMENDATIONS
// ========================================
// Run this in browser console while logged in as a buyer

(async () => {
  console.log('🔧 DEBUG: Property Alerts & Recommendations System\n');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const client = createClient(
    'https://rkwvgqozbpqgmpbvujgz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU'
  );
  
  // Check authentication
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ ERROR: Not authenticated. Please sign in as a buyer first.');
    return;
  }
  
  console.log(`✅ Authenticated as: ${user.email}`);
  console.log(`🆔 User ID: ${user.id}\n`);
  
  // Step 1: Check user profile and role
  console.log('👤 Step 1: Checking user profile...');
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError) {
    console.log('❌ Profile Error:', profileError.message);
    return;
  }
  
  console.log(`✅ Profile found:`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Subscription: ${profile.subscription_tier || 'free'}`);
  console.log(`   Name: ${profile.full_name}`);
  
  if (profile.role !== 'buyer') {
    console.log('❌ ERROR: User is not a buyer. Alerts are only for buyers.');
    return;
  }
  
  // Step 2: Check user preferences
  console.log('\n🎯 Step 2: Checking user preferences...');
  const { data: preferences, error: prefError } = await client
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (prefError) {
    console.log('❌ Preferences Error:', prefError.message);
    console.log('Creating default preferences...');
    
    // Create default preferences
    const { error: createError } = await client
      .from('user_preferences')
      .insert({
        user_id: user.id,
        property_alerts: true,
        email_notifications: true,
        preferred_areas: ['Mawson Lakes'],
        property_type_preferences: ['house'],
        budget_range: '0-1000000'
      });
    
    if (createError) {
      console.log('❌ Failed to create preferences:', createError.message);
      return;
    }
    
    console.log('✅ Default preferences created');
  } else {
    console.log('✅ User preferences found:');
    console.log(`   Property Alerts: ${preferences.property_alerts}`);
    console.log(`   Email Notifications: ${preferences.email_notifications}`);
    console.log(`   Preferred Areas: ${JSON.stringify(preferences.preferred_areas)}`);
    console.log(`   Property Types: ${JSON.stringify(preferences.property_type_preferences)}`);
    console.log(`   Budget Range: ${preferences.budget_range}`);
  }
  
  // Step 3: Check for properties in Mawson Lakes
  console.log('\n🏠 Step 3: Checking properties in Mawson Lakes...');
  const { data: properties, error: propError } = await client
    .from('property_listings')
    .select('*')
    .eq('status', 'approved')
    .ilike('city', '%mawson%')
    .order('created_at', { ascending: false });
  
  if (propError) {
    console.log('❌ Properties Error:', propError.message);
  } else {
    console.log(`✅ Found ${properties.length} properties in Mawson Lakes:`);
    properties.forEach(prop => {
      console.log(`   - ${prop.title}`);
      console.log(`     Address: ${prop.address}, ${prop.city}, ${prop.state}`);
      console.log(`     Type: ${prop.property_type}, Price: $${prop.price?.toLocaleString()}`);
      console.log(`     Bedrooms: ${prop.bedrooms}, Bathrooms: ${prop.bathrooms}`);
      console.log(`     Created: ${new Date(prop.created_at).toLocaleDateString()}`);
      console.log(`     ID: ${prop.id}`);
      console.log('');
    });
  }
  
  // Step 4: Check property alerts table
  console.log('📧 Step 4: Checking property alerts sent to user...');
  const { data: alerts, error: alertError } = await client
    .from('property_alerts')
    .select(`
      *,
      property_listings (
        title,
        city,
        property_type,
        price
      )
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  
  if (alertError) {
    console.log('❌ Alerts Error:', alertError.message);
  } else {
    console.log(`✅ Found ${alerts.length} property alerts for user:`);
    alerts.forEach(alert => {
      console.log(`   - Alert ID: ${alert.id}`);
      console.log(`     Property: ${alert.property_listings?.title}`);
      console.log(`     Status: ${alert.status}`);
      console.log(`     Type: ${alert.alert_type}`);
      console.log(`     Sent: ${new Date(alert.sent_at).toLocaleDateString()}`);
      console.log('');
    });
  }
  
  // Step 5: Test property matching logic manually
  console.log('🔍 Step 5: Testing property matching logic...');
  if (properties.length > 0 && preferences) {
    const testProperty = properties[0];
    console.log(`Testing match for: ${testProperty.title}`);
    
    // Manual matching logic
    let matchScore = 0;
    let matchedCriteria = [];
    
    // Location match
    const propertyLocation = `${testProperty.city}, ${testProperty.state}`.toLowerCase();
    const preferredAreas = preferences.preferred_areas || [];
    const locationMatch = preferredAreas.some(area => 
      propertyLocation.includes(area.toLowerCase()) || 
      testProperty.city.toLowerCase().includes(area.toLowerCase())
    );
    
    if (locationMatch) {
      matchScore += 0.3;
      matchedCriteria.push('location');
      console.log('   ✅ Location match found');
    } else {
      console.log('   ❌ No location match');
      console.log(`   Property location: ${propertyLocation}`);
      console.log(`   Preferred areas: ${JSON.stringify(preferredAreas)}`);
    }
    
    // Property type match
    const propertyTypes = preferences.property_type_preferences || [];
    const typeMatch = propertyTypes.includes(testProperty.property_type);
    
    if (typeMatch) {
      matchScore += 0.2;
      matchedCriteria.push('property_type');
      console.log('   ✅ Property type match found');
    } else {
      console.log('   ❌ No property type match');
      console.log(`   Property type: ${testProperty.property_type}`);
      console.log(`   Preferred types: ${JSON.stringify(propertyTypes)}`);
    }
    
    // Budget match
    const [minBudget, maxBudget] = (preferences.budget_range || '0-1000000').split('-').map(Number);
    const price = parseFloat(testProperty.price.toString());
    const budgetMatch = price >= minBudget && price <= maxBudget;
    
    if (budgetMatch) {
      matchScore += 0.3;
      matchedCriteria.push('budget');
      console.log('   ✅ Budget match found');
    } else {
      console.log('   ❌ No budget match');
      console.log(`   Property price: $${price.toLocaleString()}`);
      console.log(`   Budget range: $${minBudget.toLocaleString()} - $${maxBudget.toLocaleString()}`);
    }
    
    // Bedrooms/bathrooms (extract from preferred_areas if stored there)
    const bedroomPref = preferredAreas.find(area => area.startsWith('bedrooms:'));
    const bathroomPref = preferredAreas.find(area => area.startsWith('bathrooms:'));
    
    const preferredBedrooms = bedroomPref ? parseInt(bedroomPref.split(':')[1]) : 2;
    const preferredBathrooms = bathroomPref ? parseInt(bathroomPref.split(':')[1]) : 2;
    
    if (testProperty.bedrooms && testProperty.bedrooms >= preferredBedrooms) {
      matchScore += 0.1;
      matchedCriteria.push('bedrooms');
      console.log('   ✅ Bedrooms match found');
    } else {
      console.log('   ❌ No bedrooms match');
      console.log(`   Property bedrooms: ${testProperty.bedrooms}`);
      console.log(`   Preferred bedrooms: ${preferredBedrooms}+`);
    }
    
    if (testProperty.bathrooms && testProperty.bathrooms >= preferredBathrooms) {
      matchScore += 0.1;
      matchedCriteria.push('bathrooms');
      console.log('   ✅ Bathrooms match found');
    } else {
      console.log('   ❌ No bathrooms match');
      console.log(`   Property bathrooms: ${testProperty.bathrooms}`);
      console.log(`   Preferred bathrooms: ${preferredBathrooms}+`);
    }
    
    console.log(`\n📊 Match Results:`);
    console.log(`   Score: ${(matchScore * 100).toFixed(1)}%`);
    console.log(`   Matched Criteria: ${matchedCriteria.join(', ')}`);
    console.log(`   Is Match: ${matchScore >= 0.6 ? 'YES' : 'NO'} (threshold: 60%)`);
  }
  
  // Step 6: Check audit logs for alert processing
  console.log('\n📋 Step 6: Checking audit logs for alert processing...');
  const { data: auditLogs, error: auditError } = await client
    .from('audit_logs')
    .select('*')
    .eq('table_name', 'property_alerts')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (auditError) {
    console.log('❌ Audit Error:', auditError.message);
  } else {
    console.log(`✅ Found ${auditLogs.length} recent alert audit logs:`);
    auditLogs.forEach(log => {
      console.log(`   - Action: ${log.action}`);
      console.log(`     User: ${log.user_id}`);
      console.log(`     Time: ${new Date(log.created_at).toLocaleString()}`);
      console.log(`     Details: ${JSON.stringify(log.new_values)}`);
      console.log('');
    });
  }
  
  // Step 7: Test the alert system manually
  console.log('🧪 Step 7: Testing alert system manually...');
  if (properties.length > 0) {
    const testPropertyId = properties[0].id;
    console.log(`Testing alerts for property: ${testPropertyId}`);
    
    try {
      // Call the property alert processing function
      const { data, error } = await client.functions.invoke('process-property-alerts', {
        body: { propertyId: testPropertyId }
      });
      
      if (error) {
        console.log('❌ Alert processing error:', error.message);
      } else {
        console.log('✅ Alert processing result:', data);
      }
    } catch (error) {
      console.log('❌ Alert processing failed:', error.message);
      console.log('Note: This might be expected if the function doesn\'t exist yet');
    }
  }
  
  console.log('\n🔧 Debug complete!');
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Check if property alerts are enabled in user preferences');
  console.log('2. Verify location matching logic (case sensitivity, fuzzy matching)');
  console.log('3. Check if alert processing is triggered when properties are approved');
  console.log('4. Verify email notifications are working');
  console.log('5. Check subscription tier requirements for alerts');
  
})();
