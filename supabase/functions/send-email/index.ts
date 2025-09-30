import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
const { Resend } = await import("https://esm.sh/resend@4.0.0");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Brand colors
const BRAND_COLORS = {
  primary: '#FFD700',      // Yellow
  secondary: '#000000',    // Black
  accent: '#FFC700',       // Darker yellow
  text: '#1a1a1a',         // Dark text
  textLight: '#666666',    // Light text
  background: '#ffffff',   // White
  lightBg: '#FFFEF0'       // Light yellow background
};

// Common email header with logo
const getEmailHeader = () => `
  <div style="background: ${BRAND_COLORS.secondary}; padding: 30px 20px; text-align: center;">
    <img src="https://pickfirst.com.au/logo.png" alt="PickFirst Real Estate" style="max-width: 200px; height: auto;" />
  </div>
`;

// Common email footer
const getEmailFooter = () => `
  <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; margin-top: 30px; border-top: 3px solid ${BRAND_COLORS.primary};">
    <p style="margin: 0 0 10px 0; color: ${BRAND_COLORS.textLight}; font-size: 14px; text-align: center;">
      <strong>PickFirst Real Estate</strong><br>
      Your trusted partner in finding the perfect property
    </p>
    <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 13px; text-align: center;">
      📧 <a href="mailto:info@pickfirst.com.au" style="color: ${BRAND_COLORS.textLight};">info@pickfirst.com.au</a><br>
      🌐 <a href="https://pickfirst.com.au" style="color: ${BRAND_COLORS.textLight};">www.pickfirst.com.au</a>
    </p>
  </div>
`;

// Button style
const getButton = (url: string, text: string) => `
  <a href="${url}" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.secondary}; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-size: 16px;">
    ${text}
  </a>
`;

