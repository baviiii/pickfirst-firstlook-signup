// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BATCH_SIZE = Number(Deno.env.get('EMAIL_DISPATCH_BATCH') ?? 100);
const RATE_LIMIT_DELAY_MS = Number(Deno.env.get('EMAIL_DISPATCH_DELAY_MS') ?? 600);
const MAX_ATTEMPTS = Number(Deno.env.get('EMAIL_DISPATCH_MAX_ATTEMPTS') ?? 5);
const RETRY_DELAY_MS = Number(Deno.env.get('EMAIL_DISPATCH_RETRY_DELAY_MS') ?? 60_000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async () => {
  const now = new Date().toISOString();

  const { data: queuedEmails, error: fetchError } = await supabase
    .from('email_queue')
    .select('id, email, template, subject, payload, attempts, status')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('Error fetching queued emails:', fetchError);
    return new Response(
      JSON.stringify({ success: false, error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!queuedEmails || queuedEmails.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let processed = 0;
  let failed = 0;

  for (const emailJob of queuedEmails) {
    const claimResult = await supabase
      .from('email_queue')
      .update({
        status: 'processing',
        attempts: emailJob.attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailJob.id)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (claimResult.error || !claimResult.data) {
      console.log(`Skipped email job ${emailJob.id}, could not claim or already processing.`);
      continue;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emailJob.email,
          subject: emailJob.subject ?? undefined,
          template: emailJob.template,
          data: emailJob.payload ?? {}
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Send email edge function returned ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
        );
      }

      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailJob.id);

      processed += 1;
      console.log(`Email job ${emailJob.id} sent successfully to ${emailJob.email}`);
    } catch (error: any) {
      failed += 1;
      console.error(`Failed to send email job ${emailJob.id}:`, error);

      const attempts = emailJob.attempts + 1;
      const shouldRetry = attempts < MAX_ATTEMPTS;

      await supabase
        .from('email_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          error_message: error?.message ?? 'Unknown error',
          scheduled_for: shouldRetry
            ? new Date(Date.now() + RETRY_DELAY_MS).toISOString()
            : new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', emailJob.id);
    }

    await sleep(RATE_LIMIT_DELAY_MS);
  }

  return new Response(
    JSON.stringify({ success: true, processed, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

