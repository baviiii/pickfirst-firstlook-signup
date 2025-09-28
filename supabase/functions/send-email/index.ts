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
    subject: `Welcome to ${data.platformName || 'PickFirst Real Estate'}, ${data.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PickFirst Real Estate</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: white; padding: 40px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="max-width: 200px; height: auto; border-radius: 8px;">
            </div>
            <h1 style="color: #ffd700; margin-bottom: 20px; text-align: center;">Welcome to PickFirst Real Estate!</h1>
            <p style="font-size: 18px; line-height: 1.6;">Hi ${data.name},</p>
            <p style="line-height: 1.6;">Welcome to PickFirst Real Estate! We're excited to help you find your dream property.</p>
            <div style="background: rgba(255, 215, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #ffd700; margin-top: 0;">Your Profile Details:</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Location:</strong> ${data.location || 'Not specified'}</p>
              <p><strong>Preferred Contact:</strong> ${data.contactPreference || 'Email'}</p>
            </div>
            <p>Start exploring properties and connect with top real estate agents in your area.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.platformUrl || 'https://baviiii.github.io/pickfirst-firstlook-signup'}" style="background: #ffd700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Start Browsing Properties</a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
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
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="max-width: 150px; height: auto; border-radius: 8px;">
            </div>
            <h2 style="color: #ffd700; text-align: center;">Profile Updated</h2>
            <p>Hi ${data.name},</p>
            <p>Your profile has been successfully updated. Here's what changed:</p>
            <ul style="line-height: 1.8;">
              ${data.changes?.map((change: string) => `<li>${change}</li>`).join('') || '<li>General profile information</li>'}
            </ul>
            <p style="margin-top: 20px;">If you didn't make these changes, please contact support immediately.</p>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
            </div>
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
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="max-width: 150px; height: auto; border-radius: 8px;">
            </div>
            <h2 style="color: #ffd700; text-align: center;">New Property Match!</h2>
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
              <a href="${data.propertyUrl || 'https://baviiii.github.io/pickfirst-firstlook-signup'}" style="background: #ffd700; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Property</a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
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
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="max-width: 150px; height: auto; border-radius: 8px;">
            </div>
            <h2 style="color: #ffd700; text-align: center;">Appointment Confirmed</h2>
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
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
            </div>
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
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="max-width: 150px; height: auto; border-radius: 8px;">
            </div>
            <h2 style="color: #ffd700; text-align: center;">Market Update</h2>
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
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  appointmentStatusUpdate: (data: any) => ({
    subject: data.subject || `Appointment ${data.status} - ${data.appointmentType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Status Update</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff;">
            <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 20px; text-align: center;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="height: 60px; margin-bottom: 10px;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Appointment Status Update</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #ffd700; margin-bottom: 20px;">Hello ${data.name}!</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">${data.statusMessage}</p>
              
              <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-top: 0;">Appointment Details:</h3>
                <p><strong>Type:</strong> ${data.appointmentType}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Time:</strong> ${data.time}</p>
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Status:</strong> <span style="color: #ffd700; font-weight: bold;">${data.status.toUpperCase()}</span></p>
                ${data.clientName ? `<p><strong>Client:</strong> ${data.clientName}</p>` : ''}
                ${data.agentName ? `<p><strong>Agent:</strong> ${data.agentName}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${data.platformUrl}" style="background-color: #ffd700; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Platform</a>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  'property-sold': (data: any) => ({
    subject: `Property Sold: ${data.property?.title || 'Property Update'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Property Sold Notification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff;">
            <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 20px; text-align: center;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="height: 60px; margin-bottom: 10px;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">Property Sold</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #ffd700; margin-bottom: 20px;">Hello ${data.name}!</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                We wanted to let you know that a property you inquired about has been sold.
              </p>
              
              <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-top: 0;">${data.property?.title || 'Property'}</h3>
                <p><strong>Address:</strong> ${data.property?.address || 'Address not available'}</p>
                ${data.property?.sold_price ? `<p><strong>Sold Price:</strong> ${data.property.sold_price}</p>` : ''}
                ${data.property?.agent_name ? `<p><strong>Agent:</strong> ${data.property.agent_name}</p>` : ''}
              </div>
              
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Don't worry! We have many other great properties that might interest you. 
                Browse our latest listings to find your perfect home.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.property?.property_url || 'https://baviiii.github.io/pickfirst-firstlook-signup'}" style="background-color: #ffd700; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">Browse Properties</a>
                <a href="https://baviiii.github.io/pickfirst-firstlook-signup/saved-properties" style="background-color: transparent; color: #ffd700; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; border: 2px solid #ffd700;">View Saved Properties</a>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #ccc; font-size: 14px;">Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  agentInquiryNotification: (data: any) => ({
    subject: `🏠 New Property Inquiry: ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Property Inquiry</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; color: #ffffff;">
            <div style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); padding: 20px; text-align: center;">
              <img src="https://baviiii.github.io/pickfirst-firstlook-signup/logo.jpg" alt="PickFirst Real Estate" style="height: 60px; margin-bottom: 10px;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">🎉 New Property Inquiry!</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #ffd700; margin-bottom: 20px;">Hello ${data.agentName}!</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Great news! You have a new inquiry for one of your property listings.
              </p>
              
              <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-top: 0;">📍 Property Details</h3>
                <p><strong>Property:</strong> ${data.propertyTitle}</p>
                <p><strong>Address:</strong> ${data.propertyAddress}</p>
                <p><strong>Price:</strong> ${data.propertyPrice}</p>
                ${data.propertyImage ? `
                  <div style="text-align: center; margin: 15px 0;">
                    <img src="${data.propertyImage}" alt="Property Image" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 200px;">
                  </div>
                ` : ''}
              </div>

              <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-top: 0;">👤 Buyer Information</h3>
                <p><strong>Name:</strong> ${data.buyerName}</p>
                <p><strong>Email:</strong> <a href="mailto:${data.buyerEmail}" style="color: #ffd700;">${data.buyerEmail}</a></p>
                <p><strong>Phone:</strong> ${data.buyerPhone !== 'Not provided' ? `<a href="tel:${data.buyerPhone}" style="color: #ffd700;">${data.buyerPhone}</a>` : 'Not provided'}</p>
              </div>

              <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ffd700; margin-top: 0;">💬 Buyer's Message</h3>
                <p style="font-style: italic; line-height: 1.6;">"${data.inquiryMessage}"</p>
              </div>
              
              <div style="background-color: #ffd700; color: #1a1a1a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">💡 Quick Actions:</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">
                  • Reply quickly to increase your conversion rate<br>
                  • Check your dashboard for conversation history<br>
                  • Consider scheduling a property viewing
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" style="background-color: #ffd700; color: #1a1a1a; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">📊 View Dashboard</a>
                <a href="${data.propertyUrl}" style="background-color: transparent; color: #ffd700; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; border: 2px solid #ffd700;">🏠 View Property</a>
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 14px; color: #ccc; margin-bottom: 10px;">Quick Contact Options:</p>
                <a href="mailto:${data.buyerEmail}?subject=RE: ${data.propertyTitle} Inquiry" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block; margin: 0 5px;">📧 Email Buyer</a>
                ${data.buyerPhone !== 'Not provided' ? `<a href="tel:${data.buyerPhone}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block; margin: 0 5px;">📞 Call Buyer</a>` : ''}
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #ccc; font-size: 14px;">
                  Questions? Contact us at <a href="mailto:info@pickfirst.com.au" style="color: #ffd700;">info@pickfirst.com.au</a><br>
                  <span style="font-size: 12px;">This inquiry was sent through ${data.platformName}</span>
                </p>
              </div>
            </div>
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

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PickFirst Real Estate <info@pickfirst.com.au>',
        to: [to],
        subject: finalSubject,
        html: emailContent.html,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text()
      throw new Error(`Resend API error: ${resendResponse.status} - ${errorData}`)
    }

    const resendData = await resendResponse.json()
    console.log('📧 Email sent via Resend:', resendData)

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
        message: 'Email sent successfully via Resend',
        emailId: resendData.id,
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