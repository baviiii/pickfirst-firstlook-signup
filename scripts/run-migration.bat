@echo off
echo Running Feature Gates Cleanup Migration...
echo.

REM Check if we have access to supabase CLI
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase CLI not found. Please install it first.
    echo Visit: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

REM Run the migration
echo Applying feature gates cleanup migration...
supabase db reset --db-url "your-database-url-here"

REM Alternative: Run SQL directly if you have psql
REM psql -d your_database_name -f cleanup-feature-gates.sql

echo.
echo Migration completed!
echo.
echo Next steps:
echo 1. Test your application to ensure all features work
echo 2. Update any remaining components to use new feature gates
echo 3. Remove legacy feature gates when ready
echo.
pause
