/*
# Wire activity_logs to event_contexts for unified tracking

## Purpose

The existing activity_logs table captures user actions (action, entity_type,
entity_id, details). To unify it with the Event Context Architecture, we add
an `event_context_id` column so every activity log entry can be traced back
to the full event context. This makes activity_logs a lightweight consumer
of the rich event context without duplicating any data.

## Changes
- activity_logs: + event_context_id (uuid, FK, nullable)
- Index on activity_logs.event_context_id

## Security
- No RLS policy changes (column is nullable, existing policies apply).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'event_context_id'
  ) THEN
    ALTER TABLE activity_logs ADD COLUMN event_context_id uuid REFERENCES event_contexts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_activity_logs_event_context_id ON activity_logs(event_context_id);
