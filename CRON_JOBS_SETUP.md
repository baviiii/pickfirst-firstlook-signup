# Cron Jobs Setup Guide

This guide explains how to set up and manage the automated cron jobs for the PickFirst platform.

## Overview

We have two main cron jobs:

1. **Property Alerts Processing** - Runs every 15 minutes to process new property alerts
2. **Weekly Digest** - Runs every Monday at 9:00 AM UTC to send weekly market summaries

## Files Created

### GitHub Actions Workflows
- `.github/workflows/property-alerts-cron.yml` - Property alerts processing
- `.github/workflows/weekly-digest-cron.yml` - Weekly digest generation

### Edge Functions
- `supabase/functions/process-property-alerts/index.ts` - Property alerts processing
- `supabase/functions/weekly-digest/index.ts` - Weekly digest generation

### Scripts
- `scripts/test-cron-jobs.sh` / `scripts/test-cron-jobs.bat` - Test cron jobs locally
- `scripts/deploy-edge-functions.sh` / `scripts/deploy-edge-functions.bat` - Deploy Edge Functions

## Setup Instructions

### 1. Deploy Edge Functions

First, deploy the Edge Functions to Supabase:

```bash
# On Unix/Linux/macOS
./scripts/deploy-edge-functions.sh

# On Windows
scripts\deploy-edge-functions.bat
```

### 2. Set Up GitHub Actions Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `RESEND_API_KEY` - Your Resend API key for email sending

### 3. Test the Functions

Before enabling the cron jobs, test the functions:

```bash
# On Unix/Linux/macOS
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export RESEND_API_KEY="your-key"
./scripts/test-cron-jobs.sh

# On Windows
set SUPABASE_URL=your-url
set SUPABASE_SERVICE_ROLE_KEY=your-key
set RESEND_API_KEY=your-key
scripts\test-cron-jobs.bat
```

### 4. Enable GitHub Actions

1. Go to your GitHub repository
2. Navigate to Actions tab
3. Enable the workflows if they're not already enabled
4. The cron jobs will start running automatically

## Cron Job Details

### Property Alerts Processing

- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Function**: `process-property-alerts`
- **Purpose**: Processes pending property alert jobs and sends notifications
- **Timeout**: 10 minutes
- **Retry**: 3 attempts with 10-second delay

### Weekly Digest

- **Schedule**: Every Monday at 9:00 AM UTC (`0 9 * * 1`)
- **Function**: `weekly-digest`
- **Purpose**: Generates and sends weekly market summaries to users
- **Timeout**: 15 minutes
- **Retry**: 3 attempts with 30-second delay

## Monitoring

### GitHub Actions

1. Go to Actions tab in your repository
2. Check the workflow runs for success/failure
3. View logs for detailed execution information

### Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Functions section
3. View function logs and metrics
4. Monitor execution times and errors

### Audit Logs

Both functions log their activities to the `audit_logs` table:

```sql
-- View recent property alerts processing
SELECT * FROM audit_logs 
WHERE table_name = 'property_alerts' 
ORDER BY created_at DESC 
LIMIT 10;

-- View recent weekly digest generation
SELECT * FROM audit_logs 
WHERE table_name = 'weekly_digest' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Manual Testing

### Test Property Alerts

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "YOUR_SUPABASE_URL/functions/v1/process-property-alerts" \
  -d '{}'
```

### Test Weekly Digest

```bash
# Test for all users
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "YOUR_SUPABASE_URL/functions/v1/weekly-digest" \
  -d '{"digest_type": "weekly", "send_to_all_users": true}'

# Test for specific user
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "YOUR_SUPABASE_URL/functions/v1/weekly-digest" \
  -d '{"digest_type": "weekly", "send_to_all_users": false, "user_id": "USER_ID"}'
```

## Troubleshooting

### Common Issues

1. **Function Timeout**: Increase timeout in GitHub Actions workflow
2. **Rate Limiting**: Check Supabase and Resend rate limits
3. **Email Delivery**: Verify Resend API key and domain configuration
4. **Database Errors**: Check Supabase logs for SQL errors

### Debug Steps

1. Check GitHub Actions logs for detailed error messages
2. Review Supabase function logs
3. Test functions manually using curl
4. Verify environment variables are set correctly
5. Check database permissions and RLS policies

## Customization

### Changing Schedule

Edit the cron expressions in the workflow files:

```yaml
# Property alerts - every 5 minutes
- cron: '*/5 * * * *'

# Weekly digest - every Friday at 5 PM UTC
- cron: '0 17 * * 5'
```

### Adding New Cron Jobs

1. Create new Edge Function in `supabase/functions/`
2. Create new GitHub Actions workflow in `.github/workflows/`
3. Add test script in `scripts/`
4. Update this documentation

## Security Considerations

- Service role keys have full database access
- Functions run with elevated permissions
- Email sending requires valid API keys
- All actions are logged for audit purposes

## Performance Optimization

- Functions are designed to handle batch processing
- Database queries are optimized for performance
- Email sending is batched to avoid rate limits
- Failed operations are retried automatically

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review GitHub Actions and Supabase logs
3. Test functions manually
4. Contact the development team

---

**Last Updated**: January 2025
**Version**: 1.0.0
