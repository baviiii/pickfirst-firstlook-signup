# 🔐 Complete RLS Security Testing Guide for PickFirst

## 📋 Overview

This guide provides **two comprehensive RLS tests** to ensure your database is fully secure:

1. **Anonymous Access Test** - Can outsiders access your data without logging in?
2. **Cross-User Access Test** - Can logged-in users access each other's private data?

---

## 🎯 Quick Start

### Option 1: Visual HTML Interface (Recommended)
Open this file in your browser:
```
COMPLETE_RLS_TEST.html
```

This provides a beautiful tabbed interface with both tests in one place.

### Option 2: Individual Test Files
- **Anonymous Test**: `EXTERNAL_RLS_TEST.html`
- **Cross-User Test**: Use the second tab in `COMPLETE_RLS_TEST.html`

---

## 🧪 Test 1: Anonymous Access (No Login Required)

### What This Tests
Can someone access your database **without any authentication**, using only your public anon key?

### How to Run
1. Open `COMPLETE_RLS_TEST.html` in your browser
2. Stay on the "Test 1: Anonymous Access" tab
3. Click "Run Anonymous Access Test"
4. Wait for results

### What Gets Tested (16 Tables)
- ✅ User Profiles
- ✅ Property Favorites
- ✅ Messages
- ✅ Conversations
- ✅ Appointments
- ✅ Property Inquiries
- ✅ Property Alerts
- ✅ Audit Logs
- ✅ User Preferences
- ✅ Saved Filters
- ✅ Calendar Integrations
- ✅ Login History
- ✅ Clients
- ✅ Client Notes
- ✅ Client Interactions
- ✅ Property Listings (should be public for approved listings)

### Expected Results

#### ✅ SAFE (What You Want)
```
✅ User Profiles: SAFE - Access Denied
✅ Messages: SAFE - Access Denied
✅ Property Favorites: SAFE - Access Denied
...
100% Security Score
```

#### ❌ UNSAFE (Security Issue)
```
❌ User Profiles: UNSAFE - DATA EXPOSED!
   Records Exposed: 15
   [Shows actual user data]
```

---

## 🧪 Test 2: Cross-User Access (Logged In Users)

### What This Tests
Can **User A** (logged in) access **User B's** private data?

This is critical because even with authentication, users should only see their own data.

### How to Run

#### Step 1: Get Your JWT Token
1. Open your PickFirst app and **sign in as User A**
2. Open DevTools Console (F12)
3. Run this command:
```javascript
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Token:', session.access_token);
console.log('Your User ID:', session.user.id);
```
4. Copy the `access_token`

#### Step 2: Get Another User's ID
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz
2. Click **Authentication** → **Users**
3. Copy any **other user's UUID** (not your own)

#### Step 3: Run the Test
1. Open `COMPLETE_RLS_TEST.html`
2. Click the "Test 2: Cross-User Access" tab
3. Paste your JWT token
4. Paste the target user ID
5. Click "Run Cross-User Access Test"

### What Gets Tested (11 Scenarios)
- ❌ Can you read another user's profile?
- ❌ Can you see their saved properties?
- ❌ Can you read their private messages?
- ❌ Can you see their conversations?
- ❌ Can you see their appointments?
- ❌ Can you see their property inquiries?
- ❌ Can you see their property alerts?
- ❌ Can you see their settings?
- ❌ Can you see their saved searches?
- ❌ Can you see their login records?
- ❌ Can you see their activity logs?

### Expected Results

#### ✅ SAFE (What You Want)
```
✅ Read Other User Profile: SAFE - Access Denied
✅ Read Other User Messages: SAFE - Access Denied
✅ Read Other User Favorites: SAFE - Access Denied
...
100% Security Score
🎉 Perfect RLS Protection!
```

#### ❌ UNSAFE (Security Issue)
```
❌ Read Other User Profile: UNSAFE - DATA LEAKED!
   Records Exposed: 1
   {
     "id": "...",
     "email": "victim@example.com",
     "phone": "123-456-7890"
   }
```

---

## 📊 Current Database Schema

Your database has the following tables with RLS enabled:

### User Data Tables
- `profiles` - User accounts and personal info
- `user_preferences` - User settings
- `user_password_history` - Password change history
- `login_history` - Login records

### Property-Related Tables
- `property_listings` - Property listings (approved = public)
- `property_favorites` - User saved properties
- `property_inquiries` - Buyer inquiries
- `property_alerts` - User search alerts
- `property_alert_jobs` - Alert processing queue

### Communication Tables
- `messages` - Private messages
- `conversations` - Conversation threads

### Agent Tables
- `clients` - Agent client lists
- `client_notes` - Agent notes
- `client_interactions` - Agent-client interactions
- `appointments` - Scheduled viewings

### System Tables
- `audit_logs` - Activity logs
- `system_alerts` - System notifications
- `saved_filters` - User saved searches
- `calendar_integrations` - Calendar connections
- `feature_configurations` - Feature gates
- `subscription_plans` - Subscription tiers
- `agent_specialties` - Agent specializations

---

## 🔧 Current RLS Policies Summary

Based on your `20251007015950_remote_schema.sql`, you have:

