# Resend Email Setup Guide

## 1. Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Create a new API key
3. Copy the API key (starts with `re_`)

## 2. Configure Supabase Environment Variables

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz/settings/functions)
2. Navigate to **Settings** → **Edge Functions**
3. Add environment variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (e.g., `re_1234567890abcdef`)

## 3. Verify Your Domain (Optional but Recommended)

1. Go to [Resend Domains](https://resend.com/domains)
2. Add your domain (e.g., `pickfirst.com`)
3. Follow DNS verification steps
4. Update the "from" email in the edge function

## 4. Update Email Configuration

### Current Configuration:
```typescript
from: 'PickFirst Real Estate <noreply@pickfirst.com>'
```

### For Testing (using Resend's default domain):
```typescript
from: 'PickFirst Real Estate <onboarding@resend.dev>'
```

## 5. Test the System

### Option 1: Use the Test Script
```bash
node test-email-system.js
```

### Option 2: Test via Supabase Dashboard
1. Go to [Edge Functions](https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz/functions)
2. Click on `send-email` function
3. Use the "Invoke" tab to test

### Option 3: Test via API
```bash
curl -X POST "https://rkwvgqozbpqgmpbvujgz.supabase.co/functions/v1/send-email" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "template": "welcome",
    "data": {
      "name": "Test User",
      "email": "your-email@example.com",
      "platformName": "PickFirst Real Estate",
      "platformUrl": "https://baviiii.github.io/pickfirst-firstlook-signup"
    }
  }'
```

## 6. Available Email Templates

- `welcome` - Welcome email for new users
- `propertyAlert` - Property alert notifications
- `appointmentConfirmation` - Appointment confirmations
- `marketUpdate` - Market update emails
- `profileUpdate` - Profile update confirmations

## 7. Troubleshooting

### Common Issues:

1. **"RESEND_API_KEY environment variable is required"**
   - Make sure you've added the environment variable in Supabase dashboard

2. **"Invalid API key"**
   - Check that your Resend API key is correct
   - Ensure the key has proper permissions

3. **"Domain not verified"**
   - Use `onboarding@resend.dev` for testing
   - Or verify your domain in Resend dashboard

4. **"Rate limit exceeded"**
   - Resend has rate limits for free accounts
   - Check your usage in Resend dashboard

## 8. Production Considerations

1. **Domain Verification**: Verify your own domain for production
2. **Rate Limits**: Monitor your email usage
3. **Monitoring**: Set up email delivery monitoring
4. **Templates**: Customize email templates for your brand
5. **Analytics**: Track email open rates and click rates

## 9. GitHub Pages Integration

Your emails will include links to:
- **Platform URL**: `https://baviiii.github.io/pickfirst-firstlook-signup`
- **Property URLs**: `https://baviiii.github.io/pickfirst-firstlook-signup/property/{id}`

Make sure your GitHub Pages site is deployed and accessible.
