import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating free tier status");
      
      // Update user profile to free tier
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: 'inactive',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_product_id: null
        })
        .eq('id', user.id);

      return new Response(JSON.stringify({ 
        subscribed: false, 
        product_id: null,
        subscription_tier: 'free',
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let subscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;

      // Safely compute subscription end date
      const rawPeriodEnd: unknown = (subscription as any)?.current_period_end;
      const periodEndUnix = typeof rawPeriodEnd === 'number' ? rawPeriodEnd : Number(rawPeriodEnd ?? 0);
      if (Number.isFinite(periodEndUnix) && periodEndUnix > 0) {
        try {
          subscriptionEnd = new Date(periodEndUnix * 1000).toISOString();
        } catch (_e) {
          subscriptionEnd = null; // Fallback safely if date parsing fails
        }
      } else {
        subscriptionEnd = null;
      }

      // Safely determine product id
      const firstItem = (subscription as any)?.items?.data?.[0];
      const potentialProduct = firstItem?.price?.product;
      productId = typeof potentialProduct === 'string' ? potentialProduct : null;

      logStep("Active subscription found", { subscriptionId, productId, endDate: subscriptionEnd });

      // Update user profile with subscription info
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'premium',
          subscription_status: 'active',
          subscription_expires_at: subscriptionEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_product_id: productId
        })
        .eq('id', user.id);
    } else {
      logStep("No active subscription found, updating to free tier");
      
      // Update user profile to free tier
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: 'inactive',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          subscription_product_id: null
        })
        .eq('id', user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_tier: hasActiveSub ? 'premium' : 'free',
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});