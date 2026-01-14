/*
  # Add API Key to Azure OpenAI Config

  1. Changes
    - Add `api_key` column to `azure_openai_config` table
    - This allows users to store their Azure OpenAI API key in the database
    - More reliable than edge function environment variables

  2. Security
    - API key is stored in the database with RLS enabled
    - Only accessible to authenticated users through the service role in edge functions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'azure_openai_config' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE azure_openai_config ADD COLUMN api_key text DEFAULT '';
  END IF;
END $$;