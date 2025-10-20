# Stripe Webhook Setup for Subscription Emails

## What Was Implemented

I've created a comprehensive Stripe webhook system that automatically sends emails for subscription lifecycle events and notifies admins.

### Features

1. **Customer Email Notifications:**
   - ✅ Subscription created (welcome email)
   - ✅ Subscription updated (plan change notification)
   - ✅ Subscription cancelled (cancellation confirmation)
   - ✅ Payment succeeded (receipt confirmation)
   - ✅ Payment failed (action required alert)

2. **Admin Notifications:**
   - 🎉 New subscription created (with customer details)
   - ❌ Subscription cancelled (with customer details)
   - ⚠️ Payment failed (with attempt details)

3. **Database Updates:**
   - Automatically updates user profile with subscription tier
   - Updates subscription status and expiration dates
   - Tracks Stripe customer and subscription IDs

## Setup Instructions

### 1. Add Stripe Webhook Secret

First, you need to get your webhook signing secret from Stripe:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://rkwvgqozbpqgmpbvujgz.supabase.co/functions/v1/stripe-webhooks`
4. Select the following events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)

### 2. Add the Secret to Supabase

Add the webhook secret as a Supabase secret:

```bash
# Via Supabase CLI
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Or via Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz/settings/functions
# Add secret: STRIPE_WEBHOOK_SECRET
```

### 3. Deploy the Edge Function

The webhook handler will be deployed automatically with your next deployment. Or deploy manually:

```bash
supabase functions deploy stripe-webhooks
```

### 4. Test the Webhook

#### Option A: Use Stripe CLI (Recommended for testing)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to https://rkwvgqozbpqgmpbvujgz.supabase.co/functions/v1/stripe-webhooks

# In another terminal, trigger test events:
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

#### Option B: Create a real subscription

Just create a subscription through your app and check:
- Customer receives subscription welcome email
- Admin receives notification email
- User profile is updated in database

### 5. Verify Email Templates

The following email templates were added to `send-email` function:

- `subscriptionWelcome` - Sent when subscription is created
- `subscriptionChanged` - Sent when subscription tier changes
- `subscriptionCancelled` - Sent when subscription is cancelled
- `paymentSuccess` - Already existed (sends payment receipt)
- `paymentFailed` - Already existed (sends payment failure alert)

## How It Works

1. **Stripe sends webhook** → Your webhook endpoint
2. **Webhook verifies signature** → Ensures it's from Stripe
3. **Handler processes event** → Based on event type
4. **Database updated** → User profile subscription info
5. **Emails sent** → Customer and admin notifications

## Monitoring

### View Webhook Logs

```bash
# View edge function logs
supabase functions logs stripe-webhooks --tail

# Or in dashboard:
# https://supabase.com/dashboard/project/rkwvgqozbpqgmpbvujgz/functions/stripe-webhooks/logs
```

### Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. View "Recent events" to see delivery status

## Troubleshooting

### Webhook signature verification fails
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- Check that the secret matches your Stripe webhook endpoint

### Emails not sending
- Verify `RESEND_API_KEY` is set
- Check send-email function logs
- Ensure admin profiles exist with `role = 'super_admin'`

### Database not updating
- Check stripe-webhooks function logs
- Verify user has `stripe_customer_id` in profiles table
- Ensure RLS policies allow updates

## What Emails Admins Will Receive

Admins with `role = 'super_admin'` in the profiles table will receive:

1. **New Subscription Alert** - When a customer subscribes
   - Customer name and email
   - Plan selected
   - Amount
   - Subscription ID

2. **Subscription Cancellation** - When a customer cancels
   - Customer name and email
   - Cancellation date
   - Access end date

3. **Payment Failure Alert** - When a payment fails
   - Customer name and email
   - Amount due
   - Attempt count
   - Invoice ID

## Next Steps

1. ✅ Add the webhook secret (Step 1-2 above)
2. ✅ Deploy the function (Step 3)
3. ✅ Test with Stripe CLI (Step 4)
4. ✅ Monitor the first real subscription

That's it! Your subscription email system is now fully automated. 🎉
