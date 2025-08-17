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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...params } = await req.json()

    switch (action) {
      case 'getConversations': {
        const { userId } = params
        
        const { data: conversations, error } = await supabaseClient
          .from('conversations')
          .select(`
            *,
            agent_profile:profiles!conversations_agent_id_fkey(full_name, avatar_url),
            client_profile:profiles!conversations_client_id_fkey(full_name, avatar_url)
          `)
          .or(`agent_id.eq.${userId},client_id.eq.${userId}`)
          .order('updated_at', { ascending: false })

        if (error) throw error

        // Get last message and unread count for each conversation
        const processedConversations = await Promise.all(
          conversations.map(async (conv) => {
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
              .neq('sender_id', userId)
              .is('read_at', null)

            return {
              ...conv,
              last_message: lastMessage,
              unread_count: count || 0
            }
          })
        )

        return new Response(
          JSON.stringify(processedConversations),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'getMessages': {
        const { conversationId } = params
        
        const { data, error } = await supabaseClient
          .from('messages')
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, avatar_url, user_type)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) throw error

        return new Response(
          JSON.stringify(data),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'sendMessage': {
        const { conversationId, senderId, content } = params
        
        const { data, error } = await supabaseClient
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content
          })
          .select(`
            *,
            sender_profile:profiles!messages_sender_id_fkey(full_name, avatar_url, user_type)
          `)
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify(data),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'createConversation': {
        const { agentId, clientId, subject } = params
        
        // Check if conversation already exists
        const { data: existing } = await supabaseClient
          .from('conversations')
          .select('id')
          .eq('agent_id', agentId)
          .eq('client_id', clientId)
          .single()

        if (existing) {
          return new Response(
            JSON.stringify({ id: existing.id }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          )
        }

        // Create new conversation
        const { data, error } = await supabaseClient
          .from('conversations')
          .insert({
            agent_id: agentId,
            client_id: clientId,
            subject: subject || 'New Conversation'
          })
          .select('id')
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify(data),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'markMessagesAsRead': {
        const { conversationId, userId } = params
        
        const { error } = await supabaseClient
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .is('read_at', null)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})