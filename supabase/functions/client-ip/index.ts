import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Initialize Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Parse User Agent for device information
function parseUserAgent(userAgent: string) {
  const deviceInfo: any = {
    browser: 'Unknown',
    os: 'Unknown',
    device: 'Unknown',
    isMobile: false,
    isTablet: false,
    isDesktop: false
  }

  if (!userAgent) return deviceInfo

  // Browser detection
  if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome'
  else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox'
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) deviceInfo.browser = 'Safari'
  else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge'
  else if (userAgent.includes('Opera')) deviceInfo.browser = 'Opera'

  // OS detection
  if (userAgent.includes('Windows')) deviceInfo.os = 'Windows'
  else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS'
  else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux'
  else if (userAgent.includes('Android')) deviceInfo.os = 'Android'
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo.os = 'iOS'

  // Device type detection
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceInfo.isMobile = true
    deviceInfo.device = 'Mobile'
  } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
    deviceInfo.isTablet = true
    deviceInfo.device = 'Tablet'
  } else {
    deviceInfo.isDesktop = true
    deviceInfo.device = 'Desktop'
  }

  return deviceInfo
}

// Get geolocation data from IP
async function getLocationFromIP(ip: string) {
  try {
    // Using ipapi.co for geolocation (free tier available)
    const response = await fetch(`https://ipapi.co/${ip}/json/`)
    if (response.ok) {
      const data = await response.json()
      return {
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        timezone: data.timezone || 'Unknown',
        isp: data.org || 'Unknown'
      }
    }
  } catch (error) {
    console.error('Geolocation lookup failed:', error)
  }
  
  return {
    country: 'Unknown',
    countryCode: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    latitude: null,
    longitude: null,
    timezone: 'Unknown',
    isp: 'Unknown'
  }
}

// Log login activity to database
async function logLoginActivity(data: any) {
  try {
    const { error } = await supabase
      .from('login_history')
      .insert({
        user_id: data.user_id || null,
        email: data.email || 'unknown',
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        device_info: data.device_info,
        location_info: data.location_info,
        login_type: data.login_type || 'api_call',
        success: data.success !== false,
        failure_reason: data.failure_reason || null,
        session_id: data.session_id || null,
        referer: data.referer || null,
        origin: data.origin || null
      })

    if (error) {
      console.error('Failed to log login activity:', error)
    }
  } catch (error) {
    console.error('Database logging error:', error)
  }
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
        }
      })
    }

    // Get real client IP from various headers with better priority
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfConnectingIP = req.headers.get('cf-connecting-ip')
    const clientIP = req.headers.get('x-client-ip')
    const remoteAddr = req.headers.get('x-forwarded-host')

    // Priority order for IP detection
    let detectedIP = 'unknown'
    
    if (cfConnectingIP) {
      detectedIP = cfConnectingIP.trim()
    } else if (realIP) {
      detectedIP = realIP.trim()
    } else if (forwardedFor) {
      // Take the first IP from the forwarded chain
      detectedIP = forwardedFor.split(',')[0].trim()
    } else if (clientIP) {
      detectedIP = clientIP.trim()
    } else if (remoteAddr) {
      detectedIP = remoteAddr.trim()
    }

    // Validate IP format (basic check)
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    if (!ipRegex.test(detectedIP)) {
      detectedIP = 'invalid-format'
    }

    // Get additional client information
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referer = req.headers.get('referer') || 'unknown'
    const origin = req.headers.get('origin') || 'unknown'
    const acceptLanguage = req.headers.get('accept-language') || 'unknown'

    // Parse device information
    const deviceInfo = parseUserAgent(userAgent)

    // Get geolocation data (only for valid IPs)
    let locationInfo = null
    if (detectedIP !== 'unknown' && detectedIP !== 'invalid-format' && !detectedIP.startsWith('192.168.') && !detectedIP.startsWith('10.') && !detectedIP.startsWith('127.')) {
      locationInfo = await getLocationFromIP(detectedIP)
    }

    // Parse request body for additional context
    let requestData = {}
    try {
      if (req.method === 'POST') {
        const body = await req.text()
        if (body) {
          requestData = JSON.parse(body)
        }
      }
    } catch (error) {
      // Ignore JSON parsing errors
    }

    const response = {
      ip: detectedIP,
      userAgent,
      referer,
      origin,
      acceptLanguage,
      deviceInfo,
      locationInfo,
      timestamp: new Date().toISOString(),
      headers: {
        'x-forwarded-for': forwardedFor,
        'x-real-ip': realIP,
        'cf-connecting-ip': cfConnectingIP,
        'x-client-ip': clientIP,
        'x-forwarded-host': remoteAddr
      },
      requestData
    }

    // Log to database if this is a login-related request
    if (requestData && (requestData as any).logActivity) {
      await logLoginActivity({
        ...requestData,
        ip_address: detectedIP,
        user_agent: userAgent,
        device_info: deviceInfo,
        location_info: locationInfo,
        referer,
        origin
      })
    }

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
    console.error('Client IP detection error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get client information',
        message: error.message,
        ip: 'error-occurred',
        timestamp: new Date().toISOString()
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