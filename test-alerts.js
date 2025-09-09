// Simple test script for Property Alert System
// Run with: node test-alerts.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPropertyAlertSystem() {
  console.log('🧪 Testing Property Alert System...\n');

  try {
    // Step 1: Test alert statistics
    console.log('1. Testing Alert Statistics...');
    const { data: stats, error: statsError } = await supabase
      .from('property_alerts')
      .select('id', { count: 'exact' });
    
    if (statsError) {
      console.log('❌ Error getting stats:', statsError.message);
    } else {
      console.log('✅ Total alerts in system:', stats?.length || 0);
    }

    // Step 2: Test buyer preferences
    console.log('\n2. Testing Buyer Preferences...');
    const { data: buyers, error: buyersError } = await supabase
      .from('user_preferences')
      .select(`
        user_id,
        property_alerts,
        email_notifications,
        profiles!inner (
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('property_alerts', true)
      .eq('profiles.role', 'buyer')
      .limit(5);

    if (buyersError) {
      console.log('❌ Error getting buyers:', buyersError.message);
    } else {
      console.log('✅ Buyers with alerts enabled:', buyers?.length || 0);
      buyers?.forEach(buyer => {
        console.log(`   - ${buyer.profiles.full_name} (${buyer.profiles.email})`);
      });
    }

    // Step 3: Test properties
    console.log('\n3. Testing Properties...');
    const { data: properties, error: propertiesError } = await supabase
      .from('property_listings')
      .select('id, title, price, city, state, status')
      .eq('status', 'approved')
      .limit(5);

    if (propertiesError) {
      console.log('❌ Error getting properties:', propertiesError.message);
    } else {
      console.log('✅ Approved properties:', properties?.length || 0);
      properties?.forEach(property => {
        console.log(`   - ${property.title} - $${property.price?.toLocaleString()} (${property.city}, ${property.state})`);
      });
    }

    // Step 4: Test alert jobs
    console.log('\n4. Testing Alert Jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('property_alert_jobs')
      .select('id, property_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.log('❌ Error getting jobs:', jobsError.message);
    } else {
      console.log('✅ Recent alert jobs:', jobs?.length || 0);
      jobs?.forEach(job => {
        console.log(`   - Job ${job.id}: ${job.status} (Property: ${job.property_id})`);
      });
    }

    // Step 5: Test edge function call (if you have the URL)
    console.log('\n5. Testing Edge Function...');
    console.log('To test the edge function, you can:');
    console.log('   - Use the Supabase dashboard');
    console.log('   - Call: POST /functions/v1/process-property-alerts');
    console.log('   - Or trigger it by approving a new property');

    console.log('\n✅ Property Alert System Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Create a test buyer with property alerts enabled');
    console.log('2. Create and approve a matching property');
    console.log('3. Check if alert job is created');
    console.log('4. Run the process-property-alerts edge function');
    console.log('5. Check if email was sent and alert record created');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPropertyAlertSystem();
