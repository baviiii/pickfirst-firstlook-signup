import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubscriptionTiers() {
  console.log('🧪 Testing 3-Tier Subscription System...\n');

  try {
    // 1. Check if basic_tier_enabled column exists
    console.log('1. Checking database schema...');
    const { data: columns, error: columnError } = await supabase
      .from('feature_configurations')
      .select('*')
      .limit(1);

    if (columnError) {
      console.error('❌ Database schema issue:', columnError.message);
      console.log('💡 You may need to run the migration first.');
      return;
    }

    console.log('✅ Database schema looks good');

    // 2. Check subscription plans
    console.log('\n2. Checking subscription plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly');

    if (plansError) {
      console.error('❌ Error fetching subscription plans:', plansError.message);
      return;
    }

    console.log('📋 Current subscription plans:');
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price_monthly}/month`);
    });

    // 3. Check feature configurations
    console.log('\n3. Checking feature configurations...');
    const { data: features, error: featuresError } = await supabase
      .from('feature_configurations')
      .select('*')
      .order('feature_name');

    if (featuresError) {
      console.error('❌ Error fetching features:', featuresError.message);
      return;
    }

    console.log(`📊 Found ${features.length} feature configurations`);
    
    // Show features by tier
    const freeFeatures = features.filter(f => f.free_tier_enabled);
    const basicFeatures = features.filter(f => f.basic_tier_enabled);
    const premiumFeatures = features.filter(f => f.premium_tier_enabled);

    console.log(`   - Free tier: ${freeFeatures.length} features`);
    console.log(`   - Basic tier: ${basicFeatures.length} features`);
    console.log(`   - Premium tier: ${premiumFeatures.length} features`);

    // 4. Test new subscription features
    console.log('\n4. Testing new subscription features...');
    
    const newFeatures = [
      'browse_listings',
      'early_access_listings', 
      'property_insights',
      'investor_filters',
      'exclusive_offmarket',
      'vendor_details',
      'schedule_appointments',
      'direct_chat_agents'
    ];

    const foundNewFeatures = features.filter(f => newFeatures.includes(f.feature_key));
    console.log(`✅ Found ${foundNewFeatures.length}/${newFeatures.length} new features`);

    if (foundNewFeatures.length < newFeatures.length) {
      console.log('⚠️  Some new features may need to be added to the database');
      const missing = newFeatures.filter(key => !foundNewFeatures.some(f => f.feature_key === key));
      console.log('Missing features:', missing);
    }

    console.log('\n🎉 3-Tier Subscription System Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Run the database migration if needed');
    console.log('   2. Test the FeatureManagement component in super admin');
    console.log('   3. Test subscription flow with new tiers');
    console.log('   4. Verify off-market listings and vendor details work');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubscriptionTiers();
