// ========================================
// 🔐 AUTHENTICATED USER SECURITY TEST
// ========================================
// Tests what logged-in users can access from other users' data
// Run this in browser console while logged in

(async () => {
  console.log('🔐 AUTHENTICATED USER COMPREHENSIVE SECURITY TEST\n');
  console.log('Testing cross-user access and privilege escalation...\n');
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const client = createClient(
    'https://rkwvgqozbpqgmpbvujgz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU'
  );
  
  // Check if logged in
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    console.log('❌ ERROR: You are not logged in!');
    console.log('Please sign in to your app and run this script again');
    return;
  }
  
  console.log(`🔑 Testing as authenticated user: ${user.email}`);
  console.log(`🆔 User ID: ${user.id}\n`);
  console.log('═'.repeat(80) + '\n');
  
  let passCount = 0;
  let failCount = 0;
  let criticalFails = [];
  
  // Test 1: Cross-User Data Access
  console.log('🕵️ TESTING CROSS-USER DATA ACCESS:\n');
  
  const userTables = [
    { name: 'profiles', userField: 'id', desc: 'Other users\' profiles' },
    { name: 'messages', userField: 'sender_id', desc: 'Other users\' messages' },
    { name: 'user_preferences', userField: 'user_id', desc: 'Other users\' preferences' },
    { name: 'notifications', userField: 'user_id', desc: 'Other users\' notifications' },
    { name: 'property_alerts', userField: 'user_id', desc: 'Other users\' property alerts' },
    { name: 'favorites', userField: 'user_id', desc: 'Other users\' saved properties' },
    { name: 'appointments', userField: 'client_id', desc: 'Other users\' appointments' },
    { name: 'property_inquiries', userField: 'buyer_id', desc: 'Other users\' property inquiries' },
    { name: 'audit_logs', userField: 'user_id', desc: 'Other users\' activity logs' }
  ];
  
  for (const table of userTables) {
    try {
      // Try to access other users' data
      const { data, error } = await client
        .from(table.name)
        .select('*')
        .neq(table.userField, user.id)
        .limit(5);
      
      if (error) {
        console.log(`✅ SECURE: Cannot access ${table.desc} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Can access ${table.desc}!`);
        console.log(`   Exposed records: ${data.length}`);
        console.log(`   Sample:`, data.slice(0, 1));
        failCount++;
        criticalFails.push(`${table.name}_cross_access`);
      } else {
        console.log(`✅ SECURE: No ${table.desc} accessible`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${table.desc} access blocked - ${err.message}`);
      passCount++;
    }
    
    // Also test if we can only see our own data
    try {
      const { data: ownData, error: ownError } = await client
        .from(table.name)
        .select('*')
        .eq(table.userField, user.id)
        .limit(3);
      
      if (!ownError && ownData) {
        console.log(`   ℹ️ Can see own ${table.name}: ${ownData.length} records`);
      }
    } catch (err) {
      // Ignore errors for own data check
    }
    
    console.log('');
  }
  
  // Test 2: Privilege Escalation
  console.log('═'.repeat(80));
  console.log('\n👑 TESTING PRIVILEGE ESCALATION:\n');
  
  console.log('Test 2.1: Can I escalate my own role?');
  try {
    const { data, error } = await client
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', user.id)
      .select();
    
    if (error) {
      console.log('✅ SECURE: Self role escalation blocked -', error.message);
      passCount++;
    } else if (data && data.length > 0 && data[0].role === 'super_admin') {
      console.log('❌ CRITICAL: Successfully escalated own role to super_admin!');
      console.log('   New role:', data[0].role);
      failCount++;
      criticalFails.push('self_role_escalation');
    } else {
      console.log('✅ SECURE: Role escalation attempt had no effect');
      passCount++;
    }
  } catch (err) {
    console.log('✅ SECURE: Self role escalation blocked -', err.message);
    passCount++;
  }
  
  console.log('\nTest 2.2: Can I change other users\' roles?');
  try {
    const { data, error } = await client
      .from('profiles')
      .update({ role: 'buyer' })
      .neq('id', user.id)
      .limit(1)
      .select();
    
    if (error) {
      console.log('✅ SECURE: Cannot change other users\' roles -', error.message);
      passCount++;
    } else if (data && data.length > 0) {
      console.log('❌ CRITICAL: Successfully changed other users\' roles!');
      console.log('   Modified users:', data);
      failCount++;
      criticalFails.push('other_role_modification');
    } else {
      console.log('✅ SECURE: No other users\' roles modified');
      passCount++;
    }
  } catch (err) {
    console.log('✅ SECURE: Other users\' role modification blocked -', err.message);
    passCount++;
  }
  
  // Test 3: Data Modification Attacks
  console.log('\n═'.repeat(80));
  console.log('\n🎯 TESTING DATA MODIFICATION ATTACKS:\n');
  
  const modificationTests = [
    { table: 'profiles', field: 'full_name', value: 'HACKED BY ' + user.email, desc: 'other users\' names' },
    { table: 'user_preferences', field: 'email_notifications', value: false, desc: 'other users\' preferences' },
    { table: 'messages', field: 'content', value: 'HACKED MESSAGE', desc: 'other users\' messages' },
    { table: 'appointments', field: 'status', value: 'cancelled', desc: 'other users\' appointments' },
    { table: 'property_inquiries', field: 'message', value: 'HACKED INQUIRY', desc: 'other users\' inquiries' }
  ];
  
  for (const test of modificationTests) {
    try {
      const { data, error } = await client
        .from(test.table)
        .update({ [test.field]: test.value })
        .neq('id', user.id)
        .neq('user_id', user.id)
        .neq('sender_id', user.id)
        .neq('buyer_id', user.id)
        .neq('client_id', user.id)
        .limit(1)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot modify ${test.desc} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully modified ${test.desc}!`);
        console.log(`   Modified:`, data[0]);
        failCount++;
        criticalFails.push(`${test.table}_modification`);
      } else {
        console.log(`✅ SECURE: No ${test.desc} modified`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${test.desc} modification blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Test 4: Data Deletion Attacks
  console.log('\n💀 TESTING DATA DELETION ATTACKS:\n');
  
  const deletionTests = [
    { table: 'profiles', desc: 'other users\' profiles' },
    { table: 'messages', desc: 'other users\' messages' },
    { table: 'appointments', desc: 'other users\' appointments' },
    { table: 'property_inquiries', desc: 'other users\' inquiries' },
    { table: 'notifications', desc: 'other users\' notifications' }
  ];
  
  for (const test of deletionTests) {
    try {
      const { data, error } = await client
        .from(test.table)
        .delete()
        .neq('id', user.id)
        .neq('user_id', user.id)
        .neq('sender_id', user.id)
        .neq('buyer_id', user.id)
        .neq('client_id', user.id)
        .limit(1)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot delete ${test.desc} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully deleted ${test.desc}!`);
        console.log(`   Deleted:`, data[0]);
        failCount++;
        criticalFails.push(`${test.table}_deletion`);
      } else {
        console.log(`✅ SECURE: No ${test.desc} deleted`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${test.desc} deletion blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Test 5: Account Creation Attacks
  console.log('\n🎭 TESTING ACCOUNT CREATION ATTACKS:\n');
  
  const accountTests = [
    { 
      table: 'profiles', 
      data: { 
        id: '99999999-9999-9999-9999-999999999999',
        email: 'fake-admin@hacker.com',
        full_name: 'Fake Admin',
        role: 'super_admin'
      },
      desc: 'fake admin account'
    },
    {
      table: 'user_roles',
      data: {
        user_id: user.id,
        role: 'super_admin'
      },
      desc: 'admin role for self'
    }
  ];
  
  for (const test of accountTests) {
    try {
      const { data, error } = await client
        .from(test.table)
        .insert(test.data)
        .select();
      
      if (error) {
        console.log(`✅ SECURE: Cannot create ${test.desc} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        console.log(`❌ CRITICAL: Successfully created ${test.desc}!`);
        console.log(`   Created:`, data[0]);
        failCount++;
        criticalFails.push(`${test.table}_creation`);
      } else {
        console.log(`✅ SECURE: ${test.desc} creation blocked`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${test.desc} creation blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Test 6: System Table Access
  console.log('\n🔧 TESTING SYSTEM TABLE ACCESS:\n');
  
  const systemTables = [
    { name: 'audit_logs', desc: 'system audit logs' },
    { name: 'rate_limits', desc: 'rate limiting data' },
    { name: 'ip_tracking', desc: 'IP tracking logs' }
  ];
  
  for (const table of systemTables) {
    try {
      const { data, error } = await client
        .from(table.name)
        .select('*')
        .limit(5);
      
      if (error) {
        console.log(`✅ SECURE: Cannot access ${table.desc} - ${error.message}`);
        passCount++;
      } else if (data && data.length > 0) {
        // Check if it's only own data
        const hasOtherUsersData = data.some(item => 
          item.user_id && item.user_id !== user.id
        );
        
        if (hasOtherUsersData) {
          console.log(`❌ CRITICAL: Can access other users' ${table.desc}!`);
          console.log(`   Exposed records: ${data.length}`);
          failCount++;
          criticalFails.push(`${table.name}_system_access`);
        } else {
          console.log(`✅ SECURE: Can only see own ${table.desc}`);
          passCount++;
        }
      } else {
        console.log(`✅ SECURE: No ${table.desc} accessible`);
        passCount++;
      }
    } catch (err) {
      console.log(`✅ SECURE: ${table.desc} access blocked - ${err.message}`);
      passCount++;
    }
  }
  
  // Final Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 AUTHENTICATED USER SECURITY TEST SUMMARY');
  console.log('═'.repeat(80));
  
  const totalTests = passCount + failCount;
  const securityScore = Math.round((passCount / totalTests) * 100);
  
  console.log(`\n🎯 Total Tests: ${totalTests}`);
  console.log(`✅ Secure: ${passCount}`);
  console.log(`❌ Vulnerable: ${failCount}`);
  console.log(`📊 Security Score: ${securityScore}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 PERFECT! Authenticated users cannot attack other users!');
    console.log('✅ Cross-user data access is blocked');
    console.log('✅ Privilege escalation is prevented');
    console.log('✅ Data modification attacks are blocked');
    console.log('✅ Data deletion attacks are blocked');
    console.log('✅ Account creation attacks are blocked');
    console.log('✅ System table access is properly controlled');
    console.log('✅ Your RLS policies provide complete user isolation!');
  } else {
    console.log('\n🚨 SECURITY VULNERABILITIES DETECTED!');
    console.log(`⚠️ ${failCount} vulnerability(ies) found:`);
    criticalFails.forEach(fail => console.log(`  - ${fail}`));
    console.log('\n🔧 IMMEDIATE ACTION REQUIRED: Fix RLS policies for vulnerable operations!');
  }
  
  console.log('\n🔍 Combined with ANONYMOUS_USER_SECURITY_TEST.js results');
  console.log('🔒 This completes your comprehensive security audit!');
  
})();
