import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // Get real client IP from various headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    req.headers.get('x-real-ip') ||
                    req.headers.get('cf-connecting-ip') ||
                    req.headers.get('x-client-ip') ||
                    req.conn?.remoteAddr?.hostname ||
                    'unknown';

    // Get additional client information
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referer = req.headers.get('referer') || 'unknown';
    const origin = req.headers.get('origin') || 'unknown';

    const response = {
      ip: clientIP,
      userAgent,
      referer,
      origin,
      timestamp: new Date().toISOString(),
      headers: {
        'x-forwarded-for': req.headers.get('x-forwarded-for'),
        'x-real-ip': req.headers.get('x-real-ip'),
        'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
        'x-client-ip': req.headers.get('x-client-ip'),
      }
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get client IP',
        message: error.message 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      },
    )
  }
}) 