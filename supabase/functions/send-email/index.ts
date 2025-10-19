import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
const { Resend } = await import("https://esm.sh/resend@4.0.0");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Brand colors
const BRAND_COLORS = {
  primary: '#FFD700',      // Gold
  secondary: '#000000',    // Black
  accent: '#FFC700',       // Darker gold
  text: '#1a1a1a',         // Dark text
  textLight: '#666666',    // Light text
  background: '#ffffff',   // White
  lightBg: '#FFFEF0',      // Light gold background
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  error: '#EF4444',        // Red
  info: '#3B82F6'          // Blue
};

// Enhanced email styles
const commonStyles = `
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 20px 15px !important; }
      .mobile-text { font-size: 14px !important; }
      .mobile-heading { font-size: 22px !important; }
      .property-card { padding: 15px !important; }
    }
  </style>
`;

// Enhanced email header with gradient
const getEmailHeader = () => `
  <div style="background: linear-gradient(135deg, ${BRAND_COLORS.secondary} 0%, #2a2a2a 100%); padding: 40px 20px; text-align: center; border-bottom: 4px solid ${BRAND_COLORS.primary};">
    <img src="https://pickfirst.com.au/logo.png" alt="PickFirst Real Estate" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
    <p style="color: ${BRAND_COLORS.primary}; margin: 10px 0 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Your Trusted Property Partner</p>
  </div>
`;

// Enhanced email footer
const getEmailFooter = () => `
  <div style="background: ${BRAND_COLORS.lightBg}; padding: 30px 20px; margin-top: 40px; border-top: 3px solid ${BRAND_COLORS.primary};">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <img src="https://pickfirst.com.au/logo.png" alt="PickFirst" style="max-width: 120px; height: auto; opacity: 0.8;" />
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <p style="margin: 0 0 15px 0; color: ${BRAND_COLORS.text}; font-size: 16px; font-weight: bold;">
            PickFirst Real Estate
          </p>
          <p style="margin: 0 0 20px 0; color: ${BRAND_COLORS.textLight}; font-size: 14px; line-height: 1.6;">
            Your trusted partner in finding the perfect property
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 10px;">
                <a href="mailto:info@pickfirst.com.au" style="color: ${BRAND_COLORS.textLight}; text-decoration: none; font-size: 14px;">
                  📧 Email Us
                </a>
              </td>
              <td style="padding: 0 10px; color: ${BRAND_COLORS.textLight};">|</td>
              <td style="padding: 0 10px;">
                <a href="https://pickfirst.com.au" style="color: ${BRAND_COLORS.textLight}; text-decoration: none; font-size: 14px;">
                  🌐 Visit Website
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 20px;">
          <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
            © 2024 PickFirst Real Estate. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

// Enhanced button style with hover effect
const getButton = (url: string, text: string, isPrimary = true) => `
  <a href="${url}" style="display: inline-block; background: ${isPrimary ? BRAND_COLORS.primary : BRAND_COLORS.secondary}; color: ${isPrimary ? BRAND_COLORS.secondary : BRAND_COLORS.primary}; font-weight: bold; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; margin: 20px 0; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease;">
    ${text} →
  </a>
