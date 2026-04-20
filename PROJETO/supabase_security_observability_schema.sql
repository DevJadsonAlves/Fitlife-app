-- FitLife - Security & Observability Schema
-- Execute este script no SQL Editor do Supabase.

-- 1) Auditoria de ações sensíveis
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'app',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_user_id_idx
  ON audit_events(user_id, created_at DESC);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own audit events" ON audit_events;
CREATE POLICY "Users can read their own audit events"
ON audit_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own audit events" ON audit_events;
CREATE POLICY "Users can insert their own audit events"
ON audit_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2) Erros de cliente (observabilidade)
CREATE TABLE IF NOT EXISTS client_error_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  path TEXT,
  user_agent TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_error_events_user_id_idx
  ON client_error_events(user_id, created_at DESC);

ALTER TABLE client_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own client errors" ON client_error_events;
CREATE POLICY "Users can read their own client errors"
ON client_error_events
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own client errors" ON client_error_events;
CREATE POLICY "Users can insert their own client errors"
ON client_error_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);
