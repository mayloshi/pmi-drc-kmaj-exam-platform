-- Automatic email queue dispatcher for Supabase Edge Function + Resend.
-- Run after deploying the send-email-queue function.
-- The anon key is already public in the static app. Keep service-role keys out of this file.

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('send-email-queue-every-5-minutes')
where exists (
  select 1
  from cron.job
  where jobname = 'send-email-queue-every-5-minutes'
);

select cron.schedule(
  'send-email-queue-every-5-minutes',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := 'https://wfsdsrmnxwxdebahznoq.supabase.co/functions/v1/send-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_A6yU8ee1-QFB4iSF8eGQbQ_ikc65MPG'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
