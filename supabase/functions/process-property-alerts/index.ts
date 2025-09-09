import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AlertJob {
  id: string;
  property_id: string;
  created_at: string;
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
}

interface BuyerPreferences {
  user_id: string;
  property_alerts: boolean;
  email_notifications: boolean;
  min_budget?: number;
  max_budget?: number;
  preferred_bedrooms?: number;
  preferred_bathrooms?: number;
  preferred_areas?: string[];
  property_type_preferences?: string[];
  preferred_square_feet_min?: number;
  preferred_square_feet_max?: number;
}

interface BuyerProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AlertMatch {
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  property: PropertyListing;
  matchScore: number;
  matchedCriteria: string[];
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

        // Find buyers with property alerts enabled
        const { data: buyersWithAlerts, error: buyersError } = await supabaseClient
          .from('user_preferences')
          .select(`
            user_id,
            property_alerts,
            email_notifications,
            min_budget,
            max_budget,
            preferred_bedrooms,
            preferred_bathrooms,
            preferred_areas,
            property_type_preferences,
            preferred_square_feet_min,
            preferred_square_feet_max,
            profiles!inner (
              id,
              email,
              full_name,
              role
            )
          `)
          .eq('property_alerts', true)
          .eq('email_notifications', true)
          .eq('profiles.role', 'buyer')

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
          const buyerEmail = buyerPref.profiles.email
          const buyerName = buyerPref.profiles.full_name || 'User'

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
            await sendPropertyAlert(supabaseClient, match)
            await createAlertRecord(supabaseClient, match.buyerId, property.id, 'sent')
            alertsSent++
          } catch (error) {
            console.error(`Failed to send alert to buyer ${match.buyerId}:`, error)
            await createAlertRecord(supabaseClient, match.buyerId, property.id, 'failed')
          }
        }

        // Mark job as completed
        await supabaseClient
          .rpc('mark_alert_job_completed', { job_id: job.id })

        totalProcessed++
        totalMatches += matches.length
        totalAlertsSent += alertsSent

        console.log(`Processed job ${job.id}: ${matches.length} matches, ${alertsSent} alerts sent`)

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        await supabaseClient
          .rpc('mark_alert_job_completed', { 
            job_id: job.id, 
            error_msg: error.message 
          })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Property alerts processed successfully',
        processed: totalProcessed,
        matches: totalMatches,
        alertsSent: totalAlertsSent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Property alert processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
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
  let score = 0
  let totalCriteria = 0

  // Price range matching
  if (preferences.min_budget || preferences.max_budget) {
    totalCriteria++
    const price = parseFloat(property.price.toString())
    
    if (preferences.min_budget && price >= preferences.min_budget) {
      matchedCriteria.push('price_min')
      score += 0.3
    }
    
    if (preferences.max_budget && price <= preferences.max_budget) {
      matchedCriteria.push('price_max')
      score += 0.3
    }
  }

  // Bedrooms matching
  if (preferences.preferred_bedrooms && property.bedrooms) {
    totalCriteria++
    if (property.bedrooms >= preferences.preferred_bedrooms) {
      matchedCriteria.push('bedrooms')
      score += 0.2
    }
  }

  // Bathrooms matching
  if (preferences.preferred_bathrooms && property.bathrooms) {
    totalCriteria++
    if (property.bathrooms >= preferences.preferred_bathrooms) {
      matchedCriteria.push('bathrooms')
      score += 0.2
    }
  }

  // Location matching
  if (preferences.preferred_areas && preferences.preferred_areas.length > 0) {
    totalCriteria++
    const propertyLocation = `${property.city}, ${property.state}`.toLowerCase()
    const isLocationMatch = preferences.preferred_areas.some(area => 
      propertyLocation.includes(area.toLowerCase()) || 
      property.city.toLowerCase().includes(area.toLowerCase())
    )
    
    if (isLocationMatch) {
      matchedCriteria.push('location')
      score += 0.3
    }
  }

  // Property type matching
  if (preferences.property_type_preferences && preferences.property_type_preferences.length > 0) {
    totalCriteria++
    if (preferences.property_type_preferences.includes(property.property_type)) {
      matchedCriteria.push('property_type')
      score += 0.2
    }
  }

  // Square footage matching
  if (preferences.preferred_square_feet_min && property.square_feet) {
    totalCriteria++
    if (property.square_feet >= preferences.preferred_square_feet_min) {
      matchedCriteria.push('square_feet_min')
      score += 0.1
    }
  }

  if (preferences.preferred_square_feet_max && property.square_feet) {
    totalCriteria++
    if (property.square_feet <= preferences.preferred_square_feet_max) {
      matchedCriteria.push('square_feet_max')
      score += 0.1
    }
  }

  // Consider it a match if it meets at least 60% of the criteria or has a high score
  const isMatch = totalCriteria === 0 || score >= 0.6 || (matchedCriteria.length >= 2 && score >= 0.4)

  return {
    isMatch,
    score: totalCriteria > 0 ? score / totalCriteria : 0,
    matchedCriteria
  }
}

async function sendPropertyAlert(supabaseClient: any, match: AlertMatch): Promise<void> {
  const propertyUrl = `https://baviiii.github.io/pickfirst-firstlook-signup/property/${match.property.id}`
  
  await supabaseClient.functions.invoke('send-email', {
    body: {
      to: match.buyerEmail,
      template: 'propertyAlert',
      data: {
        name: match.buyerName,
        propertyTitle: match.property.title,
        price: parseFloat(match.property.price.toString()),
        location: `${match.property.city}, ${match.property.state}`,
        propertyType: match.property.property_type,
        bedrooms: match.property.bedrooms || 0,
        bathrooms: match.property.bathrooms || 0,
        propertyUrl
      }
    }
  })
}

async function createAlertRecord(
  supabaseClient: any,
  buyerId: string, 
  propertyId: string, 
  status: 'sent' | 'delivered' | 'failed'
): Promise<void> {
  await supabaseClient
    .from('property_alerts')
    .insert({
      buyer_id: buyerId,
      property_id: propertyId,
      status,
      email_template: 'propertyAlert',
      sent_at: new Date().toISOString()
    })
}
