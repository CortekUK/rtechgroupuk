-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a cron job to generate reminders daily at 6:00 AM UTC
-- This calls the reminders-generate edge function
SELECT cron.schedule(
  'daily-reminder-generation',  -- job name
  '0 6 * * *',                  -- cron expression: 6:00 AM UTC every day
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/reminders-generate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To view scheduled jobs: SELECT * FROM cron.job;
-- To view job run history: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- To unschedule: SELECT cron.unschedule('daily-reminder-generation');
