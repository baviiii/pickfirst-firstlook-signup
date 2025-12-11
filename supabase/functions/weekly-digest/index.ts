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
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #000000; background: #FEF9E7; }
          .email-wrapper { background: linear-gradient(135deg, #FEF9E7 0%, #FEF3C7 50%, #FFFBEB 100%); padding: 24px 16px; }
          .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(234, 179, 8, 0.2); }
          .header { background: linear-gradient(135deg, #EAB308 0%, #F59E0B 100%); color: #000000; padding: 32px 24px; text-align: center; border-bottom: 3px solid #FCD34D; }
          .logo { width: 70px; height: auto; display: block; margin: 0 auto 16px; border-radius: 8px; }
          .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; color: #000000; letter-spacing: -0.5px; }
          .header .subtitle { font-size: 13px; color: #000000; opacity: 0.9; font-weight: 500; }
          .greeting-section { padding: 24px 24px 20px; background: linear-gradient(to bottom, #FFFBEB 0%, #FEF3C7 100%); border-bottom: 1px solid #EAB308; }
          .greeting-section h2 { font-size: 18px; margin-bottom: 8px; color: #000000; font-weight: 700; }
          .greeting-section p { font-size: 13px; color: #000000; line-height: 1.5; }
          .stats-section { padding: 24px; background: #FFFFFF; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
          .stat-card { background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 16px 12px; border-radius: 12px; text-align: center; border: 2px solid #EAB308; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.15); transition: transform 0.2s; }
          .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(234, 179, 8, 0.25); }
          .stat-number { font-size: 22px; font-weight: 800; color: #EAB308; display: block; margin-bottom: 4px; line-height: 1.2; }
          .stat-label { font-size: 10px; color: #000000; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
          .properties-section { padding: 24px; background: #FFFFFF; }
          .section-title { font-size: 18px; font-weight: 800; margin-bottom: 20px; color: #000000; display: flex; align-items: center; gap: 8px; }
          .property-card { background: #FFFFFF; border-radius: 14px; overflow: hidden; margin-bottom: 20px; border: 2px solid #EAB308; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.15); transition: all 0.3s; }
          .property-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(234, 179, 8, 0.25); border-color: #F59E0B; }
          .property-image { width: 100%; height: 180px; object-fit: cover; display: block; }
          .property-content { padding: 18px; }
          .property-price { font-size: 20px; font-weight: 800; color: #EAB308; margin-bottom: 8px; }
          .property-address { font-size: 14px; color: #000000; margin-bottom: 12px; font-weight: 600; }
          .property-features { display: flex; gap: 16px; margin: 12px 0; padding: 12px 0; border-top: 1px solid #FEF3C7; border-bottom: 1px solid #FEF3C7; }
          .feature { font-size: 12px; color: #000000; font-weight: 500; }
          .view-button { display: inline-block; background: linear-gradient(135deg, #EAB308 0%, #F59E0B 100%); color: #000000; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 12px; box-shadow: 0 3px 10px rgba(234, 179, 8, 0.3); transition: all 0.2s; }
          .view-button:hover { box-shadow: 0 5px 15px rgba(234, 179, 8, 0.4); transform: translateY(-1px); }
          .insights-section { padding: 20px 24px; background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%); border-top: 2px solid #EAB308; border-bottom: 2px solid #EAB308; }
          .insights-section h2 { font-size: 16px; font-weight: 800; margin-bottom: 12px; color: #000000; }
          .insight-item { margin-bottom: 10px; font-size: 13px; color: #000000; }
          .insight-item strong { font-weight: 700; }
          .trend { display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px; }
          .trend-up { background: #dcfce7; color: #166534; }
          .trend-down { background: #fee2e2; color: #991b1b; }
          .trend-stable { background: #f3f4f6; color: #000000; }
          .footer { background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); color: #000000; padding: 24px; text-align: center; border-top: 3px solid #EAB308; }
          .footer-links { margin-bottom: 12px; }
          .footer-link { color: #000000; text-decoration: none; margin: 0 16px; font-size: 13px; font-weight: 700; padding: 8px 12px; border-radius: 6px; display: inline-block; transition: background 0.2s; }
          .footer-link:hover { background: rgba(234, 179, 8, 0.2); }
          .footer-text { font-size: 11px; color: #000000; margin-top: 16px; opacity: 0.8; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 16px 12px; }
            .header { padding: 24px 20px; }
            .header h1 { font-size: 20px; }
            .greeting-section, .properties-section, .stats-section { padding: 20px; }
            .stats-grid { grid-template-columns: 1fr; gap: 10px; }
            .stat-card { padding: 14px; }
            .property-image { height: 160px; }
            .property-features { flex-wrap: wrap; gap: 10px; }
            .property-content { padding: 16px; }
            .footer-link { display: block; margin: 6px 0; }
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
              <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; color: #000000;">Your Weekly Property Digest</h2>
              <p class="subtitle" style="font-size: 11px; color: #000000;">${digest.week_start} - ${digest.week_end}</p>
            </div>
            
            <div class="greeting-section">
              <h2>Hello ${userName}! 👋</h2>
              <p>Here's your weekly property market update</p>
            </div>
            
            <div class="stats-section">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-number">${newPropertiesCount}</div>
                  <div class="stat-label">New Properties</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">$${averagePriceDisplay}</div>
                  <div class="stat-label">Avg Price</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">${totalPropertiesCount}</div>
                  <div class="stat-label">Active Listings</div>
                </div>
              </div>
            </div>
            
            <div class="insights-section">
              <h2>📊 Market Insights</h2>
              <div class="insight-item">
                <strong>Price Trend:</strong> 
                <span class="trend trend-${digest.market_insights.price_trend}">
                  ${digest.market_insights.price_trend}
                </span>
              </div>
              <div class="insight-item">
                <strong>New Listings:</strong> 
                <span class="trend trend-${digest.market_insights.inventory_trend}">
                  ${digest.market_insights.inventory_trend}
                </span>
              </div>
            </div>
            
            <div class="properties-section">
              <h2 class="section-title">🏠 <span>New Properties This Week</span></h2>
              ${propertiesHtml}
            </div>
            
            <div class="footer">
              <p style="font-size: 15px; margin-bottom: 16px; color: #000000; font-weight: 700;">Thank you for using PickFirst! 🏠</p>
              <div class="footer-links">
                <a href="https://pickfirst.com.au" class="footer-link">Visit Website</a>
                <a href="https://pickfirst.com.au/browse" class="footer-link">Browse Properties</a>
              </div>
              <p class="footer-text">You're receiving this because you signed up for weekly property updates. You can update your preferences anytime in your account settings.</p>
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
      htmlLength: emailHtml.length,
      subject
    });

    // Validate email before queuing
    if (!userEmail || !userEmail.includes('@')) {
      throw new Error(`Invalid email address: ${userEmail}`);
    }

    const queueData = {
      email: userEmail,
      subject,
      template: 'weeklyDigest',
      payload: {
        html: emailHtml,
        subject,
        text: textContent
      }
    };

    console.log('Attempting to insert into email_queue:', {
      email: queueData.email,
      template: queueData.template,
      subjectLength: queueData.subject.length,
      payloadSize: JSON.stringify(queueData.payload).length
    });

    const { data: insertedData, error: queueError } = await supabaseClient
      .from('email_queue')
      .insert(queueData)
      .select();

    if (queueError) {
      console.error(`Failed to queue weekly digest for ${userEmail}:`, {
        error: queueError,
        message: queueError.message,
        details: queueError.details,
        hint: queueError.hint,
        code: queueError.code
      });
      throw queueError;
    }

    console.log(`✅ Weekly digest queued successfully for ${userEmail}`, {
      insertedId: insertedData?.[0]?.id,
      timestamp: new Date().toISOString()
    });
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
    const daysBack = 6; // 6 days back + today = 7 days total
    // Calculate rolling date window (inclusive of today)
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const weekStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
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
    
    console.log('Request parameters:', { send_to_all_users, user_id, digest_type });
    
    if (send_to_all_users) {
      // Send to all buyers and agents with email addresses (agents can act as buyers too)
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('profiles')
        .select('email, full_name, role, id')
        .in('role', ['buyer', 'agent'])
        .not('email', 'is', null);
      
      if (usersError) {
        console.error('Error fetching all users:', usersError);
        throw usersError;
      }
      usersToSend = allUsers || [];
      console.log(`Found ${usersToSend.length} users to send digest to`);
    } else if (user_id) {
      // Send to specific user
      const { data: user, error: userError } = await supabaseClient
        .from('profiles')
        .select('email, full_name, role, id')
        .eq('id', user_id)
        .single();
      
      if (userError) {
        console.error(`Error fetching user ${user_id}:`, userError);
        throw userError;
      }
      if (user) {
        usersToSend = [user];
        console.log(`Found user to send digest to: ${user.email} (role: ${user.role})`);
      } else {
        console.warn(`User ${user_id} not found`);
      }
    } else {
      console.warn('No recipients specified - need either send_to_all_users=true or user_id');
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