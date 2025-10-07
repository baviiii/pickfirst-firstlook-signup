#!/usr/bin/env node

/**
 * Simple debug script to check property alerts data
 */

import { execSync } from 'child_process';

console.log('🔍 Debugging Property Alerts System...\n');

async function debugPropertyAlerts() {
  try {
    // 1. Check if there are any pending alert jobs
    console.log('1. Checking pending alert jobs...');
    try {
      const pendingJobs = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT * FROM get_pending_alert_jobs(10);"', { encoding: 'utf8' });
      console.log('✅ Pending jobs:', pendingJobs);
    } catch (error) {
      console.log('❌ Error fetching pending jobs:', error.message);
    }

    // 2. Check recent alert jobs
    console.log('\n2. Checking recent alert jobs...');
    try {
      const recentJobs = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT * FROM property_alert_jobs ORDER BY created_at DESC LIMIT 5;"', { encoding: 'utf8' });
      console.log('✅ Recent jobs:', recentJobs);
    } catch (error) {
      console.log('❌ Error fetching recent jobs:', error.message);
    }

    // 3. Check approved properties
    console.log('\n3. Checking approved properties...');
    try {
      const approvedProperties = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT id, title, price, city, state, status, created_at FROM property_listings WHERE status = \'approved\' ORDER BY created_at DESC LIMIT 5;"', { encoding: 'utf8' });
      console.log('✅ Approved properties:', approvedProperties);
    } catch (error) {
      console.log('❌ Error fetching approved properties:', error.message);
    }

    // 4. Check users with property alerts enabled
    console.log('\n4. Checking users with property alerts enabled...');
    try {
      const usersWithAlerts = execSync(`
        psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
          SELECT 
            up.user_id,
            up.property_alerts,
            up.email_notifications,
            up.min_budget,
            up.max_budget,
            up.preferred_bedrooms,
            up.preferred_bathrooms,
            up.preferred_areas,
            up.property_type_preferences,
            p.email,
            p.full_name,
            p.role,
            p.subscription_tier
          FROM user_preferences up
          INNER JOIN profiles p ON up.user_id = p.id
          WHERE up.property_alerts = true 
            AND up.email_notifications = true 
            AND p.role = 'buyer';
        "
      `, { encoding: 'utf8' });
      console.log('✅ Users with alerts:', usersWithAlerts);
    } catch (error) {
      console.log('❌ Error fetching users with alerts:', error.message);
    }

    // 5. Check feature configuration
    console.log('\n5. Checking feature configuration...');
    try {
      const featureConfig = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT * FROM feature_configurations WHERE feature_key = \'property_alerts_unlimited\';"', { encoding: 'utf8' });
      console.log('✅ Feature config:', featureConfig);
    } catch (error) {
      console.log('❌ Error fetching feature config:', error.message);
    }

    // 6. Check sent property alerts
    console.log('\n6. Checking sent property alerts...');
    try {
      const sentAlerts = execSync('psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT * FROM property_alerts ORDER BY sent_at DESC LIMIT 5;"', { encoding: 'utf8' });
      console.log('✅ Sent alerts:', sentAlerts);
    } catch (error) {
      console.log('❌ Error fetching sent alerts:', error.message);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug script
debugPropertyAlerts().then(() => {
  console.log('\n✅ Debug complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
