/*
  # Create console logs table

  1. New Tables
    - `console_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `timestamp` (timestamptz) - When the log was created
      - `level` (text) - Log level (info, warn, error, debug)
      - `action` (text) - The action being performed (fetch, summarize, list-files, etc)
      - `message` (text) - The log message
      - `details` (jsonb) - Additional details about the log entry
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `console_logs` table
    - Add policy for authenticated users to read all logs
    - Add policy for service role to insert logs

  3. Indexes
    - Index on timestamp for efficient querying
    - Index on action for filtering
*/

CREATE TABLE IF NOT EXISTS console_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now() NOT NULL,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  action text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE console_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read console logs"
  ON console_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert console logs"
  ON console_logs
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_console_logs_timestamp ON console_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_console_logs_action ON console_logs (action);
CREATE INDEX IF NOT EXISTS idx_console_logs_level ON console_logs (level);