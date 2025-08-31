# Google Maps API Setup Guide (Secure Supabase Approach)

## Overview
This guide will help you set up Google Maps API integration for your real estate platform using **Supabase Edge Functions only** for maximum security. Your API keys will never be exposed to the client-side code.

## 🔒 Security Approach
- **API keys are stored ONLY in Supabase secrets** - never exposed to the browser
- **All Google Maps operations go through Supabase edge functions**
- **Client-side code has no access to API keys**
- **Maximum security for production environments**

## Prerequisites
1. A Google Cloud Platform account
2. A billing account enabled on Google Cloud Platform
3. Supabase project with edge functions enabled

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project

## Step 2: Enable Required APIs
Enable the following APIs in your Google Cloud Console:

1. **Maps JavaScript API** - For map tiles and rendering
2. **Geocoding API** - For address to coordinates conversion
3. **Places API** - For location search and autocomplete
4. **Static Maps API** - For generating map images (optional)

## Step 3: Create API Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key

## Step 4: Restrict API Key (Recommended)
1. Click on your newly created API key
2. Under "Application restrictions", select "HTTP referrers (web sites)"
3. Add your domain(s) to the allowed referrers
4. Under "API restrictions", select "Restrict key"
5. Select only the APIs you need

## Step 5: Configure Supabase Environment Variables
**This is the ONLY place you need to set your API key:**

1. Go to your Supabase project dashboard
2. Navigate to Settings > Edge Functions
3. Add environment variable:
   ```bash
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

## Step 6: Deploy the Edge Function
The Google Maps edge function is already configured in `supabase/functions/google-maps/index.ts`. Deploy it:

```bash
supabase functions deploy google-maps
```

## Step 7: Test the Integration
1. Start your development server
2. Navigate to the Property Map page
3. You should see a secure map interface
4. Try searching for locations (uses edge function)
5. Property markers should appear on the map

## How It Works (Secure Architecture)

### 🔐 **Client-Side (Browser)**
- **NO API keys** - completely secure
- Creates visual map interface using CSS/HTML
- Displays property markers as overlays
- Handles user interactions

### 🚀 **Server-Side (Supabase Edge Functions)**
- **API keys stored securely** in Supabase secrets
- Handles all Google Maps API calls
- Geocoding addresses
- Location search
- Reverse geocoding

### 🔄 **Data Flow**
```
User Action → Client → Supabase Edge Function → Google Maps API → Response → Client
```

## Features Available

### ✅ **What Works Now**
- Property markers on map
- Location search via edge function
- Address geocoding for coordinates
- Interactive property selection
- Mobile-responsive design

### 🔮 **Future Enhancements** (Optional)
- Real map tiles via Static Maps API
- Street view integration
- Advanced mapping features

## Troubleshooting

### ❌ "Failed to load map"
- Check if edge function is deployed
- Verify environment variable is set in Supabase
- Check edge function logs

### ❌ Search not working
- Verify Geocoding API is enabled
- Check edge function logs for errors
- Ensure API key has correct permissions

### ❌ No properties showing
- Check if properties have coordinates
- Verify database connection
- Check if properties are approved

## Cost Considerations
- Google Maps API has usage-based pricing
- First $200 of usage per month is free
- All API calls go through your edge function
- Monitor usage in Google Cloud Console

## Security Benefits

1. **API keys never exposed** to client-side code
2. **All requests authenticated** through Supabase
3. **Rate limiting** can be implemented at edge function level
4. **Audit logging** of all API calls
5. **Production-ready** security model

## Support

If you encounter issues:
1. Check Supabase edge function logs
2. Verify environment variables are set
3. Ensure Google Cloud APIs are enabled
4. Check API key restrictions

## Next Steps

1. **Set your API key** in Supabase project environment variables
2. **Deploy the edge function**
3. **Test the integration**
4. **Add coordinates to properties** using the PropertyCoordinatesForm

Your Google Maps integration is now **100% secure** and production-ready! 🎉