### ✅ Properly Protected Tables
- **profiles**: Users can only view/update their own
- **messages**: Users can only see messages in their conversations
- **conversations**: Users can only see their own conversations
- **appointments**: Agents see theirs, buyers see theirs
- **property_inquiries**: Buyers see theirs, agents see inquiries for their properties
- **property_favorites**: Users can only manage their own
- **user_preferences**: Users can only see/update their own
- **audit_logs**: Users see their own, admins see all
- **login_history**: Users see their own, super admins see all

### ⚠️ Tables to Verify
- **property_listings**: Anyone can view approved listings (this is correct for a real estate platform)
- **feature_configurations**: Anyone can view (needed for feature gates)
- **subscription_plans**: Anyone can view active plans (needed for signup)

---

## 🚨 What to Do If Tests Fail

### If Anonymous Test Fails

This means someone can access your data without logging in. **CRITICAL SECURITY ISSUE!**

#### Fix:
```sql
-- Enable RLS on the exposed table
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies (example for user data)
CREATE POLICY "Users can only view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

### If Cross-User Test Fails

This means logged-in users can see each other's private data. **MAJOR SECURITY ISSUE!**

#### Fix:
```sql
-- Update the policy to check user ownership
DROP POLICY IF EXISTS "existing_policy_name" ON table_name;

CREATE POLICY "Users can only access own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 📝 Example Fix Scripts

### Fix for Favorites Table
```sql
-- Enable RLS
ALTER TABLE property_favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users view own favorites" ON property_favorites
  FOR SELECT USING (auth.uid() = buyer_id);

-- Users can only add their own favorites
CREATE POLICY "Users insert own favorites" ON property_favorites
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Users can only delete their own favorites
CREATE POLICY "Users delete own favorites" ON property_favorites
  FOR DELETE USING (auth.uid() = buyer_id);
```

### Fix for Messages Table
```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages in their conversations
CREATE POLICY "Users view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

-- Users can only send messages in their conversations
CREATE POLICY "Users send own messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );
```

---

## 🎯 Testing Checklist

### Before Deployment
- [ ] Run Anonymous Access Test - 100% safe
- [ ] Run Cross-User Access Test - 100% safe
- [ ] Verify property listings are public (approved status)
- [ ] Verify feature configurations are public
- [ ] Verify subscription plans are public
- [ ] All other tables return empty [] for unauthorized access

### After Any Database Changes
- [ ] Re-run both tests
- [ ] Check new tables have RLS enabled
- [ ] Verify new policies are working

### Regular Security Audits
- [ ] Monthly: Run both tests
- [ ] After adding new tables: Run tests
- [ ] After modifying RLS policies: Run tests
- [ ] Before major releases: Run tests

---

## 💡 Pro Tips

### 1. Test with Real Data
Don't use fake UUIDs. Create actual test users and try accessing their data.

### 2. Test All User Roles
- Test as a buyer trying to access another buyer's data
- Test as an agent trying to access another agent's data
- Test as a buyer trying to access agent-only data
- Test as an agent trying to access super admin data

### 3. Test CRUD Operations
Don't just test SELECT (read). Also test:
- INSERT (create)
- UPDATE (modify)
- DELETE (remove)

### 4. Automate Testing
Consider creating a CI/CD pipeline that runs these tests automatically.

### 5. Monitor in Production
Set up alerts for:
- Unusual access patterns
- Failed RLS policy checks
- High volume of 403 errors (could indicate attack attempts)

---

## 🔍 Understanding the Results

### HTTP Status Codes

- **200 with empty []** = ✅ SAFE (RLS blocked the query)
- **200 with data** = ❌ UNSAFE (data leaked!)
- **401 Unauthorized** = ✅ SAFE (authentication required)
- **403 Forbidden** = ✅ SAFE (RLS policy blocked access)
- **404 Not Found** = ✅ SAFE (table doesn't exist)

### Error Codes

- **42P01** = Table doesn't exist (safe)
- **42501** = RLS policy violation (safe - policy is working)
- **PGRST** errors = PostgREST errors (usually safe)

---

## 📞 Quick Reference

### Your Supabase Details
- **Project URL**: https://rkwvgqozbpqgmpbvujgz.supabase.co
- **Project ID**: rkwvgqozbpqgmpbvujgz
- **Dashboard**: https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz

### Test Files
1. `COMPLETE_RLS_TEST.html` - All-in-one test suite (recommended)
2. `EXTERNAL_RLS_TEST.html` - Anonymous access only
3. `RLS_SECURITY_TEST.md` - Original documentation
4. `QUICK_EXTERNAL_TEST.md` - Quick reference guide
5. `test-external-access.js` - Node.js test script

---

## ✅ Success Criteria

Your database is **production-ready** when:

1. ✅ Anonymous Access Test: 100% safe
2. ✅ Cross-User Access Test: 100% safe
3. ✅ Property listings (approved) are public
4. ✅ All other user data is private
5. ✅ Agents can only see their own clients
6. ✅ Buyers can only see their own data
7. ✅ Super admins can see everything (for admin panel)

---

## 🎉 Your Current Status

Based on your test results:

### Anonymous Access Test
**Status**: ✅ **100% SECURE**

All sensitive tables are protected from anonymous access. Excellent work!

### Cross-User Access Test
**Status**: ⚠️ **NEEDS TESTING**

Please run the cross-user test to verify users can't access each other's data.

---

**Last Updated**: 2025-01-11  
**Database Schema Version**: 20251007015950  
**Total Tables**: 25  
**RLS Enabled**: All tables ✅
