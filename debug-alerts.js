// Debug script to check alert system
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAlerts() {
  console.log('🔍 Debugging Alert System...')
  
  // 1. Check if there are any pending jobs
  console.log('\n1. Checking pending alert jobs...')
  const { data: jobs, error: jobsError } = await supabase
    .from('property_alert_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (jobsError) {
    console.error('❌ Error fetching jobs:', jobsError)
  } else {
    console.log(`📋 Found ${jobs?.length || 0} pending jobs`)
    jobs?.forEach(job => {
      console.log(`  - Job ${job.id}: Property ${job.property_id} (${job.created_at})`)
    })
  }
  
  // 2. Check if there are any approved properties
  console.log('\n2. Checking approved properties...')
  const { data: properties, error: propsError } = await supabase
    .from('property_listings')
    .select('id, title, status, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (propsError) {
    console.error('❌ Error fetching properties:', propsError)
  } else {
    console.log(`🏠 Found ${properties?.length || 0} approved properties`)
    properties?.forEach(prop => {
      console.log(`  - ${prop.title} (${prop.created_at})`)
    })
  }
  
  // 3. Check users with property alerts enabled
  console.log('\n3. Checking users with alerts enabled...')
  const { data: users, error: usersError } = await supabase
    .from('user_preferences')
    .select(`
      user_id,
      property_alerts,
      email_notifications,
      profiles!inner (
        id,
        email,
        full_name,
        role,
        subscription_tier
      )
    `)
    .eq('property_alerts', true)
    .eq('email_notifications', true)
    .eq('profiles.role', 'buyer')
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
  } else {
    console.log(`👥 Found ${users?.length || 0} users with alerts enabled`)
    users?.forEach(user => {
      const profile = user.profiles
      console.log(`  - ${profile.full_name} (${profile.email}) - ${profile.subscription_tier}`)
    })
  }
  
  // 4. Check recent alert history
  console.log('\n4. Checking recent alert history...')
  const { data: alerts, error: alertsError } = await supabase
    .from('property_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (alertsError) {
    console.error('❌ Error fetching alerts:', alertsError)
  } else {
    console.log(`📧 Found ${alerts?.length || 0} recent alerts`)
    alerts?.forEach(alert => {
      console.log(`  - Alert to buyer ${alert.buyer_id} for property ${alert.property_id} (${alert.created_at})`)
    })
  }
}

debugAlerts().catch(console.error)
