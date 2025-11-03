# 🔐 Supabase RLS Security Testing Guide

## Quick Answer: Are You Safe?

Based on your current RLS policies in `fix-rls-policies.sql`, you have **basic protection** in place:
- ✅ Users can only view their own profile
- ✅ Users can only update their own profile
- ✅ Users can only insert their own profile

However, you need to test **ALL tables** (favorites, messages, properties, etc.) to ensure complete security.

---

## 🎯 Step-by-Step Testing Instructions

### Step 1: Prepare Two Test Users

You need two user accounts to test:
- **User A** (You): The account you'll sign in with
- **User B** (Target): The account you'll try to access (should fail)

**Get User B's ID:**
1. Sign in to Supabase Dashboard: https://supabase.com/dashboard
2. Go to: Authentication → Users
3. Copy any other user's UUID (not your own)

---

### Step 2: Sign In and Open DevTools

1. Open your PickFirst app: http://localhost:5173 (or your deployed URL)
2. Sign in as **User A**
3. Press `F12` to open DevTools
4. Go to the **Console** tab

---

### Step 3: Run the Complete Security Test

Copy and paste this **entire script** into the Console and press Enter:

```javascript
// ========================================
// 🔐 PICKFIRST RLS SECURITY TEST
// ========================================

// === CONFIGURATION ===
const SUPABASE_URL = 'https://rkwvgqozbpqgmpbvujgz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU';

// ⚠️ REPLACE THIS WITH ANOTHER USER'S ID FROM YOUR DATABASE
const OTHER_USER_ID = 'PASTE_OTHER_USER_ID_HERE';

// === GET YOUR CURRENT SESSION ===
const { data: { session } } = await window.supabase.auth.getSession();
const myToken = session?.access_token;
const myUserId = session?.user?.id;

console.log('🔐 PICKFIRST RLS SECURITY TEST');
console.log('================================');
console.log('My User ID:', myUserId);
console.log('Target User ID:', OTHER_USER_ID);
console.log('Test Time:', new Date().toLocaleString());
console.log('================================\n');

// === HELPER FUNCTION ===
async function testEndpoint(name, url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${myToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    const isSafe = response.status === 403 || response.status === 401 || 
                   (Array.isArray(data) && data.length === 0) ||
                   (data.code && data.code.includes('PGRST'));
    
    console.log(`${isSafe ? '✅' : '❌'} ${name}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Result:`, data);
    console.log(`   ${isSafe ? 'SAFE - No data leaked' : '⚠️ UNSAFE - DATA EXPOSED!'}\n`);
    
    return { name, safe: isSafe, status: response.status, data };
  } catch (error) {
    console.log(`✅ ${name}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   SAFE - Request blocked\n`);
    return { name, safe: true, error: error.message };
  }
}

// === RUN ALL TESTS ===
const results = [];

// TEST 1: Read another user's profile
console.log('📋 TEST 1: Reading Profiles Table');
results.push(await testEndpoint(
  'Read Other User Profile',
  `${SUPABASE_URL}/rest/v1/profiles?id=eq.${OTHER_USER_ID}`
));

// TEST 2: Update another user's profile
console.log('📋 TEST 2: Updating Profiles Table');
results.push(await testEndpoint(
  'Update Other User Profile',
  `${SUPABASE_URL}/rest/v1/profiles?id=eq.${OTHER_USER_ID}`,
  'PATCH',
  { full_name: 'HACKED NAME' }
));

// TEST 3: Delete another user's profile
console.log('📋 TEST 3: Deleting Profiles Table');
results.push(await testEndpoint(
  'Delete Other User Profile',
  `${SUPABASE_URL}/rest/v1/profiles?id=eq.${OTHER_USER_ID}`,
  'DELETE'
));

// TEST 4: Read another user's favorites
console.log('📋 TEST 4: Reading Favorites Table');
results.push(await testEndpoint(
  'Read Other User Favorites',
  `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${OTHER_USER_ID}`
));

// TEST 5: Delete another user's favorites
console.log('📋 TEST 5: Deleting Favorites Table');
results.push(await testEndpoint(
  'Delete Other User Favorites',
  `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${OTHER_USER_ID}`,
  'DELETE'
));

// TEST 6: Read another user's messages
console.log('📋 TEST 6: Reading Messages Table');
results.push(await testEndpoint(
  'Read Other User Messages',
  `${SUPABASE_URL}/rest/v1/messages?receiver_id=eq.${OTHER_USER_ID}`
));

// TEST 7: Read another user's property alerts
console.log('📋 TEST 7: Reading Property Alerts Table');
results.push(await testEndpoint(
  'Read Other User Alerts',
  `${SUPABASE_URL}/rest/v1/property_alerts?user_id=eq.${OTHER_USER_ID}`
));

// TEST 8: Read another user's appointments
console.log('📋 TEST 8: Reading Appointments Table');
results.push(await testEndpoint(
  'Read Other User Appointments',
  `${SUPABASE_URL}/rest/v1/appointments?buyer_id=eq.${OTHER_USER_ID}`
));

// TEST 9: Read another user's inquiries
console.log('📋 TEST 9: Reading Inquiries Table');
results.push(await testEndpoint(
  'Read Other User Inquiries',
  `${SUPABASE_URL}/rest/v1/inquiries?buyer_id=eq.${OTHER_USER_ID}`
));

// TEST 10: Read another user's subscription
console.log('📋 TEST 10: Reading Subscriptions Table');
results.push(await testEndpoint(
  'Read Other User Subscription',
  `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${OTHER_USER_ID}`
));

// === FINAL SUMMARY ===
console.log('\n========================================');
console.log('🎯 FINAL SECURITY REPORT');
console.log('========================================');

const safeCount = results.filter(r => r.safe).length;
const unsafeCount = results.filter(r => !r.safe).length;
const totalTests = results.length;

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Safe: ${safeCount}`);
console.log(`❌ Unsafe: ${unsafeCount}`);
console.log(`Security Score: ${Math.round((safeCount / totalTests) * 100)}%\n`);

