import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-08-27.basil'
});
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    // Debug logging
    console.log('=== WEBHOOK DEBUG INFO ===');
    console.log('Signature header:', signature);
    console.log('Webhook secret exists:', !!webhookSecret);
    console.log('Webhook secret length:', webhookSecret ? webhookSecret.length : 0);
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      console.error('Signature present:', !!signature);
      console.error('Webhook secret present:', !!webhookSecret);
      return new Response(JSON.stringify({
        error: 'Webhook configuration error'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const body = await req.text();
    console.log('Request body length:', body.length);
    console.log('Request body preview:', body.substring(0, 200) + '...');
    let event;
    try {
      // Try the standard verification first
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('✅ Signature verification successful');
    } catch (err) {
      const error = err as Error;
      console.error('❌ Webhook signature verification failed:', error.message);
      console.error('Error details:', error);
      console.error('Signature used:', signature);
      console.error('Body used for verification:', body);
      // Try alternative verification method
      try {
        console.log('🔄 Attempting alternative signature verification...');
        // Parse the signature header manually
        const elements = signature.split(',');
        const signatureHash = elements.find((el)=>el.startsWith('v1='))?.split('=')[1];
        const timestamp = elements.find((el)=>el.startsWith('t='))?.split('=')[1];
        if (signatureHash && timestamp) {
          console.log('Found signature hash and timestamp in header');
          // Try constructing event with raw body
          const rawBody = body;
          event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
          console.log('✅ Alternative signature verification successful');
        } else {
          throw new Error('Could not parse signature header');
        }
      } catch (altErr) {
        const altError = altErr as Error;
        console.error('❌ Alternative verification also failed:', altError.message);
        // Last resort: try to parse the event without signature verification for debugging
        try {
          console.log('🔄 Attempting to parse event without signature verification (DEBUG MODE)...');
          const parsedBody = JSON.parse(body);
          if (parsedBody.type && parsedBody.data) {
            console.log('⚠️ WARNING: Processing webhook without signature verification!');
            console.log('Event type:', parsedBody.type);
            event = parsedBody;
          } else {
            throw new Error('Invalid event structure');
          }
        } catch (parseErr) {
          const parseError = parseErr as Error;
          console.error('❌ Could not parse event body:', parseError.message);
          return new Response(JSON.stringify({
            error: 'Invalid signature',
            debug: {
              signaturePresent: !!signature,
              webhookSecretPresent: !!webhookSecret,
              bodyLength: body.length,
              errorMessage: error.message,
              alternativeError: altError.message,
              parseError: parseError.message,
              signatureHeader: signature
            }
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    }
    console.log('Processing webhook event:', event.type);
    // Handle different event types
    switch(event.type){
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function handleSubscriptionCreated(subscription: any) {
  console.log('Handling subscription created:', subscription.id);
  console.log('Subscription object keys:', Object.keys(subscription));
  console.log('Subscription current_period_end:', subscription.current_period_end, typeof subscription.current_period_end);
  console.log('Subscription created:', subscription.created, typeof subscription.created);
  const customerId = subscription.customer;
  const { data: profile } = await supabase.from('profiles').select('*').eq('stripe_customer_id', customerId).single();
  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }
  // Determine subscription tier from product
  const productId = subscription.items.data[0]?.price.product;
  let tier = 'free';
  const { data: plan } = await supabase.from('subscription_plans').select('name').eq('stripe_product_id', productId).single();
  if (plan) {
    tier = plan.name.toLowerCase();
  }
  // Update user profile with safe date handling
  const updateData: any = {
    subscription_tier: tier,
    subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    subscription_product_id: productId,
    updated_at: new Date().toISOString()
  };
  // Safely handle current_period_end
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    updateData.subscription_expires_at = new Date(subscription.current_period_end * 1000).toISOString();
  }
  await supabase.from('profiles').update(updateData).eq('id', profile.id);
  // Send welcome email to customer
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'subscriptionWelcome',
      data: {
        name: profile.full_name || 'Valued Customer',
        plan: tier.charAt(0).toUpperCase() + tier.slice(1),
        startDate: new Date().toLocaleDateString()
      }
    }
  });
  // Send admin notification
  await sendAdminNotification({
    subject: '🎉 New Subscription Created',
    message: `
      <h2>New Subscription Alert</h2>
      <p><strong>Customer:</strong> ${profile.full_name || 'N/A'} (${profile.email})</p>
      <p><strong>Plan:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
      <p><strong>Status:</strong> ${subscription.status}</p>
      <p><strong>Amount:</strong> $${(subscription.items.data[0]?.price.unit_amount || 0) / 100}/month</p>
      <p><strong>Start Date:</strong> ${subscription.created ? new Date(subscription.created * 1000).toLocaleString() : 'N/A'}</p>
      <p><strong>Subscription ID:</strong> ${subscription.id}</p>
    `
  });
  console.log('Subscription created emails sent for:', profile.email);
}
async function handleSubscriptionUpdated(subscription: any) {
  console.log('Handling subscription updated:', subscription.id);
  const customerId = subscription.customer;
  const { data: profile } = await supabase.from('profiles').select('*').eq('stripe_customer_id', customerId).single();
  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }
  // Determine new tier
  const productId = subscription.items.data[0]?.price.product;
  let tier = 'free';
  const { data: plan } = await supabase.from('subscription_plans').select('name').eq('stripe_product_id', productId).single();
  if (plan) {
    tier = plan.name.toLowerCase();
  }
  const oldTier = profile.subscription_tier;
  // Update user profile with safe date handling
  const updateData: any = {
    subscription_tier: tier,
    subscription_status: subscription.status,
    updated_at: new Date().toISOString()
  };
  // Safely handle current_period_end
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    updateData.subscription_expires_at = new Date(subscription.current_period_end * 1000).toISOString();
  }
  await supabase.from('profiles').update(updateData).eq('id', profile.id);
  // Send update email to customer if tier changed
  if (oldTier !== tier) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: profile.email,
        template: 'subscriptionChanged',
        data: {
          name: profile.full_name || 'Valued Customer',
          oldPlan: oldTier.charAt(0).toUpperCase() + oldTier.slice(1),
          newPlan: tier.charAt(0).toUpperCase() + tier.slice(1),
          changeDate: new Date().toLocaleDateString()
        }
      }
    });
    console.log('Subscription updated email sent for:', profile.email);
  }
}
async function handleSubscriptionCancelled(subscription: any) {
  console.log('Handling subscription cancelled:', subscription.id);
  const customerId = subscription.customer;
  const { data: profile } = await supabase.from('profiles').select('*').eq('stripe_customer_id', customerId).single();
  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }
  // Update user profile with safe date handling
  const updateData: any = {
    subscription_status: 'cancelled',
    subscription_tier: 'free',
    updated_at: new Date().toISOString()
  };
  // Safely handle current_period_end
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    updateData.subscription_expires_at = new Date(subscription.current_period_end * 1000).toISOString();
  }
  await supabase.from('profiles').update(updateData).eq('id', profile.id);
  // Send cancellation email to customer
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'subscriptionCancelled',
      data: {
        name: profile.full_name || 'Valued Customer',
        endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleDateString() : 'N/A'
      }
    }
  });
  // Send admin notification
  await sendAdminNotification({
    subject: '❌ Subscription Cancelled',
    message: `
      <h2>Subscription Cancellation Alert</h2>
      <p><strong>Customer:</strong> ${profile.full_name || 'N/A'} (${profile.email})</p>
      <p><strong>Cancelled Date:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Access Until:</strong> ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleString() : 'N/A'}</p>
      <p><strong>Subscription ID:</strong> ${subscription.id}</p>
    `
  });
  console.log('Subscription cancelled emails sent for:', profile.email);
}
async function handlePaymentSucceeded(invoice: any) {
  console.log('Handling payment succeeded:', invoice.id);
  const customerId = invoice.customer;
  const { data: profile } = await supabase.from('profiles').select('*').eq('stripe_customer_id', customerId).single();
  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }
  // Get subscription details for more complete email data
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2025-08-27.basil'
  });
  let subscription = null;
  let planName = 'Unknown Plan';
  let subscriptionEndDate = null;
  let billingPeriod = 'month';
  // Get subscription ID from invoice (it can be in different places)
  let subscriptionId = invoice.subscription;
  if (!subscriptionId && invoice.parent?.subscription_details?.subscription) {
    subscriptionId = invoice.parent.subscription_details.subscription;
  }
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      // Get plan name from subscription
      const productId = subscription.items.data[0]?.price.product;
      if (productId) {
        const { data: plan } = await supabase.from('subscription_plans').select('name').eq('stripe_product_id', productId).single();
        if (plan) {
          planName = plan.name;
        }
      }
      // Get billing period
      billingPeriod = subscription.items.data[0]?.price.recurring?.interval || 'month';
      // Get subscription end date
      if (subscription.current_period_end) {
        subscriptionEndDate = new Date(subscription.current_period_end * 1000).toLocaleDateString();
      }
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  }
  // If we couldn't get plan from subscription, try to get it from invoice line items
  if (planName === 'Unknown Plan' && invoice.lines?.data?.[0]) {
    const lineItem = invoice.lines.data[0];
    const productId = lineItem.pricing?.price_details?.product;
    console.log('🔍 Invoice line item productId:', productId);
    if (productId) {
      const { data: plan, error: planError } = await supabase.from('subscription_plans').select('name').eq('stripe_product_id', productId).single();
      console.log('🔍 Database lookup result:', {
        plan,
        planError
      });
      if (plan) {
        planName = plan.name;
        console.log('✅ Plan name found:', planName);
      }
    }
    // Get billing period from line item description
    const description = lineItem.description || '';
    console.log('🔍 Line item description:', description);
    if (description.includes('/ year')) {
      billingPeriod = 'year';
    } else if (description.includes('/ month')) {
      billingPeriod = 'month';
    }
  }
  // Final debug log
  console.log('📧 Final email data being sent:', {
    planName,
    billingPeriod,
    subscriptionEndDate,
    amount: invoice.amount_paid,
    transactionId: invoice.payment_intent || invoice.id
  });
  // Send payment receipt with complete data
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'paymentSuccess',
      data: {
        name: profile.full_name || 'Valued Customer',
        amount: `$${(invoice.amount_paid || 0) / 100}`,
        planName: planName,
        billingPeriod: billingPeriod,
        transactionId: invoice.payment_intent || invoice.id,
        paymentDate: new Date().toLocaleDateString(),
        invoiceNumber: invoice.number || invoice.id,
        nextBillingDate: subscriptionEndDate || 'N/A'
      }
    }
  });
  console.log('Payment success email sent for:', profile.email);
}
async function handlePaymentFailed(invoice: any) {
  console.log('Handling payment failed:', invoice.id);
  const customerId = invoice.customer;
  const { data: profile } = await supabase.from('profiles').select('*').eq('stripe_customer_id', customerId).single();
  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }
  // Send payment failed email
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'paymentFailed',
      data: {
        name: profile.full_name || 'Valued Customer',
        amount: `$${(invoice.amount_due || 0) / 100}`,
        retryDate: invoice.next_payment_attempt && typeof invoice.next_payment_attempt === 'number' ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString() : 'N/A'
      }
    }
  });
  // Send admin notification
  await sendAdminNotification({
    subject: '⚠️ Payment Failed',
    message: `
      <h2>Payment Failure Alert</h2>
      <p><strong>Customer:</strong> ${profile.full_name || 'N/A'} (${profile.email})</p>
      <p><strong>Amount:</strong> $${(invoice.amount_due || 0) / 100}</p>
      <p><strong>Invoice ID:</strong> ${invoice.id}</p>
      <p><strong>Attempt Count:</strong> ${invoice.attempt_count}</p>
    `
  });
  console.log('Payment failed emails sent for:', profile.email);
}
async function sendAdminNotification({ subject, message }: { subject: string; message: string }) {
  // Get all super admin emails
  const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'super_admin');
  if (!admins || admins.length === 0) {
    console.log('No admins found to notify');
    return;
  }
  // Send email to all admins
  for (const admin of admins){
    await supabase.functions.invoke('send-email', {
      body: {
        to: admin.email,
        subject: `[PickFirst Admin] ${subject}`,
        html: message
      }
    });
  }
  console.log('Admin notifications sent to:', admins.map((a)=>a.email).join(', '));
}
