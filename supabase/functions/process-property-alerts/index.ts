import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'accept',
    'accept-profile',
    'content-profile',
    'range',
    'prefer'
  ].join(', '),
}

interface AlertJob {
  id: string;
  property_id: string;
  created_at: string;
  alert_type: 'on_market' | 'off_market';
}

interface PropertyListing {
  id: string;
  title: string;
  price: number;
  city: string;
  state: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  status: string;
  listing_source: string;
}

interface BuyerPreferences {
  user_id: string;
  property_alerts: boolean;
  email_notifications: boolean;
  budget_range?: string;
  preferred_areas?: string[];
  property_type_preferences?: string[];
}

interface BuyerProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  subscription_tier: string;
}

interface AlertMatch {
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  property: PropertyListing;
  matchScore: number;
  matchedCriteria: string[];
}

/**
 * Check if a user has access to property alerts feature
 * @param alertType - 'on_market' or 'off_market'
 */
async function checkPropertyAlertsAccess(
  supabaseClient: any, 
  userId: string, 
  alertType: 'on_market' | 'off_market'
): Promise<boolean> {
  try {
    // Get user's subscription status first
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return false;
    }

    const subscriptionTier = profile.subscription_tier || 'free';
    console.log(`Access check for user ${userId}: tier=${subscriptionTier}, alertType=${alertType}`);
    
    // SIMPLIFIED LOGIC:
    // - Regular property alerts: ALL USERS (free and premium)
    // - Off-market alerts: PREMIUM ONLY
    
    if (alertType === 'off_market') {
      // Off-market alerts require premium subscription
      const hasAccess = subscriptionTier === 'premium';
      console.log(`Off-market alert access: ${hasAccess} (requires premium, user has ${subscriptionTier})`);
      return hasAccess;
    }
    
    if (alertType === 'on_market') {
      // Regular property alerts: available to ALL users
      console.log(`On-market alert access: true (available to all users)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkPropertyAlertsAccess:', error);
    return false;
  }
}

/**
 * Log feature access attempt for audit purposes
 */
async function logFeatureAccessAttempt(
  supabaseClient: any,
  userId: string, 
  action: string, 
  allowed: boolean, 
  details?: any
): Promise<void> {
  try {
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        table_name: 'property_alerts',
        action: `feature_access_${action}`,
        new_values: {
          allowed,
          feature: 'property_alerts',
          details,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging feature access attempt:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending alert jobs
    const { data: pendingJobs, error: jobsError } = await supabaseClient
      .rpc('get_pending_alert_jobs', { limit_count: 10 })

    if (jobsError) {
      console.error('Error fetching pending jobs:', jobsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending jobs' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending alert jobs',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let totalProcessed = 0;
    let totalMatches = 0;
    let totalAlertsSent = 0;
    let accessDeniedCount = 0;

    // Process each job
    for (const job of pendingJobs as AlertJob[]) {
      try {
        // Mark job as processing
        const { error: markError } = await supabaseClient
          .rpc('mark_alert_job_processing', { job_id: job.id })

        if (markError) {
          console.error(`Error marking job ${job.id} as processing:`, markError)
          continue
        }

        // Get the property
        const { data: property, error: propertyError } = await supabaseClient
          .from('property_listings')
          .select('*')
          .eq('id', job.property_id)
          .eq('status', 'approved')
          .single()

        if (propertyError || !property) {
          await supabaseClient
            .rpc('mark_alert_job_completed', { 
              job_id: job.id, 
              error_msg: 'Property not found or not approved' 
            })
          continue
        }

        // Find buyers with property alerts enabled - FIXED QUERY
        const { data: buyersWithAlerts, error: buyersError } = await supabaseClient
          .from('user_preferences')
          .select(`
            user_id,
            property_alerts,
            email_notifications,
            budget_range,
            preferred_areas,
            property_type_preferences,
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
          .filter('profiles.role', 'eq', 'buyer');

        if (buyersError || !buyersWithAlerts) {
          await supabaseClient
            .rpc('mark_alert_job_completed', { 
              job_id: job.id, 
              error_msg: 'Failed to fetch buyers with alerts' 
            })
          continue
        }

        const matches: AlertMatch[] = []

        // Check each buyer's preferences against the property
        for (const buyerPref of buyersWithAlerts) {
          const buyerId = buyerPref.user_id
          const profiles = buyerPref.profiles as any
          const buyerEmail = profiles.email
          const buyerName = profiles.full_name || 'User'

          console.log(`Checking buyer ${buyerId} (${buyerEmail}) with subscription: ${profiles.subscription_tier}`);

          // SECURITY: Check if buyer has access to this alert type
          const hasAccess = await checkPropertyAlertsAccess(supabaseClient, buyerId, job.alert_type);
          console.log(`Access check result for buyer ${buyerId}: ${hasAccess}`);
          
          if (!hasAccess) {
            accessDeniedCount++;
            console.log(`Access denied for buyer ${buyerId}: ${job.alert_type} alerts not available for ${profiles.subscription_tier} tier`);
            await logFeatureAccessAttempt(supabaseClient, buyerId, 'edge_function_processing', false, {
              property_id: job.property_id,
              alert_type: job.alert_type,
              reason: job.alert_type === 'off_market' 
                ? 'off_market_requires_premium' 
                : 'insufficient_subscription_tier'
            });
            continue; // Skip users without proper subscription
          }

          // Log successful feature access
          await logFeatureAccessAttempt(supabaseClient, buyerId, 'edge_function_processing', true, {
            property_id: job.property_id,
            alert_type: job.alert_type
          });

          // Check if property matches buyer preferences
          const matchResult = checkPropertyMatch(property as PropertyListing, buyerPref as BuyerPreferences)
          
          if (matchResult.isMatch) {
            matches.push({
              buyerId,
              buyerEmail,
              buyerName,
              property: property as PropertyListing,
              matchScore: matchResult.score,
              matchedCriteria: matchResult.matchedCriteria
            })
          }
        }

        // Send alerts to matching buyers
        let alertsSent = 0
        for (const match of matches) {
          try {
            await sendPropertyAlert(supabaseClient, match, job.alert_type)
            await createAlertRecord(supabaseClient, match.buyerId, property.id, 'sent', job.alert_type)
            alertsSent++
          } catch (error) {
            console.error(`Failed to send alert to buyer ${match.buyerId}:`, error)
            await createAlertRecord(supabaseClient, match.buyerId, property.id, 'failed', job.alert_type)
          }
        }

        // Log processing with access control metrics
        await logAlertProcessing(supabaseClient, job.property_id, matches.length, alertsSent, accessDeniedCount);

        // Mark job as completed
        await supabaseClient
          .rpc('mark_alert_job_completed', { job_id: job.id })

        totalProcessed++
        totalMatches += matches.length
        totalAlertsSent += alertsSent

        console.log(`Processed job ${job.id}: ${matches.length} matches, ${alertsSent} alerts sent, ${accessDeniedCount} access denied`)

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await supabaseClient
          .rpc('mark_alert_job_completed', { 
            job_id: job.id, 
            error_msg: errorMessage 
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Property alerts processed successfully',
        processed: totalProcessed,
        matches: totalMatches,
        alertsSent: totalAlertsSent,
        accessDenied: accessDeniedCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Property alert processing error:', error)
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

function checkPropertyMatch(
  property: PropertyListing, 
  preferences: BuyerPreferences
): { isMatch: boolean; score: number; matchedCriteria: string[] } {
  const matchedCriteria: string[] = []
  let matches = 0
  let totalCriteria = 0

  // Parse price from price_display or price field (handles ranges, text, etc.)
  const parsePropertyPrice = (prop: PropertyListing): { min: number | null; max: number | null } => {
    const parseNumericPrice = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined) return null
      if (typeof value === 'number') return isFinite(value) && value > 0 ? value : null
      const cleaned = value.toString().replace(/[,$\s]/g, '').toLowerCase()
      if (cleaned.includes('k')) {
        const num = parseFloat(cleaned.replace('k', ''))
        return isNaN(num) ? null : num * 1000
      }
      if (cleaned.includes('m')) {
        const num = parseFloat(cleaned.replace('m', ''))
        return isNaN(num) ? null : num * 1000000
      }
      const num = parseFloat(cleaned)
      return isNaN(num) ? null : num
    }
    
    const priceDisplay = typeof (prop as any).price_display === 'string' ? (prop as any).price_display.trim() : ''
    if (priceDisplay) {
      const rangeMatch = priceDisplay.match(/^[\$]?\s*([\d,k.m]+)\s*[-–—]\s*[\$]?\s*([\d,k.m]+)/i)
      if (rangeMatch) {
        return {
          min: parseNumericPrice(rangeMatch[1]),
          max: parseNumericPrice(rangeMatch[2])
        }
      }
      const singlePrice = parseNumericPrice(priceDisplay)
      if (singlePrice !== null) {
        return { min: singlePrice, max: singlePrice }
      }
    }
    
    const price = parseNumericPrice(prop.price)
    return price !== null ? { min: price, max: price } : { min: null, max: null }
  }

  // Convert budget_range to min_budget and max_budget (same as BuyerProfileService)
  let minBudget = 0
  let maxBudget = 10000000
  
  if (preferences.budget_range) {
    const [minStr, maxStr] = preferences.budget_range.split('-')
    minBudget = parseInt(minStr) || 0
    maxBudget = parseInt(maxStr) || 10000000
  }

  // Extract bedrooms and bathrooms from preferred_areas (same as BuyerProfileService)
  let preferredBedrooms = null // Default: any number of bedrooms
  let preferredBathrooms = null // Default: any number of bathrooms
  let locationAreas: string[] = []
  
  if (preferences.preferred_areas) {
    const bedroomPref = preferences.preferred_areas.find(area => area.startsWith('bedrooms:'))
    const bathroomPref = preferences.preferred_areas.find(area => area.startsWith('bathrooms:'))
    
    preferredBedrooms = bedroomPref ? parseInt(bedroomPref.split(':')[1]) : null
    preferredBathrooms = bathroomPref ? parseInt(bathroomPref.split(':')[1]) : null
    
    // Filter out bedroom/bathroom preferences from areas
    locationAreas = preferences.preferred_areas.filter(area => 
      !area.startsWith('bedrooms:') && !area.startsWith('bathrooms:')
    )
  }

  // Price matching - handle text prices, ranges, etc.
  totalCriteria++
  const propertyPrice = parsePropertyPrice(property)
  
  // Check if property price range overlaps with budget range
  let priceMatch = false
  if (propertyPrice.min !== null && propertyPrice.max !== null) {
    // Property has a price range
    priceMatch = (propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget) ||
                (propertyPrice.max >= minBudget && propertyPrice.max <= maxBudget) ||
                (propertyPrice.min <= minBudget && propertyPrice.max >= maxBudget)
  } else if (propertyPrice.min !== null) {
    // Single price
    priceMatch = propertyPrice.min >= minBudget && propertyPrice.min <= maxBudget
  } else {
    // No price (Contact Agent, etc.) - always include
    priceMatch = true
  }
  
  if (priceMatch) {
    matchedCriteria.push('Price Range')
    matches++
  }

  // Bedrooms matching (EXACT same logic as buyer dashboard)
  if (preferredBedrooms) {
    totalCriteria++
    if (property.bedrooms && property.bedrooms >= preferredBedrooms) {
      matchedCriteria.push('Bedrooms')
      matches++
    }
  }

  // Bathrooms matching (EXACT same logic as buyer dashboard)
  if (preferredBathrooms) {
    totalCriteria++
    if (property.bathrooms && property.bathrooms >= preferredBathrooms) {
      matchedCriteria.push('Bathrooms')
      matches++
    }
  }

  // Location matching (EXACT same logic as buyer dashboard)
  if (locationAreas && locationAreas.length > 0) {
    totalCriteria++
    const propertyLocation = `${property.city}, ${property.state}`.toLowerCase()
    const hasLocationMatch = locationAreas.some((area: string) => 
      propertyLocation.includes(area.toLowerCase()) || 
      property.city.toLowerCase().includes(area.toLowerCase())
    )
    
    if (hasLocationMatch) {
      matchedCriteria.push('Preferred Area')
      matches++
    }
  }

  // Property type matching (EXACT same logic as buyer dashboard)
  if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
    totalCriteria++
    if (preferences.property_type_preferences.includes(property.property_type)) {
      matchedCriteria.push('Property Type')
      matches++
    }
  }

  // Calculate score (EXACT same logic as buyer dashboard)
  const score = totalCriteria > 0 ? matches / totalCriteria : 0
  
  // Use same threshold as buyer dashboard (typically 40%+ match)
  const isMatch = score >= 0.4

  return {
    isMatch,
    score,
    matchedCriteria
  }
}

async function sendPropertyAlert(
  supabaseClient: any, 
  match: AlertMatch, 
  alertType: 'on_market' | 'off_market'
): Promise<void> {
  const propertyUrl = `https://pickfirst.com.au/property/${match.property.id}`
  
  // Get property images and features
  const { data: propertyWithDetails } = await supabaseClient
    .from('property_listings')
    .select('images, features')
    .eq('id', match.property.id)
    .single();
  
  const propertyImage = propertyWithDetails?.images?.[0] || null;
  
  // Extract matching features from matchedCriteria
  const matchingFeatures = match.matchedCriteria
    .filter(c => c.startsWith('feature_'))
    .map(c => c.replace('feature_', '').replace(/_/g, ' '))
    .map(f => f.charAt(0).toUpperCase() + f.slice(1));
  
  // Choose template and subject based on alert type
  const template = alertType === 'off_market' ? 'offMarketPropertyAlert' : 'propertyAlert';
  const subject = alertType === 'off_market' 
    ? `🔐 Exclusive Off-Market Property: ${match.property.title}`
    : `🏠 New Property Alert: ${match.property.title}`;
  
  await supabaseClient.functions.invoke('send-email', {
    body: {
      to: match.buyerEmail,
      template,
      data: {
        name: match.buyerName,
        propertyTitle: match.property.title,
        price: parseFloat(match.property.price.toString()),
        location: `${match.property.city}, ${match.property.state}`,
        propertyType: match.property.property_type,
        bedrooms: match.property.bedrooms || 0,
        bathrooms: match.property.bathrooms || 0,
        image: propertyImage,
        matchingFeatures: matchingFeatures.length > 0 ? matchingFeatures : null,
        propertyUrl,
        isOffMarket: alertType === 'off_market'
      },
      subject
    }
  })
}

async function createAlertRecord(
  supabaseClient: any,
  buyerId: string, 
  propertyId: string, 
  status: 'sent' | 'delivered' | 'failed',
  alertType: 'on_market' | 'off_market'
): Promise<void> {
  try {
    const template = alertType === 'off_market' ? 'offMarketPropertyAlert' : 'propertyAlert';
    
    const { data, error } = await supabaseClient
      .from('property_alerts')
      .insert({
        buyer_id: buyerId,
        property_id: propertyId,
        status,
        alert_type: alertType,
        email_template: template,
        sent_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error(`Error creating alert record for buyer ${buyerId}, property ${propertyId}:`, error);
      throw error;
    }
    
    console.log(`✅ Alert record created: buyer ${buyerId}, property ${propertyId}, status ${status}`);
  } catch (error) {
    console.error(`Failed to create alert record:`, error);
    // Don't throw - we don't want to fail the entire alert process if record creation fails
  }
}

/**
 * Log alert processing activity with access control metrics
 */
async function logAlertProcessing(
  supabaseClient: any,
  propertyId: string, 
  matchesFound: number, 
  alertsSent: number,
  accessDeniedCount: number = 0
): Promise<void> {
  try {
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: 'system',
        table_name: 'property_alerts',
        action: 'edge_function_process_property',
        new_values: {
          property_id: propertyId,
          matches_found: matchesFound,
          alerts_sent: alertsSent,
          access_denied_count: accessDeniedCount,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging alert processing:', error);
  }
}