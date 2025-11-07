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

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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
              agent_profile: profiles!agent_id (id, full_name, avatar_url, email, phone, company),
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

          // Add null checks for required fields
          conversationsQuery = conversationsQuery.not('agent_id', 'is', null)
          conversationsQuery = conversationsQuery.not('client_id', 'is', null)

          const { data: conversations, error } = await conversationsQuery
            .order('updated_at', { ascending: false })

          if (error) {
            console.error('Conversations query error:', error)
            return new Response(
              JSON.stringify({ error: 'Failed to fetch conversations', details: error.message }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
          }

          console.log('Raw conversations from DB:', conversations)
          
          // Debug: Check if agent profile exists
          if (conversations && conversations.length > 0) {
            const firstConv = conversations[0];
            console.log('First conversation agent_id:', firstConv.agent_id);
            console.log('First conversation agent_profile:', firstConv.agent_profile);
            
            // Try to fetch the agent profile directly
            const { data: agentProfile, error: agentError } = await supabaseClient
              .from('profiles')
              .select('id, full_name, email, phone, company')
              .eq('id', firstConv.agent_id)
              .single();
            
            console.log('Direct agent profile lookup:', agentProfile, agentError);
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

                // Fetch agent profile separately since join is failing
                let agentProfile = conv.agent_profile;
                if (!agentProfile && conv.agent_id) {
                  console.log('Fetching agent profile for ID:', conv.agent_id);
                  const { data: agentData, error: agentError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, avatar_url, email, phone, company')
                    .eq('id', conv.agent_id)
                    .single();
                  console.log('Agent profile fetch result:', agentData, agentError);
                  agentProfile = agentData;
                }

                // Extract property information from metadata
                let property = null;
                if (conv.metadata?.property_id) {
                  property = { 
                    id: conv.metadata.property_id, 
                    title: conv.subject || 'Property', 
                    address: 'Address not available',
                    price: null
                  };
                }

                return {
                  ...conv,
                  agent_profile: agentProfile,
                  last_message: lastMessage,
                  unread_count: count || 0,
                  property: property
                }
              } catch (error) {
                console.error('Error processing conversation:', conv.id, error)
                return {
                  ...conv,
                  last_message: null,
                  unread_count: 0,
                  property: null
                }
              }
            })
          )

          console.log('Processed conversations:', processedConversations)
          return new Response(
            JSON.stringify(processedConversations),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('getConversations error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: 'Failed to fetch conversations', details: errorMessage }),
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: 'Failed to fetch messages', details: errorMessage }),
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
          // Fetch conversation with participant details for email notification
          // Use supabaseAdmin to bypass RLS and get recipient email
        
        
          const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .select(`
              agent_id, 
              client_id,
              subject
            `)
            .eq('id', conversationId)
            .single()

          if (convError || !conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          // Fetch agent and client profiles separately
          const { data: agentProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', conversation.agent_id)
            .single()

          const { data: clientProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', conversation.client_id)
            .single()

          // Add profiles to conversation object (using type assertion for dynamic properties)
          const conversationWithProfiles = conversation as any
          conversationWithProfiles.agent = agentProfile
          conversationWithProfiles.client = clientProfile

          

          // Authorization check: ensure the sender is part of the conversation
          if (conversation.agent_id !== user.id && conversation.client_id !== user.id) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized to send message in this conversation' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          // Insert the message into the database
          const { data, error } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: user.id,
              content: content.trim()
            })
            .select(`
              *,
              sender_profile:profiles!sender_id(id, full_name, avatar_url, role)
            `)
            .single()

          if (error) throw error

          // Send email notification to the recipient
          try {
            const isAgentSending = conversation.agent_id === user.id
            const conversationWithProfiles = conversation as any
            const recipient = isAgentSending ? conversationWithProfiles.client : conversationWithProfiles.agent
            const sender = isAgentSending ? conversationWithProfiles.agent : conversationWithProfiles.client
            const senderName = data.sender_profile?.full_name || 'Someone'

            if (recipient?.email) {
              // Asynchronously call the send-email function
              fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  to: recipient.email,
                  subject: `New message from ${senderName}`,
                  template: 'messageNotification',
                  data: {
                    recipientName: recipient.full_name || 'there',
                    senderName: senderName,
                    senderEmail: sender?.email || null,
                    messageContent: content.trim().substring(0, 200),
                    messagePreview: content.trim().substring(0, 200),
                    conversationId: conversationId,
                    conversationSubject: conversation.subject || 'Property Inquiry',
                    platformName: 'PickFirst Real Estate',
                    platformUrl: 'https://www.pickfirst.com.au'
                  }
                })
              })
              console.log('Email notification queued for:', recipient.email)
            }
          } catch (emailError) {
            console.error('Failed to queue email notification:', emailError)
            // Do not block message sending if email fails
          }

          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('sendMessage error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: 'Failed to send message', details: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
      }

      case 'createConversation': {
        const { clientId, subject = 'New Conversation', inquiryId, propertyId } = params
        
        if (!clientId) {
          return new Response(
            JSON.stringify({ error: 'Client ID is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        try {
          // Get current user profile to handle both agents and buyers creating conversations
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

          // Determine agent and client IDs based on user role
          let agentId, actualClientId;
          if (userProfile.role === 'agent') {
            agentId = user.id;
            actualClientId = clientId;
          } else if (userProfile.role === 'buyer') {
            agentId = clientId; // clientId is actually agentId when buyer creates conversation
            actualClientId = user.id;
          } else {
            return new Response(
              JSON.stringify({ error: 'Invalid user role for creating conversations' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }

          console.log('Creating conversation between agent:', agentId, 'and client:', actualClientId, 'for property:', propertyId);

          // Check if conversation already exists for this specific context
          let existingQuery = supabaseClient
            .from('conversations')
            .select('id, metadata, subject')
            .eq('agent_id', agentId)
            .eq('client_id', actualClientId);

          const { data: existingConversations } = await existingQuery;
          console.log('Found existing conversations:', existingConversations);

          // For property-specific conversations, check metadata
          if (propertyId && existingConversations) {
            const propertyConversation = existingConversations.find(conv => 
              conv.metadata && 
              typeof conv.metadata === 'object' && 
              conv.metadata.property_id === propertyId
            );
            
            if (propertyConversation) {
              console.log('Found existing property conversation:', propertyConversation.id);
              return new Response(
                JSON.stringify({ id: propertyConversation.id, existing: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
              )
            }
          }

          // For inquiry-specific conversations
          if (inquiryId && existingConversations) {
            const inquiryConversation = existingConversations.find((conv: any) => 
              conv.inquiry_id === inquiryId
            );
            
            if (inquiryConversation) {
              console.log('Found existing inquiry conversation:', inquiryConversation.id);
              return new Response(
                JSON.stringify({ id: inquiryConversation.id, existing: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
              )
            }
          }

          // Create new conversation with proper metadata
          const conversationData: any = {
            agent_id: agentId,
            client_id: actualClientId,
            subject: subject.trim(),
            metadata: {}
          };

          // Add inquiry ID if provided
          if (inquiryId) {
            conversationData.inquiry_id = inquiryId;
          }

          // Add property ID to metadata if provided
          if (propertyId) {
            conversationData.metadata.property_id = propertyId;
            console.log('Adding property ID to metadata:', propertyId);
          }

          console.log('Creating new conversation with data:', conversationData);

          const { data, error } = await supabaseClient
            .from('conversations')
            .insert(conversationData)
            .select('id')
            .single()

          if (error) {
            console.error('Error creating conversation:', error);
            throw error;
          }

          console.log('Created new conversation:', data.id);
          return new Response(
            JSON.stringify({ id: data.id, existing: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        } catch (error) {
          console.error('createConversation error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation', details: errorMessage }),
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({ error: 'Failed to mark messages as read', details: errorMessage }),
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})