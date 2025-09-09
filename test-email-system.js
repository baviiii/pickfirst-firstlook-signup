// Test script for the email system with Resend
// Run with: node test-email-system.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabaseUrl = 'https://rkwvgqozbpqgmpbvujgz.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailSystem() {
  console.log('🧪 Testing Email System with Resend...\n');

  try {
    // Test 1: Send a welcome email
    console.log('1. Testing Welcome Email...');
    const welcomeResponse = await supabase.functions.invoke('send-email', {
      body: {
        to: 'test@example.com', // Replace with your test email
        template: 'welcome',
        data: {
          name: 'Test User',
          email: 'test@example.com',
          platformName: 'PickFirst Real Estate',
          platformUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup',
          userId: 'test-user-123'
        }
      }
    });

    if (welcomeResponse.error) {
      console.log('❌ Welcome email failed:', welcomeResponse.error);
    } else {
      console.log('✅ Welcome email sent:', welcomeResponse.data);
    }

    // Test 2: Send a property alert email
    console.log('\n2. Testing Property Alert Email...');
    const alertResponse = await supabase.functions.invoke('send-email', {
      body: {
        to: 'test@example.com', // Replace with your test email
        template: 'propertyAlert',
        data: {
          name: 'Test Buyer',
          propertyTitle: 'Beautiful 3BR House in San Francisco',
          price: 850000,
          location: 'San Francisco, CA',
          propertyType: 'house',
          bedrooms: 3,
          bathrooms: 2,
          propertyUrl: 'https://baviiii.github.io/pickfirst-firstlook-signup/property/test-property-123'
        }
      }
    });

    if (alertResponse.error) {
      console.log('❌ Property alert email failed:', alertResponse.error);
    } else {
      console.log('✅ Property alert email sent:', alertResponse.data);
    }

    // Test 3: Test property alert processing
    console.log('\n3. Testing Property Alert Processing...');
    const processResponse = await supabase.functions.invoke('process-property-alerts', {
      body: {}
    });

    if (processResponse.error) {
      console.log('❌ Property alert processing failed:', processResponse.error);
    } else {
      console.log('✅ Property alert processing result:', processResponse.data);
    }

    console.log('\n🎉 Email System Test Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up RESEND_API_KEY in Supabase dashboard');
    console.log('2. Verify your domain in Resend');
    console.log('3. Update the "from" email address in send-email function');
    console.log('4. Test with real email addresses');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmailSystem();
