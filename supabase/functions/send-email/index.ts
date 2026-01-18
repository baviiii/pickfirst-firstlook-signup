import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
const { Resend } = await import("https://esm.sh/resend@4.0.0");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// Brand colors - PickFirst Yellowish Theme
const BRAND_COLORS = {
  primary: '#EAB308',      // PickFirst Yellow
  secondary: '#1F2937',    // Dark text
  accent: '#F59E0B',       // Amber
  text: '#374151',         // Dark text
  textLight: '#78350F',    // Yellowish brown text
  background: '#FFFFFF',   // White
  lightBg: '#FFFBEB',      // Light yellowish background
  lighterBg: '#FEF9E7',    // Very light yellowish
  yellowBg: '#FEF3C7',     // Yellow background
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber/Orange
  error: '#EF4444',        // Red
  info: '#EAB308'          // Yellow (replacing blue)
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

// Enhanced email header with yellowish gradient
const getEmailHeader = () => `
  <div style="background: linear-gradient(135deg, #EAB308 0%, #F59E0B 100%); padding: 40px 20px; text-align: center; border-bottom: 4px solid #FCD34D;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 12px;">
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="vertical-align: middle; padding-right: 12px;">
                <img src="https://rkwvgqozbpqgmpbvujgz.supabase.co/storage/v1/object/public/logo/logo.jpg" alt="PickFirst" style="max-width: 80px; height: auto; max-height: 50px; border-radius: 6px; display: block; vertical-align: middle;" />
              </td>
              <td style="vertical-align: middle;">
                <h1 style="color: #1F2937; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; line-height: 1.2; vertical-align: middle;">PickFirst</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <p style="color: #78350F; margin: 5px 0 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Your Trusted Property Partner</p>
        </td>
      </tr>
    </table>
  </div>
`;

// Enhanced email footer with yellowish theme
const getEmailFooter = () => `
  <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 30px 20px; margin-top: 40px; border-top: 3px solid #EAB308;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="vertical-align: middle; padding-right: 10px;">
                <img src="https://rkwvgqozbpqgmpbvujgz.supabase.co/storage/v1/object/public/logo/logo.jpg" alt="PickFirst" style="max-width: 60px; height: auto; max-height: 40px; opacity: 0.9; border-radius: 4px; display: block; vertical-align: middle;" />
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0; color: #1F2937; font-size: 18px; font-weight: 700; line-height: 1.2; vertical-align: middle;">
                  PickFirst Real Estate
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <p style="margin: 0 0 20px 0; color: #78350F; font-size: 14px; line-height: 1.6; font-weight: 500;">
            Your trusted partner in finding the perfect property
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align: center;">
          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td style="padding: 0 10px;">
                <a href="mailto:support@pickfirst.com.au" style="color: #EAB308; text-decoration: none; font-size: 14px; font-weight: 600;">
                  📧 Email Us
                </a>
              </td>
              <td style="padding: 0 10px; color: #FCD34D;">|</td>
              <td style="padding: 0 10px;">
                <a href="https://pickfirst.com.au" style="color: #EAB308; text-decoration: none; font-size: 14px; font-weight: 600;">
                  🌐 Visit Website
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 20px;">
          <p style="margin: 0; color: #92400E; font-size: 12px; font-weight: 500;">
            © 2026 PickFirst Real Estate. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

// Enhanced button style with yellowish theme
const getButton = (url: string, text: string, isPrimary = true) => `
  <a href="${url}" style="display: inline-block; background: ${isPrimary ? 'linear-gradient(135deg, #EAB308 0%, #F59E0B 100%)' : '#1F2937'}; color: ${isPrimary ? '#000000' : '#EAB308'}; font-weight: 700; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; margin: 20px 0; font-size: 16px; box-shadow: 0 4px 16px rgba(234, 179, 8, 0.35); transition: all 0.3s ease;">
    ${text} →
  </a>
`;

// Property card component with image (full size - for single property emails)
const getPropertyCard = (property: any) => {
  // Get the first image from images array or use the image property
  const imageUrl = property.images?.[0] || property.image || '';
  
  const priceDisplay =
    typeof property.priceDisplay === 'string' && property.priceDisplay.trim().length > 0
      ? property.priceDisplay.trim()
      : typeof property.price === 'number' && property.price > 0
        ? `$${property.price.toLocaleString()}`
        : property.priceText || 'Contact for price';

  return `
  <div style="background: white; border-radius: 16px; overflow: hidden; margin: 25px 0; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    ${imageUrl ? `
      <div style="position: relative; width: 100%; height: 300px; overflow: hidden; background: #f0f0f0;">
        <img src="${imageUrl}" alt="${property.title || 'Property'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        ${property.badge ? `
          <div style="position: absolute; top: 16px; right: 16px; background: linear-gradient(135deg, #EAB308, #F59E0B); color: #1F2937; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4);">
            ${property.badge}
          </div>
        ` : ''}
      </div>
    ` : ''}
    <div style="padding: 28px;">
      <div style="font-size: 28px; font-weight: 700; color: #000000; margin-bottom: 12px;">
        ${priceDisplay}
      </div>
      <div style="font-size: 18px; color: #000000; margin-bottom: 16px; font-weight: 500;">
        ${property.location}
      </div>
      ${property.description ? `
        <p style="margin: 0 0 20px 0; color: #000000; font-size: 15px; line-height: 1.7;">
          ${property.description}
        </p>
      ` : ''}
      <div style="display: flex; gap: 20px; margin: 20px 0; padding: 16px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        ${property.bedrooms ? `
          <span style="font-size: 15px; color: #000000;">🛏️ ${property.bedrooms} bed</span>
        ` : ''}
        ${property.bathrooms ? `
          <span style="font-size: 15px; color: #000000;">🛁 ${property.bathrooms} bath</span>
        ` : ''}
        ${property.parking ? `
          <span style="font-size: 15px; color: #000000;">🚗 ${property.parking} car</span>
        ` : ''}
        ${property.landSize ? `
          <span style="font-size: 15px; color: #000000;">📐 ${property.landSize}</span>
        ` : ''}
      </div>
      ${property.features?.length > 0 ? `
        <div style="margin: 20px 0;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${property.features.map((feature: string) => `
              <span style="background: #FEF3C7; color: #000000; padding: 6px 12px; border-radius: 6px; font-size: 13px; border: 1px solid #EAB308;">
                ✓ ${feature}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${property.url ? `
        <div style="margin-top: 20px;">
          <a href="${property.url}" style="display: inline-block; background: linear-gradient(135deg, #EAB308, #F59E0B); color: #000000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);">View Property</a>
        </div>
      ` : ''}
    </div>
  </div>