`;

// Property card component with image
const getPropertyCard = (property: any) => `
  <div class="property-card" style="border: 2px solid ${BRAND_COLORS.primary}; border-radius: 12px; overflow: hidden; margin: 25px 0; background: ${BRAND_COLORS.background}; box-shadow: 0 6px 20px rgba(0,0,0,0.1);">
    ${property.image ? `
      <div style="position: relative; width: 100%; height: 0; padding-bottom: 60%; overflow: hidden; background: #f0f0f0;">
        <img src="${property.image}" alt="${property.title}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; top: 15px; right: 15px; background: ${BRAND_COLORS.primary}; color: ${BRAND_COLORS.secondary}; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ${property.badge || 'NEW'}
        </div>
      </div>
    ` : ''}
    <div style="padding: 25px;">
      <h2 style="margin: 0 0 12px 0; color: ${BRAND_COLORS.secondary}; font-size: 22px; font-weight: bold;">
        ${property.title}
      </h2>
      <p style="margin: 0 0 15px 0; font-size: 28px; font-weight: bold; color: ${BRAND_COLORS.secondary};">
        ${property.price ? `$${property.price.toLocaleString()}` : property.priceText || 'Contact for price'}
      </p>
      <p style="margin: 0 0 15px 0; color: ${BRAND_COLORS.text}; font-size: 15px; display: flex; align-items: center;">
        📍 ${property.location}
      </p>
      ${property.description ? `
        <p style="margin: 0 0 15px 0; color: ${BRAND_COLORS.textLight}; font-size: 14px; line-height: 1.6;">
          ${property.description}
        </p>
      ` : ''}
      <div style="display: flex; gap: 20px; margin: 15px 0; padding: 15px; background: ${BRAND_COLORS.lightBg}; border-radius: 8px;">
        ${property.bedrooms ? `
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 24px; margin-bottom: 5px;">🛏️</div>
            <div style="color: ${BRAND_COLORS.text}; font-weight: bold;">${property.bedrooms}</div>
            <div style="color: ${BRAND_COLORS.textLight}; font-size: 12px;">Bedrooms</div>
          </div>
        ` : ''}
        ${property.bathrooms ? `
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 24px; margin-bottom: 5px;">🚿</div>
            <div style="color: ${BRAND_COLORS.text}; font-weight: bold;">${property.bathrooms}</div>
            <div style="color: ${BRAND_COLORS.textLight}; font-size: 12px;">Bathrooms</div>
          </div>
        ` : ''}
        ${property.parking ? `
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 24px; margin-bottom: 5px;">🚗</div>
            <div style="color: ${BRAND_COLORS.text}; font-weight: bold;">${property.parking}</div>
            <div style="color: ${BRAND_COLORS.textLight}; font-size: 12px;">Parking</div>
          </div>
        ` : ''}
        ${property.landSize ? `
          <div style="text-align: center; flex: 1;">
            <div style="font-size: 24px; margin-bottom: 5px;">📏</div>
            <div style="color: ${BRAND_COLORS.text}; font-weight: bold;">${property.landSize}</div>
            <div style="color: ${BRAND_COLORS.textLight}; font-size: 12px;">Land Size</div>
          </div>
        ` : ''}
      </div>
      ${property.features?.length > 0 ? `
        <div style="margin: 15px 0;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${property.features.map((feature: string) => `
              <span style="background: ${BRAND_COLORS.lightBg}; color: ${BRAND_COLORS.text}; padding: 6px 12px; border-radius: 20px; font-size: 12px; border: 1px solid ${BRAND_COLORS.primary};">
                ✓ ${feature}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${property.url ? `
        <div style="margin-top: 20px; text-align: center;">
          ${getButton(property.url, 'View Full Details')}
        </div>
      ` : ''}
    </div>
  </div>
`;

const templates = {
  // Enhanced Welcome Email with Email Verification
  signupVerification: (data: any) => ({
    subject: `Verify Your Email - Welcome to ${data.platformName || 'PickFirst Real Estate'}`,
    text: `Welcome to PickFirst Real Estate!

Hi ${data.name || 'there'},

Thank you for joining PickFirst Real Estate! We're excited to help you find your perfect property.

To get started, please verify your email address by clicking the link below:
${data.verificationUrl}

This link will expire in 24 hours for security reasons.

What's Next After Verification:
- Set up your property preferences
- Browse our curated property listings
- Get instant alerts for new matches
- Connect with our expert agents

Need help? Contact our support team at support@pickfirst.com.au

Best regards,
PickFirst Real Estate Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${commonStyles}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
              <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0;">
                Welcome to PickFirst Real Estate!
              </h1>
            </div>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px; text-align: center;">
              Hi ${data.name || 'there'}, welcome to the future of property searching!
            </p>
            
            <div style="background: linear-gradient(135deg, ${BRAND_COLORS.info}, #60A5FA); padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              <div style="font-size: 48px; margin-bottom: 15px;">✉️</div>
              <h2 style="color: white; margin: 0 0 15px 0; font-size: 20px;">Verify Your Email Address</h2>
              <p style="color: white; font-size: 14px; margin: 0 0 25px 0; opacity: 0.95;">
                Click the button below to verify your email and activate your account
              </p>
              <a href="${data.verificationUrl}" style="display: inline-block; background: white; color: ${BRAND_COLORS.info}; font-weight: bold; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                Verify Email Address →
              </a>
              <p style="color: white; font-size: 12px; margin: 20px 0 0 0; opacity: 0.85;">
                This link expires in 24 hours
              </p>
            </div>
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid ${BRAND_COLORS.primary};">
              <h2 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 20px;">What's Next After Verification?</h2>
              <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.text};">
                <li style="margin-bottom: 10px;">✓ Set up your property preferences</li>
                <li style="margin-bottom: 10px;">✓ Browse our curated property listings</li>
                <li style="margin-bottom: 10px;">✓ Get instant alerts for new matches</li>
                <li style="margin-bottom: 10px;">✓ Connect with our expert agents</li>
              </ul>
            </div>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                <strong>💡 Tip:</strong> If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${data.verificationUrl}" style="color: ${BRAND_COLORS.info}; word-break: break-all; font-size: 12px;">${data.verificationUrl}</a>
              </p>
            </div>
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid ${BRAND_COLORS.primary};">
              <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
                Need help getting started? Contact our support team at 
                <a href="mailto:support@pickfirst.com.au" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">support@pickfirst.com.au</a>
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
    `
  }),

  // Regular Welcome Email with Email Verification Link
  welcome: (data: any) => ({
    subject: `Verify Your Email - Welcome to ${data.platformName || 'PickFirst Real Estate'}`,
    text: `Welcome to PickFirst Real Estate!

