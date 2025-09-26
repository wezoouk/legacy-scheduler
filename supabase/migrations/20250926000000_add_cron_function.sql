-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    response text;
    supabase_url text := current_setting('app.settings.supabase_url', true);
    service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
    -- Only proceed if we have the required settings
    IF supabase_url IS NULL OR service_key IS NULL THEN
        RAISE NOTICE 'Supabase URL or service key not configured';
        RETURN;
    END IF;

    -- Call the edge function using http extension
    SELECT content INTO response FROM http((
        'POST',
        supabase_url || '/functions/v1/process-scheduled-messages',
        ARRAY[
            http_header('Authorization', 'Bearer ' || service_key),
            http_header('Content-Type', 'application/json')
        ],
        'application/json',
        '{}'
    ));
    
    -- Log the response
    RAISE NOTICE 'Scheduled message processing result: %', response;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error processing scheduled messages: %', SQLERRM;
END;
$$;

-- Schedule the function to run every minute
-- Note: This requires superuser privileges and may not work on hosted Supabase
-- SELECT cron.schedule(
--     'process-scheduled-messages',
--     '* * * * *',
--     'SELECT process_scheduled_messages();'
-- );

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION trigger_scheduled_processing()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    PERFORM process_scheduled_messages();
    
    result := json_build_object(
        'success', true,
        'message', 'Scheduled message processing triggered',
        'timestamp', now()
    );
    
    RETURN result;
END;
$$;
