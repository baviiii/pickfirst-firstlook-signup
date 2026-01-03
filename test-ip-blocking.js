// Test script to check IP blocking functionality
// Run this in browser console after attempting logins

async function testIPBlocking() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  
  // You'll need to replace these with your actual Supabase credentials
  const supabaseUrl = 'YOUR_SUPABASE_URL';
  const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get your current IP
  const ipResponse = await fetch('https://api.ipify.org?format=json');
  const { ip } = await ipResponse.json();
  console.log('Your IP:', ip);
  
  // Check login history for this IP
  const { data: loginHistory, error: historyError } = await supabase
    .from('login_history')
    .select('*')
    .eq('ip_address', ip)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  if (historyError) {
    console.error('Error fetching login history:', historyError);
    return;
  }
  
  console.log('Login attempts in last hour:', loginHistory.length);
  const failedAttempts = loginHistory.filter(a => !a.success);
  console.log('Failed attempts:', failedAttempts.length);
  console.log('All attempts:', loginHistory);
  
  // Check if IP is blocked
  const { data: blockedIP, error: blockedError } = await supabase
    .from('blocked_ips')
    .select('*')
    .eq('ip_address', ip)
    .eq('is_active', true)
    .single();
  
  if (blockedError && blockedError.code !== 'PGRST116') {
    console.error('Error checking blocked IP:', blockedError);
  } else if (blockedIP) {
    console.log('IP IS BLOCKED:', blockedIP);
  } else {
    console.log('IP is NOT blocked');
  }
  
  // Check suspicious logins view
  const { data: suspicious, error: suspiciousError } = await supabase
    .from('suspicious_logins')
    .select('*')
    .eq('ip_address', ip)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (suspiciousError) {
    console.error('Error fetching suspicious logins:', suspiciousError);
  } else {
    console.log('Suspicious logins:', suspicious);
  }
}

// Run the test
testIPBlocking();

