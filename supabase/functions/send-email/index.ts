import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  template: string
  data: Record<string, any>
  subject?: string
}

// Email templates
const EMAIL_TEMPLATES = {
  welcome: (data: any) => ({
    subject: `Welcome to ${data.platformName || 'Our Platform'}, ${data.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px; border-radius: 10px;">
            <h1 style="color: #ffd700; margin-bottom: 20px;">Welcome to Our Real Estate Platform!</h1>
            <p style="font-size: 18px; line-height: 1.6;">Hi ${data.name},</p>
            <p style="line-height: 1.6;">Welcome to our platform! We're excited to help you find your dream property.</p>
            <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ffd700; margin-top: 0;">Your Profile Details:</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Location:</strong> ${data.location || 'Not specified'}</p>
              <p><strong>Preferred Contact:</strong> ${data.contactPreference || 'Email'}</p>
            </div>
            <p>Start exploring properties and connect with top real estate agents in your area.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.platformUrl || '#'}" style="background: #ffd700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Browsing Properties</a>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  profileUpdate: (data: any) => ({
    subject: 'Profile Updated Successfully',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #ffd700;">Profile Updated</h2>
            <p>Hi ${data.name},</p>
            <p>Your profile has been successfully updated. Here's what changed:</p>
            <ul style="line-height: 1.8;">
              ${data.changes?.map((change: string) => `<li>${change}</li>`).join('') || '<li>General profile information</li>'}
            </ul>
            <p style="margin-top: 20px;">If you didn't make these changes, please contact support immediately.</p>
          </div>
        </body>
      </html>
    `
  }),

  propertyAlert: (data: any) => ({
    subject: `New Property Alert: ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #ffd700;">New Property Match!</h2>
            <p>Hi ${data.name},</p>
            <p>We found a property that matches your criteria:</p>
            <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ffd700; margin-top: 0;">${data.propertyTitle}</h3>
              <p><strong>Price:</strong> $${data.price?.toLocaleString()}</p>
              <p><strong>Location:</strong> ${data.location}</p>
              <p><strong>Type:</strong> ${data.propertyType}</p>
              <p><strong>Bedrooms:</strong> ${data.bedrooms} | <strong>Bathrooms:</strong> ${data.bathrooms}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.propertyUrl || '#'}" style="background: #ffd700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Property</a>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  appointmentConfirmation: (data: any) => ({
    subject: `Appointment Confirmed: ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #ffd700;">Appointment Confirmed</h2>
            <p>Hi ${data.name},</p>
            <p>Your property viewing has been confirmed!</p>
            <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ffd700; margin-top: 0;">${data.propertyTitle}</h3>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.time}</p>
              <p><strong>Agent:</strong> ${data.agentName}</p>
              <p><strong>Agent Phone:</strong> ${data.agentPhone}</p>
            </div>
            <p>Please arrive 5 minutes early. If you need to reschedule, contact your agent directly.</p>
          </div>
        </body>
      </html>
    `
  }),

  marketUpdate: (data: any) => ({
    subject: `Market Update for ${data.area}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #ffd700;">Market Update</h2>
            <p>Hi ${data.name},</p>
            <p>Here's your weekly market update for ${data.area}:</p>
            <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ffd700; margin-top: 0;">Market Insights</h3>
              <p><strong>Average Price:</strong> $${data.avgPrice?.toLocaleString()}</p>
              <p><strong>New Listings:</strong> ${data.newListings}</p>
              <p><strong>Market Trend:</strong> ${data.trend}</p>
              <p><strong>Days on Market:</strong> ${data.daysOnMarket} days average</p>
            </div>
            <p>Based on your preferences, now might be ${data.recommendation || 'a good time to explore the market'}.</p>
          </div>
        </body>
      </html>
    `
  })
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

    const { to, template, data, subject }: EmailRequest = await req.json()

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Email address and template are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get template
    const templateFunction = EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES]
    if (!templateFunction) {
      return new Response(
        JSON.stringify({ error: 'Invalid template' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const emailContent = templateFunction(data)
    const finalSubject = subject || emailContent.subject

    // For now, simulate sending email (replace with actual email service later)
    console.log('📧 Simulated Email Send:')
    console.log('To:', to)
    console.log('Subject:', finalSubject)
    console.log('Template:', template)
    console.log('Data:', JSON.stringify(data, null, 2))

    // Log email activity to database for production tracking
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: data.userId || 'system',
          table_name: 'email_notifications',
          action: 'send_email',
          new_values: {
            to,
            template,
            subject: finalSubject,
            status: 'sent'
          }
        })
    } catch (logError) {
      console.warn('Failed to log email activity:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully (simulated)',
        emailId: `sim_${Date.now()}`,
        template,
        to,
        subject: finalSubject
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Email service error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})