`;
};

// Compact property card for digest emails (smaller, cleaner)
const getCompactPropertyCard = (property: any) => {
  const imageUrl = property.images?.[0] || property.image || '';
  
  const priceDisplay =
    typeof property.priceDisplay === 'string' && property.priceDisplay.trim().length > 0
      ? property.priceDisplay.trim()
      : typeof property.price === 'number' && property.price > 0
        ? `$${property.price.toLocaleString()}`
        : property.priceText || 'Contact for price';

  return `
  <div style="background: #FFFBEB; border-radius: 10px; overflow: hidden; margin: 12px 0; border: 1px solid #EAB308; box-shadow: 0 2px 6px rgba(234, 179, 8, 0.15);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${imageUrl ? `
          <td style="width: 120px; vertical-align: top;">
            <div style="position: relative; width: 120px; height: 100px; overflow: hidden; background: #FEF3C7;">
              <img src="${imageUrl}" alt="${property.title || 'Property'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              ${property.badge ? `
                <div style="position: absolute; top: 6px; left: 6px; background: linear-gradient(135deg, #EAB308, #F59E0B); color: #000000; padding: 3px 8px; border-radius: 10px; font-weight: 700; font-size: 9px; text-transform: uppercase;">
                  ${property.badge}
                </div>
              ` : ''}
            </div>
          </td>
        ` : ''}
        <td style="padding: 12px 14px; vertical-align: top;">
          <div style="font-size: 16px; font-weight: 700; color: #000000; margin-bottom: 4px;">
            ${priceDisplay}
          </div>
          <div style="font-size: 12px; color: #000000; margin-bottom: 6px; font-weight: 500;">
            ${property.location}
          </div>
          <div style="margin-bottom: 8px;">
            ${property.bedrooms ? `<span style="font-size: 11px; color: #000000; margin-right: 10px;">🛏️ ${property.bedrooms}</span>` : ''}
            ${property.bathrooms ? `<span style="font-size: 11px; color: #000000; margin-right: 10px;">🛁 ${property.bathrooms}</span>` : ''}
            ${property.parking ? `<span style="font-size: 11px; color: #000000;">🚗 ${property.parking}</span>` : ''}
          </div>
          ${property.url ? `
            <a href="${property.url}" style="display: inline-block; background: linear-gradient(135deg, #EAB308, #F59E0B); color: #000000; padding: 6px 14px; border-radius: 5px; text-decoration: none; font-weight: 600; font-size: 11px;">View →</a>
          ` : ''}
        </td>
      </tr>
    </table>
  </div>
