// ========================================
// 🔐 ANONYMOUS USER SECURITY TEST
// ========================================
// Tests what anonymous (not logged in) users can access
// Run this in browser console while logged out

(async () => {
  console.log('🔐 ANONYMOUS USER COMPREHENSIVE SECURITY TEST\n');
  console.log('Testing ALL tables for anonymous access...\n');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const client = createClient(
    'https://rkwvgqozbpqgmpbvujgz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU'
  );
  
  // Verify we're not logged in
  const { data: { user } } = await client.auth.getUser();
  if (user) {
    console.log('❌ ERROR: You are logged in as:', user.email);
    console.log('Please sign out and refresh the page!');
    return;
  }
  
  console.log('✅ Confirmed: Testing as anonymous user\n');
  console.log('═'.repeat(80) + '\n');
  
  // All tables to test
  const tables = [
    // User & Auth Tables
    { name: 'profiles', desc: 'User profiles (email, phone, names)', critical: true },
    { name: 'user_roles', desc: 'User role assignments', critical: true },
    { name: 'user_preferences', desc: 'User settings and preferences', critical: true },
    
    // Communication Tables
    { name: 'messages', desc: 'Private messages between users', critical: true },
    { name: 'conversations', desc: 'Message conversation threads', critical: true },
    { name: 'notifications', desc: 'User notifications', critical: true },
    
    // Property & Business Tables
    { name: 'property_listings', desc: 'Property listings (should be public)', critical: false },
    { name: 'property_inquiries', desc: 'Property inquiry requests', critical: true },
    { name: 'property_alerts', desc: 'User property search alerts', critical: true },
    { name: 'favorites', desc: 'User saved properties', critical: true },
    
    // Booking & Appointments
    { name: 'appointments', desc: 'Property viewing appointments', critical: true },
    { name: 'clients', desc: 'Client information', critical: true },
    { name: 'client_interactions', desc: 'Client interaction history', critical: true },
    
    // System & Audit Tables
    { name: 'audit_logs', desc: 'System activity logs', critical: true },
    { name: 'rate_limits', desc: 'Rate limiting data', critical: true },
    { name: 'ip_tracking', desc: 'IP tracking logs', critical: true },
    
    // Subscription & Payment
    { name: 'subscriptions', desc: 'User subscription data', critical: true },
    { name: 'feature_configurations', desc: 'Feature settings', critical: false },
    
    // Additional Tables
    { name: 'property_images', desc: 'Property image metadata', critical: false },
    { name: 'saved_searches', desc: 'User saved search queries', critical: true }
  ];
  
  let passCount = 0;
  let failCount = 0;
  let criticalFails = [];
  
  console.log('🔍 TESTING READ ACCESS TO ALL TABLES:\n');
  
  // Test 1: Read Access
  for (const table of tables) {
    try {
      const { data, error, count } = await client
        .from(table.name)
        .select('*', { count: 'exact' })
        .limit(5);
      
      const hasData = data && data.length > 0;
      const isBlocked = error || !hasData;
      
      if (table.critical && !isBlocked) {
        console.log(`❌ CRITICAL: ${table.name}`);
        console.log(`   Contains: ${table.desc}`);
        console.log(`   ⚠️ EXPOSED: ${data.length} records visible!`);
        console.log(`   Sample:`, data.slice(0, 1));
        console.log('');
        failCount++;
        criticalFails.push(table.name);
      } else if (!table.critical && hasData) {
        console.log(`✅ PUBLIC: ${table.name}`);
        console.log(`   Contains: ${table.desc}`);
        console.log(`   Records: ${data.length} (expected to be public)`);
        console.log('');
        passCount++;
      } else {
        console.log(`✅ SECURE: ${table.name}`);
        console.log(`   Contains: ${table.desc}`);
        console.log(`   Status: Access denied (${error?.message || 'No data'})`);
        console.log('');
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${table.name}`);
      console.log(`   Error: ${err.message}`);
      console.log('');
      passCount++;
    }
  }
  
  console.log('═'.repeat(80));
  console.log('\n💀 TESTING WRITE ACCESS (INSERT/UPDATE/DELETE):\n');
  
  // Test 2: Insert Access
  console.log('🎭 Testing INSERT operations...');
  const insertTests = [
    { table: 'profiles', data: { id: '11111111-1111-1111-1111-111111111111', email: 'hacker@evil.com', full_name: 'Evil Hacker', role: 'super_admin' }},
    { table: 'messages', data: { sender_id: '11111111-1111-1111-1111-111111111111', receiver_id: '22222222-2222-2222-2222-222222222222', content: 'HACKED' }},
    { table: 'appointments', data: { client_id: '11111111-1111-1111-1111-111111111111', agent_id: '22222222-2222-2222-2222-222222222222', appointment_date: '2024-01-01' }},
    { table: 'property_inquiries', data: { buyer_id: '11111111-1111-1111-1111-111111111111', property_id: '22222222-2222-2222-2222-222222222222', message: 'HACKED' }}
  ];
  
  for (const test of insertTests) {
    try {
      const { data, error } = await client
        .from(test.table)
        .insert(test.data)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot insert into ${test.table} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully inserted into ${test.table}!`);
        console.log('   Inserted:', data[0]);
        failCount++;
        criticalFails.push(`${test.table}_insert`);
      } else {
        console.log(`✅ SECURE: Insert into ${test.table} blocked (no data returned)`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: Insert into ${test.table} blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Test 3: Update Access
  console.log('\n👑 Testing UPDATE operations...');
  const updateTests = [
    { table: 'profiles', update: { role: 'super_admin', full_name: 'HACKED BY ANON' }},
    { table: 'user_preferences', update: { email_notifications: false }},
    { table: 'property_listings', update: { price: 1, title: 'HACKED PROPERTY' }},
    { table: 'appointments', update: { status: 'cancelled' }}
  ];
  
  for (const test of updateTests) {
    try {
      const { data, error } = await client
        .from(test.table)
        .update(test.update)
        .limit(1)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot update ${test.table} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully updated ${test.table}!`);
        console.log('   Updated:', data[0]);
        failCount++;
        criticalFails.push(`${test.table}_update`);
      } else {
        console.log(`✅ SECURE: Update ${test.table} blocked (no data affected)`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: Update ${test.table} blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Test 4: Delete Access
  console.log('\n💀 Testing DELETE operations...');
  const deleteTests = ['profiles', 'messages', 'appointments', 'property_inquiries', 'notifications'];
  
  for (const table of deleteTests) {
    try {
      const { data, error } = await client
        .from(table)
        .delete()
        .limit(1)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot delete from ${table} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully deleted from ${table}!`);
        console.log('   Deleted:', data[0]);
        failCount++;
        criticalFails.push(`${table}_delete`);
      } else {
        console.log(`✅ SECURE: Delete from ${table} blocked (no data affected)`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: Delete from ${table} blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Final Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 ANONYMOUS USER SECURITY TEST SUMMARY');
  console.log('═'.repeat(80));
  
  const totalTests = passCount + failCount;
  const securityScore = Math.round((passCount / totalTests) * 100);
  
  console.log(`\n🎯 Total Tests: ${totalTests}`);
  console.log(`✅ Secure: ${passCount}`);
  console.log(`❌ Vulnerable: ${failCount}`);
  console.log(`📊 Security Score: ${securityScore}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 PERFECT! Anonymous users cannot access or modify any sensitive data!');
    console.log('✅ All critical tables are protected');
    console.log('✅ No unauthorized read access');
    console.log('✅ No unauthorized write access');
    console.log('✅ Your database is bulletproof against anonymous attacks!');
  } else {
    console.log('\n🚨 SECURITY VULNERABILITIES DETECTED!');
    console.log(`⚠️ ${failCount} vulnerability(ies) found:`);
    criticalFails.forEach(fail => console.log(`  - ${fail}`));
    console.log('\n🔧 IMMEDIATE ACTION REQUIRED: Fix RLS policies for vulnerable tables!');
  }
  
  console.log('\n🔍 Next: Run AUTHENTICATED_USER_SECURITY_TEST.js while logged in');
  console.log('🔒 This completes the anonymous user security audit!');
  
})();
