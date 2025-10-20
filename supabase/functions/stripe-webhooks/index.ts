import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response(JSON.stringify({ error: 'Webhook configuration error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Handling subscription created:', subscription.id);
  
  const customerId = subscription.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Determine subscription tier from product
  const productId = subscription.items.data[0]?.price.product as string;
  let tier = 'free';
  
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('stripe_product_id', productId)
    .single();
  
  if (plan) {
    tier = plan.name.toLowerCase();
  }

  // Update user profile
  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      subscription_product_id: productId,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Send welcome email to customer
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'subscriptionWelcome',
      data: {
        name: profile.full_name || 'Valued Customer',
        plan: tier.charAt(0).toUpperCase() + tier.slice(1),
        startDate: new Date().toLocaleDateString(),
      },
    },
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
      <p><strong>Start Date:</strong> ${new Date(subscription.start_date * 1000).toLocaleString()}</p>
      <p><strong>Subscription ID:</strong> ${subscription.id}</p>
    `,
  });

  console.log('Subscription created emails sent for:', profile.email);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Handling subscription updated:', subscription.id);
  
  const customerId = subscription.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Determine new tier
  const productId = subscription.items.data[0]?.price.product as string;
  let tier = 'free';
  
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('stripe_product_id', productId)
    .single();
  
  if (plan) {
    tier = plan.name.toLowerCase();
  }

  const oldTier = profile.subscription_tier;

  // Update user profile
  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

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
          changeDate: new Date().toLocaleDateString(),
        },
      },
    });

    console.log('Subscription updated email sent for:', profile.email);
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  console.log('Handling subscription cancelled:', subscription.id);
  
  const customerId = subscription.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Update user profile
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_tier: 'free',
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Send cancellation email to customer
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'subscriptionCancelled',
      data: {
        name: profile.full_name || 'Valued Customer',
        endDate: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      },
    },
  });

  // Send admin notification
  await sendAdminNotification({
    subject: '❌ Subscription Cancelled',
    message: `
      <h2>Subscription Cancellation Alert</h2>
      <p><strong>Customer:</strong> ${profile.full_name || 'N/A'} (${profile.email})</p>
      <p><strong>Cancelled Date:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Access Until:</strong> ${new Date(subscription.current_period_end * 1000).toLocaleString()}</p>
      <p><strong>Subscription ID:</strong> ${subscription.id}</p>
    `,
  });

  console.log('Subscription cancelled emails sent for:', profile.email);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Handling payment succeeded:', invoice.id);
  
  const customerId = invoice.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('Profile not found for customer:', customerId);
    return;
  }

  // Send payment receipt (Stripe already sends one, but we can send a custom one)
  await supabase.functions.invoke('send-email', {
    body: {
      to: profile.email,
      template: 'paymentSuccess',
      data: {
        name: profile.full_name || 'Valued Customer',
        amount: `$${(invoice.amount_paid || 0) / 100}`,
        date: new Date().toLocaleDateString(),
        invoiceNumber: invoice.number,
      },
    },
  });

  console.log('Payment success email sent for:', profile.email);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Handling payment failed:', invoice.id);
  
  const customerId = invoice.customer as string;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

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
        retryDate: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
          : 'N/A',
      },
    },
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
    `,
  });

  console.log('Payment failed emails sent for:', profile.email);
}

async function sendAdminNotification({ subject, message }: { subject: string; message: string }) {
  // Get all super admin emails
  const { data: admins } = await supabase
    .from('profiles')
    .select('email')
    .eq('role', 'super_admin');

  if (!admins || admins.length === 0) {
    console.log('No admins found to notify');
    return;
  }

  // Send email to all admins
  for (const admin of admins) {
    await supabase.functions.invoke('send-email', {
      body: {
        to: admin.email,
        subject: `[PickFirst Admin] ${subject}`,
        html: message,
      },
    });
  }

  console.log('Admin notifications sent to:', admins.map(a => a.email).join(', '));
}
