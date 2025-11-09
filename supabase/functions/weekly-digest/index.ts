import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeeklyDigestData {
  digest_type: string;
  send_to_all_users: boolean;
  user_id?: string;
}

interface PropertyStats {
  total_properties: number;
  new_properties_this_week: number;
  average_price: number;
  price_range: {
    min: number;
    max: number;
  };
  popular_areas: Array<{
    area: string;
    count: number;
  }>;
  property_types: Array<{
    type: string;
    count: number;
  }>;
}

interface UserStats {
  total_users: number;
  new_users_this_week: number;
  active_users: number;
  subscription_breakdown: {
    free: number;
    premium: number;
  };
}

interface WeeklyDigest {
  week_start: string;
  week_end: string;
  property_stats: PropertyStats;
  user_stats: UserStats;
  featured_properties: Array<{
    id: string;
    title: string;
    price: number;
    city: string;
    state: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    square_feet: number;
    images?: string[];
  }>;
  market_insights: {
    price_trend: 'up' | 'down' | 'stable';
    inventory_trend: 'up' | 'down' | 'stable';
    demand_trend: 'up' | 'down' | 'stable';
  };
}

interface UserPreferenceSnapshot {
  email_notifications?: boolean | null;
  new_listings?: boolean | null;
  preferred_areas?: string[] | null;
  property_type_preferences?: string[] | null;
  min_budget?: number | null;
  max_budget?: number | null;
}

function parseBudgetRange(range?: string | null): { min?: number; max?: number } {
  if (!range) return {};

  const cleaned = range.replace(/\s/g, '');
  const parts = cleaned.split(/[-–—]/);

  const parseValue = (value: string): number | undefined => {
    const numeric = parseInt(value.replace(/[^0-9]/g, ''), 10);
    return isNaN(numeric) ? undefined : numeric;
  };

  if (parts.length === 2) {
    return {
      min: parseValue(parts[0]),
      max: parseValue(parts[1])
    };
  }

  const single = parseValue(parts[0]);
  return single ? { min: single } : {};
}

/**
 * Get property statistics for the week
 */
