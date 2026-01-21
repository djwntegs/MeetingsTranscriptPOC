/*
  # Add Video URL to Transcripts

  1. Changes
    - Add `video_url` column to `transcripts` table
      - Stores the SharePoint URL of the associated .mp4 recording file
      - Allows tracking which video file each transcript (VTT) came from
      - Nullable since some transcripts may not have an associated video
    - Add `video_file_name` column to store the .mp4 filename for reference

  2. Purpose
    - Enable users to see which .mp4 recording is associated with each transcript
    - Provide direct links to view the video in SharePoint
    - Better track the relationship between VTT files and their source recordings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcripts' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE transcripts ADD COLUMN video_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcripts' AND column_name = 'video_file_name'
  ) THEN
    ALTER TABLE transcripts ADD COLUMN video_file_name text;
  END IF;
END $$;

-- Add index for better query performance when filtering by video URL
CREATE INDEX IF NOT EXISTS idx_transcripts_video_url ON transcripts(video_url);