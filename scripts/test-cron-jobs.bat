@echo off
REM Test script for cron jobs on Windows
REM This script can be used to manually test the cron job functionality

echo 🧪 Testing Cron Jobs for PickFirst Platform
echo =============================================

REM Check if required environment variables are set
echo 🔍 Checking environment variables...

if "%SUPABASE_URL%"=="" (
    echo ❌ SUPABASE_URL is not set
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ❌ SUPABASE_SERVICE_ROLE_KEY is not set
    exit /b 1
)

if "%RESEND_API_KEY%"=="" (
    echo ❌ RESEND_API_KEY is not set
    exit /b 1
)

echo ✅ All environment variables are set

REM Test property alerts processing
echo.
echo 🚀 Testing Property Alerts Processing...

curl -s -X POST ^
    -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%" ^
    -H "Content-Type: application/json" ^
    "%SUPABASE_URL%/functions/v1/process-property-alerts" ^
    -d "{}" ^
    --max-time 300

if %ERRORLEVEL% neq 0 (
    echo ❌ Property alerts processing failed
    exit /b 1
) else (
    echo ✅ Property alerts processing successful
)

REM Test weekly digest generation
echo.
echo 📧 Testing Weekly Digest Generation...

curl -s -X POST ^
    -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%" ^
    -H "Content-Type: application/json" ^
    "%SUPABASE_URL%/functions/v1/weekly-digest" ^
    -d "{\"digest_type\": \"weekly\", \"send_to_all_users\": false}" ^
    --max-time 900

if %ERRORLEVEL% neq 0 (
    echo ❌ Weekly digest generation failed
    exit /b 1
) else (
    echo ✅ Weekly digest generation successful
)

REM Test with specific user (if provided)
if not "%TEST_USER_ID%"=="" (
    echo.
    echo 👤 Testing Weekly Digest for User: %TEST_USER_ID%...
    
    curl -s -X POST ^
        -H "Authorization: Bearer %SUPABASE_SERVICE_ROLE_KEY%" ^
        -H "Content-Type: application/json" ^
        "%SUPABASE_URL%/functions/v1/weekly-digest" ^
        -d "{\"digest_type\": \"weekly\", \"send_to_all_users\": false, \"user_id\": \"%TEST_USER_ID%\"}" ^
        --max-time 900
    
    if %ERRORLEVEL% neq 0 (
        echo ❌ Weekly digest for user failed
        exit /b 1
    ) else (
        echo ✅ Weekly digest for user successful
    )
)

echo.
echo 🎉 All cron job tests completed successfully!
echo 📋 Next steps:
echo 1. Deploy the Edge Functions to Supabase
echo 2. Set up GitHub Actions secrets
echo 3. Enable the workflows in GitHub
echo 4. Monitor the cron job executions

pause
