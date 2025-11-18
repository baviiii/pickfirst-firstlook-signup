import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Get property statistics for the week
 * Returns: total properties, new properties this week, average price, price range,
 * popular areas, and property type breakdown
 */
async function getPropertyStats(supabaseClient, weekStart, weekEnd) {
  try {
    // Total approved properties in the system
    const { data: totalProperties, error: totalError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved');
    
    if (totalError) throw totalError;

    // New properties added this week
    const { data: newProperties, error: newError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);
    
    if (newError) throw newError;

    // Get all property prices to calculate average and range
    const { data: priceData, error: priceError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved');
    
    if (priceError) throw priceError;

    const prices = priceData?.map(p => p.price).filter(p => p > 0) || [];
    const averagePrice = prices.length > 0 
      ? prices.reduce((a, b) => a + b, 0) / prices.length 
      : 0;
    
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };

    // Calculate popular areas (top 5 cities with most properties)
    const { data: areaData, error: areaError } = await supabaseClient
      .from('property_listings')
      .select('city, state')
      .eq('status', 'approved');
    
    if (areaError) throw areaError;

    const areaCounts = {};
    areaData?.forEach(property => {
      const area = `${property.city}, ${property.state}`;
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });

    const popularAreas = Object.entries(areaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Property type breakdown (house, apartment, condo, etc.)
    const { data: typeData, error: typeError } = await supabaseClient
      .from('property_listings')
      .select('property_type')
      .eq('status', 'approved');
    
    if (typeError) throw typeError;

    const typeCounts = {};
    typeData?.forEach(property => {
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
 * Returns: total users, new users this week, subscription breakdown
 */
async function getUserStats(supabaseClient, weekStart, weekEnd) {
  try {
    // Total registered users
    const { data: totalUsers, error: totalError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' });
    
    if (totalError) throw totalError;

    // New users who registered this week
    const { data: newUsers, error: newError } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);
    
    if (newError) throw newError;

    // Subscription tier breakdown
    const { data: subscriptionData, error: subError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier');
    
    if (subError) throw subError;

    const subscriptionBreakdown = {
      free: subscriptionData?.filter(p => p.subscription_tier === 'free' || !p.subscription_tier).length || 0,
      premium: subscriptionData?.filter(p => p.subscription_tier === 'premium').length || 0
    };

    return {
      total_users: totalUsers?.length || 0,
      new_users_this_week: newUsers?.length || 0,
      subscription_breakdown: subscriptionBreakdown
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Get all new properties from this week for the digest
 * Returns up to 12 newest properties with full details
 */
async function getFeaturedProperties(supabaseClient, weekStart, weekEnd) {
  try {
    // Get ALL new properties from this week
    const { data: weeklyProperties, error } = await supabaseClient
      .from('property_listings')
      .select(`
        id,
        title,
        price,
        price_display,
        status,
        sold_price,
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

    // Return up to 12 properties for the email
    return (weeklyProperties || []).slice(0, 12);
  } catch (error) {
    console.error('Error getting weekly properties:', error);
    throw error;
  }
}

/**
 * Generate market insights by comparing this week to previous week
 * Analyzes: price trends and inventory trends
 */
async function generateMarketInsights(supabaseClient, weekStart, weekEnd) {
  try {
    // Calculate date for 2 weeks ago to compare previous week
    const twoWeeksAgo = new Date(new Date(weekStart).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Current week average price
    const { data: currentPrices, error: currentError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);
    
    if (currentError) throw currentError;

    // Previous week average price
    const { data: previousPrices, error: previousError } = await supabaseClient
      .from('property_listings')
      .select('price')
      .eq('status', 'approved')
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', weekStart);
    
    if (previousError) throw previousError;

    const currentAvg = currentPrices?.length > 0 
      ? currentPrices.reduce((sum, p) => sum + p.price, 0) / currentPrices.length 
      : 0;
    
    const previousAvg = previousPrices?.length > 0 
      ? previousPrices.reduce((sum, p) => sum + p.price, 0) / previousPrices.length 
      : 0;

    // Determine price trend: up (>5% increase), down (>5% decrease), or stable
    const priceTrend = currentAvg > previousAvg * 1.05 
      ? 'up' 
      : currentAvg < previousAvg * 0.95 
        ? 'down' 
        : 'stable';

    // Current week inventory (number of new listings)
    const { data: currentInventory, error: invCurrentError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', weekStart)
      .lte('created_at', weekEnd);
    
    if (invCurrentError) throw invCurrentError;

    // Previous week inventory
    const { data: previousInventory, error: invPreviousError } = await supabaseClient
      .from('property_listings')
      .select('id', { count: 'exact' })
      .eq('status', 'approved')
      .gte('created_at', twoWeeksAgo)
      .lt('created_at', weekStart);
    
    if (invPreviousError) throw invPreviousError;

    // Determine inventory trend: up (>10% increase), down (>10% decrease), or stable
    const inventoryTrend = (currentInventory?.length || 0) > (previousInventory?.length || 0) * 1.1 
      ? 'up' 
      : (currentInventory?.length || 0) < (previousInventory?.length || 0) * 0.9 
        ? 'down' 
        : 'stable';

    return {
      price_trend: priceTrend,
      inventory_trend: inventoryTrend
    };
  } catch (error) {
    console.error('Error generating market insights:', error);
    return {
      price_trend: 'stable',
      inventory_trend: 'stable'
    };
  }
}

/**
 * Send the weekly digest email to a user
 * Creates a beautifully formatted HTML email with all digest data
 */
async function sendWeeklyDigestEmail(supabaseClient, digest, userEmail, userName) {
  try {
    const formatNumber = (value) => {
      if (typeof value === 'number' && isFinite(value)) {
        return value.toLocaleString();
      }
      if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed.toLocaleString();
        }
      }
      return 'N/A';
    };

    const formatCount = (value) => (typeof value === 'number' && isFinite(value)) ? value : 0;
    const averagePriceDisplay = formatNumber(digest.property_stats?.average_price);
    const newPropertiesCount = formatCount(digest.property_stats?.new_properties_this_week);
    const totalPropertiesCount = formatNumber(digest.property_stats?.total_properties);

    const propertiesHtml = Array.isArray(digest.featured_properties) && digest.featured_properties.length > 0
      ? digest.featured_properties.map((property) => {
          const isSold = property.status === 'sold' && property.sold_price && Number(property.sold_price) > 0;
          let priceDisplay = 'Contact Agent';

          if (isSold) {
            const soldFormatted = formatNumber(property.sold_price);
            priceDisplay = soldFormatted !== 'N/A' ? `Sold: $${soldFormatted}` : 'Sold';
          } else if (typeof property.price_display === 'string' && property.price_display.trim().length > 0) {
            priceDisplay = property.price_display.trim();
          } else if (property.price && Number(property.price) > 0) {
            const formatted = formatNumber(property.price);
            priceDisplay = formatted !== 'N/A' ? `$${formatted}` : 'Contact Agent';
          }

          const bedsDisplay = property.bedrooms ?? 'N/A';
          const bathsDisplay = property.bathrooms ?? 'N/A';
          const areaDisplay = formatNumber(property.square_feet);
          const imageHtml = property.images?.[0]
            ? `<img src="${property.images[0]}" alt="${property.title || 'Property'}" class="property-image" />`
            : '';

          return `
            <div class="property-card">
              ${imageHtml}
              <div class="property-content">
                <div class="property-price">${priceDisplay}</div>
                <div class="property-address">${property.city || ''}${property.state ? `, ${property.state}` : ''}</div>
                <div class="property-features">
                  <span class="feature">🛏️ ${bedsDisplay} bed</span>
                  <span class="feature">🛁 ${bathsDisplay} bath</span>
                  <span class="feature">📐 ${areaDisplay} sq ft</span>
                </div>                <a href="${Deno.env.get('SITE_URL') || 'https://pickfirst.com.au'}/property/${property.id}" class="view-button">

                  View Property
                </a>
              </div>
            </div>
          `;
        }).join('')
      : '<p style="text-align: center; color: #718096; padding: 40px;">No new properties this week. Check back soon!</p>';

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
          .logo { width: 160px; height: auto; display: block; margin: 0 auto 20px; }
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
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="https://pickfirst.com.au/logo.jpg" alt="PickFirst" style="max-width: 80px; height: auto; max-height: 50px; border-radius: 6px; display: block; vertical-align: middle;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; line-height: 1.2; vertical-align: middle; color: white;">PickFirst</h1>
                  </td>
                </tr>
              </table>
              <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">Your Weekly Property Digest</h2>
              <p class="subtitle">${digest.week_start} - ${digest.week_end}</p>
            </div>
            
            <div class="stats-section">
              <h2 style="font-size: 20px; margin-bottom: 8px;">Hello ${userName}!</h2>
              <p style="color: #718096;">Here's what's happening in the property market this week</p>
            
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-number">${newPropertiesCount}</div>
                  <div class="stat-label">New Properties This Week</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">$${averagePriceDisplay}</div>
                  <div class="stat-label">Average Property Price</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalPropertiesCount}</div>
                  <div class="stat-label">Total Active Listings</div>
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
              <p style="font-size: 15px;"><strong>New Listings:</strong> 
                <span class="trend trend-${digest.market_insights.inventory_trend}">
                  ${digest.market_insights.inventory_trend}
                </span>
              </p>
            </div>
            
            <div class="properties-section">
              <h2 class="section-title">🏠 New Properties This Week</h2>
              ${propertiesHtml}
            </div>
            
            <div class="footer">
              <p style="font-size: 16px; margin-bottom: 16px;">Thank you for using PickFirst! 🏠</p>
              <a href="https://pickfirst.com.au" class="footer-link">Visit pickfirst.com.au</a>
              <p class="footer-text">You're receiving this because you signed up for weekly property updates.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `🏠 PickFirst Weekly Digest - ${digest.week_start} to ${digest.week_end}`;
    const textContent = `Your weekly PickFirst digest covering ${digest.week_start} to ${digest.week_end}.`;

    console.log('Preparing weekly digest email', {
      userEmail,
      propertyCount: digest.featured_properties.length,
      htmlLength: emailHtml.length
    });

    const { error: queueError } = await supabaseClient
      .from('email_queue')
      .insert({
        email: userEmail,
        subject,
        template: 'weeklyDigest',
        payload: {
          html: emailHtml,
          subject,
          text: textContent
        }
      });

    if (queueError) {
      console.error(`Failed to queue weekly digest for ${userEmail}:`, queueError);
      throw queueError;
    }

    console.log(`Weekly digest queued for ${userEmail}`);
  } catch (error) {
    console.error(`Error sending weekly digest to ${userEmail}:`, error);
    throw error;
  }
}

/**
 * MAIN HANDLER
 * This is the entry point for the Edge Function
 * Generates and sends weekly property digest emails
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key (admin access)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { digest_type, send_to_all_users, user_id } = await req.json();

    // Calculate rolling 7-day window (inclusive of today)
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const weekStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();
    const weekStartStr = weekStartISO.split('T')[0];
    const weekEndStr = weekEndISO.split('T')[0];

    console.log(`Generating weekly digest for ${weekStartStr} to ${weekEndStr}`);

    // Fetch all digest data in parallel for efficiency
    const [propertyStats, userStats, featuredProperties, marketInsights] = await Promise.all([
      getPropertyStats(supabaseClient, weekStartISO, weekEndISO),
      getUserStats(supabaseClient, weekStartISO, weekEndISO),
      getFeaturedProperties(supabaseClient, weekStartISO, weekEndISO),
      generateMarketInsights(supabaseClient, weekStartISO, weekEndISO)
    ]);

    // Compile digest data
    const digest = {
      week_start: weekStartStr,
      week_end: weekEndStr,
      property_stats: propertyStats,
      user_stats: userStats,
      featured_properties: featuredProperties,
      market_insights: marketInsights
    };

    // Determine recipient list
    let usersToSend = [];
    
    if (send_to_all_users) {
      // Send to all buyers with email addresses
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'buyer')
        .not('email', 'is', null);
      
      if (usersError) throw usersError;
      usersToSend = allUsers || [];
    } else if (user_id) {
      // Send to specific user
      const { data: user, error: userError } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', user_id)
        .single();
      
      if (userError) throw userError;
      if (user) usersToSend = [user];
    }

    // Send emails to all recipients
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const user of usersToSend) {
      try {
        await sendWeeklyDigestEmail(
          supabaseClient,
          digest,
          user.email,
          user.full_name || 'User'
        );
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error);
        emailsFailed++;
      }
    }

    // Log digest generation for audit trail
    await supabaseClient.from('audit_logs').insert({
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
    });

    // Return success response
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
    );
  } catch (error) {
    console.error('Weekly digest generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});