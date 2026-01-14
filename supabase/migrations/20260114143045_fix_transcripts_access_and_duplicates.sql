/*
  # Fix Transcripts Access and Remove Duplicates

  1. Changes
    - Remove duplicate transcripts (keep only the oldest one based on created_at)
    - Update RLS policies to allow public access (anon users)
    - Add unique constraint on sharepoint_url to prevent future duplicates
  
  2. Security
    - Changed policies from authenticated-only to public access
    - This allows the app to work without user authentication
*/

-- Remove duplicate transcripts, keeping only the oldest one
WITH duplicates AS (
  SELECT id, sharepoint_url, created_at,
    ROW_NUMBER() OVER (PARTITION BY sharepoint_url ORDER BY created_at ASC) as rn
  FROM transcripts
  WHERE sharepoint_url IS NOT NULL
)
DELETE FROM transcripts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view all transcripts" ON transcripts;
DROP POLICY IF EXISTS "Authenticated users can insert transcripts" ON transcripts;
DROP POLICY IF EXISTS "Authenticated users can update transcripts" ON transcripts;
DROP POLICY IF EXISTS "Authenticated users can delete transcripts" ON transcripts;

DROP POLICY IF EXISTS "Authenticated users can view all summaries" ON summaries;
DROP POLICY IF EXISTS "Authenticated users can insert summaries" ON summaries;
DROP POLICY IF EXISTS "Authenticated users can update summaries" ON summaries;
DROP POLICY IF EXISTS "Authenticated users can delete summaries" ON summaries;

-- Create new public access policies for transcripts
CREATE POLICY "Public users can view all transcripts"
  ON transcripts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public users can insert transcripts"
  ON transcripts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public users can update transcripts"
  ON transcripts FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete transcripts"
  ON transcripts FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create new public access policies for summaries
CREATE POLICY "Public users can view all summaries"
  ON summaries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public users can insert summaries"
  ON summaries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public users can update summaries"
  ON summaries FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public users can delete summaries"
  ON summaries FOR DELETE
  TO anon, authenticated
  USING (true);

-- Add unique constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transcripts_sharepoint_url_key'
  ) THEN
    ALTER TABLE transcripts 
    ADD CONSTRAINT transcripts_sharepoint_url_key UNIQUE (sharepoint_url);
  END IF;
END $$;