import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  clientId: string;
  clientEmail: string;
  clientName: string;
  agentName: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { clientId, clientEmail, clientName, agentName }: InviteRequest = await req.json();

    if (!clientId || !clientEmail || !clientName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending invite to: ${clientEmail} from agent: ${agentName}`);

    // Production domain URL
    const PRODUCTION_URL = 'https://pickfirst.com.au';
    const signupUrl = `${PRODUCTION_URL}/auth?signup=true&email=${encodeURIComponent(clientEmail)}&client_id=${clientId}`;

    // Use the unified send-email function like other services
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: clientEmail,
        subject: `${agentName} invited you to join PickFirst Properties`,
        template: 'clientInvite',
        data: {
          recipientName: clientName,
          agentName: agentName,
          signupUrl: signupUrl,
          platformName: 'PickFirst Real Estate',
          platformUrl: PRODUCTION_URL
        }
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email service returned error:', emailResponse.status, errorText);
      throw new Error(`Failed to send email: ${emailResponse.status} ${errorText}`);
    }

    console.log('Client invite email sent successfully to:', clientEmail);

    // Update client record with invited_at timestamp
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', clientId);

    if (updateError) {
      console.error('Failed to update client invite timestamp:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending client invite:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
