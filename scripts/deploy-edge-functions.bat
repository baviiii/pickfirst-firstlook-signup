@echo off
REM Deploy Edge Functions to Supabase on Windows
REM This script deploys the property alerts and weekly digest Edge Functions

echo 🚀 Deploying Edge Functions to Supabase
echo ========================================

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Supabase CLI is not installed
    echo Please install it from: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

REM Check if we're in a Supabase project
if not exist "supabase\config.toml" (
    echo ❌ Not in a Supabase project directory
    echo Please run this script from the project root
    pause
    exit /b 1
)

REM Deploy property alerts function
echo.
echo 📦 Deploying process-property-alerts function...
supabase functions deploy process-property-alerts
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to deploy process-property-alerts
    pause
    exit /b 1
) else (
    echo ✅ process-property-alerts deployed successfully
)

REM Deploy weekly digest function
echo.
echo 📦 Deploying weekly-digest function...
supabase functions deploy weekly-digest
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to deploy weekly-digest
    pause
    exit /b 1
) else (
    echo ✅ weekly-digest deployed successfully
)

echo.
echo 🎉 All Edge Functions deployed successfully!
echo 📋 Next steps:
echo 1. Test the functions using the test scripts
echo 2. Set up GitHub Actions secrets
echo 3. Enable the workflows in GitHub
echo 4. Monitor the cron job executions

echo.
echo 🔧 Function URLs:
echo Property Alerts: https://your-project.supabase.co/functions/v1/process-property-alerts
echo Weekly Digest: https://your-project.supabase.co/functions/v1/weekly-digest

pause
