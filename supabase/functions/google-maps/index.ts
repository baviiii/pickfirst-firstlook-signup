import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  console.log('Google Maps API function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    // Initialize Supabase client for authentication
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    
    // Get auth token from request
    const authToken = req.headers.get('Authorization');
    if (authToken) {
      const { data: { user }, error } = await supabase.auth.getUser(authToken.replace('Bearer ', ''));
      if (error || !user) {
        console.log('Authentication failed:', error);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { action, ...params } = await req.json();
    console.log('Action:', action, 'Params:', params);

    let apiUrl = '';
    let queryParams = new URLSearchParams({ key: GOOGLE_MAPS_API_KEY });

    switch (action) {
      case 'geocode':
        apiUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        if (params.address) {
          queryParams.set('address', params.address);
        }
        if (params.latlng) {
          queryParams.set('latlng', params.latlng);
        }
        break;

      case 'places_autocomplete':
        apiUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
        if (params.input) {
          queryParams.set('input', params.input);
        }
        if (params.types) {
          queryParams.set('types', params.types);
        }
        if (params.location) {
          queryParams.set('location', params.location);
        }
        if (params.radius) {
          queryParams.set('radius', params.radius.toString());
        }
        if (params.components) {
          queryParams.set('components', params.components);
        }
        break;

      case 'place_details':
        apiUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
        if (params.place_id) {
          queryParams.set('place_id', params.place_id);
        }
        if (params.fields) {
          queryParams.set('fields', params.fields);
        }
        break;

      case 'nearby_search':
        apiUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
        if (params.location) {
          queryParams.set('location', params.location);
        }
        if (params.radius) {
          queryParams.set('radius', params.radius.toString());
        }
        if (params.type) {
          queryParams.set('type', params.type);
        }
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    const response = await fetch(`${apiUrl}?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Google Maps API response status:', data.status);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-maps function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      error: errorMessage,
      status: 'ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});