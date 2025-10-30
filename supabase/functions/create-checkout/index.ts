import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
  try {
    logStep("Function started");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", {
      userId: user.id,
      email: user.email
    });
    // Get request body to determine which plan to subscribe to
    const { priceId } = await req.json();
    if (!priceId) throw new Error("Price ID is required");
    logStep("Price ID received", {
      priceId
    });
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil"
    });
    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", {
        customerId
      });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
      logStep("New customer created", {
        customerId
      });
    }
    // Determine base URL safely (supports custom base path and env override)
    const envBaseUrl = Deno.env.get("APP_BASE_URL");
    const originHeader = req.headers.get("origin") || "http://localhost:5173";
    const basePath = Deno.env.get("APP_BASE_PATH") || ""; // e.g. "/pickfirst-firstlook-signup"
    const normalizedBasePath = basePath ? basePath.startsWith('/') ? basePath : `/${basePath}` : '';
    const computedFromOrigin = `${originHeader}${normalizedBasePath}`;
    const fallbackGhPages = "https://baviiii.github.io/pickfirst-firstlook-signup";
    const baseUrl = envBaseUrl || (normalizedBasePath ? computedFromOrigin : originHeader) || fallbackGhPages;
    const finalBaseUrl = baseUrl || fallbackGhPages;
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${finalBaseUrl}/pricing?success=true`,
      cancel_url: `${finalBaseUrl}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id
      }
    });
    logStep("Checkout session created", {
      sessionId: session.id,
      url: session.url
    });
    return new Response(JSON.stringify({
      url: session.url
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", {
      message: errorMessage 
    });
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
