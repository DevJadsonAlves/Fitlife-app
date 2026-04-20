-- FitLife - Notification Preferences
-- Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  water_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  water_time TEXT NOT NULL DEFAULT '10:00',
  meal_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  meal_time TEXT NOT NULL DEFAULT '12:00',
  workout_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  workout_time TEXT NOT NULL DEFAULT '18:00',
  fasting_start_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fasting_start_time TEXT NOT NULL DEFAULT '08:00',
  fasting_phase_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fasting_end_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sleep_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sleep_time TEXT NOT NULL DEFAULT '22:30',
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_summary_time TEXT NOT NULL DEFAULT '21:00',
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_start TEXT NOT NULL DEFAULT '22:30',
  quiet_end TEXT NOT NULL DEFAULT '07:00',
  frequency TEXT NOT NULL DEFAULT 'normal',
  active_days TEXT[] NOT NULL DEFAULT ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_preferences_frequency_check
    CHECK (frequency IN ('light', 'normal', 'strong'))
);

CREATE INDEX IF NOT EXISTS notification_preferences_updated_at_idx
  ON notification_preferences(updated_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification preferences"
  ON notification_preferences;

CREATE POLICY "Users can manage their own notification preferences"
ON notification_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
