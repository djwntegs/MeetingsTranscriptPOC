/*
  # Create Azure OpenAI Configuration Table

  1. New Tables
    - `azure_openai_config`
      - `id` (uuid, primary key)
      - `endpoint` (text) - Azure OpenAI endpoint URL
      - `deployment_name` (text) - Name of the GPT deployment
      - `api_version` (text) - API version string
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `azure_openai_config` table
    - Add policy for authenticated users to read config
    - Add policy for authenticated users to update config
  
  3. Notes
    - Only one config row is needed (singleton pattern)
    - API key is stored separately in Supabase secrets as AZURE_OPENAI_API_KEY
*/

CREATE TABLE IF NOT EXISTS azure_openai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  deployment_name text NOT NULL,
  api_version text NOT NULL DEFAULT '2025-01-01-preview',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE azure_openai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read Azure OpenAI config"
  ON azure_openai_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert Azure OpenAI config"
  ON azure_openai_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update Azure OpenAI config"
  ON azure_openai_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete Azure OpenAI config"
  ON azure_openai_config
  FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO azure_openai_config (endpoint, deployment_name, api_version)
VALUES (
  'https://ntegraazureopenai.openai.azure.com',
  'gpt-4o-mini',
  '2025-01-01-preview'
)
ON CONFLICT DO NOTHING;
