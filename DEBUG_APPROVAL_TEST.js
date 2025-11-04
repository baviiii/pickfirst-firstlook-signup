// ========================================
// 🔧 DEBUG APPROVAL TEST SCRIPT
// ========================================
// Run this in browser console while logged in as super admin
// This will help us debug the approval issue

(async () => {
  console.log('🔧 DEBUG: Testing Property Approval Functionality\n');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const client = createClient(
    'https://rkwvgqozbpqgmpbvujgz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU'
  );
  
  // Check authentication
  const { data: { user }, error: authError } = await client.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ ERROR: Not authenticated. Please sign in as super admin first.');
    return;
  }
  
  console.log(`✅ Authenticated as: ${user.email}`);
  console.log(`🆔 User ID: ${user.id}\n`);
  
  // Step 1: Get all pending properties
  console.log('📋 Step 1: Fetching pending properties...');
  const { data: pendingProperties, error: fetchError } = await client
    .from('property_listings')
    .select('id, title, status, approved_at, approved_by')
    .eq('status', 'pending')
    .limit(5);
  
  if (fetchError) {
    console.log('❌ Error fetching pending properties:', fetchError.message);
    return;
  }
  
  if (!pendingProperties || pendingProperties.length === 0) {
    console.log('ℹ️ No pending properties found. Let\'s check all properties...');
    
    const { data: allProperties, error: allError } = await client
      .from('property_listings')
      .select('id, title, status, approved_at, approved_by')
      .limit(10);
    
    if (allError) {
      console.log('❌ Error fetching all properties:', allError.message);
      return;
    }
    
    console.log('📊 All properties status:');
    allProperties.forEach(prop => {
      console.log(`  - ${prop.title}: ${prop.status} (ID: ${prop.id.substring(0, 8)}...)`);
    });
    
    // Use the first property for testing
    if (allProperties.length > 0) {
      console.log('\n🧪 Using first property for approval test...');
      const testProperty = allProperties[0];
      
      // Step 2: Try to approve it
      console.log(`\n🔧 Step 2: Attempting to approve "${testProperty.title}"...`);
      
      const { data: updateResult, error: updateError } = await client
        .from('property_listings')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', testProperty.id)
        .select();
      
      if (updateError) {
        console.log('❌ UPDATE FAILED:', updateError.message);
        console.log('Error details:', updateError);
        
        // Check if it's an RLS issue
        if (updateError.message.includes('row-level security') || updateError.message.includes('policy')) {
          console.log('\n🚨 RLS POLICY ISSUE DETECTED!');
          console.log('The update is being blocked by Row Level Security policies.');
          console.log('This means super admins don\'t have permission to update property_listings.');
        }
      } else {
        console.log('✅ UPDATE SUCCESSFUL!');
        console.log('Update result:', updateResult);
        
        // Step 3: Verify the update
        console.log('\n🔍 Step 3: Verifying the update...');
        const { data: verifyResult, error: verifyError } = await client
          .from('property_listings')
          .select('id, title, status, approved_at, approved_by')
          .eq('id', testProperty.id)
          .single();
        
        if (verifyError) {
          console.log('❌ VERIFICATION FAILED:', verifyError.message);
        } else {
          console.log('✅ VERIFICATION RESULT:');
          console.log(`  Status: ${verifyResult.status}`);
          console.log(`  Approved At: ${verifyResult.approved_at}`);
          console.log(`  Approved By: ${verifyResult.approved_by}`);
          
          if (verifyResult.status === 'approved') {
            console.log('\n🎉 SUCCESS! Property approval is working correctly.');
          } else {
            console.log('\n❌ FAILURE! Status did not change to approved.');
          }
        }
      }
    }
    return;
  }
  
  console.log(`✅ Found ${pendingProperties.length} pending properties:`);
  pendingProperties.forEach(prop => {
    console.log(`  - ${prop.title} (ID: ${prop.id.substring(0, 8)}...)`);
  });
  
  // Use the first pending property for testing
  const testProperty = pendingProperties[0];
  console.log(`\n🧪 Testing approval on: "${testProperty.title}"`);
  
  // Step 2: Try to approve it
  console.log('\n🔧 Step 2: Attempting approval...');
  
  const { data: updateResult, error: updateError } = await client
    .from('property_listings')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id
    })
    .eq('id', testProperty.id)
    .select();
  
  if (updateError) {
    console.log('❌ UPDATE FAILED:', updateError.message);
    console.log('Error details:', updateError);
    
    // Check if it's an RLS issue
    if (updateError.message.includes('row-level security') || updateError.message.includes('policy')) {
      console.log('\n🚨 RLS POLICY ISSUE DETECTED!');
      console.log('The update is being blocked by Row Level Security policies.');
      console.log('This means super admins don\'t have permission to update property_listings.');
      
      console.log('\n🔧 SUGGESTED FIX:');
      console.log('Run this SQL in Supabase Dashboard:');
      console.log(`
CREATE POLICY "super_admin_can_manage_all_properties" ON property_listings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);
      `);
    }
  } else {
    console.log('✅ UPDATE SUCCESSFUL!');
    console.log('Update result:', updateResult);
    
    // Step 3: Verify the update
    console.log('\n🔍 Step 3: Verifying the update...');
    const { data: verifyResult, error: verifyError } = await client
      .from('property_listings')
      .select('id, title, status, approved_at, approved_by')
      .eq('id', testProperty.id)
      .single();
    
    if (verifyError) {
      console.log('❌ VERIFICATION FAILED:', verifyError.message);
    } else {
      console.log('✅ VERIFICATION RESULT:');
      console.log(`  Status: ${verifyResult.status}`);
      console.log(`  Approved At: ${verifyResult.approved_at}`);
      console.log(`  Approved By: ${verifyResult.approved_by}`);
      
      if (verifyResult.status === 'approved') {
        console.log('\n🎉 SUCCESS! Property approval is working correctly.');
      } else {
        console.log('\n❌ FAILURE! Status did not change to approved.');
      }
    }
  }
  
  console.log('\n🔧 Debug test complete!');
  
})();
