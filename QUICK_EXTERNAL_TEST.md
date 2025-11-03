# 🚨 QUICK EXTERNAL RLS TEST (No Login Required)

## ⚡ 30-Second Test

This tests if someone can access your database **WITHOUT LOGGING IN**.

### Step 1: Open ANY Browser (Even Incognito)
- Don't sign in to your app
- Don't even visit your website
- Just open a blank tab

### Step 2: Open DevTools Console
- Press `F12`
- Go to **Console** tab

### Step 3: Paste This Code and Press Enter

```javascript
// 🔐 QUICK EXTERNAL RLS TEST
(async () => {
  const url = 'https://rkwvgqozbpqgmpbvujgz.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU';
  
  const tables = ['profiles', 'favorites', 'messages', 'appointments', 'inquiries', 'subscriptions', 'notifications'];
  
  console.log('🔐 Testing External Access (No Login)...\n');
  
  let unsafe = 0;
  
  for (const table of tables) {
    const res = await fetch(`${url}/rest/v1/${table}?limit=5`, {
      headers: { 'apikey': key }
    });
    const data = await res.json();
    const exposed = Array.isArray(data) && data.length > 0;
    
    if (exposed) {
      console.log(`❌ ${table}: ${data.length} records EXPOSED!`, data);
      unsafe++;
    } else {
      console.log(`✅ ${table}: SAFE`);
    }
  }
  
  console.log(`\n${unsafe === 0 ? '🎉 SECURE!' : '⚠️ DANGER! ' + unsafe + ' tables exposed!'}`);
})();
```

---

## 📊 What You Should See

### ✅ SAFE (Good):
```
✅ profiles: SAFE
✅ favorites: SAFE
✅ messages: SAFE
✅ appointments: SAFE
✅ inquiries: SAFE
✅ subscriptions: SAFE
✅ notifications: SAFE

🎉 SECURE!
```

### ❌ UNSAFE (Bad):
```
❌ profiles: 15 records EXPOSED! [{id: "...", email: "user@example.com", ...}]
❌ messages: 42 records EXPOSED! [{sender_id: "...", content: "..."}]
❌ favorites: 8 records EXPOSED! [...]

⚠️ DANGER! 3 tables exposed!
```

---

## 🎯 Alternative Methods

### Method 1: HTML File (Visual Interface)
1. Open `EXTERNAL_RLS_TEST.html` in your browser
2. Click "Run External Security Test"
3. See visual results

### Method 2: Node.js Script
```bash
node test-external-access.js
```

### Method 3: cURL (Command Line)
```bash
curl "https://rkwvgqozbpqgmpbvujgz.supabase.co/rest/v1/profiles?limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU"
```

**Expected if SAFE:** `[]` (empty array)  
**Expected if UNSAFE:** `[{...user data...}]`

---

## 🔧 If You Find Vulnerabilities

Run this SQL in Supabase to fix ALL tables:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Favorites: Users can only see their own
CREATE POLICY "Users view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Messages: Users can only see messages they sent or received
CREATE POLICY "Users view own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Appointments: Users can only see their own
CREATE POLICY "Users view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = agent_id);

-- Inquiries: Users can only see their own
CREATE POLICY "Users view own inquiries" ON inquiries
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = agent_id);

-- Property Alerts: Users can only see their own
CREATE POLICY "Users view own alerts" ON property_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions: Users can only see their own
CREATE POLICY "Users view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Users can only see their own
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Audit Logs: Only super admins can view
CREATE POLICY "Super admins view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

---

## ⚠️ Why This Test Matters

Your **anon key is public** - it's in your frontend JavaScript code that anyone can view.

An attacker can:
1. View your website source code
2. Find your Supabase URL and anon key
3. Use them to query your database directly
4. **No login required!**

This is why RLS (Row Level Security) is critical.

---

## ✅ Best Practices

1. **Always enable RLS** on tables with sensitive data
2. **Test regularly** - Run this test after any database changes
3. **Properties table** can be public (listings are meant to be seen)
4. **Everything else** should require authentication
5. **Never trust the frontend** - Always enforce security at the database level

---

## 📞 Quick Reference

- **Your Supabase URL:** https://rkwvgqozbpqgmpbvujgz.supabase.co
- **Your Project ID:** rkwvgqozbpqgmpbvujgz
- **Dashboard:** https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz

---

**Last Updated:** 2025-01-11