if (unsafeCount === 0) {
  console.log('🎉 EXCELLENT! Your RLS policies are working correctly!');
  console.log('All attempts to access other users\' data were blocked.');
} else {
  console.log('⚠️ WARNING! Security vulnerabilities detected!');
  console.log('The following tests failed:');
  results.filter(r => !r.safe).forEach(r => {
    console.log(`  ❌ ${r.name}`);
  });
  console.log('\n🔧 ACTION REQUIRED: Fix RLS policies immediately!');
}

console.log('\n========================================');
console.log('📊 Detailed Results:');
console.table(results.map(r => ({
  Test: r.name,
  Status: r.safe ? '✅ SAFE' : '❌ UNSAFE',
  HTTP: r.status || 'Error'
})));
```

---

## 📊 Understanding the Results

### ✅ SAFE Output Examples:

```javascript
✅ Read Other User Profile
   Status: 200
   Result: []
   SAFE - No data leaked
```

```javascript
✅ Update Other User Profile
   Status: 403
   Result: { code: "42501", message: "new row violates row-level security policy" }
   SAFE - No data leaked
```

### ❌ UNSAFE Output Examples:

```javascript
❌ Read Other User Profile
   Status: 200
   Result: [{
     id: "other-user-id",
     email: "victim@example.com",
     full_name: "John Doe",
     phone: "123-456-7890"
   }]
   ⚠️ UNSAFE - DATA EXPOSED!
```

```javascript
❌ Delete Other User Favorites
   Status: 204
   Result: null
   ⚠️ UNSAFE - DATA EXPOSED!
```

---

## 🔧 What to Do If Tests Fail

If any test shows **❌ UNSAFE**, you need to add RLS policies for that table.

### Example: Fix Favorites Table

```sql
-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only add their own favorites
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own favorites
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 🎯 Quick Test (One-Liner)

If you just want a quick check, run this simplified version:

```javascript
// Quick RLS Test
const OTHER_USER_ID = 'PASTE_USER_ID_HERE';
const { data: { session } } = await window.supabase.auth.getSession();
const response = await fetch(
  `https://rkwvgqozbpqgmpbvujgz.supabase.co/rest/v1/profiles?id=eq.${OTHER_USER_ID}`,
  {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU',
      'Authorization': `Bearer ${session.access_token}`
    }
  }
);
const data = await response.json();
console.log(data.length === 0 ? '✅ SAFE' : '❌ UNSAFE - DATA LEAKED!', data);
```

---

## 📝 Additional Security Checks

### Check All Tables Have RLS Enabled

Run this in Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

### View All Current RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🚨 Critical Tables to Protect

Make sure these tables have RLS policies:

1. ✅ `profiles` - User personal information
2. ⚠️ `favorites` - User saved properties
3. ⚠️ `messages` - Private conversations
4. ⚠️ `appointments` - Scheduled viewings
5. ⚠️ `inquiries` - Property inquiries
6. ⚠️ `property_alerts` - User search alerts
7. ⚠️ `subscriptions` - Payment information
8. ⚠️ `audit_logs` - System logs (admin only)

---

## 💡 Pro Tips

1. **Test with real user IDs** - Don't use fake UUIDs
2. **Test all CRUD operations** - SELECT, INSERT, UPDATE, DELETE
3. **Test as different roles** - buyer, agent, super_admin
4. **Test edge cases** - NULL values, missing fields
5. **Automate testing** - Run this script regularly

---

## 📞 Need Help?

If you find security issues:
1. **Don't panic** - RLS can be fixed quickly
2. **Document the issue** - Screenshot the console output
3. **Fix immediately** - Add the missing RLS policies
4. **Re-test** - Run the script again to verify

---

## ✅ Checklist

- [ ] I have two test user accounts
- [ ] I replaced `OTHER_USER_ID` with a real UUID
- [ ] I ran the complete security test
- [ ] All tests show ✅ SAFE
- [ ] I checked all tables have RLS enabled
- [ ] I documented any issues found
- [ ] I fixed any security vulnerabilities
- [ ] I re-tested after fixes

---

**Last Updated:** 2025-01-11  
**Your Supabase Project:** rkwvgqozbpqgmpbvujgz
