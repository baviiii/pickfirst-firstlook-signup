import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OutlookEvent {
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, accessToken, calendarId, event, eventId } = await req.json()

    if (!accessToken || !calendarId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result;

    switch (action) {
      case 'create_event':
        result = await createOutlookCalendarEvent(accessToken, calendarId, event);
        break;
      case 'update_event':
        result = await updateOutlookCalendarEvent(accessToken, calendarId, eventId, event);
        break;
      case 'delete_event':
        result = await deleteOutlookCalendarEvent(accessToken, calendarId, eventId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Outlook Calendar sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createOutlookCalendarEvent(
  accessToken: string, 
  calendarId: string, 
  event: OutlookEvent
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Microsoft Graph API error: ${errorData.error?.message || 'Unknown error'}`)
  }

  return await response.json()
}

async function updateOutlookCalendarEvent(
  accessToken: string, 
  calendarId: string, 
  eventId: string, 
  event: OutlookEvent
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Microsoft Graph API error: ${errorData.error?.message || 'Unknown error'}`)
  }

  return await response.json()
}

async function deleteOutlookCalendarEvent(
  accessToken: string, 
  calendarId: string, 
  eventId: string
) {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Microsoft Graph API error: ${errorData.error?.message || 'Unknown error'}`)
  }

  return { success: true }
}
