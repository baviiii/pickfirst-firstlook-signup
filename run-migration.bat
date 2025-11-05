@echo off
echo Running database migration for price_display and ownership_duration...
echo.

REM Check if Supabase CLI is available
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Supabase CLI not found. Please install it first:
    echo npm install -g supabase
    echo.
    pause
    exit /b 1
)

echo Applying migration...
supabase db push

if %errorlevel% equ 0 (
    echo.
    echo ✅ Migration completed successfully!
    echo.
    echo Next steps:
    echo 1. Test property creation with price ranges like "900k-1.2M"
    echo 2. Test ownership duration with text like "7 years, 2 months"
    echo 3. Verify TypeScript errors are resolved
    echo.
) else (
    echo.
    echo ❌ Migration failed. Please check the error above.
    echo.
    echo Alternative: Run the SQL manually in Supabase Dashboard
    echo File: supabase/migrations/20241105000001_add_price_display_and_update_ownership_duration.sql
    echo.
)

pause
