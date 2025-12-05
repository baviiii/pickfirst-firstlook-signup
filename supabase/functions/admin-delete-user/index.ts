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

    // Create client with admin's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify admin is authenticated
    const { data: { user: adminUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !adminUser) {
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

    // Verify admin is a super_admin
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target user ID from request body
    const body = await req.json()
    const targetUserId = body.userId

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent admins from deleting themselves
    if (targetUserId === adminUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account. Please use the account deletion feature.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target user's email for email queue cleanup
    const { data: targetProfile } = await serviceClient
      .from('profiles')
      .select('email')
      .eq('id', targetUserId)
      .single()

    const targetUserEmail = targetProfile?.email || ''

    console.log(`[admin-delete-user] Admin ${adminUser.id} deleting user: ${targetUserId}`)

    // Step 1: Delete all user data from database tables (same as delete-account)
    await serviceClient.from('user_preferences').delete().eq('user_id', targetUserId)
    await serviceClient.from('buyer_preferences').delete().eq('buyer_id', targetUserId)
    await serviceClient.from('saved_searches').delete().eq('user_id', targetUserId)
    if (targetUserEmail) {
      await serviceClient.from('email_queue').delete().eq('recipient_email', targetUserEmail)
    }
    await serviceClient.from('property_alerts').delete().eq('buyer_id', targetUserId)
    await serviceClient.from('property_alert_jobs').delete().eq('buyer_id', targetUserId)
    await serviceClient.from('notifications').delete().eq('user_id', targetUserId)
    await serviceClient.from('login_history').delete().eq('user_id', targetUserId)
    await serviceClient.from('user_password_history').delete().eq('user_id', targetUserId)
    await serviceClient.from('calendar_integrations').delete().eq('user_id', targetUserId)
    await serviceClient.from('clients').delete().eq('user_id', targetUserId)
    await serviceClient.from('property_listings').delete().eq('agent_id', targetUserId)
    await serviceClient.from('user_roles').delete().eq('user_id', targetUserId)

    console.log(`[admin-delete-user] Deleted all user data for: ${targetUserId}`)

    // Step 2: Delete profile (cascade deletes conversations, messages, appointments, etc.)
    const { error: profileError } = await serviceClient
      .from('profiles')
      .delete()
      .eq('id', targetUserId)

    if (profileError) {
      console.error(`[admin-delete-user] Error deleting profile:`, profileError)
      return new Response(
        JSON.stringify({ error: `Failed to delete profile: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[admin-delete-user] Deleted profile for: ${targetUserId}`)

    // Step 3: Delete the auth user from Supabase Auth
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(targetUserId)

    if (deleteAuthError) {
      console.error(`[admin-delete-user] Error deleting auth user:`, deleteAuthError)
      return new Response(
        JSON.stringify({ 
          success: true,
          warning: `Profile deleted but auth user deletion failed: ${deleteAuthError.message}. User will not be able to log in.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[admin-delete-user] Successfully deleted account for: ${targetUserId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account and all associated data deleted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[admin-delete-user] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

