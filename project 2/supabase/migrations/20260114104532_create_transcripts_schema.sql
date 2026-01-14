/*
  # Meeting Transcripts and Summaries Schema

  1. New Tables
    - `transcripts`
      - `id` (uuid, primary key) - Unique identifier for each transcript
      - `title` (text) - Meeting title or transcript name
      - `sharepoint_url` (text) - Original SharePoint location URL
      - `content` (text) - Full transcript content
      - `file_name` (text) - Original file name from SharePoint
      - `meeting_date` (timestamptz) - Date of the meeting
      - `uploaded_at` (timestamptz) - When the transcript was fetched
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `summaries`
      - `id` (uuid, primary key) - Unique identifier for each summary
      - `transcript_id` (uuid, foreign key) - Reference to the transcript
      - `summary` (text) - AI-generated summary
      - `key_points` (jsonb) - Structured key points from the meeting
      - `action_items` (jsonb) - Action items extracted from the meeting
      - `ai_model` (text) - Which AI model was used for summarization
      - `created_at` (timestamptz) - When the summary was generated

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their transcripts
*/

CREATE TABLE IF NOT EXISTS transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  sharepoint_url text,
  content text NOT NULL,
  file_name text NOT NULL,
  meeting_date timestamptz,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  summary text NOT NULL,
  key_points jsonb DEFAULT '[]'::jsonb,
  action_items jsonb DEFAULT '[]'::jsonb,
  ai_model text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Policies for transcripts table
CREATE POLICY "Authenticated users can view all transcripts"
  ON transcripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transcripts"
  ON transcripts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transcripts"
  ON transcripts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transcripts"
  ON transcripts FOR DELETE
  TO authenticated
  USING (true);

-- Policies for summaries table
CREATE POLICY "Authenticated users can view all summaries"
  ON summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert summaries"
  ON summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update summaries"
  ON summaries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete summaries"
  ON summaries FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_transcript_id ON summaries(transcript_id);