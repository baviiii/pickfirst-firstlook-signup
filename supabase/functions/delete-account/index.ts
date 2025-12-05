import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const userId = user.id

    console.log(`[delete-account] Starting account deletion for user: ${userId}`)

    // Step 1: Delete all user data from database tables (in order to respect foreign keys)
    // Note: Most will cascade delete when profile is deleted, but we'll be explicit for important ones
    
    // Delete user preferences
    await serviceClient.from('user_preferences').delete().eq('user_id', userId)
    
    // Delete buyer preferences
    await serviceClient.from('buyer_preferences').delete().eq('buyer_id', userId)
    
    // Delete saved searches
    await serviceClient.from('saved_searches').delete().eq('user_id', userId)
    
    // Delete email queue entries for this user (using email column, not recipient_email)
    if (user.email) {
      await serviceClient.from('email_queue').delete().ilike('email', user.email)
    }
    
    // Delete property alerts
    await serviceClient.from('property_alerts').delete().eq('buyer_id', userId)
    
    // Delete property alert jobs related to this user
    await serviceClient.from('property_alert_jobs').delete().eq('buyer_id', userId)
    
    // Delete notifications
    await serviceClient.from('notifications').delete().eq('user_id', userId)
    
    // Delete login history
    await serviceClient.from('login_history').delete().eq('user_id', userId)
    
    // Delete user password history
    await serviceClient.from('user_password_history').delete().eq('user_id', userId)
    
    // Delete calendar integrations
    await serviceClient.from('calendar_integrations').delete().eq('user_id', userId)
    
    // Delete client records where user is the client
    await serviceClient.from('clients').delete().eq('user_id', userId)
    
    // Delete property listings (if user is an agent)
    // Note: We should check if they have listings first, but for safety, we'll try
    await serviceClient.from('property_listings').delete().eq('agent_id', userId)
    
    // Delete user roles
    await serviceClient.from('user_roles').delete().eq('user_id', userId)
    
    console.log(`[delete-account] Deleted all user data for: ${userId}`)

    // Step 2: Delete profile (this will cascade delete conversations, messages, appointments, etc.)
    const { error: profileError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error(`[delete-account] Error deleting profile:`, profileError)
      return new Response(
        JSON.stringify({ error: `Failed to delete profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[delete-account] Deleted profile for: ${userId}`)

    // Step 3: Delete the auth user from Supabase Auth
    // This requires admin API access
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error(`[delete-account] Error deleting auth user:`, deleteAuthError)
      // Critical: If auth user deletion fails, the email remains taken and user can't sign up again
      // Return error so user knows deletion wasn't complete and can contact support
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Account deletion incomplete. Auth user deletion failed: ${deleteAuthError.message}. Please contact support. The email address remains registered.`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[delete-account] Successfully deleted account for: ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account and all associated data deleted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[delete-account] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