`;
};

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
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
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
                <a href="${data.verificationUrl}" style="display: inline-block; background: #1F2937; color: #EAB308; font-weight: 700; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(31, 41, 55, 0.3);">
                Verify Email Address →
              </a>
              <p style="color: #78350F; font-size: 12px; margin: 20px 0 0 0; font-weight: 500;">
                ⏰ This link expires in 24 hours
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);">
              <h2 style="color: #EAB308; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">What's Next After Verification?</h2>
              <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Set up your property preferences</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Browse our curated property listings</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Get instant alerts for new matches</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Connect with our expert agents</li>
              </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                <strong>💡 Tip:</strong> If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${data.verificationUrl}" style="color: #EAB308; word-break: break-all; font-size: 12px; font-weight: 600; text-decoration: underline;">${data.verificationUrl}</a>
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #FEF3C7;">
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                Need help getting started? Contact our support team at 
                <a href="mailto:support@pickfirst.com.au" style="color: #EAB308; text-decoration: none; font-weight: 600;">support@pickfirst.com.au</a>
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
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
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
            <div style="background: linear-gradient(135deg, #EAB308 0%, #F59E0B 100%); padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; box-shadow: 0 4px 16px rgba(234, 179, 8, 0.35);">
              <div style="font-size: 48px; margin-bottom: 15px;">✉️</div>
              <h2 style="color: #1F2937; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
              <p style="color: #78350F; font-size: 14px; margin: 0 0 25px 0; font-weight: 500;">
                Click the button below to verify your email and activate your account
              </p>
              <a href="${data.verificationUrl}" style="display: inline-block; background: #1F2937; color: #EAB308; font-weight: 700; text-align: center; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 12px rgba(31, 41, 55, 0.3);">
                Verify Email Address →
              </a>
              <p style="color: #78350F; font-size: 12px; margin: 20px 0 0 0; font-weight: 500;">
                ⏰ This link expires in 24 hours
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #EAB308;">
              <p style="margin: 0; color: #78350F; font-size: 14px; line-height: 1.6;">
                <strong style="color: #92400E;">💡 Tip:</strong> If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${data.verificationUrl}" style="color: #EAB308; word-break: break-all; font-size: 12px; font-weight: 600; text-decoration: underline;">${data.verificationUrl}</a>
              </p>
            </div>
            ` : ''}
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);">
              <h2 style="color: #EAB308; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">What's Next${data.verificationUrl ? ' After Verification' : ''}?</h2>
              <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Set up your property preferences</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Browse our curated property listings</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Get instant alerts for new matches</li>
                <li style="margin-bottom: 10px; font-size: 15px;">✓ Connect with our expert agents</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              ${getButton(data.platformUrl || 'https://pickfirst.com.au', 'Get Started')}
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #FEF3C7;">
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                Need help getting started? Contact our support team at 
                <a href="mailto:support@pickfirst.com.au" style="color: #EAB308; text-decoration: none; font-weight: 600;">support@pickfirst.com.au</a>
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Welcome Agent ${data.name}!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Your agent account has been activated. Start managing your listings and connecting with clients.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Welcome ${data.name}!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Start your property search with PickFirst Real Estate's comprehensive platform.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #EAB308;">
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

  clientInvite: (data: any) => ({
    subject: `${data.agentName || 'Your agent'} invited you to join PickFirst Properties`,
    text: `Hello ${data.recipientName || 'there'}!

${data.agentName || 'Your agent'} has added you as a client and would like to invite you to join our property platform.

Why join?
- Browse exclusive property listings
- Save and track your favorite properties
- Direct messaging with your agent
- Get personalized property recommendations
- Schedule property viewings

Accept your invitation and create your account:
${data.signupUrl || 'https://pickfirst.com.au/auth?signup=true'}

This invitation will link your account with ${data.agentName || 'your agent'}'s client records, making it easier to manage your property search journey.

If you didn't expect this invitation, you can safely ignore this email.

Questions? Contact your agent ${data.agentName || ''} directly.

© 2026 PickFirst Properties. All rights reserved.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${commonStyles}
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🏡</div>
              <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0;">
                Welcome to PickFirst Properties!
              </h1>
            </div>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px;">
              Hello ${data.recipientName || 'there'}!
            </p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px;">
              ${data.agentName || 'Your agent'} has added you as a client and would like to invite you to join our property platform.
            </p>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #EAB308;">
              <h2 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 20px;">Why join?</h2>
              <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.text}; line-height: 1.8;">
                <li style="margin-bottom: 10px;">Browse exclusive property listings</li>
                <li style="margin-bottom: 10px;">Save and track your favorite properties</li>
                <li style="margin-bottom: 10px;">Direct messaging with your agent</li>
                <li style="margin-bottom: 10px;">Get personalized property recommendations</li>
                <li style="margin-bottom: 10px;">Schedule property viewings</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              ${getButton(data.signupUrl || 'https://pickfirst.com.au/auth?signup=true', 'Accept Invitation & Create Account')}
            </div>
            
            <p style="color: #78350F; font-size: 14px; margin: 20px 0;">
              This invitation will link your account with ${data.agentName || 'your agent'}'s client records, making it easier to manage your property search journey.
            </p>
            
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #FEF3C7;">
              <p style="margin: 0; color: #78350F; font-size: 12px;">
                Questions? Contact your agent ${data.agentName || ''} directly.
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
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
Price: ${typeof data.priceDisplay === 'string' && data.priceDisplay.trim().length > 0
  ? data.priceDisplay.trim()
  : data.price
    ? `$${data.price.toLocaleString()}`
    : 'Contact for price'}
Location: ${data.location}
Bedrooms: ${data.bedrooms || 'N/A'}
Bathrooms: ${data.bathrooms || 'N/A'}
${data.matchingFeatures?.length > 0 ? `\nMatching Features:\n${data.matchingFeatures.map((f: string) => `- ${f}`).join('\n')}` : ''}

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
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 10px 20px; border-radius: 25px; border: 2px solid #EAB308;">
                <span style="font-size: 24px; margin-right: 8px;">🏠</span>
                <span style="color: #000000; font-weight: bold;">Property Alert</span>
              </div>
            </div>
            
            <h1 class="mobile-heading" style="color: #000000; margin: 0 0 15px 0; font-size: 28px; text-align: center;">
              New Property Match
            </h1>
            <p style="color: #000000; font-size: 16px; text-align: center; margin-bottom: 30px;">
              Hi ${data.name}, a property matching your search criteria has been found
            </p>
            
            ${data.matchingFeatures?.length > 0 ? `
              <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%); padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #EAB308;">
                <div style="color: #000000; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 20px;">✨</span>
                  <span>Matching Your Preferences:</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${data.matchingFeatures.map((feature: string) => `
                    <span style="background: ${BRAND_COLORS.primary}; color: #000000; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                      ✓ ${feature}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${getPropertyCard({
              title: data.propertyTitle,
              price: data.price,
              priceDisplay: data.priceDisplay,
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
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #EAB308;">
              <p style="margin: 0; color: #000000; font-size: 12px;">
                This property was found based on your saved search preferences. 
                <a href="${data.unsubscribeUrl || '#'}" style="color: #000000; text-decoration: underline; font-weight: 600;">Update preferences</a>
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
    `
  }),

  // Enhanced Weekly Property Digest - Compact Layout
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
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 25px 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 8px 16px; border-radius: 20px; border: 2px solid #EAB308;">
                <span style="font-size: 18px; margin-right: 6px;">📊</span>
                <span style="color: #000000; font-weight: bold; font-size: 14px;">Weekly Update</span>
              </div>
            </div>
            
            <h1 class="mobile-heading" style="color: #000000; margin: 0 0 10px 0; font-size: 22px; text-align: center;">
              Property Search Update
            </h1>
            <p style="color: #000000; font-size: 14px; text-align: center; margin-bottom: 20px;">
              Hi ${data.name}, <strong>${data.matches?.length || 0}</strong> new properties matching your criteria
            </p>
            
            ${data.matches?.map((match: any) => getCompactPropertyCard({
              title: match.title,
              price: match.price,
              priceDisplay: match.priceDisplay,
              location: `${match.city}, ${match.state}`,
              bedrooms: match.bedrooms,
              bathrooms: match.bathrooms,
              parking: match.parking,
              image: match.image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&crop=center',
              url: match.url,
              badge: 'NEW'
            })).join('') || `
              <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-radius: 10px; border: 2px solid #EAB308;">
                <div style="font-size: 36px; margin-bottom: 15px;">🔍</div>
                <h3 style="color: #000000; margin: 0 0 8px 0; font-size: 16px;">No New Matches This Week</h3>
                <p style="color: #000000; margin: 0; font-size: 13px;">We'll keep searching for properties that match your criteria.</p>
              </div>
            `}
            
            <div style="text-align: center; margin: 25px 0 20px 0;">
              <a href="${(data.platformUrl || 'https://pickfirst.com.au') + '/browse'}" style="display: inline-block; background: linear-gradient(135deg, #EAB308 0%, #F59E0B 100%); color: #000000; font-weight: 700; text-align: center; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; box-shadow: 0 3px 10px rgba(234, 179, 8, 0.3);">
                Browse All Properties →
              </a>
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #EAB308;">
              <p style="margin: 0; color: #000000; font-size: 11px;">
                Based on your saved search preferences. 
                <a href="${data.unsubscribeUrl || '#'}" style="color: #000000; text-decoration: underline; font-weight: 600;">Update preferences</a>
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Appointment Confirmed</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your property viewing has been confirmed:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.propertyTitle}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Agent:</strong> ${data.agentName}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Contact:</strong> ${data.agentPhone}</p>
          </div>
          
          <div style="background: #FFF9E6; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #FEF3C7;">
            <p style="margin: 0; color: ${BRAND_COLORS.text};"><strong>Reminder:</strong> Please arrive 5 minutes early and bring valid ID.</p>
          </div>
          
          <p style="color: #78350F; font-size: 14px;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Appointment Scheduled</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.agentName}, you have a new appointment:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Appointment Update</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your appointment status has been updated:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Property Viewing Reminder</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, this is a reminder of your upcoming property viewing:
          </p>
          
          <div style="background: #FFF9E6; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #EAB308;">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_COLORS.secondary};">${data.propertyTitle}</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0; font-size: 18px;"><strong>Tomorrow at ${data.time}</strong></p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Address:</strong> ${data.address}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Agent:</strong> ${data.agentName} - ${data.agentPhone}</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 6px; margin: 20px 0;">
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
  preferencesUpdated: (data: any) => {
    // Helper function to format preference values for display
    const formatPreference = (key: string, value: any): { label: string; displayValue: string } | null => {
      if (value === null || value === undefined) return null;
      
      const formatters: Record<string, { label: string; format: (v: any) => string }> = {
        'min_budget': { label: 'Minimum Budget', format: (v) => `$${Number(v).toLocaleString()}` },
        'max_budget': { label: 'Maximum Budget', format: (v) => `$${Number(v).toLocaleString()}` },
        'preferred_bedrooms': { label: 'Bedrooms', format: (v) => `${v}+` },
        'preferred_bathrooms': { label: 'Bathrooms', format: (v) => `${v}+` },
        'preferred_garages': { label: 'Garages', format: (v) => `${v}+` },
        'preferred_square_feet_min': { label: 'Min Square Feet', format: (v) => `${Number(v).toLocaleString()} sq ft` },
        'preferred_square_feet_max': { label: 'Max Square Feet', format: (v) => `${Number(v).toLocaleString()} sq ft` },
        'preferred_areas': { label: 'Preferred Areas', format: (v) => Array.isArray(v) ? v.join(', ') : v },
        'property_type_preferences': { label: 'Property Types', format: (v) => Array.isArray(v) ? v.join(', ') : v },
        'preferred_features': { label: 'Features', format: (v) => Array.isArray(v) ? v.join(', ') : v },
        'email_notifications': { label: 'Email Notifications', format: (v) => v ? 'Enabled' : 'Disabled' },
        'sms_notifications': { label: 'SMS Notifications', format: (v) => v ? 'Enabled' : 'Disabled' }
      };
      
      const formatter = formatters[key];
      if (!formatter) return null;
      
      return {
        label: formatter.label,
        displayValue: formatter.format(value)
      };
    };

    // Get formatted preferences
    const preferences = data.preferences || {};
    const formattedPrefs = Object.entries(preferences)
      .map(([key, value]) => formatPreference(key, value))
      .filter(Boolean);

    return {
      subject: 'Property Search Preferences Updated',
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          ${getEmailHeader()}
          <div style="padding: 40px 20px;">
            <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0; font-size: 24px;">Property Search Preferences Updated</h1>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px;">
              Hi ${data.name},
            </p>
            
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 25px;">
              Your property search preferences have been successfully updated. Here's what you're now looking for:
            </p>
            
            ${formattedPrefs.length > 0 ? `
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h2 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 18px;">Your Search Criteria</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  ${formattedPrefs.map((pref: any) => `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 12px 0; color: #78350F; font-size: 14px; width: 45%;">${pref.label}:</td>
                      <td style="padding: 12px 0; color: ${BRAND_COLORS.text}; font-size: 14px; font-weight: 500;">${pref.displayValue}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            ` : ''}
            
            <div style="background: #f0fdf4; border-left: 4px solid #EAB308; padding: 20px; border-radius: 4px; margin: 25px 0;">
              <p style="color: ${BRAND_COLORS.text}; font-size: 14px; margin: 0;">
                <strong>What happens next:</strong> We'll automatically notify you when new properties matching these criteria become available.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl || 'https://pickfirst.com.au/dashboard'}" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; font-weight: 600; text-align: center; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px;">
                View Matching Properties
              </a>
            </div>
            
            <p style="color: #78350F; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you didn't make these changes, please <a href="mailto:support@pickfirst.com.au" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">contact support</a> immediately.
            </p>
          </div>
          ${getEmailFooter()}
        </div>
      `
    };
  },

  searchPreferencesSaved: (data: any) => ({
    subject: 'Search Preferences Saved',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Search Preferences Saved</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your search preferences have been saved and property alerts are now active.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Market Update: ${data.area}</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, here's your latest market update for ${data.area}:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
            ${data.avgPrice ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Average Price:</strong> $${data.avgPrice.toLocaleString()}</p>` : ''}
            ${data.newListings ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>New Listings:</strong> ${data.newListings}</p>` : ''}
            ${data.trend ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Market Trend:</strong> ${data.trend}</p>` : ''}
            ${data.daysOnMarket ? `<p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Average Days on Market:</strong> ${data.daysOnMarket}</p>` : ''}
          </div>
          
          ${data.recommendation ? `
            <div style="background: #E8F5E9; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #FEF3C7;">
              <p style="margin: 0; color: ${BRAND_COLORS.text};"><strong>Our Recommendation:</strong> ${data.recommendation}</p>
            </div>
          ` : ''}
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Security & Messaging - User facing
  securityAlert: (data: any) => ({
    subject: data.alertTitle || 'Security Alert - Unusual Account Activity',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${data.alertTitle || 'Security Alert'}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">PickFirst Real Estate - Admin Notification</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <div style="background: #2d2d44; border: 1px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">⚠️ Suspicious Activity Detected</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">Target Account:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: white; font-size: 14px; font-weight: bold;">${data.targetEmail || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">IP Address:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: white; font-size: 14px; font-family: monospace;">${data.ipAddress || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">Location:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: white; font-size: 14px;">${data.location || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">Device:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: white; font-size: 14px;">${data.device || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">Attempts (Last Hour):</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #dc2626; font-size: 14px; font-weight: bold;">${data.attemptsLastHour || 0}</td>
              </tr>
              ${data.failureReason && data.failureReason !== 'N/A' ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #9ca3af; font-size: 14px;">Failure Reason:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #3d3d5c; color: #f59e0b; font-size: 14px;">${data.failureReason}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; color: #9ca3af; font-size: 14px;">Detected At:</td>
                <td style="padding: 10px 0; color: white; font-size: 14px;">${new Date(data.timestamp).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #2d2d44; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #EAB308; margin: 0 0 10px 0; font-size: 16px;">🔐 Recommended Actions</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              <li>Review the login history for this account</li>
              <li>Consider temporarily suspending the account if suspicious</li>
              <li>Block the IP address if brute force is confirmed</li>
              <li>Notify the user if their account may be compromised</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://pickfirst.com.au/admin/login-history'}" style="display: inline-block; background: linear-gradient(135deg, #EAB308 0%, #CA8A04 100%); color: #000; font-weight: bold; text-align: center; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px;">
              View Login History Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #0f0f1a; padding: 20px; text-align: center; border-top: 1px solid #2d2d44;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            This is an automated security alert from PickFirst Real Estate.<br/>
            You received this because you are a Super Admin.
          </p>
        </div>
      </div>
    `
  }),

  messageNotification: (data: any) => ({
    subject: `New Message from ${data.senderName || 'PickFirst User'}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Message</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.recipientName}, you have a new message from ${data.senderName}:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
            <p style="margin: 0; font-style: italic; color: ${BRAND_COLORS.text};">"${data.messagePreview || data.messageContent || 'You have a new message waiting for you.'}"</p>
          </div>
          
          ${data.senderEmail ? `
          <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.success};">
            <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
              <strong>💬 Reply directly to:</strong> <a href="mailto:${data.senderEmail}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">${data.senderEmail}</a>
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            ${getButton((data.platformUrl || 'https://pickfirst.com.au') + '/dashboard/', 'View Full Conversation')}
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  agentInquiryNotification: (data: any) => ({
    subject: `🔔 New Property Inquiry - ${data.propertyTitle}`,
    text: `New Property Inquiry

Hi ${data.agentName},

You have received a new inquiry for your property listing!

Property: ${data.propertyTitle}
Address: ${data.propertyAddress}
Price: ${data.propertyPrice}

Buyer Information:
Name: ${data.buyerName}
Email: ${data.buyerEmail}
Phone: ${data.buyerPhone}

Message:
${data.inquiryMessage}

View Property: ${data.propertyUrl}
Go to Dashboard: ${data.dashboardUrl}

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
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #FEF9E7;">
        <div style="max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          ${getEmailHeader()}
          <div class="mobile-padding" style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; background: ${BRAND_COLORS.success}; padding: 10px 20px; border-radius: 25px;">
                <span style="font-size: 24px; margin-right: 8px;">🔔</span>
                <span style="color: white; font-weight: bold;">New Inquiry</span>
              </div>
            </div>
            
            <h1 class="mobile-heading" style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 28px; text-align: center;">
              Property Inquiry Received
            </h1>
            <p style="color: ${BRAND_COLORS.text}; font-size: 16px; text-align: center; margin-bottom: 30px;">
              Hi ${data.agentName}, you have a new inquiry for your property listing!
            </p>
            
            ${getPropertyCard({
              title: data.propertyTitle,
              price: data.propertyPrice,
              location: data.propertyAddress,
              image: data.propertyImage,
              url: data.propertyUrl,
              badge: 'YOUR LISTING'
            })}
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px solid #EAB308;">
              <h2 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 20px;">Buyer Information</h2>
              <div style="color: ${BRAND_COLORS.text}; line-height: 1.8;">
                <p style="margin: 8px 0;"><strong>👤 Name:</strong> ${data.buyerName}</p>
                <p style="margin: 8px 0;"><strong>✉️ Email:</strong> <a href="mailto:${data.buyerEmail}" style="color: #EAB308; text-decoration: none;">${data.buyerEmail}</a></p>
                <p style="margin: 8px 0;"><strong>📱 Phone:</strong> ${data.buyerPhone}</p>
              </div>
            </div>
            
            <div style="background: #EFF6FF; padding: 25px; border-radius: 12px; border-left: 4px solid ${BRAND_COLORS.info};">
              <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">Buyer's Message:</h3>
              <p style="color: ${BRAND_COLORS.text}; font-size: 15px; line-height: 1.6; font-style: italic; margin: 0;">
                "${data.inquiryMessage || 'The buyer is interested in this property and would like to know more details.'}"
              </p>
            </div>
            
            <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLORS.success};">
              <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px;">
                <strong>💬 Reply directly to:</strong> <a href="mailto:${data.buyerEmail}" style="color: ${BRAND_COLORS.primary}; text-decoration: none;">${data.buyerEmail}</a>
              </p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              ${getButton(data.dashboardUrl || 'https://pickfirst.com.au/agent-dashboard', 'Go to Dashboard')}
            </div>
            
            <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; border: 1px solid #FEF3C7;">
              <p style="margin: 0; color: #78350F; font-size: 12px;">
                💡 Quick tip: Respond quickly to increase your chances of converting this lead!
              </p>
            </div>
          </div>
          ${getEmailFooter()}
        </div>
      </body>
      </html>
    `
  }),

  // Business Operations
  leadAssignment: (data: any) => ({
    subject: `New Lead Assigned: ${data.clientName}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">New Lead Assigned</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.agentName}, you have been assigned a new lead:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Follow-up Reminder</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, this is a follow-up regarding ${data.subject}:
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Subscription Upgraded!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, your subscription has been successfully upgraded to ${data.planName}.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="background: #FFF9E6; padding: 25px; border-radius: 8px; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Payment Successful</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">
            Hi ${data.name}, thank you for your payment!
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #EAB308;">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
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
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
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
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #78350F; font-size: 12px;">
              You're receiving this email because you're a valued member of PickFirst Real Estate. 
              ${data.unsubscribeUrl ? `<a href="${data.unsubscribeUrl}" style="color: #78350F;">Unsubscribe</a>` : ''}
            </p>
          </div>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  subscriptionWelcome: (data: any) => ({
    subject: 'Welcome to Your New Subscription! 🎉',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
            <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 10px 0;">Welcome, ${data.name}!</h1>
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px; margin-bottom: 20px;">
            Thank you for subscribing to PickFirst ${data.plan} plan!
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308;">
            <p style="color: ${BRAND_COLORS.text}; margin: 0 0 15px 0;">
              Your subscription is now <strong>active</strong> and you have access to all ${data.plan} features.
            </p>
            <p style="color: #78350F; margin: 0;"><strong>Start Date:</strong> ${data.startDate}</p>
          </div>
          
          <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.accent}); padding: 30px; border-radius: 12px; margin: 25px 0;">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: ${BRAND_COLORS.secondary};">
              <li style="margin-bottom: 10px;">Explore premium property listings</li>
              <li style="margin-bottom: 10px;">Set up property alerts</li>
              <li style="margin-bottom: 10px;">Connect with top agents</li>
            </ul>
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; text-align: center;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  subscriptionChanged: (data: any) => ({
    subject: 'Your Subscription Has Been Updated',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Subscription Updated</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.name},</p>
          
          <p style="color: ${BRAND_COLORS.text}; margin-bottom: 25px;">
            Your subscription has been successfully updated.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308;">
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Previous Plan:</strong> ${data.oldPlan}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>New Plan:</strong> ${data.newPlan}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Change Date:</strong> ${data.changeDate}</p>
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; text-align: center;">
            Your new plan features are now active and ready to use!
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  subscriptionCancelled: (data: any) => ({
    subject: 'Your Subscription Has Been Cancelled',
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">Subscription Cancelled</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.name},</p>
          
          <p style="color: ${BRAND_COLORS.text}; margin-bottom: 25px;">
            We're sorry to see you go. Your subscription has been cancelled.
          </p>
          
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
            <p style="color: ${BRAND_COLORS.text}; margin: 0 0 10px 0;">
              <strong>Your access will continue until:</strong> ${data.endDate}
            </p>
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              After this date, your account will revert to the free plan.
            </p>
          </div>
          
          <p style="color: ${BRAND_COLORS.text};">
            We'd love to hear your feedback. If there's anything we could have done better, please let us know.
          </p>
          
          <p style="color: ${BRAND_COLORS.text}; text-align: center; font-weight: bold;">
            You're always welcome back!
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  }),

  // Property Listing Workflow Email Templates
  propertyListingSubmitted: (data: any) => {
    const formattedPrice =
      data?.propertyPriceDisplay ??
      (typeof data?.propertyPrice === 'number'
        ? `$${data.propertyPrice.toLocaleString()}`
        : (typeof data?.propertyPrice === 'string' && data.propertyPrice.trim().length > 0
          ? data.propertyPrice
          : 'Contact Agent'));

    return ({
      subject: `Property Listing Submitted: ${data.propertyTitle}`,
      html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 20px 0;">🏠 Property Listing Submitted!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.agentName},</p>
          
          <p style="color: ${BRAND_COLORS.text}; margin-bottom: 25px;">
            Great news! Your property listing has been successfully submitted and is now awaiting admin approval.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308;">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 18px;">📋 Property Details</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Title:</strong> ${data.propertyTitle}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Address:</strong> ${data.propertyAddress}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Price:</strong> ${formattedPrice}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Type:</strong> ${data.propertyType}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Submitted:</strong> ${data.submissionDate}</p>
          </div>
          
          <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.info};">
            <h4 style="color: ${BRAND_COLORS.text}; margin: 0 0 10px 0;">⏳ What happens next?</h4>
            <ul style="color: ${BRAND_COLORS.text}; margin: 0; padding-left: 20px;">
              <li>Our admin team will review your listing within 24 hours</li>
              <li>You'll receive an email notification once it's approved</li>
              <li>Your property will then go live on our platform</li>
              <li>Potential buyers will be able to view and inquire about your property</li>
            </ul>
          </div>
          
          <p style="color: ${BRAND_COLORS.text};">
            You can track the status of your listing in your agent dashboard. If you have any questions, feel free to contact our support team.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            ${getButton(data.dashboardUrl || 'https://pickfirst.com.au/dashboard', 'View My Listings')}
          </div>
          
          <p style="color: #78350F; font-size: 14px; text-align: center;">
            Thank you for choosing PickFirst Real Estate!
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
    });
  },

  propertyListingApproved: (data: any) => {
    const formattedPrice =
      data?.propertyPriceDisplay ??
      (typeof data?.propertyPrice === 'number'
        ? `$${data.propertyPrice.toLocaleString()}`
        : (typeof data?.propertyPrice === 'string' && data.propertyPrice.trim().length > 0
          ? data.propertyPrice
          : 'Contact Agent'));

    return ({
      subject: `🎉 Property Approved: ${data.propertyTitle} is Now Live!`,
      html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.success}; margin: 0 0 20px 0;">🎉 Congratulations! Your Property is Live!</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.agentName},</p>
          
          <p style="color: ${BRAND_COLORS.text}; margin-bottom: 25px;">
            Excellent news! Your property listing has been approved and is now live on the PickFirst platform. Potential buyers can now view and inquire about your property.
          </p>
          
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white; text-align: center;">
            <h3 style="color: white; margin: 0 0 10px 0; font-size: 20px;">✅ APPROVED & LIVE</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">
              Approved on ${data.approvalDate} by ${data.approvedBy}
            </p>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308;">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 18px;">🏠 Your Live Property</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Title:</strong> ${data.propertyTitle}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Address:</strong> ${data.propertyAddress}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Price:</strong> ${formattedPrice}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Type:</strong> ${data.propertyType}</p>
            ${data.propertyImages && data.propertyImages.length > 0 ? `
              <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Images:</strong> ${data.propertyImages.length} photos uploaded</p>
            ` : ''}
          </div>
          
          <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.warning};">
            <h4 style="color: ${BRAND_COLORS.text}; margin: 0 0 10px 0;">🚀 What you can expect now:</h4>
            <ul style="color: ${BRAND_COLORS.text}; margin: 0; padding-left: 20px;">
              <li><strong>Visibility:</strong> Your property is now searchable by all buyers</li>
              <li><strong>Inquiries:</strong> You'll receive email notifications for new inquiries</li>
              <li><strong>Analytics:</strong> Track views and engagement in your dashboard</li>
              <li><strong>Alerts:</strong> Buyers with matching criteria will be notified</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            ${getButton(data.propertyUrl || 'https://pickfirst.com.au/properties', 'View Live Property', true)}
            ${getButton(data.dashboardUrl || 'https://pickfirst.com.au/dashboard', 'Manage Listings', false)}
          </div>
          
          <p style="color: ${BRAND_COLORS.text}; text-align: center;">
            <strong>Pro Tip:</strong> Share your property link on social media and with your network to maximize exposure!
          </p>
          
          <p style="color: #78350F; font-size: 14px; text-align: center;">
            Best of luck with your sale! 🏡
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
    });
  },

  propertyListingRejected: (data: any) => ({
    subject: `Property Listing Requires Updates: ${data.propertyTitle}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_COLORS.background}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
        ${getEmailHeader()}
        <div style="padding: 40px 20px;">
          <h1 style="color: ${BRAND_COLORS.warning}; margin: 0 0 20px 0;">📝 Property Listing Needs Updates</h1>
          <p style="color: ${BRAND_COLORS.text}; font-size: 16px;">Hi ${data.agentName},</p>
          
          <p style="color: ${BRAND_COLORS.text}; margin-bottom: 25px;">
            We've reviewed your property listing and need some updates before we can approve it for publication.
          </p>
          
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #EAB308;">
            <h3 style="color: ${BRAND_COLORS.secondary}; margin: 0 0 15px 0; font-size: 18px;">🏠 Property Details</h3>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Title:</strong> ${data.propertyTitle}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Address:</strong> ${data.propertyAddress}</p>
            <p style="color: ${BRAND_COLORS.text}; margin: 8px 0;"><strong>Reviewed:</strong> ${data.reviewDate}</p>
          </div>
          
          <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.error};">
            <h4 style="color: ${BRAND_COLORS.error}; margin: 0 0 10px 0;">❌ Reason for Update Request:</h4>
            <p style="color: ${BRAND_COLORS.text}; margin: 0; font-size: 15px; line-height: 1.6;">
              ${data.rejectionReason}
            </p>
          </div>
          
          <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${BRAND_COLORS.info};">
            <h4 style="color: ${BRAND_COLORS.text}; margin: 0 0 10px 0;">💡 Next Steps:</h4>
            <ul style="color: ${BRAND_COLORS.text}; margin: 0; padding-left: 20px;">
              <li>Review the feedback above</li>
              <li>Edit your listing to address the concerns</li>
              <li>Resubmit for approval</li>
              <li>We'll review it again within 24 hours</li>
            </ul>
          </div>
          
          <p style="color: ${BRAND_COLORS.text};">
            Don't worry - this is a common part of the process to ensure all listings meet our quality standards. Once updated, your property will be approved quickly.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            ${getButton(data.editUrl || 'https://pickfirst.com.au/dashboard', 'Edit My Listing')}
          </div>
          
          <p style="color: #78350F; font-size: 14px; text-align: center;">
            Need help? Contact our support team - we're here to help you succeed!
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  })
,
  weeklyDigest: (incomingData: any = {}) => {
    const data = incomingData || {};
    return {
      subject: data.subject || `PickFirst Weekly Digest`,
      text: data.text || `Your PickFirst weekly digest is ready.`,
      html: data.html || `
      <div style="font-family: 'Inter', -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;background:#FEF9E7;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;padding:40px;text-align:center;box-shadow: 0 4px 20px rgba(234, 179, 8, 0.15);">
          <h1 style="color:#EAB308;margin-bottom:16px;font-weight:700;">Your Weekly Property Digest</h1>
          <p style="color:#374151;">We couldn't load the full content of this digest. Please log in to view the latest properties.</p>
          <div style="margin-top:32px;">
            <a href="https://pickfirst.com.au/login" style="display:inline-block;background:linear-gradient(135deg, #EAB308 0%, #F59E0B 100%);color:#1F2937;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;box-shadow: 0 4px 16px rgba(234, 179, 8, 0.35);">
              View Properties
            </a>
          </div>
        </div>
      </div>
    `
    };
  }
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

    if (template === 'weeklyDigest') {
      console.log('weeklyDigest template payload:', {
        hasDataHtml: Boolean(data?.html),
        htmlLength: data?.html?.length || 0,
        subject: data?.subject,
        textLength: data?.text?.length || 0
      });
    }

    // Create a simple text version for better deliverability
    const textContent = (emailContent as any).text || emailContent.subject;
    const templateReplyTo = (emailContent as any).replyTo;
    
    // Define which templates should be treated as transactional vs promotional
    const transactionalTemplates = [
      'welcome', 'agentWelcome', 'buyerWelcome', 
      'appointmentConfirmation', 'appointmentNotification', 'appointmentStatusUpdate',
      'paymentSuccess', 'paymentFailed', 'accountSuspension', 'securityAlert',
      'messageNotification', 'leadAssignment', 'propertyViewing', 'followUp',
      'subscriptionUpgrade', 'subscriptionExpiry', 'profileUpdate',
      'subscriptionWelcome', 'subscriptionChanged', 'subscriptionCancelled',
      'propertyAlert', 'agentInquiryNotification', // Added for inbox delivery
      'propertyListingSubmitted', 'propertyListingApproved', 'propertyListingRejected', // Property workflow emails
      'clientInvite' // Client invitation emails
    ];
    
    const isTransactional = transactionalTemplates.includes(template);
    
    // Configure headers based on template type
    const headers: Record<string, string> = isTransactional ? {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'PickFirst Real Estate System',
      'X-Category': 'transactional',
      'X-Entity-Ref-ID': `pf-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'X-Transaction-Type': template,
      'Precedence': 'bulk'
    } : {
      'X-Mailer': 'PickFirst Real Estate System',
      'X-Category': 'marketing',
      'X-Entity-Ref-ID': `pf-promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      'List-Unsubscribe': '<mailto:unsubscribe@pickfirst.com.au?subject=unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
    
    // Configure email settings
    const emailConfig: any = {
      from: "PickFirst Real Estate <info@pickfirst.com.au>",
      to: [to],
      subject: subject || emailContent.subject,
      html: emailContent.html,
      text: textContent,
      headers,
      tags: [
        {
          name: 'category',
          value: isTransactional ? 'transactional' : 'marketing'
        },
        {
          name: 'type',
          value: template
        }
      ]
    };
    
    // Set reply-to address
    // For message/inquiry notifications, use sender's email so recipients can reply directly
    // For all other emails, use support email
    if (template === 'agentInquiryNotification' && data.buyerEmail) {
      emailConfig.reply_to = [data.buyerEmail];
    } else if (template === 'messageNotification' && data.senderEmail) {
      emailConfig.reply_to = [data.senderEmail];
    } else {
      emailConfig.reply_to = ['info@pickfirst.com.au'];
    }
    
    if (template === 'weeklyDigest') {
      console.log('weeklyDigest emailConfig stats:', {
        htmlLength: emailConfig.html?.length || 0,
        textLength: emailConfig.text?.length || 0,
        subject: emailConfig.subject
      });
    }

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