async function getPropertyStats(supabaseClient: any, weekStart: string, weekEnd: string): Promise<PropertyStats> {
  try {
    // Total properties
    const { data: totalProperties, error: totalError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved');

    if (totalError) throw totalError;

    // New properties this week
    const { data: newProperties, error: newError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);

    if (newError) throw newError;

    // Average price and price range
    const { data: priceData, error: priceError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved');

    if (priceError) throw priceError;

    const prices = priceData?.map((p: { price: number }) => p.price).filter((p: number) => p > 0) || [];
    const averagePrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };

    // Popular areas
    const { data: areaData, error: areaError } = await supabaseClient
      .from('property_listings')
      .select('city, state')
      .eq('status', 'approved');

    if (areaError) throw areaError;

    const areaCounts: { [key: string]: number } = {};
    areaData?.forEach((property: { city: string; state: string }) => {
      const area = `${property.city}, ${property.state}`;
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });

    const popularAreas = Object.entries(areaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Property types
    const { data: typeData, error: typeError } = await supabaseClient
      .from('property_listings')
      .select('property_type')
      .eq('status', 'approved');

    if (typeError) throw typeError;

    const typeCounts: { [key: string]: number } = {};
    typeData?.forEach((property: { property_type: string }) => {
      typeCounts[property.property_type] = (typeCounts[property.property_type] || 0) + 1;
    });

    const propertyTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_properties: totalProperties?.length || 0,
      new_properties_this_week: newProperties?.length || 0,
      average_price: Math.round(averagePrice),
      price_range: priceRange,
      popular_areas: popularAreas,
      property_types: propertyTypes
    };
  } catch (error) {
    console.error('Error getting property stats:', error);
    throw error;
  }
}

/**
 * Get user statistics for the week
 */
async function getUserStats(supabaseClient: any, weekStart: string, weekEnd: string): Promise<UserStats> {
  try {
    // Total users
    const { data: totalUsers, error: totalError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' });

    if (totalError) throw totalError;

    // New users this week
    const { data: newUsers, error: newError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);

    if (newError) throw newError;

    // Active users (users who logged in within last 7 days)
    const { data: activeUsers, error: activeError } = await supabaseClient
      .from('profiles')
      .select('id, last_login_at')
      .gte('updated_at', weekStart);

    if (activeError) throw activeError;

    // Subscription breakdown
    const { data: subscriptionData, error: subError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier');

    if (subError) throw subError;

    const subscriptionBreakdown = {
      free: subscriptionData?.filter((p: { subscription_tier: string | null }) => p.subscription_tier === 'free' || !p.subscription_tier).length || 0,
      premium: subscriptionData?.filter((p: { subscription_tier: string }) => p.subscription_tier === 'premium').length || 0
    };

    return {
      total_users: totalUsers?.length || 0,
      new_users_this_week: newUsers?.length || 0,
      active_users: activeUsers?.length || 0,
      subscription_breakdown: subscriptionBreakdown
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Get featured properties for the week - ALL NEW PROPERTIES
 */
async function getFeaturedProperties(supabaseClient: any, weekStart: string, weekEnd: string): Promise<Array<any>> {
  try {
    // Get ALL new properties from this week, not just featured
    const { data: weeklyProperties, error } = await supabaseClient
      .from('property_listings')
      .select(`
        id,
        title,
        price,
        city,
        state,
        property_type,
        bedrooms,
        bathrooms,
        square_feet,
        images,
        created_at
      `)
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Return the full list for the week (limit to 50 to keep payload reasonable)
    return (weeklyProperties || []).slice(0, 50);
  } catch (error) {
    console.error('Error getting weekly properties:', error);
    throw error;
  }
}

/**
 * Generate market insights based on recent data
 */
async function generateMarketInsights(supabaseClient: any, weekStart: string, weekEnd: string): Promise<any> {
  try {
    // Get price data for last 2 weeks to compare
    const twoWeeksAgo = new Date(new Date(weekStart).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    // Current week prices
    const { data: currentPrices, error: currentError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);

    if (currentError) throw currentError;

    // Previous week prices
    const { data: previousPrices, error: previousError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved')
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', weekStart);

    if (previousError) throw previousError;

    const currentAvg = currentPrices?.length > 0 ? 
      currentPrices.reduce((sum: number, p: { price: number }) => sum + p.price, 0) / currentPrices.length : 0;
    const previousAvg = previousPrices?.length > 0 ? 
      previousPrices.reduce((sum: number, p: { price: number }) => sum + p.price, 0) / previousPrices.length : 0;

    const priceTrend = currentAvg > previousAvg * 1.05 ? 'up' : 
                      currentAvg < previousAvg * 0.95 ? 'down' : 'stable';

    // Inventory trend (new properties vs previous week)
    const { data: currentInventory, error: invCurrentError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);

    if (invCurrentError) throw invCurrentError;

    const { data: previousInventory, error: invPreviousError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', weekStart);

    if (invPreviousError) throw invPreviousError;

    const inventoryTrend = (currentInventory?.length || 0) > (previousInventory?.length || 0) * 1.1 ? 'up' :
                          (currentInventory?.length || 0) < (previousInventory?.length || 0) * 0.9 ? 'down' : 'stable';

    // Demand trend (based on user activity)
    const { data: currentActivity, error: actCurrentError } = await supabaseClient
      .from('profiles')
      .select('id')
      .gte('updated_at', weekStart);

    if (actCurrentError) throw actCurrentError;

    const { data: previousActivity, error: actPreviousError } = await supabaseClient
      .from('profiles')
      .select('id')
      .gte('updated_at', twoWeeksAgo)
      .lt('updated_at', weekStart);

    if (actPreviousError) throw actPreviousError;

    const demandTrend = (currentActivity?.length || 0) > (previousActivity?.length || 0) * 1.1 ? 'up' :
                       (currentActivity?.length || 0) < (previousActivity?.length || 0) * 0.9 ? 'down' : 'stable';

    return {
      price_trend: priceTrend,
      inventory_trend: inventoryTrend,
      demand_trend: demandTrend
    };
  } catch (error) {
    console.error('Error generating market insights:', error);
    return {
      price_trend: 'stable',
      inventory_trend: 'stable',
      demand_trend: 'stable'
    };
  }
}

function filterPropertiesForUser(
  properties: Array<WeeklyDigest['featured_properties'][number]>,
  preferences?: UserPreferenceSnapshot | null
): Array<WeeklyDigest['featured_properties'][number]> {
  if (!preferences) {
    return properties.slice(0, 12);
  }

  const minBudget = typeof preferences.min_budget === 'number' ? preferences.min_budget : undefined;
  const maxBudget = typeof preferences.max_budget === 'number' ? preferences.max_budget : undefined;
  const preferredAreas = Array.isArray(preferences.preferred_areas) ? preferences.preferred_areas : [];
  const preferredTypes = Array.isArray(preferences.property_type_preferences) ? preferences.property_type_preferences : [];

  const filtered = properties.filter((property) => {
    const matchesBudget = (
      (minBudget === undefined || property.price >= minBudget) &&
      (maxBudget === undefined || property.price <= maxBudget)
    );

    const matchesArea = preferredAreas.length === 0 || preferredAreas.some((area) => {
      const normalizedArea = area.trim().toLowerCase();
      const propertyArea = `${property.city}, ${property.state}`.toLowerCase();
      return propertyArea.includes(normalizedArea);
    });

    const matchesType = preferredTypes.length === 0 || preferredTypes.includes(property.property_type);

    return matchesBudget && matchesArea && matchesType;
  });

  if (filtered.length > 0) {
    return filtered.slice(0, 12);
  }

  // Fallback: show top properties from the week even if they don't match preferences
  return properties.slice(0, 8);
}

/**
 * Send weekly digest email to users
 */
async function sendWeeklyDigestEmail(
  supabaseClient: any,
  digest: WeeklyDigest,
  userEmail: string,
  userName: string,
  properties: Array<WeeklyDigest['featured_properties'][number]>
): Promise<void> {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Weekly Property Digest - PickFirst</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d3748; background: #f7fafc; }
          .email-wrapper { background: #f7fafc; padding: 40px 20px; }
          .container { max-width: 680px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 50px 40px; text-align: center; }
          .logo { width: 60px; height: 60px; background: #FFCC00; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: #1a1a1a; margin-bottom: 20px; }
          .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
          .header .subtitle { font-size: 16px; opacity: 0.9; }
          .stats-section { padding: 40px; background: linear-gradient(to bottom, #fff 0%, #f8f9fa 100%); }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-top: 20px; }
          .stat-card { background: white; padding: 24px; border-radius: 12px; text-align: center; border: 2px solid #f0f0f0; }
          .stat-number { font-size: 36px; font-weight: 700; color: #FFCC00; display: block; margin-bottom: 8px; }
          .stat-label { font-size: 14px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
          .properties-section { padding: 40px; }
          .section-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1a202c; }
          .property-card { background: white; border-radius: 16px; overflow: hidden; margin-bottom: 32px; border: 1px solid #e2e8f0; }
          .property-image { width: 100%; height: 300px; object-fit: cover; display: block; }
          .property-content { padding: 28px; }
          .property-price { font-size: 28px; font-weight: 700; color: #1a202c; margin-bottom: 12px; }
          .property-address { font-size: 18px; color: #4a5568; margin-bottom: 16px; font-weight: 500; }
          .property-features { display: flex; gap: 20px; margin: 20px 0; padding: 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
          .feature { font-size: 15px; color: #4a5568; }
          .view-button { display: inline-block; background: linear-gradient(135deg, #FFCC00 0%, #FFB800 100%); color: #1a1a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 16px; }
          .insights-section { padding: 40px; background: #f8f9fa; }
          .trend { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .trend-up { background: #dcfce7; color: #166534; }
          .trend-down { background: #fee2e2; color: #991b1b; }
          .trend-stable { background: #f3f4f6; color: #374151; }
          .footer { background: #1a202c; color: white; padding: 40px; text-align: center; }
          .footer-link { color: #FFCC00; text-decoration: none; margin: 0 16px; font-size: 14px; }
          .footer-text { font-size: 13px; color: #a0aec0; margin-top: 20px; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 20px 10px; }
            .header { padding: 40px 24px; }
            .header h1 { font-size: 24px; }
            .properties-section, .stats-section { padding: 24px; }
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .property-features { flex-wrap: wrap; }
            .property-content { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">P</div>
              <h1>Your Weekly Property Digest</h1>
              <p class="subtitle">${digest.week_start} - ${digest.week_end}</p>
            </div>
            
            <div class="stats-section">
              <h2 style="font-size: 20px; margin-bottom: 8px;">Hello ${userName}!</h2>
              <p style="color: #718096;">Here's what's happening in the property market this week</p>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${digest.property_stats.new_properties_this_week}</div>
                <div class="stat-label">New Properties This Week</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">$${digest.property_stats.average_price.toLocaleString()}</div>
                <div class="stat-label">Average Property Price</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${digest.user_stats.new_users_this_week}</div>
                <div class="stat-label">New Users This Week</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${digest.user_stats.active_users}</div>
                <div class="stat-label">Active Users</div>
              </div>
            </div>
            
            </div>
            
            <div class="insights-section">
              <h2 class="section-title">📊 Market Insights</h2>
              <p style="margin-bottom: 12px; font-size: 15px;"><strong>Price Trend:</strong> 
                <span class="trend trend-${digest.market_insights.price_trend}">
                  ${digest.market_insights.price_trend}
                </span>
              </p>
              <p style="margin-bottom: 12px; font-size: 15px;"><strong>Inventory:</strong> 
                <span class="trend trend-${digest.market_insights.inventory_trend}">
                  ${digest.market_insights.inventory_trend}
                </span>
              </p>
              <p style="font-size: 15px;"><strong>Demand:</strong> 
                <span class="trend trend-${digest.market_insights.demand_trend}">
                  ${digest.market_insights.demand_trend}
                </span>
              </p>
            </div>
            
            
            <div class="properties-section">
              <h2 class="section-title">🏠 New Properties This Week</h2>
              ${properties.length > 0 ? properties.map(property => `
                <div class="property-card">
                  ${property.images?.[0] ? `
                    <img src="${property.images[0]}" alt="${property.title}" class="property-image" />
                  ` : ''}
                  <div class="property-content">
                    <div class="property-price">$${property.price.toLocaleString()}</div>
                    <div class="property-address">${property.city}, ${property.state}</div>
                    <div class="property-features">
                      <span class="feature">🛏️ ${property.bedrooms} bed</span>
                      <span class="feature">🛁 ${property.bathrooms} bath</span>
                      <span class="feature">📐 ${property.square_feet.toLocaleString()} sq ft</span>
                    </div>
                    <a href="https://baviiii.github.io/pickfirst-firstlook-signup/property/${property.id}" class="view-button">
                      View Property
                    </a>
                  </div>
                </div>
              `).join('') : '<p style="text-align: center; color: #718096; padding: 40px;">No new properties matched your preferences this week. Check back soon!</p>'}
            </div>
            
            <div class="footer">
              <p style="font-size: 16px; margin-bottom: 16px;">Thank you for using PickFirst! 🏠</p>
              <a href="https://pickfirst.com" class="footer-link">Visit pickfirst.com</a>
              <p class="footer-text">You're receiving this because you signed up for weekly property updates.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Call the send-email Edge Function
    const subject = `🏠 PickFirst Weekly Digest - ${digest.week_start} to ${digest.week_end}`;

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userEmail,
        subject,
        template: 'weeklyDigest',
        data: {
          html: emailHtml,
          subject,
          text: `Your PickFirst weekly digest covering ${digest.week_start} to ${digest.week_end} is ready.`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    console.log(`Weekly digest sent to ${userEmail}`);
  } catch (error) {
    console.error(`Error sending weekly digest to ${userEmail}:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { digest_type, send_to_all_users, user_id } = await req.json() as WeeklyDigestData

    // Calculate week range
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    console.log(`Generating weekly digest for ${weekStartStr} to ${weekEndStr}`)

    // Get all digest data
    const [propertyStats, userStats, featuredProperties, marketInsights] = await Promise.all([
      getPropertyStats(supabaseClient, weekStartStr, weekEndStr),
      getUserStats(supabaseClient, weekStartStr, weekEndStr),
      getFeaturedProperties(supabaseClient, weekStartStr, weekEndStr),
      generateMarketInsights(supabaseClient, weekStartStr, weekEndStr)
    ])

    const digest: WeeklyDigest = {
      week_start: weekStartStr,
      week_end: weekEndStr,
      property_stats: propertyStats,
      user_stats: userStats,
      featured_properties: featuredProperties,
      market_insights: marketInsights
    }

    // Determine who to send to
    let usersToSend: Array<{ id: string; email: string; full_name: string | null }> = []

    if (send_to_all_users) {
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'buyer')
        .not('email', 'is', null)

      if (usersError) throw usersError
      usersToSend = allUsers || []
    } else if (user_id) {
      const { data: user, error: userError } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', user_id)
        .single()

      if (userError) throw userError
      if (user) usersToSend = [user]
    }

    // Send emails
    let emailsSent = 0
    let emailsFailed = 0

    for (const user of usersToSend) {
      try {
        const { data: preferences } = await supabaseClient
          .from('user_preferences')
          .select('email_notifications, new_listings, preferred_areas, property_type_preferences, budget_range')
          .eq('user_id', user.id)
          .maybeSingle()

        const masterOptOut = preferences?.email_notifications === false;
        const digestOptOut = preferences?.new_listings === false;

        if (masterOptOut || digestOptOut) {
          console.log(`Skipping weekly digest for ${user.email} due to notification preferences`)
          continue;
        }

        const { min: minBudget, max: maxBudget } = parseBudgetRange(preferences?.budget_range);

        const preferenceSnapshot: UserPreferenceSnapshot = {
          email_notifications: preferences?.email_notifications,
          new_listings: preferences?.new_listings,
          preferred_areas: preferences?.preferred_areas,
          property_type_preferences: preferences?.property_type_preferences,
          min_budget: minBudget ?? null,
          max_budget: maxBudget ?? null
        };

        const propertiesForUser = filterPropertiesForUser(digest.featured_properties, preferenceSnapshot);

        await sendWeeklyDigestEmail(supabaseClient, digest, user.email, user.full_name || 'User', propertiesForUser)
        emailsSent++
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error)
        emailsFailed++
      }
    }

    // Log the digest generation
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: null,
        table_name: 'weekly_digest',
        action: 'digest_generated',
        new_values: {
          digest_type,
          week_start: weekStartStr,
          week_end: weekEndStr,
          emails_sent: emailsSent,
          emails_failed: emailsFailed,
          total_users: usersToSend.length,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Weekly digest generated successfully',
        digest: {
          week_start: weekStartStr,
          week_end: weekEndStr,
          property_stats: propertyStats,
          user_stats: userStats,
          featured_properties: featuredProperties.length,
          market_insights: marketInsights
        },
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        total_users: usersToSend.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Weekly digest generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
