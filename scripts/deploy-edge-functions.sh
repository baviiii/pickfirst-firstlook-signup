#!/bin/bash

# Deploy Edge Functions to Supabase
# This script deploys the property alerts and weekly digest Edge Functions

echo "🚀 Deploying Edge Functions to Supabase"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Please install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in a Supabase project directory${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

# Deploy property alerts function
echo -e "\n${BLUE}📦 Deploying process-property-alerts function...${NC}"
if supabase functions deploy process-property-alerts; then
    echo -e "${GREEN}✅ process-property-alerts deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy process-property-alerts${NC}"
    exit 1
fi

# Deploy weekly digest function
echo -e "\n${BLUE}📦 Deploying weekly-digest function...${NC}"
if supabase functions deploy weekly-digest; then
    echo -e "${GREEN}✅ weekly-digest deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy weekly-digest${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 All Edge Functions deployed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Test the functions using the test scripts"
echo "2. Set up GitHub Actions secrets"
echo "3. Enable the workflows in GitHub"
echo "4. Monitor the cron job executions"

echo -e "\n${YELLOW}🔧 Function URLs:${NC}"
echo "Property Alerts: https://your-project.supabase.co/functions/v1/process-property-alerts"
echo "Weekly Digest: https://your-project.supabase.co/functions/v1/weekly-digest"
