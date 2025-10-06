#!/bin/bash

# Test script for cron jobs
# This script can be used to manually test the cron job functionality

echo "🧪 Testing Cron Jobs for PickFirst Platform"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required environment variables are set
check_env_vars() {
    echo -e "${BLUE}🔍 Checking environment variables...${NC}"
    
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ SUPABASE_URL is not set${NC}"
        return 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY is not set${NC}"
        return 1
    fi
    
    if [ -z "$RESEND_API_KEY" ]; then
        echo -e "${RED}❌ RESEND_API_KEY is not set${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All environment variables are set${NC}"
    return 0
}

# Test property alerts processing
test_property_alerts() {
    echo -e "\n${BLUE}🚀 Testing Property Alerts Processing...${NC}"
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/functions/v1/process-property-alerts" \
        -d '{}' \
        --max-time 300 \
        -w "HTTPSTATUS:%{http_code}")
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ $http_code -eq 200 ]; then
        echo -e "${GREEN}✅ Property alerts processing successful${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}❌ Property alerts processing failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Test weekly digest generation
test_weekly_digest() {
    echo -e "\n${BLUE}📧 Testing Weekly Digest Generation...${NC}"
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/functions/v1/weekly-digest" \
        -d '{"digest_type": "weekly", "send_to_all_users": false}' \
        --max-time 900 \
        -w "HTTPSTATUS:%{http_code}")
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ $http_code -eq 200 ]; then
        echo -e "${GREEN}✅ Weekly digest generation successful${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}❌ Weekly digest generation failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Test with specific user (if provided)
test_weekly_digest_user() {
    if [ -n "$TEST_USER_ID" ]; then
        echo -e "\n${BLUE}👤 Testing Weekly Digest for User: $TEST_USER_ID...${NC}"
        
        response=$(curl -s -X POST \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/json" \
            "$SUPABASE_URL/functions/v1/weekly-digest" \
            -d "{\"digest_type\": \"weekly\", \"send_to_all_users\": false, \"user_id\": \"$TEST_USER_ID\"}" \
            --max-time 900 \
            -w "HTTPSTATUS:%{http_code}")
        
        http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
        
        if [ $http_code -eq 200 ]; then
            echo -e "${GREEN}✅ Weekly digest for user successful${NC}"
            echo "Response: $body"
        else
            echo -e "${RED}❌ Weekly digest for user failed (HTTP $http_code)${NC}"
            echo "Response: $body"
            return 1
        fi
    fi
}

# Main test function
main() {
    echo -e "${YELLOW}Starting cron job tests...${NC}"
    
    # Check environment variables
    if ! check_env_vars; then
        echo -e "${RED}❌ Environment check failed. Please set required environment variables.${NC}"
        exit 1
    fi
    
    # Test property alerts
    if ! test_property_alerts; then
        echo -e "${RED}❌ Property alerts test failed${NC}"
        exit 1
    fi
    
    # Test weekly digest
    if ! test_weekly_digest; then
        echo -e "${RED}❌ Weekly digest test failed${NC}"
        exit 1
    fi
    
    # Test weekly digest for specific user
    test_weekly_digest_user
    
    echo -e "\n${GREEN}🎉 All cron job tests completed successfully!${NC}"
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Deploy the Edge Functions to Supabase"
    echo "2. Set up GitHub Actions secrets"
    echo "3. Enable the workflows in GitHub"
    echo "4. Monitor the cron job executions"
}

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -u, --user-id USER_ID   Test weekly digest for specific user"
    echo ""
    echo "Environment Variables Required:"
    echo "  SUPABASE_URL            Supabase project URL"
    echo "  SUPABASE_SERVICE_ROLE_KEY  Supabase service role key"
    echo "  RESEND_API_KEY          Resend API key for email sending"
    echo ""
    echo "Example:"
    echo "  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx RESEND_API_KEY=xxx $0"
    echo "  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx RESEND_API_KEY=xxx $0 --user-id 123e4567-e89b-12d3-a456-426614174000"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--user-id)
            TEST_USER_ID="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
