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
  }>;
  market_insights: {
    price_trend: 'up' | 'down' | 'stable';
    inventory_trend: 'up' | 'down' | 'stable';
    demand_trend: 'up' | 'down' | 'stable';
  };
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
      .select('id', { count: 'exact' })
      .gte('last_sign_in_at', weekStart);

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
 * Get featured properties for the week
 */
async function getFeaturedProperties(supabaseClient: any): Promise<Array<any>> {
  try {
    const { data: featuredProperties, error } = await supabaseClient
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
        images
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;

    return featuredProperties || [];
  } catch (error) {
    console.error('Error getting featured properties:', error);
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
      .select('id', { count: 'exact' })
      .gte('last_sign_in_at', weekStart);

    if (actCurrentError) throw actCurrentError;

    const { data: previousActivity, error: actPreviousError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('last_sign_in_at', twoWeeksAgo)
      .lt('last_sign_in_at', weekStart);

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

/**
 * Send weekly digest email to users
 */
async function sendWeeklyDigestEmail(supabaseClient: any, digest: WeeklyDigest, userEmail: string, userName: string): Promise<void> {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Property Digest - PickFirst</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
          .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-number { font-size: 2em; font-weight: bold; color: #f59e0b; }
          .stat-label { color: #6b7280; font-size: 0.9em; }
          .featured-properties { margin: 30px 0; }
          .property-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .property-title { font-weight: bold; color: #1f2937; margin-bottom: 10px; }
          .property-details { color: #6b7280; font-size: 0.9em; }
          .market-insights { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .trend { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
          .trend-up { background: #dcfce7; color: #166534; }
          .trend-down { background: #fee2e2; color: #991b1b; }
          .trend-stable { background: #f3f4f6; color: #374151; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 PickFirst Weekly Digest</h1>
            <p>${digest.week_start} - ${digest.week_end}</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Here's what's happening in the property market this week:</p>
            
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
            
            <div class="market-insights">
              <h3>📊 Market Insights</h3>
              <p><strong>Price Trend:</strong> 
                <span class="trend trend-${digest.market_insights.price_trend}">
                  ${digest.market_insights.price_trend.toUpperCase()}
                </span>
              </p>
              <p><strong>Inventory Trend:</strong> 
                <span class="trend trend-${digest.market_insights.inventory_trend}">
                  ${digest.market_insights.inventory_trend.toUpperCase()}
                </span>
              </p>
              <p><strong>Demand Trend:</strong> 
                <span class="trend trend-${digest.market_insights.demand_trend}">
                  ${digest.market_insights.demand_trend.toUpperCase()}
                </span>
              </p>
            </div>
            
            <div class="featured-properties">
              <h3>⭐ Featured Properties This Week</h3>
              ${digest.featured_properties.map(property => `
                <div class="property-card" style="background: white; padding: 0; margin: 15px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  ${property.images?.[0] ? `
                    <div style="position: relative; width: 100%; height: 0; padding-bottom: 60%; overflow: hidden; background: #f0f0f0;">
                      <img src="${property.images[0]}" alt="${property.title}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                  ` : ''}
                  <div style="padding: 20px;">
                    <div class="property-title" style="font-weight: bold; color: #1f2937; margin-bottom: 10px; font-size: 18px;">${property.title}</div>
                    <div class="property-details" style="color: #6b7280; font-size: 0.9em; line-height: 1.6;">
                      📍 ${property.city}, ${property.state}<br/>
                      💰 $${property.price.toLocaleString()}<br/>
                      🏠 ${property.bedrooms} bed • ${property.bathrooms} bath • ${property.square_feet} sq ft
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="footer">
              <p>Thank you for using PickFirst! 🏠</p>
              <p>Visit <a href="https://pickfirst.com">pickfirst.com</a> to browse more properties.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Call the send-email Edge Function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userEmail,
        subject: `🏠 PickFirst Weekly Digest - ${digest.week_start} to ${digest.week_end}`,
        html: emailHtml,
        template: 'weeklyDigest'
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
      getFeaturedProperties(supabaseClient),
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
    let usersToSend: Array<{ email: string; full_name: string }> = []

    if (send_to_all_users) {
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'buyer')
        .not('email', 'is', null)

      if (usersError) throw usersError
      usersToSend = allUsers || []
    } else if (user_id) {
      const { data: user, error: userError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
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
        await sendWeeklyDigestEmail(supabaseClient, digest, user.email, user.full_name || 'User')
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