Hi ${data.name || 'there'},

Thank you for joining PickFirst Real Estate! We're excited to help you find your perfect property.

${data.verificationUrl ? `To get started, please verify your email address by clicking the link below:\n${data.verificationUrl}\n\nThis link will expire in 24 hours for security reasons.\n` : ''}

What's Next${data.verificationUrl ? ' After Verification' : ''}:
- Set up your property preferences
- Browse our curated property listings
- Get instant alerts for new matches
- Connect with our expert agents

Get started: ${data.platformUrl || 'https://pickfirst.com.au'}

Need help? Contact our support team at support@pickfirst.com.au

Best regards,
PickFirst Real Estate Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${commonStyles}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
              <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0;">
                Welcome to PickFirst Real Estate!
              </h1>
            </div>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px; text-align: center;">
              Hi ${data.name || 'there'}, welcome to the future of property searching!
            </p>
            
            ${data.verificationUrl ? `
            <div style="background: linear-gradient(135deg, ${BRAND_COLORS.info}, #60A5FA); padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              <div style="font-size: 48px; margin-bottom: 15px;">✉️</div>
              <h2 style="color: white; margin: 0 0 15px 0; font-size: 20px;">Verify Your Email Address</h2>
              <p style="color: white; font-size: 14px; margin: 0 0 25px 0; opacity: 0.95;">
                Click the button below to verify your email and activate your account
              </p>
              <a href="${data.verificationUrl}" style="display: inline-block; background: white; color: ${BRAND_COLORS.info}; font-weight: bold; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                Verify Email Address →
              </a>
              <p style="color: white; font-size: 12px; margin: 20px 0 0 0; opacity: 0.85;">
                This link expires in 24 hours
              </p>
            </div>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                <strong>💡 Tip:</strong> If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${data.verificationUrl}" style="color: ${BRAND_COLORS.info}; word-break: break-all; font-size: 12px;">${data.verificationUrl}</a>
              </p>
            </div>
            ` : ''}
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid ${BRAND_COLORS.primary};">
              <h2 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 20px;">What's Next${data.verificationUrl ? ' After Verification' : ''}?</h2>
              <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.text};">
                <li style="margin-bottom: 10px;">✓ Set up your property preferences</li>
                <li style="margin-bottom: 10px;">✓ Browse our curated property listings</li>
                <li style="margin-bottom: 10px;">✓ Get instant alerts for new matches</li>
                <li style="margin-bottom: 10px;">✓ Connect with our expert agents</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              ${getButton(data.platformUrl || 'https://pickfirst.com.au', 'Get Started')}
            </div>
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid ${BRAND_COLORS.primary};">
              <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
                Need help getting started? Contact our support team at 
                <a href="mailto:support@pickfirst.com.au" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">support@pickfirst.com.au</a>
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
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
    subject: 'Password Reset Request - PickFirst Real Estate',
    text: `Password Reset Request

Hi ${data.name},

We received a request to reset your password for your PickFirst Real Estate account.

To reset your password, click the link below:
${data.resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this reset, please ignore this email. Your account remains secure.

Best regards,
PickFirst Real Estate Team`,
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
  // Enhanced Property Alert with Image
  propertyAlert: (data: any) => ({
    subject: `Property Alert: ${data.propertyTitle} - ${data.location || 'New Match Found'}`,
    text: `New Property Match Found

Hi ${data.name},

We found a property that matches your search criteria:

Property: ${data.propertyTitle}
Price: ${data.price ? `$${data.price.toLocaleString()}` : 'Contact for price'}
Location: ${data.location}
Bedrooms: ${data.bedrooms || 'N/A'}
Bathrooms: ${data.bathrooms || 'N/A'}

View full details: ${data.propertyUrl || 'https://pickfirst.com.au'}

This alert was sent based on your saved search preferences.
To update your preferences, visit: ${data.unsubscribeUrl || 'https://pickfirst.com.au/preferences'}

Best regards,
PickFirst Real Estate Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${commonStyles}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: ${BRAND_COLORS.lightBg}; padding: 10px 20px; border-radius: 25px; border: 2px solid ${BRAND_COLORS.primary};">
                <span style="font-size: 24px; margin-right: 8px;">🏠</span>
                <span style="color: ${BRAND_COLORS.secondary}; font-weight: bold;">Property Alert</span>
              </div>
            </div>
            
            <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 28px; text-align: center;">
              New Property Match
            </h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; text-align: center; margin-bottom: 30px;">
              Hi ${data.name}, a property matching your search criteria has been found
            </p>
            
            ${getPropertyCard({
              title: data.propertyTitle,
              price: data.price,
              location: data.location,
              bedrooms: data.bedrooms,
              bathrooms: data.bathrooms,
              propertyType: data.propertyType,
              image: data.image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center',
              description: data.description || 'A beautiful property that matches your search criteria perfectly.',
              features: data.features || ['Modern Design', 'Prime Location', 'Great Investment'],
              url: data.propertyUrl,
              badge: 'NEW MATCH'
            })}
            
            <div style="text-align: center; margin: 40px 0;">
              ${getButton(data.propertyUrl || '#', 'View Full Details')}
            </div>
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid ${BRAND_COLORS.primary};">
              <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
                This property was found based on your saved search preferences. 
                <a href="${data.unsubscribeUrl || '#'}" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">Update preferences</a>
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
    `
  }),

  // Enhanced Weekly Property Digest
  newMatchesDigest: (data: any) => ({
    subject: `Weekly Property Update: ${data.matches?.length || 0} New Properties Found`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${commonStyles}
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background};">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: ${BRAND_COLORS.lightBg}; padding: 10px 20px; border-radius: 25px; border: 2px solid ${BRAND_COLORS.primary};">
                <span style="font-size: 24px; margin-right: 8px;">📊</span>
                <span style="color: ${BRAND_COLORS.secondary}; font-weight: bold;">Weekly Update</span>
              </div>
            </div>
            
            <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 28px; text-align: center;">
              Property Search Update
            </h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; text-align: center; margin-bottom: 30px;">
              Hi ${data.name}, ${data.matches?.length || 0} new properties matching your criteria have been found
            </p>
            
            ${data.matches?.map((match: any) => getPropertyCard({
              title: match.title,
              price: match.price,
              location: `${match.city}, ${match.state}`,
              bedrooms: match.bedrooms,
              bathrooms: match.bathrooms,
              propertyType: match.propertyType,
              image: match.image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center',
              description: match.description || 'A beautiful property that matches your search criteria.',
              features: match.features || ['Great Location', 'Modern Features'],
              url: match.url,
              badge: 'NEW'
            })).join('') || `
              <div style="text-align: center; padding: 40px; background: ${BRAND_COLORS.lightBg}; border-radius: 12px; border: 2px solid ${BRAND_COLORS.primary};">
                <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 10px 0;">No New Matches This Week</h3>
                <p style="color: ${BRAND_COLORS.textLight}; margin: 0;">We'll keep searching for properties that match your criteria.</p>
              </div>
            `}
            
            <div style="text-align: center; margin: 40px 0;">
              ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/browse', 'Browse All Properties')}
            </div>
            
            <div style="background: ${BRAND_COLORS.lightBg}; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid ${BRAND_COLORS.primary};">
              <p style="margin: 0; color: ${BRAND_COLORS.textLight}; font-size: 12px;">
                These properties were found based on your saved search preferences. 
                <a href="${data.unsubscribeUrl || '#'}" style="color: ${BRAND_COLORS.textLight}; text-decoration: underline;">Update preferences</a>
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
    `
  }),

  // Appointments
  appointmentConfirmation: (data: any) => ({
    subject: `Appointment Confirmation - ${data.propertyTitle}`,
    text: `Appointment Confirmation

Hi ${data.name},

Your property viewing appointment has been confirmed:

Property: ${data.propertyTitle}
Date: ${data.date}
Time: ${data.time}
Agent: ${data.agentName}
Location: ${data.propertyAddress}

If you need to reschedule or cancel, please contact us at info@pickfirst.com.au

Best regards,
PickFirst Real Estate Team`,
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
    subject: 'Payment Confirmation - PickFirst Real Estate',
    text: `Payment Confirmation

Hi ${data.name},

Your payment has been successfully processed.

Amount: ${data.amount}
Plan: ${data.planName}
Date: ${data.paymentDate}
Transaction ID: ${data.transactionId}

Access your dashboard: ${data.dashboardUrl || 'https://pickfirst.com.au/dashboard'}

Questions? Contact billing@pickfirst.com.au

Best regards,
PickFirst Real Estate Team`,
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
    
    if (!templates[template as keyof typeof templates]) {
      throw new Error(`Template "${template}" not found. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    const templateFunction = templates[template as keyof typeof templates];
    const emailContent = templateFunction(data);

    // Create a simple text version for better deliverability
    const textContent = (emailContent as any).text || emailContent.subject;
    
    // Define which templates should be treated as transactional vs promotional
    const transactionalTemplates = [
      'welcome', 'agentWelcome', 'buyerWelcome', 'passwordReset', 
      'appointmentConfirmation', 'appointmentNotification', 'appointmentStatusUpdate',
      'paymentSuccess', 'paymentFailed', 'accountSuspension', 'securityAlert',
      'messageNotification', 'leadAssignment', 'propertyViewing', 'followUp',
      'subscriptionUpgrade', 'subscriptionExpiry', 'profileUpdate'
    ];
    
    const isTransactional = transactionalTemplates.includes(template);
    
    // Configure email settings based on template type
    const emailConfig = {
      from: "PickFirst Real Estate <info@pickfirst.com.au>",
      to: [to],
      subject: subject || emailContent.subject,
      html: emailContent.html,
      text: textContent,
      ...(isTransactional ? {
        // Transactional email configuration
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'X-Mailer': 'PickFirst Real Estate System',
          'X-Category': 'transactional',
          'X-Entity-Ref-ID': `pf-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'X-Transaction-Type': template,
          'Precedence': 'bulk'
        },
        tags: [
          {
            name: 'category',
            value: 'transactional'
          },
          {
            name: 'type',
            value: template
          }
        ]
      } : {
        // Promotional email configuration
        headers: {
          'X-Mailer': 'PickFirst Real Estate System',
          'X-Category': 'marketing',
          'X-Entity-Ref-ID': `pf-promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'List-Unsubscribe': '<mailto:unsubscribe@pickfirst.com.au?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        tags: [
          {
            name: 'category',
            value: 'marketing'
          },
          {
            name: 'type',
            value: template
          }
        ]
      })
    };
    
    const { error } = await resend.emails.send(emailConfig);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);