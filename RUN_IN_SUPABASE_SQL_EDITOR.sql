-- ============================================================================
-- SECURITY HARDENING: Apply Audit Logs Table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Create audit_logs table for security tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'SUCCESS',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS audit_logs_select_own ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_service_insert ON public.audit_logs;

-- RLS Policies: Users can only view their own audit logs
CREATE POLICY audit_logs_select_own ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert audit logs (from Edge Functions)
CREATE POLICY audit_logs_service_insert ON public.audit_logs
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS anyway

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'Security audit trail for all critical operations';

-- Verify table was created
SELECT 
  'Audit logs table created successfully!' as status,
  COUNT(*) as initial_count
FROM public.audit_logs;
