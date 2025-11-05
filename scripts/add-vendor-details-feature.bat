@echo off
echo ========================================
echo Adding Vendor Details Feature
echo ========================================
echo.
echo This will add the vendor_details premium feature to your database.
echo.
echo IMPORTANT: Make sure you have:
echo 1. Supabase CLI installed (supabase --version)
echo 2. Linked to your project (supabase link)
echo 3. Database connection configured
echo.
pause

echo.
echo Running migration...
echo.

supabase db push

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo ERROR: Migration failed!
    echo ========================================
    echo.
    echo Alternative: Run the SQL manually in Supabase Dashboard:
    echo 1. Go to https://supabase.com/dashboard
    echo 2. Select your project
    echo 3. Go to SQL Editor
    echo 4. Copy and paste the contents of:
    echo    scripts\add-vendor-details-feature.sql
    echo 5. Click "Run"
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Vendor Details feature added
echo ========================================
echo.
echo The vendor_details feature is now available as a premium-only feature.
echo Premium users can now view vendor details on property pages.
echo.
pause
