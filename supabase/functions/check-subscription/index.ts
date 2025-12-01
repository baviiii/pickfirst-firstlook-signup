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
      const { error: noCustomerUpdateError } = await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: 'inactive',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_product_id: null
        })
        .eq('id', user.id);
        
      if (noCustomerUpdateError) {
        logStep("Error updating profile for user without customer", { error: noCustomerUpdateError.message });
        // Don't throw here, just log the error and continue
      } else {
        logStep("Profile updated for user without customer");
      }

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
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;

      // Safely compute subscription end date from multiple sources
      // Try current_period_end first, then cancel_at, then fallback to profile
      let rawPeriodEnd: unknown = subscription.current_period_end;
      
      // If current_period_end is missing, try cancel_at (for canceled subscriptions)
      if (!rawPeriodEnd && subscription.cancel_at) {
        rawPeriodEnd = subscription.cancel_at;
      }
      
      // Also check the subscription object structure
      if (!rawPeriodEnd && (subscription as any).period_end) {
        rawPeriodEnd = (subscription as any).period_end;
      }
      
      logStep("Raw period end value", { rawPeriodEnd, type: typeof rawPeriodEnd, subscriptionKeys: Object.keys(subscription) });
      
      if (rawPeriodEnd && typeof rawPeriodEnd === 'number' && rawPeriodEnd > 0) {
        try {
          // Ensure the timestamp is reasonable (not too far in the past or future)
          const now = Date.now() / 1000; // Current time in seconds
          const maxFuture = now + (10 * 365 * 24 * 60 * 60); // 10 years from now
          const minPast = now - (10 * 365 * 24 * 60 * 60); // 10 years ago
          
          if (rawPeriodEnd >= minPast && rawPeriodEnd <= maxFuture) {
            const date = new Date(rawPeriodEnd * 1000);
            // Validate the date is valid
            if (!isNaN(date.getTime())) {
              subscriptionEnd = date.toISOString();
              logStep("Subscription end date computed", { subscriptionEnd });
            } else {
              logStep("Invalid date created from timestamp", { rawPeriodEnd, date });
              // Try to get from profile as fallback
              const { data: profileData } = await supabaseClient
                .from('profiles')
                .select('subscription_expires_at')
                .eq('id', user.id)
                .single();
              subscriptionEnd = profileData?.subscription_expires_at || null;
            }
          } else {
            logStep("Timestamp out of reasonable range", { rawPeriodEnd, now, minPast, maxFuture });
            // Try to get from profile as fallback
            const { data: profileData } = await supabaseClient
              .from('profiles')
              .select('subscription_expires_at')
              .eq('id', user.id)
              .single();
            subscriptionEnd = profileData?.subscription_expires_at || null;
          }
        } catch (error) {
          logStep("Error parsing subscription end date", { 
            error: error instanceof Error ? error.message : String(error), 
            rawPeriodEnd 
          });
          // Try to get from profile as fallback
          try {
            const { data: profileData } = await supabaseClient
              .from('profiles')
              .select('subscription_expires_at')
              .eq('id', user.id)
              .single();
            subscriptionEnd = profileData?.subscription_expires_at || null;
          } catch {
            subscriptionEnd = null;
          }
        }
      } else {
        logStep("Invalid or missing period end from Stripe, checking profile", { rawPeriodEnd });
        // Fallback: check profile for subscription_expires_at
        try {
          const { data: profileData } = await supabaseClient
            .from('profiles')
            .select('subscription_expires_at')
            .eq('id', user.id)
            .single();
          subscriptionEnd = profileData?.subscription_expires_at || null;
          logStep("Got subscription end from profile", { subscriptionEnd });
        } catch {
          subscriptionEnd = null;
        }
      }

      // Safely determine product id
      const firstItem = (subscription as any)?.items?.data?.[0];
      const potentialProduct = firstItem?.price?.product;
      productId = typeof potentialProduct === 'string' ? potentialProduct : null;

      logStep("Active subscription found", { subscriptionId, productId, endDate: subscriptionEnd });

      // Update user profile with subscription info
      const updateData: any = { 
        subscription_tier: 'premium',
        subscription_status: 'active',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_product_id: productId
      };
      
      // Only include subscription_expires_at if we have a valid date
      if (subscriptionEnd) {
        updateData.subscription_expires_at = subscriptionEnd;
      }
      
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (updateError) {
        logStep("Error updating profile with subscription info", { error: updateError.message });
        // Don't throw here, just log the error and continue
      } else {
        logStep("Profile updated with subscription info", { updateData });
      }
    } else {
      logStep("No active subscription found, updating to free tier");
      
      // Update user profile to free tier
      const { error: freeUpdateError } = await supabaseClient
        .from('profiles')
        .update({ 
          subscription_tier: 'free',
          subscription_status: 'inactive',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          subscription_product_id: null
        })
        .eq('id', user.id);
        
      if (freeUpdateError) {
        logStep("Error updating profile to free tier", { error: freeUpdateError.message });
        // Don't throw here, just log the error and continue
      } else {
        logStep("Profile updated to free tier");
      }
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