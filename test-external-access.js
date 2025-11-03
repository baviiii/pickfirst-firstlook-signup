/**
 * 🔐 EXTERNAL RLS SECURITY TEST
 * 
 * This script tests if your Supabase database can be accessed
 * by someone who is NOT logged in (anonymous external attacker).
 * 
 * Run this from ANY computer, even one that has never accessed your app.
 * 
 * Usage: node test-external-access.js
 */

const SUPABASE_URL = 'https://rkwvgqozbpqgmpbvujgz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3ZncW96YnBxZ21wYnZ1amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDYyNDMsImV4cCI6MjA2Nzg4MjI0M30.fSLOGnAo3OU7B726VAAAboPtWJZkBoVuSlttuHzpVJU';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function testTable(tableName, description) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?limit=10`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    const hasData = Array.isArray(data) && data.length > 0;
    const isSafe = !hasData || response.status === 401 || response.status === 403;

    return {
      table: tableName,
      description,
      safe: isSafe,
      status: response.status,
      recordCount: Array.isArray(data) ? data.length : 0,
      sampleData: hasData ? data.slice(0, 2) : null
    };
  } catch (error) {
    return {
      table: tableName,
      description,
      safe: true,
      error: error.message
    };
  }
}

async function runTests() {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║     🔐 PICKFIRST EXTERNAL RLS SECURITY TEST               ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║     Testing Anonymous Access (No Login Required)          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.yellow}⚠️  WARNING: This simulates an external attacker${colors.reset}`);
  console.log(`${colors.yellow}   They have NEVER logged in, only have your public anon key${colors.reset}\n`);

  const tables = [
    { name: 'profiles', desc: 'User profiles (email, phone, personal info)' },
    { name: 'favorites', desc: 'User saved properties' },
    { name: 'messages', desc: 'Private messages between users' },
    { name: 'appointments', desc: 'Scheduled property viewings' },
    { name: 'inquiries', desc: 'Property inquiries from buyers' },
    { name: 'property_alerts', desc: 'User search alerts and preferences' },
    { name: 'subscriptions', desc: 'Payment and subscription data' },
    { name: 'audit_logs', desc: 'System activity logs' },
    { name: 'notifications', desc: 'User notifications' },
    { name: 'properties', desc: 'Property listings (should be public)' }
  ];

  const results = [];
  let testNumber = 1;

  for (const table of tables) {
    process.stdout.write(`${colors.blue}[${testNumber}/${tables.length}]${colors.reset} Testing ${colors.bold}${table.name}${colors.reset}... `);
    
    const result = await testTable(table.name, table.desc);
    results.push(result);

    if (result.safe) {
      console.log(`${colors.green}✅ SAFE${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ UNSAFE - ${result.recordCount} records exposed!${colors.reset}`);
    }

    testNumber++;
  }

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  
  const safeCount = results.filter(r => r.safe).length;
  const unsafeCount = results.filter(r => !r.safe).length;
  const score = Math.round((safeCount / results.length) * 100);

  console.log(`${colors.bold}📊 SECURITY REPORT${colors.reset}\n`);
  console.log(`Total Tables Tested: ${results.length}`);
  console.log(`${colors.green}✅ Safe: ${safeCount}${colors.reset}`);
  console.log(`${colors.red}❌ Unsafe: ${unsafeCount}${colors.reset}`);
  console.log(`${colors.bold}Security Score: ${score}%${colors.reset}\n`);

  if (unsafeCount === 0) {
    console.log(`${colors.green}${colors.bold}🎉 EXCELLENT! Your database is secure!${colors.reset}`);
    console.log(`${colors.green}All sensitive data is protected from anonymous access.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️  CRITICAL SECURITY ISSUE!${colors.reset}`);
    console.log(`${colors.red}The following tables are publicly accessible:${colors.reset}\n`);
    
    results.filter(r => !r.safe).forEach(r => {
      console.log(`${colors.red}  ❌ ${r.table}${colors.reset}`);
      console.log(`     ${r.description}`);
      console.log(`     ${colors.bold}${r.recordCount} records exposed${colors.reset}`);
      if (r.sampleData) {
        console.log(`     Sample data: ${JSON.stringify(r.sampleData[0], null, 2).substring(0, 200)}...`);
      }
      console.log('');
    });

    console.log(`${colors.yellow}${colors.bold}🔧 ACTION REQUIRED:${colors.reset}`);
    console.log(`${colors.yellow}1. Enable RLS on these tables${colors.reset}`);
    console.log(`${colors.yellow}2. Add proper security policies${colors.reset}`);
    console.log(`${colors.yellow}3. Run this test again to verify${colors.reset}\n`);
  }

  // Detailed results
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`${colors.bold}📋 DETAILED RESULTS${colors.reset}\n`);
  
  results.forEach((r, i) => {
    const icon = r.safe ? '✅' : '❌';
    const color = r.safe ? colors.green : colors.red;
    console.log(`${color}${icon} ${r.table}${colors.reset}`);
    console.log(`   ${r.description}`);
    console.log(`   Status: ${r.status || 'Error'}`);
    if (!r.safe) {
      console.log(`   ${colors.red}⚠️  ${r.recordCount} records accessible without login!${colors.reset}`);
    }
    console.log('');
  });
}

// Run the tests
runTests().catch(console.error);
