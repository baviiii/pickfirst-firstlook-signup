import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// Import Resend using dynamic import to avoid module resolution issues
const { Resend } = await import("https://esm.sh/resend@4.0.0");

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  template: string;
  data: Record<string, any>;
  subject?: string;
}

const templates = {
  // Authentication & Welcome
  welcome: (data: any) => ({
    subject: `Welcome to ${data.platformName || 'PickFirst Real Estate'}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; text-align: center;">Welcome ${data.name}!</h1>
        <p>Thank you for joining ${data.platformName}. We're excited to help you find your perfect property.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What's next?</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Set up property alerts</li>
            <li>Browse our latest listings</li>
          </ul>
        </div>
        <a href="${data.platformUrl}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Get Started
        </a>
        <p style="color: #64748b; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
      </div>
    `
  }),

  agentWelcome: (data: any) => ({
    subject: 'Welcome to PickFirst Real Estate - Agent Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Welcome Agent ${data.name}!</h1>
        <p>Your agent account has been activated. Start managing your listings and connecting with clients.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Agent Features:</h3>
          <ul>
            <li>Manage property listings</li>
            <li>Track client interactions</li>
            <li>Schedule appointments</li>
            <li>View analytics dashboard</li>
          </ul>
        </div>
        <a href="${data.platformUrl}/agent/dashboard" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Access Agent Portal
        </a>
      </div>
    `
  }),

  buyerWelcome: (data: any) => ({
    subject: 'Welcome to PickFirst Real Estate - Find Your Dream Home',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Welcome ${data.name}!</h1>
        <p>Start your property search with PickFirst Real Estate's comprehensive platform.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Buyer Features:</h3>
          <ul>
            <li>Advanced property search</li>
            <li>Save favorite properties</li>
            <li>Set up property alerts</li>
            <li>Connect with agents</li>
          </ul>
        </div>
        <a href="${data.platformUrl}/browse" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Start Browsing Properties
        </a>
      </div>
    `
  }),

  passwordReset: (data: any) => ({
    subject: 'Reset Your Password - PickFirst Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Password Reset Request</h1>
        <p>We received a request to reset your password for your PickFirst Real Estate account.</p>
        <a href="${data.resetUrl}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #64748b; font-size: 14px;">If you didn't request this reset, please ignore this email. This link will expire in 24 hours.</p>
        <p style="color: #64748b; font-size: 14px;">For security, this link can only be used once.</p>
      </div>
    `
  }),

  // Property Alerts
  propertyAlert: (data: any) => ({
    subject: `New Property Match: ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Property Alert!</h1>
        <p>Hi ${data.name}, we found a property that matches your search criteria:</p>
        
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #1e293b;">${data.propertyTitle}</h2>
          <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #059669;">$${data.price?.toLocaleString()}</p>
          <p style="margin: 5px 0; color: #64748b;">${data.location}</p>
          <div style="display: flex; gap: 20px; margin: 10px 0;">
            <span>${data.bedrooms} bed</span>
            <span>${data.bathrooms} bath</span>
            <span>${data.propertyType}</span>
          </div>
        </div>
        
        ${data.propertyUrl ? `<a href="${data.propertyUrl}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">View Property</a>` : ''}
        
        <p style="color: #64748b; font-size: 14px;">You're receiving this because you have property alerts enabled.</p>
      </div>
    `
  }),

  newMatchesDigest: (data: any) => ({
    subject: `${data.matches?.length || 0} New Properties Match Your Preferences`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Weekly Property Digest</h1>
        <p>Hi ${data.name}, here are ${data.matches?.length || 0} new properties that match your preferences:</p>
        
        ${data.matches?.map((match: any) => `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0;">${match.title}</h3>
            <p style="font-size: 16px; font-weight: bold; color: #059669;">$${match.price?.toLocaleString()}</p>
            <p style="color: #64748b;">${match.city}, ${match.state}</p>
            <div style="display: flex; gap: 15px; margin: 10px 0;">
              ${match.bedrooms ? `<span>${match.bedrooms} bed</span>` : ''}
              ${match.bathrooms ? `<span>${match.bathrooms} bath</span>` : ''}
            </div>
            ${match.url ? `<a href="${match.url}" style="color: #2563eb; text-decoration: none;">View Details →</a>` : ''}
          </div>
        `).join('') || '<p>No new matches this week.</p>'}
        
        <a href="${data.platformUrl}/browse" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Browse All Properties
        </a>
      </div>
    `
  }),

  // Appointments
  appointmentConfirmation: (data: any) => ({
    subject: `Appointment Confirmed - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Appointment Confirmed</h1>
        <p>Hi ${data.name}, your property viewing has been confirmed:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${data.propertyTitle}</h3>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
          <p><strong>Agent:</strong> ${data.agentName}</p>
          <p><strong>Contact:</strong> ${data.agentPhone}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>Reminder:</strong> Please arrive 5 minutes early and bring valid ID.</p>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">If you need to reschedule, please contact your agent directly.</p>
      </div>
    `
  }),

  appointmentNotification: (data: any) => ({
    subject: `New Appointment: ${data.clientName} - ${data.appointmentType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Appointment Scheduled</h1>
        <p>Hi ${data.agentName}, you have a new appointment:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${data.appointmentType}</h3>
          <p><strong>Client:</strong> ${data.clientName}</p>
          <p><strong>Email:</strong> ${data.clientEmail}</p>
          <p><strong>Phone:</strong> ${data.clientPhone}</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
          <p><strong>Duration:</strong> ${data.duration} minutes</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <a href="${data.platformUrl}/appointments/${data.appointmentId}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          View Appointment Details
        </a>
      </div>
    `
  }),

  appointmentStatusUpdate: (data: any) => ({
    subject: `Appointment ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - ${data.appointmentType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Appointment Update</h1>
        <p>Hi ${data.name}, your appointment status has been updated:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${data.appointmentType}</h3>
          <p><strong>Status:</strong> <span style="color: ${data.status === 'confirmed' ? '#059669' : data.status === 'cancelled' ? '#dc2626' : '#f59e0b'};">${data.status.toUpperCase()}</span></p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          ${data.agentName ? `<p><strong>Agent:</strong> ${data.agentName}</p>` : ''}
          ${data.statusMessage ? `<p><strong>Message:</strong> ${data.statusMessage}</p>` : ''}
        </div>
        
        <a href="${data.platformUrl}/appointments" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          View All Appointments
        </a>
      </div>
    `
  }),

  propertyViewing: (data: any) => ({
    subject: `Property Viewing Reminder - ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Property Viewing Reminder</h1>
        <p>Hi ${data.name}, this is a reminder of your upcoming property viewing:</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${data.propertyTitle}</h3>
          <p><strong>Tomorrow at ${data.time}</strong></p>
          <p><strong>Address:</strong> ${data.address}</p>
          <p><strong>Agent:</strong> ${data.agentName} - ${data.agentPhone}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0;"><strong>What to bring:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Valid photo ID</li>
            <li>List of questions</li>
            <li>Pre-approval letter (if applicable)</li>
          </ul>
        </div>
      </div>
    `
  }),

  // User Preferences
  preferencesUpdated: (data: any) => ({
    subject: 'Your Preferences Have Been Updated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Preferences Updated</h1>
        <p>Hi ${data.name}, your account preferences have been successfully updated.</p>
        
        ${data.changedFields?.length > 0 ? `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Updated Fields:</h3>
            <ul>
              ${data.changedFields.map((field: string) => `<li>${field}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <p style="color: #64748b; font-size: 14px;">If you didn't make these changes, please contact support immediately.</p>
      </div>
    `
  }),

  searchPreferencesSaved: (data: any) => ({
    subject: 'Search Preferences Saved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Search Preferences Saved</h1>
        <p>Hi ${data.name}, your search preferences have been saved and property alerts are now active.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Search Criteria:</h3>
          ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
          ${data.minPrice ? `<p><strong>Price Range:</strong> $${data.minPrice?.toLocaleString()} - $${data.maxPrice?.toLocaleString()}</p>` : ''}
          ${data.propertyType ? `<p><strong>Property Type:</strong> ${data.propertyType}</p>` : ''}
          ${data.bedrooms ? `<p><strong>Bedrooms:</strong> ${data.bedrooms}+</p>` : ''}
          ${data.bathrooms ? `<p><strong>Bathrooms:</strong> ${data.bathrooms}+</p>` : ''}
        </div>
        
        <p>We'll notify you when new properties matching your criteria become available.</p>
      </div>
    `
  }),

  // Market Updates
  marketUpdate: (data: any) => ({
    subject: `Market Update: ${data.area}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Market Update: ${data.area}</h1>
        <p>Hi ${data.name}, here's your latest market update for ${data.area}:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${data.avgPrice ? `<p><strong>Average Price:</strong> $${data.avgPrice.toLocaleString()}</p>` : ''}
          ${data.newListings ? `<p><strong>New Listings:</strong> ${data.newListings}</p>` : ''}
          ${data.trend ? `<p><strong>Market Trend:</strong> ${data.trend}</p>` : ''}
          ${data.daysOnMarket ? `<p><strong>Average Days on Market:</strong> ${data.daysOnMarket}</p>` : ''}
        </div>
        
        ${data.recommendation ? `
          <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;"><strong>Our Recommendation:</strong> ${data.recommendation}</p>
          </div>
        ` : ''}
      </div>
    `
  }),

  // Security & Messaging
  securityAlert: (data: any) => ({
    subject: 'Security Alert - Unusual Account Activity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h1 style="color: #dc2626; margin: 0 0 15px 0;">Security Alert</h1>
          <p>Hi ${data.name}, we detected unusual activity on your account:</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Activity:</strong> ${data.activity}</p>
            <p><strong>Time:</strong> ${data.timestamp}</p>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Device:</strong> ${data.device}</p>
          </div>
          
          <p><strong>Was this you?</strong></p>
          <p>If this was you, no action is needed. If not, please secure your account immediately.</p>
          
          <a href="${data.platformUrl}/security" style="display: block; background: #dc2626; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
            Secure My Account
          </a>
        </div>
      </div>
    `
  }),

  messageNotification: (data: any) => ({
    subject: `New Message from ${data.senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Message</h1>
        <p>Hi ${data.recipientName}, you have a new message from ${data.senderName}:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; font-style: italic;">"${data.messagePreview}"</p>
        </div>
        
        <a href="${data.platformUrl}/messages/${data.conversationId}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          View Message
        </a>
      </div>
    `
  }),

  // Business Operations
  leadAssignment: (data: any) => ({
    subject: `New Lead Assigned: ${data.clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Lead Assigned</h1>
        <p>Hi ${data.agentName}, you have been assigned a new lead:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0;">${data.clientName}</h3>
          <p><strong>Email:</strong> ${data.clientEmail}</p>
          <p><strong>Phone:</strong> ${data.clientPhone}</p>
          <p><strong>Interest:</strong> ${data.propertyType} in ${data.location}</p>
          <p><strong>Budget:</strong> $${data.budgetRange}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <a href="${data.platformUrl}/leads/${data.leadId}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          View Lead Details
        </a>
      </div>
    `
  }),

  followUp: (data: any) => ({
    subject: `Follow-up: ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Follow-up Reminder</h1>
        <p>Hi ${data.name}, this is a follow-up regarding ${data.subject}:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>${data.message}</p>
          ${data.nextSteps ? `
            <h4>Next Steps:</h4>
            <ul>
              ${data.nextSteps.map((step: string) => `<li>${step}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        
        <a href="${data.platformUrl}/contact" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Contact Us
        </a>
      </div>
    `
  }),

  // Subscription & Billing
  subscriptionUpgrade: (data: any) => ({
    subject: 'Subscription Upgraded Successfully',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Subscription Upgraded!</h1>
        <p>Hi ${data.name}, your subscription has been successfully upgraded to ${data.planName}.</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your New Benefits:</h3>
          <ul>
            ${data.features?.map((feature: string) => `<li>${feature}</li>`).join('') || ''}
          </ul>
        </div>
        
        <p><strong>Billing:</strong> $${data.amount} per ${data.interval}</p>
        <p><strong>Next billing date:</strong> ${data.nextBillingDate}</p>
        
        <a href="${data.platformUrl}/dashboard" style="display: block; background: #059669; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          Access Premium Features
        </a>
      </div>
    `
  }),

  subscriptionExpiry: (data: any) => ({
    subject: 'Your Subscription Expires Soon',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h1 style="color: #92400e; margin: 0 0 15px 0;">Subscription Expiring</h1>
          <p>Hi ${data.name}, your ${data.planName} subscription expires in ${data.daysLeft} days.</p>
          
          <p><strong>Expiry Date:</strong> ${data.expiryDate}</p>
          
          <p>Renew now to continue enjoying premium features without interruption.</p>
          
          <a href="${data.platformUrl}/billing" style="display: block; background: #f59e0b; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
            Renew Subscription
          </a>
        </div>
      </div>
    `
  }),

  paymentSuccess: (data: any) => ({
    subject: 'Payment Received - Thank You!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #059669;">Payment Successful</h1>
        <p>Hi ${data.name}, thank you for your payment!</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Amount:</strong> $${data.amount}</p>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Period:</strong> ${data.billingPeriod}</p>
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${data.paymentDate}</p>
        </div>
        
        <p>Your subscription is now active until ${data.nextBillingDate}.</p>
        
        <a href="${data.platformUrl}/billing" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
          View Billing History
        </a>
      </div>
    `
  }),

  paymentFailed: (data: any) => ({
    subject: 'Payment Failed - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h1 style="color: #dc2626; margin: 0 0 15px 0;">Payment Failed</h1>
          <p>Hi ${data.name}, we couldn't process your payment for ${data.planName}.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Amount:</strong> $${data.amount}</p>
            <p><strong>Reason:</strong> ${data.failureReason}</p>
            <p><strong>Date:</strong> ${data.attemptDate}</p>
          </div>
          
          <p>Please update your payment method to avoid service interruption.</p>
          
          <a href="${data.platformUrl}/billing/payment-methods" style="display: block; background: #dc2626; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
            Update Payment Method
          </a>
        </div>
      </div>
    `
  }),

  accountSuspension: (data: any) => ({
    subject: 'Account Suspension Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
          <h1 style="color: #dc2626; margin: 0 0 15px 0;">Account Suspended</h1>
          <p>Hi ${data.name}, your account has been temporarily suspended.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p><strong>Suspension Date:</strong> ${data.suspensionDate}</p>
            ${data.duration ? `<p><strong>Duration:</strong> ${data.duration}</p>` : ''}
          </div>
          
          <p>To appeal this decision or resolve the issue, please contact our support team.</p>
          
          <a href="${data.platformUrl}/support" style="display: block; background: #dc2626; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
            Contact Support
          </a>
        </div>
      </div>
    `
  }),

  bulkCampaign: (data: any) => ({
    subject: data.subject || 'Important Update from PickFirst Real Estate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">${data.title}</h1>
        <p>Hi ${data.name},</p>
        
        <div style="margin: 20px 0;">
          ${data.content}
        </div>
        
        ${data.callToAction ? `
          <a href="${data.callToActionUrl}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 12px; border-radius: 6px; text-decoration: none; margin: 20px 0;">
            ${data.callToAction}
          </a>
        ` : ''}
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #64748b; font-size: 12px;">
            You're receiving this email because you're a valued member of PickFirst Real Estate. 
            ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}" style="color: #64748b;">Unsubscribe</a>` : ''}
          </p>
        </div>
      </div>
    `
  })
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, template, data, subject }: EmailRequest = await req.json();

    console.log(`Sending email template "${template}" to ${to}`);

    if (!templates[template as keyof typeof templates]) {
      throw new Error(`Template "${template}" not found`);
    }

    const templateFunction = templates[template as keyof typeof templates];
    const emailContent = templateFunction(data);

    const { error } = await resend.emails.send({
      from: "PickFirst Real Estate <onboarding@resend.dev>",
      to: [to],
      subject: subject || emailContent.subject,
      html: emailContent.html,
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
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);