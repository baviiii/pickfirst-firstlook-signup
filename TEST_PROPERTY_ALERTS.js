// ========================================
// 🧪 TEST PROPERTY ALERTS MANUALLY
// ========================================
// Run this in browser console while logged in as a buyer

(async () => {
  console.log('🧪 MANUAL PROPERTY ALERTS TEST\n');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const client = createClient(
    'https://rkwvgqozbpqgmpbvujgz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU'
  );
  
  // Check authentication
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.log('❌ Please sign in first');
    return;
  }
  
  console.log(`✅ Signed in as: ${user.email}\n`);
  
  // Step 1: Set up proper buyer preferences
  console.log('🎯 Step 1: Setting up buyer preferences...');
  
  const preferenceData = {
    user_id: user.id,
    property_alerts: true,
    email_notifications: true,
    preferred_areas: ['Mawson Lakes', 'bedrooms:2', 'bathrooms:2'],
    property_type_preferences: ['house'],
    budget_range: '0-1000000'
  };
  
  const { error: prefError } = await client
    .from('user_preferences')
    .upsert(preferenceData, { onConflict: 'user_id' });
  
  if (prefError) {
    console.log('❌ Failed to set preferences:', prefError.message);
    return;
  }
  
  console.log('✅ Buyer preferences set:');
  console.log('   - Property alerts: enabled');
  console.log('   - Email notifications: enabled');
  console.log('   - Preferred areas: Mawson Lakes');
  console.log('   - Property type: house');
  console.log('   - Bedrooms: 2+');
  console.log('   - Bathrooms: 2+');
  console.log('   - Budget: $0 - $1,000,000');
  
  // Step 2: Find a property in Mawson Lakes
  console.log('\n🏠 Step 2: Finding properties in Mawson Lakes...');
  
  const { data: properties, error: propError } = await client
    .from('property_listings')
    .select('*')
    .eq('status', 'approved')
    .ilike('city', '%mawson%')
    .order('created_at', { ascending: false });
  
  if (propError) {
    console.log('❌ Error finding properties:', propError.message);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ No properties found in Mawson Lakes');
    console.log('Creating a test property...');
    
    // Create a test property
    const testProperty = {
      title: 'Test House in Mawson Lakes',
      description: 'A beautiful test house for alert testing',
      property_type: 'house',
      price: 750000,
      bedrooms: 3,
      bathrooms: 2,
      address: '10 The Mall',
      city: 'Mawson Lakes',
      state: 'SA',
      zip_code: '5095',
      agent_id: user.id, // Use current user as agent for testing
      status: 'approved',
      images: []
    };
    
    const { data: newProperty, error: createError } = await client
      .from('property_listings')
      .insert(testProperty)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Failed to create test property:', createError.message);
      return;
    }
    
    console.log('✅ Created test property:', newProperty.title);
    properties.push(newProperty);
  }
  
  const testProperty = properties[0];
  console.log(`✅ Found property: ${testProperty.title}`);
  console.log(`   Address: ${testProperty.address}, ${testProperty.city}`);
  console.log(`   Type: ${testProperty.property_type}`);
  console.log(`   Price: $${testProperty.price?.toLocaleString()}`);
  console.log(`   Bedrooms: ${testProperty.bedrooms}, Bathrooms: ${testProperty.bathrooms}`);
  
  // Step 3: Manually test the matching logic
  console.log('\n🔍 Step 3: Testing matching logic...');
  
  // Get buyer preferences
  const { data: prefs } = await client
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (!prefs) {
    console.log('❌ No preferences found');
    return;
  }
  
  // Manual matching
  let matchScore = 0;
  let matchedCriteria = [];
  
  // Location match
  const propertyLocation = `${testProperty.city}, ${testProperty.state}`.toLowerCase();
  const preferredAreas = prefs.preferred_areas || [];
  const locationAreas = preferredAreas.filter(area => 
    !area.startsWith('bedrooms:') && 
    !area.startsWith('bathrooms:') && 
    !area.startsWith('garages:')
  );
  
  const locationMatch = locationAreas.some(area => {
    const areaLower = area.toLowerCase().trim();
    return propertyLocation.includes(areaLower) || testProperty.city.toLowerCase().includes(areaLower);
  });
  
  if (locationMatch) {
    matchScore += 0.3;
    matchedCriteria.push('location');
    console.log('   ✅ Location match: YES');
  } else {
    console.log('   ❌ Location match: NO');
    console.log(`      Property: ${propertyLocation}`);
    console.log(`      Preferred: ${JSON.stringify(locationAreas)}`);
  }
  
  // Property type match
  const typeMatch = prefs.property_type_preferences?.includes(testProperty.property_type);
  if (typeMatch) {
    matchScore += 0.2;
    matchedCriteria.push('property_type');
    console.log('   ✅ Property type match: YES');
  } else {
    console.log('   ❌ Property type match: NO');
  }
  
  // Budget match
  const [minBudget, maxBudget] = (prefs.budget_range || '0-1000000').split('-').map(Number);
  const price = parseFloat(testProperty.price.toString());
  const budgetMatch = price >= minBudget && price <= maxBudget;
  
  if (budgetMatch) {
    matchScore += 0.3;
    matchedCriteria.push('budget');
    console.log('   ✅ Budget match: YES');
  } else {
    console.log('   ❌ Budget match: NO');
  }
  
  // Bedrooms/bathrooms
  const bedroomPref = preferredAreas.find(area => area.startsWith('bedrooms:'));
  const bathroomPref = preferredAreas.find(area => area.startsWith('bathrooms:'));
  
  const preferredBedrooms = bedroomPref ? parseInt(bedroomPref.split(':')[1]) : 2;
  const preferredBathrooms = bathroomPref ? parseInt(bathroomPref.split(':')[1]) : 2;
  
  if (testProperty.bedrooms && testProperty.bedrooms >= preferredBedrooms) {
    matchScore += 0.1;
    matchedCriteria.push('bedrooms');
    console.log('   ✅ Bedrooms match: YES');
  } else {
    console.log('   ❌ Bedrooms match: NO');
  }
  
  if (testProperty.bathrooms && testProperty.bathrooms >= preferredBathrooms) {
    matchScore += 0.1;
    matchedCriteria.push('bathrooms');
    console.log('   ✅ Bathrooms match: YES');
  } else {
    console.log('   ❌ Bathrooms match: NO');
  }
  
  console.log(`\n📊 Match Results:`);
  console.log(`   Total Score: ${(matchScore * 100).toFixed(1)}%`);
  console.log(`   Matched Criteria: ${matchedCriteria.join(', ')}`);
  console.log(`   Should Alert: ${matchScore >= 0.6 ? 'YES' : 'NO'} (threshold: 60%)`);
  
  // Step 4: Manually trigger alert processing
  console.log('\n📧 Step 4: Manually processing property alert...');
  
  if (matchScore >= 0.6) {
    // Create a manual alert record
    const alertData = {
      buyer_id: user.id,
      property_id: testProperty.id,
      status: 'sent',
      alert_type: 'on_market',
      email_template: 'propertyAlert',
      sent_at: new Date().toISOString()
    };
    
    const { error: alertError } = await client
      .from('property_alerts')
      .insert(alertData);
    
    if (alertError) {
      console.log('❌ Failed to create alert record:', alertError.message);
    } else {
      console.log('✅ Alert record created successfully');
      
      // Try to send email notification
      try {
        const { data: profile } = await client
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        
        if (profile?.email) {
          console.log(`📧 Sending email to: ${profile.email}`);
          
          const { error: emailError } = await client.functions.invoke('send-email', {
            body: {
              to: profile.email,
              template: 'propertyAlert',
              data: {
                name: profile.full_name || 'User',
                property: {
                  title: testProperty.title,
                  price: testProperty.price,
                  location: `${testProperty.city}, ${testProperty.state}`,
                  propertyType: testProperty.property_type,
                  bedrooms: testProperty.bedrooms || 0,
                  bathrooms: testProperty.bathrooms || 0,
                  propertyUrl: `${window.location.origin}/property/${testProperty.id}`
                }
              }
            }
          });
          
          if (emailError) {
            console.log('❌ Email sending failed:', emailError.message);
          } else {
            console.log('✅ Property alert email sent successfully!');
          }
        }
      } catch (emailError) {
        console.log('❌ Email error:', emailError.message);
      }
    }
  } else {
    console.log('❌ Property does not meet matching criteria - no alert sent');
  }
  
  // Step 5: Check if alerts were created
  console.log('\n📋 Step 5: Checking alert history...');
  
  const { data: alerts } = await client
    .from('property_alerts')
    .select(`
      *,
      property_listings (title, city, price)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`✅ Found ${alerts?.length || 0} recent alerts:`);
  alerts?.forEach((alert, index) => {
    console.log(`   ${index + 1}. ${alert.property_listings?.title}`);
    console.log(`      Status: ${alert.status}`);
    console.log(`      Sent: ${new Date(alert.sent_at).toLocaleString()}`);
  });
  
  console.log('\n🎉 Property alerts test complete!');
  console.log('\n💡 If alerts are not working:');
  console.log('1. Check that property_alerts is true in user_preferences');
  console.log('2. Verify email_notifications is true');
  console.log('3. Check location matching (case sensitivity)');
  console.log('4. Ensure property status is "approved"');
  console.log('5. Check that the property meets matching criteria (60%+ score)');
  
})();
