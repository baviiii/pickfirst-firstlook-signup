# Database Migration Guide - Price Display & Ownership Duration

## Overview
This migration adds support for flexible price formats and ownership duration text input.

## Changes Made

### 1. New Field: `price_display`
- **Type**: `TEXT`
- **Purpose**: Store original price text as entered by agents
- **Examples**: 
  - `"900k-1.2M"` (price ranges)
  - `"Best Offers"` (text-based pricing)
  - `"900,000-1,200,000"` (full ranges)
  - `NULL` (for regular numeric prices)

### 2. Updated Field: `vendor_ownership_duration`
- **Before**: `INTEGER` (months only)
- **After**: `TEXT` (flexible format)
- **Migration**: Existing data converted from `24` → `"24 months"`
- **Examples**:
  - `"7 years, 2 months"`
  - `"18 months"`
  - `"2.5 years"`
  - `"Recently purchased"`

## How to Run the Migration

### Option 1: Supabase CLI (Recommended)
```bash
# Navigate to project directory
cd /path/to/pickfirst-firstlook-signup

# Run the migration
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 2: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20241105000001_add_price_display_and_update_ownership_duration.sql`
3. Paste and execute the SQL

### Option 3: Direct SQL Execution
```sql
-- Copy and paste the migration SQL directly into your database
-- File: supabase/migrations/20241105000001_add_price_display_and_update_ownership_duration.sql
```

## Verification

After running the migration, verify the changes:

```sql
-- Check the new schema
\d property_listings

-- Verify price_display column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name IN ('price_display', 'vendor_ownership_duration');

-- Check existing data migration
SELECT 
  id, 
  price, 
  price_display, 
  vendor_ownership_duration 
FROM property_listings 
LIMIT 5;
```

## Frontend Impact

### Before Migration:
- TypeScript errors due to type mismatches
- Limited to numeric ownership duration
- No support for price ranges/text

### After Migration:
- ✅ All TypeScript errors resolved
- ✅ Flexible ownership duration input
- ✅ Price ranges and text pricing supported
- ✅ Backward compatibility maintained

## Rollback (if needed)

If you need to rollback the changes:

```sql
-- Remove price_display column
ALTER TABLE property_listings DROP COLUMN IF EXISTS price_display;

-- Revert vendor_ownership_duration to integer
ALTER TABLE property_listings ADD COLUMN vendor_ownership_duration_old INTEGER;

-- Extract numbers from text (basic conversion)
UPDATE property_listings 
SET vendor_ownership_duration_old = 
  CASE 
    WHEN vendor_ownership_duration ~ '^[0-9]+' 
    THEN (regexp_match(vendor_ownership_duration, '^([0-9]+)'))[1]::INTEGER
    ELSE NULL
  END;

-- Drop text column and rename
ALTER TABLE property_listings DROP COLUMN vendor_ownership_duration;
ALTER TABLE property_listings RENAME COLUMN vendor_ownership_duration_old TO vendor_ownership_duration;
```

## Testing

Test the new functionality:

1. **Create Property with Price Range**:
   - Enter: `"900k-1.2M"`
   - Verify: `price` = 900000, `price_display` = "900k-1.2M"

2. **Create Property with Text Price**:
   - Enter: `"Best Offers"`
   - Verify: `price` = 0, `price_display` = "Best Offers"

3. **Create Property with Ownership Duration**:
   - Enter: `"7 years, 2 months"`
   - Verify: `vendor_ownership_duration` = "7 years, 2 months"

## Support

If you encounter issues:
1. Check Supabase logs for migration errors
2. Verify database permissions
3. Ensure all TypeScript types are updated
4. Test with sample data

## Files Modified
- `supabase/migrations/20241105000001_add_price_display_and_update_ownership_duration.sql`
- `src/services/propertyService.ts`
- `src/components/property/PropertyListingForm.tsx`
- `src/pages/BrowsePropertiesSimple.tsx`
- `src/utils/priceUtils.ts`
