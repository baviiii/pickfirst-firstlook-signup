/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
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
    // Create Supabase client with JWT verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    )

    // Get the authenticated user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - valid JWT required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { action, ...params } = await req.json()

    switch (action) {
      case 'getConversations': {
        try {
          // First, check if conversations table exists
          const { data: tableCheck, error: tableError } = await supabaseClient
            .from('conversations')
            .select('id')
            .limit(1)

          if (tableError) {
            console.error('Table check error:', tableError)
            return new Response(
              JSON.stringify({ error: 'Database table not ready. Please run migrations first.' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
          }

          // Get user profile to determine role
          const { data: userProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profileError || !userProfile) {
            return new Response(
              JSON.stringify({ error: 'User profile not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          let conversationsQuery = supabaseClient
            .from('conversations')
            .select(`
              *,
              agent_profile: profiles!agent_id (id, full_name, avatar_url, email),
              client_profile: profiles!client_id (id, full_name, avatar_url, email)
            `)

          // Apply role-based filtering
          if (userProfile.role === 'agent') {
            conversationsQuery = conversationsQuery.eq('agent_id', user.id)
          } else if (userProfile.role === 'buyer') {
            conversationsQuery = conversationsQuery.eq('client_id', user.id)
          } else {
            return new Response(
              JSON.stringify({ error: 'Invalid user role' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          const { data: conversations, error } = await conversationsQuery
            .order('updated_at', { ascending: false })

          if (error) {
            console.error('Conversations query error:', error)
            throw error
          }

          // Get last message and unread count for each conversation
          const processedConversations = await Promise.all(
            conversations.map(async (conv) => {
              try {
                // Get last message
                const { data: lastMessage } = await supabaseClient
                  .from('messages')
                  .select('content, created_at, sender_id')
                  .eq('conversation_id', conv.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single()

                // Get unread count
                const { count } = await supabaseClient
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('conversation_id', conv.id)
                  .neq('sender_id', user.id)
                  .is('read_at', null)

                return {
                  ...conv,
                  last_message: lastMessage,
                  unread_count: count || 0
                }
              } catch (error) {
                console.error('Error processing conversation:', conv.id, error)
                return {
                  ...conv,
                  last_message: null,
                  unread_count: 0
                }
              }
            })
          )

          return new Response(
            JSON.stringify(processedConversations),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('getConversations error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch conversations', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      case 'getMessages': {
        const { conversationId } = params
        
        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Verify user is part of the conversation
          const { data: conversation, error: convError } = await supabaseClient
            .from('conversations')
            .select('agent_id, client_id')
            .eq('id', conversationId)
            .single()

          if (convError || !conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          if (conversation.agent_id !== user.id && conversation.client_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized to access this conversation' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          const { data, error } = await supabaseClient
            .from('messages')
            .select(`
              *,
              sender_profile:profiles!sender_id(id, full_name, avatar_url, role)
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

          if (error) throw error

          return new Response(
            JSON.stringify(data || []),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('getMessages error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch messages', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      case 'sendMessage': {
        const { conversationId, content } = params
        
        if (!conversationId || !content) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID and content are required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Verify sender is part of the conversation
          const { data: conversation, error: convError } = await supabaseClient
            .from('conversations')
            .select('agent_id, client_id')
            .eq('id', conversationId)
            .single()

          if (convError || !conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          if (conversation.agent_id !== user.id && conversation.client_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized to send message in this conversation' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          const { data, error } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: user.id, // Use authenticated user ID
              content: content.trim()
            })
            .select(`
              *,
              sender_profile:profiles!sender_id(id, full_name, avatar_url, role)
            `)
            .single()

          if (error) throw error

          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('sendMessage error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to send message', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      case 'createConversation': {
        const { clientId, subject = 'New Conversation' } = params
        
        if (!clientId) {
          return new Response(
            JSON.stringify({ error: 'Client ID is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Verify current user is an agent
          const { data: userProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profileError || userProfile.role !== 'agent') {
            return new Response(
              JSON.stringify({ error: 'Only agents can create conversations' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          // Check if conversation already exists
          const { data: existing } = await supabaseClient
            .from('conversations')
            .select('id')
            .eq('agent_id', user.id)
            .eq('client_id', clientId)
            .single()

          if (existing) {
            return new Response(
              JSON.stringify({ id: existing.id, existing: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
          }

          // Create new conversation
          const { data, error } = await supabaseClient
            .from('conversations')
            .insert({
              agent_id: user.id, // Use authenticated user ID
              client_id: clientId,
              subject: subject.trim()
            })
            .select('id')
            .single()

          if (error) throw error

          return new Response(
            JSON.stringify({ id: data.id, existing: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('createConversation error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      case 'markMessagesAsRead': {
        const { conversationId } = params
        
        if (!conversationId) {
          return new Response(
            JSON.stringify({ error: 'Conversation ID is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Verify user is part of the conversation
          const { data: conversation, error: convError } = await supabaseClient
            .from('conversations')
            .select('agent_id, client_id')
            .eq('id', conversationId)
            .single()

          if (convError || !conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          if (conversation.agent_id !== user.id && conversation.client_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized to access this conversation' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          const { error } = await supabaseClient
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_id', user.id)
            .is('read_at', null)

          if (error) throw error

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('markMessagesAsRead error:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to mark messages as read', details: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Messaging function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})