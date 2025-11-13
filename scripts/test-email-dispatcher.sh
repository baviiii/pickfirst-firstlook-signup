#!/bin/bash
# Test email dispatcher manually

echo "📧 Testing email dispatcher..."

curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/functions/v1/email-dispatcher"

echo ""
echo "✅ Dispatcher called. Check email_queue table for status updates."

