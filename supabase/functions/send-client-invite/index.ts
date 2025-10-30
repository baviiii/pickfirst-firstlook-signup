import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const { Resend } = await import("https://esm.sh/resend@4.0.0");

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

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

    // Validate API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending invite to: ${clientEmail} from agent: ${agentName}`);

    // Production domain URL
    const PRODUCTION_URL = 'https://pickfirst.com.au';
    const signupUrl = `${PRODUCTION_URL}/auth?signup=true&email=${encodeURIComponent(clientEmail)}&client_id=${clientId}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #000; margin: 0; font-size: 28px; }
            .content { background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; }
            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #000 !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #666; }
            .info-box { background: #f9f9f9; border-left: 4px solid #FFD700; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 Welcome to PickFirst Properties!</h1>
            </div>
            <div class="content">
              <h2>Hello ${clientName}!</h2>
              <p>${agentName} has added you as a client and would like to invite you to join our property platform.</p>
              
              <div class="info-box">
                <strong>Why join?</strong>
                <ul>
                  <li>Browse exclusive property listings</li>
                  <li>Save and track your favorite properties</li>
                  <li>Direct messaging with your agent</li>
                  <li>Get personalized property recommendations</li>
                  <li>Schedule property viewings</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="${signupUrl}" class="button">
                  Accept Invitation & Create Account
                </a>
              </p>
              
              <p style="font-size: 14px; color: #666;">
                This invitation will link your account with ${agentName}'s client records, making it easier to manage your property search journey.
              </p>
              
              <p style="font-size: 14px; color: #666;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 PickFirst Properties. All rights reserved.</p>
              <p>Questions? Contact your agent ${agentName} directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'PickFirst Properties <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `${agentName} invited you to join PickFirst Properties`,
      html: emailHtml
    });

    if (emailError) {
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

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