const templates = {
  // Authentication & Welcome
  welcome: (data: any) => ({
    subject: `Welcome to ${data.platformName || 'PickFirst Real Estate'}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Welcome ${data.name}!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px; line-height: 1.6;">
            Thank you for joining ${data.platformName || 'PickFirst Real Estate'}. We're excited to help you find your perfect property.
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">What's next?</h3>
            <ul style="color: ${BRAND_COLORS.text}; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>Set up property alerts</li>
              <li>Browse our latest listings</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            ${getButton(data.platformUrl || 'https://pickfirst.com.au', 'Get Started')}
          </div>
          
          <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  agentWelcome: (data: any) => ({
    subject: 'Welcome to PickFirst Real Estate - Agent Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Welcome Agent ${data.name}!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Your agent account has been activated. Start managing your listings and connecting with clients.
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Agent Features:</h3>
            <ul style="color: ${BRAND_COLORS.text}; line-height: 1.8;">
              <li>Manage property listings</li>
              <li>Track client interactions</li>
              <li>Schedule appointments</li>
              <li>View analytics dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/agent/dashboard', 'Access Agent Portal')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  buyerWelcome: (data: any) => ({
    subject: 'Welcome to PickFirst Real Estate - Find Your Dream Home',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Welcome ${data.name}!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Start your property search with PickFirst Real Estate's comprehensive platform.
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Buyer Features:</h3>
            <ul style="color: ${BRAND_COLORS.text}; line-height: 1.8;">
              <li>Advanced property search</li>
              <li>Save favorite properties</li>
              <li>Set up property alerts</li>
              <li>Connect with agents</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/browse', 'Start Browsing Properties')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  passwordReset: (data: any) => ({
    subject: 'Reset Your Password - PickFirst Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Password Reset Request</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            We received a request to reset your password for your PickFirst Real Estate account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            ${getButton(data.resetUrl, 'Reset Password')}
          </div>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 8px; border: 1px solid ${BRAND_COLORS.primary};">
            <p style="color: ${BRAND_COLORS.text}; font-size: 14px; margin: 0;">
              If you didn't request this reset, please ignore this email. This link will expire in 24 hours and can only be used once.
            </p>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Property Alerts
  propertyAlert: (data: any) => ({
    subject: `New Property Match: ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Property Alert!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, we found a property that matches your search criteria:
          </p>
          
          <div style="border: 2px solid ${BRAND_COLORS.primary}; border-radius: 8px; padding: 25px; margin: 25px 0; background: ${BRAND_COLORS.lightBg};">
            <h2 style="margin: 0 0 10px 0; color: ${BRAND_COLORS.secondary};">${data.propertyTitle}</h2>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: ${BRAND_COLORS.secondary};">$${data.price?.toLocaleString()}</p>
            <p style="margin: 5px 0; color: ${BRAND_COLORS.text};">${data.location}</p>
            <div style="margin: 10px 0; color: ${BRAND_COLORS.text};">
              <span style="margin-right: 20px;">${data.bedrooms} bed</span>
              <span style="margin-right: 20px;">${data.bathrooms} bath</span>
              <span>${data.propertyType}</span>
            </div>
          </div>
          
          ${data.propertyUrl ? `<div style="text-align: center;">${getButton(data.propertyUrl, 'View Property')}</div>` : ''}
          
          <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
            You're receiving this because you have property alerts enabled.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  newMatchesDigest: (data: any) => ({
    subject: `${data.matches?.length || 0} New Properties Match Your Preferences`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Weekly Property Digest</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, here are ${data.matches?.length || 0} new properties that match your preferences:
          </p>
          
          ${data.matches?.map((match: any) => `
            <div style="border: 1px solid ${BRAND_COLORS.primary}; border-radius: 8px; padding: 20px; margin: 20px 0; background: ${BRAND_COLORS.lightBg};">
              <h3 style="margin: 0 0 10px 0; color: ${BRAND_COLORS.secondary};">${match.title}</h3>
              <p style="font-size: 18px; font-weight: bold; color: ${BRAND_COLORS.secondary}; margin: 5px 0;">$${match.price?.toLocaleString()}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 5px 0;">${match.city}, ${match.state}</p>
              <div style="margin: 10px 0; color: ${BRAND_COLORS.text};">
                ${match.bedrooms ? `<span style="margin-right: 15px;">${match.bedrooms} bed</span>` : ''}
                ${match.bathrooms ? `<span style="margin-right: 15px;">${match.bathrooms} bath</span>` : ''}
              </div>
              ${match.url ? `<a href="${match.url}" style="color: ${BRAND_COLORS.secondary}; font-weight: bold; text-decoration: none;">View Details →</a>` : ''}
            </div>
          `).join('') || '<p>No new matches this week.</p>'}
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/browse', 'Browse All Properties')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Appointments
  appointmentConfirmation: (data: any) => ({
    subject: `Appointment Confirmed - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Appointment Confirmed</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your property viewing has been confirmed:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.propertyTitle}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Agent:</strong> ${data.agentName}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Contact:</strong> ${data.agentPhone}</p>
          </div>
          
          <div style="background: #FFF9E6; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid ${BRAND_COLORS.primary};">
            <p style="margin: 0; color: ${BRAND_COLORS.text};"><strong>Reminder:</strong> Please arrive 5 minutes early and bring valid ID.</p>
          </div>
          
          <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
            If you need to reschedule, please contact your agent directly.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  appointmentNotification: (data: any) => ({
    subject: `New Appointment: ${data.clientName} - ${data.appointmentType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Appointment Scheduled</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.agentName}, you have a new appointment:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.appointmentType}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Email:</strong> ${data.clientEmail}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Phone:</strong> ${data.clientPhone}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Location:</strong> ${data.location}</p>
            ${data.notes ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/appointments/' + data.appointmentId, 'View Appointment Details')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  appointmentStatusUpdate: (data: any) => ({
    subject: `Appointment ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - ${data.appointmentType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Appointment Update</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your appointment status has been updated:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.appointmentType}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Status:</strong> <span style="color: ${data.status === 'confirmed' ? '#059669' : data.status === 'cancelled' ? '#dc2626' : BRAND_COLORS.secondary};">${data.status.toUpperCase()}</span></p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Location:</strong> ${data.location}</p>
            ${data.agentName ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Agent:</strong> ${data.agentName}</p>` : ''}
            ${data.statusMessage ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Message:</strong> ${data.statusMessage}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/appointments', 'View All Appointments')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  propertyViewing: (data: any) => ({
    subject: `Property Viewing Reminder - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Property Viewing Reminder</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, this is a reminder of your upcoming property viewing:
          </p>
          
          <div style="background: #FFF9E6; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid ${BRAND_COLORS.primary};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.propertyTitle}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0; font-size: 18px;"><strong>Tomorrow at ${data.time}</strong></p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Address:</strong> ${data.address}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Agent:</strong> ${data.agentName} - ${data.agentPhone}</p>
          </div>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: ${BRAND_COLORS.secondary};"><strong>What to bring:</strong></p>
            <ul style="margin: 10px 0; color: ${BRAND_COLORS.text};">
              <li>Valid photo ID</li>
              <li>List of questions</li>
              <li>Pre-approval letter (if applicable)</li>
            </ul>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // User Preferences
  preferencesUpdated: (data: any) => ({
    subject: 'Your Preferences Have Been Updated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Preferences Updated</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your account preferences have been successfully updated.
          </p>
          
          ${data.changedFields?.length > 0 ? `
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
              <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Updated Fields:</h3>
              <ul style="color: ${BRAND_COLORS.text};">
                ${data.changedFields.map((field: string) => `<li>${field}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          <p style="color: ${BRAND_COLORS.textLight}; font-size: 14px;">
            If you didn't make these changes, please contact support immediately.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  searchPreferencesSaved: (data: any) => ({
    subject: 'Search Preferences Saved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Search Preferences Saved</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your search preferences have been saved and property alerts are now active.
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Your Search Criteria:</h3>
            ${data.location ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Location:</strong> ${data.location}</p>` : ''}
            ${data.minPrice ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Price Range:</strong> $${data.minPrice?.toLocaleString()} - $${data.maxPrice?.toLocaleString()}</p>` : ''}
            ${data.propertyType ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Property Type:</strong> ${data.propertyType}</p>` : ''}
            ${data.bedrooms ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Bedrooms:</strong> ${data.bedrooms}+</p>` : ''}
            ${data.bathrooms ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Bathrooms:</strong> ${data.bathrooms}+</p>` : ''}
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            We'll notify you when new properties matching your criteria become available.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Market Updates
  marketUpdate: (data: any) => ({
    subject: `Market Update: ${data.area}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Market Update: ${data.area}</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, here's your latest market update for ${data.area}:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            ${data.avgPrice ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Average Price:</strong> $${data.avgPrice.toLocaleString()}</p>` : ''}
            ${data.newListings ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>New Listings:</strong> ${data.newListings}</p>` : ''}
            ${data.trend ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Market Trend:</strong> ${data.trend}</p>` : ''}
            ${data.daysOnMarket ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Average Days on Market:</strong> ${data.daysOnMarket}</p>` : ''}
          </div>
          
          ${data.recommendation ? `
            <div style="background: #E8F5E9; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid ${BRAND_COLORS.primary};">
              <p style="margin: 0; color: ${BRAND_COLORS.text};"><strong>Our Recommendation:</strong> ${data.recommendation}</p>
            </div>
          ` : ''}
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Security & Messaging
  securityAlert: (data: any) => ({
    subject: 'Security Alert - Unusual Account Activity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="background: #FEE; padding: 25px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin: 0 0 15px 0;">Security Alert</h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
              Hi ${data.name}, we detected unusual activity on your account:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 15px 0;">
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Activity:</strong> ${data.activity}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Time:</strong> ${data.timestamp}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Location:</strong> ${data.location}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Device:</strong> ${data.device}</p>
            </div>
            
            <p style="color: ${BRAND_COLORS.text}; font-weight: bold;">Was this you?</p>
            <p style="color: ${BRAND_COLORS.text};">
              If this was you, no action is needed. If not, please secure your account immediately.
            </p>
            
            <div style="text-align: center;">
              <a href="${(data.platformUrl || 'https://pickfirst.com.au') + '/security'}" style="display: inline-block; background: #dc2626; color: white; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-size: 16px;">
                Secure My Account
              </a>
            </div>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  messageNotification: (data: any) => ({
    subject: `New Message from ${data.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Message</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.recipientName}, you have a new message from ${data.senderName}:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <p style="margin: 0; font-style: italic; color: ${BRAND_COLORS.text};">"${data.messagePreview}"</p>
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/messages/' + data.conversationId, 'View Message')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Business Operations
  leadAssignment: (data: any) => ({
    subject: `New Lead Assigned: ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Lead Assigned</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.agentName}, you have been assigned a new lead:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.clientName}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Email:</strong> ${data.clientEmail}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Phone:</strong> ${data.clientPhone}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Interest:</strong> ${data.propertyType} in ${data.location}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Budget:</strong> ${data.budgetRange}</p>
            ${data.notes ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/leads/' + data.leadId, 'View Lead Details')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  followUp: (data: any) => ({
    subject: `Follow-up: ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Follow-up Reminder</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, this is a follow-up regarding ${data.subject}:
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <p style="color: ${BRAND_COLORS.text};">${data.message}</p>
            ${data.nextSteps ? `
              <h4 style="color: ${BRAND_COLORS.secondary}; margin: 20px 0 10px 0;">Next Steps:</h4>
              <ul style="color: ${BRAND_COLORS.text};">
                ${data.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/contact', 'Contact Us')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Subscription & Billing
  subscriptionUpgrade: (data: any) => ({
    subject: 'Subscription Upgraded Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Subscription Upgraded!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your subscription has been successfully upgraded to ${data.planName}.
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Your New Benefits:</h3>
            <ul style="color: ${BRAND_COLORS.text}; line-height: 1.8;">
              ${data.features?.map((feature: string) => `<li>${feature}</li>`).join('') || ''}
            </ul>
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Billing:</strong> ${data.amount} per ${data.interval}</p>
          <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Next billing date:</strong> ${data.nextBillingDate}</p>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/dashboard', 'Access Premium Features')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  subscriptionExpiry: (data: any) => ({
    subject: 'Your Subscription Expires Soon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="background: #FFF9E6; padding: 25px; border-radius: 8px; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Subscription Expiring</h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
              Hi ${data.name}, your ${data.planName} subscription expires in ${data.daysLeft} days.
            </p>
            
            <p style="color: ${BRAND_COLORS.text}; margin: 15px 0;"><strong>Expiry Date:</strong> ${data.expiryDate}</p>
            
            <p style="color: ${BRAND_COLORS.text};">
              Renew now to continue enjoying premium features without interruption.
            </p>
            
            <div style="text-align: center;">
              <a href="${(data.platformUrl || 'https://pickfirst.com.au') + '/billing'}" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.secondary}; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-size: 16px;">
                Renew Subscription
              </a>
            </div>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  paymentSuccess: (data: any) => ({
    subject: 'Payment Received - Thank You!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Payment Successful</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, thank you for your payment!
          </p>
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.primary};">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Payment Details:</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Amount:</strong> ${data.amount}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Plan:</strong> ${data.planName}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Period:</strong> ${data.billingPeriod}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.paymentDate}</p>
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Your subscription is now active until ${data.nextBillingDate}.
          </p>
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/billing', 'View Billing History')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  paymentFailed: (data: any) => ({
    subject: 'Payment Failed - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="background: #FEE; padding: 25px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin: 0 0 15px 0;">Payment Failed</h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
              Hi ${data.name}, we couldn't process your payment for ${data.planName}.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 15px 0;">
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Amount:</strong> ${data.amount}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Reason:</strong> ${data.failureReason}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.attemptDate}</p>
            </div>
            
            <p style="color: ${BRAND_COLORS.text};">
              Please update your payment method to avoid service interruption.
            </p>
            
            <div style="text-align: center;">
              <a href="${(data.platformUrl || 'https://pickfirst.com.au') + '/billing/payment-methods'}" style="display: inline-block; background: #dc2626; color: white; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-size: 16px;">
                Update Payment Method
              </a>
            </div>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  accountSuspension: (data: any) => ({
    subject: 'Account Suspension Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="background: #FEE; padding: 25px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h1 style="color: #dc2626; margin: 0 0 15px 0;">Account Suspended</h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
              Hi ${data.name}, your account has been temporarily suspended.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 15px 0;">
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Reason:</strong> ${data.reason}</p>
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Suspension Date:</strong> ${data.suspensionDate}</p>
              ${data.duration ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Duration:</strong> ${data.duration}</p>` : ''}
            </div>
            
            <p style="color: ${BRAND_COLORS.text};">
              To appeal this decision or resolve the issue, please contact our support team.
            </p>
            
            <div style="text-align: center;">
              <a href="${(data.platformUrl || 'https://pickfirst.com.au') + '/support'}" style="display: inline-block; background: #dc2626; color: white; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 4px; text-decoration: none; margin: 20px 0; font-size: 16px;">
                Contact Support
              </a>
            </div>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  bulkCampaign: (data: any) => ({
    subject: data.subject || 'Important Update from PickFirst Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">${data.title}</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.name},</p>
          
          <div style="margin: 25px 0; color: ${BRAND_COLORS.text}; line-height: 1.8;">
            ${data.content}
          </div>
          
          ${data.callToAction ? `
            <div style="text-align: center;">
              ${getButton(data.callToActionUrl, data.callToAction)}
            </div>
          ` : ''}
          
          <div style="background: ${BRAND_COLORS.lightBg}; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
              You're receiving this email because you're a valued member of PickFirst Real Estate. 
              ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}" style="color: ${BRAND_COLORS.textLight};">Unsubscribe</a>` : ''}
            </p>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  })
};

const handler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, template, data, subject } = await req.json();
    
    console.log(`Sending email template "${template}" to ${to}`);
    
    if (!templates[template]) {
      throw new Error(`Template "${template}" not found. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    const templateFunction = templates[template];
    const emailContent = templateFunction(data);

    const { error } = await resend.emails.send({
      from: "PickFirst Real Estate <info@pickfirst.com.au>",
      to: [to],
      subject: subject || emailContent.subject,
      html: emailContent.html
    });

    if (error) {
      console.error("Email sending error:", error);
      throw error;
    }

    console.log(`Email "${template}" sent successfully to ${to}`);
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);