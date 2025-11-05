# Vendor Details Premium Feature

## Overview
The Vendor Details feature is a **premium-only** feature that provides buyers with exclusive insights into property sellers, helping them make more informed purchasing decisions.

## Feature Details

### What Premium Users See
When viewing a property, premium users can access:
- **Ownership Duration**: How long the vendor has owned the property
- **Vendor Motivation**: Why the seller is selling (e.g., downsizing, relocating, investment)
- **Special Conditions**: Any unique circumstances or requirements
- **Favorable Contracts**: Information about existing contracts that benefit the buyer

### Access Control
- **Free Tier**: ❌ No access
- **Basic Tier**: ❌ No access  
- **Premium Tier**: ✅ Full access

## Implementation

### Frontend Integration
The feature is integrated into the `PropertyDetails.tsx` component:

```typescript
const { canViewVendorDetails } = useSubscription();

// Conditionally render vendor details section
{canViewVendorDetails() && (
  <VendorDetails
    propertyId={property.id}
    ownershipDuration={property.vendor_ownership_duration}
    specialConditions={property.vendor_special_conditions}
    favorableContracts={property.vendor_favorable_contracts}
    motivation={property.vendor_motivation}
  />
)}
```

### Feature Gate Configuration
The feature is controlled by the `vendor_details` feature gate in the database:

```sql
feature_key: 'vendor_details'
feature_name: 'Vendor Details'
description: 'Access detailed vendor/seller information'
free_tier_enabled: false
basic_tier_enabled: false
premium_tier_enabled: true
```

### Subscription Hook
The `useSubscription` hook provides the `canViewVendorDetails()` method:

```typescript
const canViewVendorDetails = (): boolean => {
  return isFeatureEnabled('vendor_details');
};
```

## Database Setup

### Migration Files
1. **20241105120000_cleanup_redundant_feature_gates.sql**
   - Updated to preserve `vendor_details` feature
   - Removed from deletion list
   - Added to whitelist

2. **20250105000000_add_vendor_details_feature.sql**
   - Creates/updates the `vendor_details` feature configuration
   - Sets premium-only access

### Running the Migration

#### Option 1: Using Supabase CLI
```bash
cd scripts
add-vendor-details-feature.bat
```

#### Option 2: Manual SQL Execution
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to SQL Editor
4. Copy and paste contents from `scripts/add-vendor-details-feature.sql`
5. Click "Run"

## Verification

### Check Feature Configuration
```sql
SELECT 
  feature_key, 
  feature_name, 
  free_tier_enabled,
  basic_tier_enabled,
  premium_tier_enabled
FROM feature_configurations 
WHERE feature_key = 'vendor_details';
```

Expected result:
```
feature_key: vendor_details
feature_name: Vendor Details
free_tier_enabled: false
basic_tier_enabled: false
premium_tier_enabled: true
```

### Test in Application
1. **As Free User**: Vendor details section should NOT appear on property pages
2. **As Premium User**: Vendor details section should appear with all information
3. **Feature Toggle**: Super admin can enable/disable via feature management

## Component Structure

### VendorDetails Component
Located at: `src/components/property/VendorDetails.tsx`

Props:
- `propertyId`: string
- `ownershipDuration`: string | null
- `specialConditions`: string | null
- `favorableContracts`: string | null
- `motivation`: string | null

## Business Value

### For Buyers
- **Better Negotiation**: Understanding seller motivation helps with offers
- **Risk Assessment**: Special conditions reveal potential issues
- **Time Savings**: Favorable contracts can expedite closing
- **Informed Decisions**: Complete picture of the property situation

### For Platform
- **Premium Conversion**: Exclusive feature drives upgrades
- **Competitive Advantage**: Unique offering vs. competitors
- **User Retention**: Premium users get ongoing value
- **Data Monetization**: Vendor insights are valuable information

## Related Features
- **Off-Market Properties**: Another premium-only feature
- **Market Insights**: Premium analytics and trends
- **Advanced Search**: Premium search capabilities
- **Priority Support**: Premium customer service

## Future Enhancements
- [ ] Vendor contact history
- [ ] Previous sale prices
- [ ] Vendor portfolio (other properties)
- [ ] Negotiation tips based on motivation
- [ ] AI-powered vendor insights
- [ ] Vendor response time analytics

## Support
For issues or questions:
1. Check feature gate configuration in database
2. Verify user subscription tier
3. Check browser console for errors
4. Review audit logs for access attempts
5. Contact platform support

## Security Notes
- Vendor details are sensitive information
- Only premium users can access
- All access is logged in audit trail
- RLS policies protect vendor data
- No API exposure without authentication
