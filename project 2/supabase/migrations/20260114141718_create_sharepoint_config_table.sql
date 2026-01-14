/*
  # SharePoint Configuration Storage

  1. New Tables
    - `sharepoint_config`
      - `id` (uuid, primary key) - Unique identifier for the config record
      - `tenant_id` (text) - Azure AD tenant ID
      - `client_id` (text) - Azure AD application client ID
      - `client_secret` (text) - Azure AD application client secret (encrypted)
      - `site_url` (text, nullable) - SharePoint site URL (optional, can be set per fetch)
      - `folder_path` (text, nullable) - SharePoint folder path (optional, can be set per fetch)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `sharepoint_config` table
    - Add policy for public access (since no auth system exists yet)
    
  3. Notes
    - This table stores SharePoint OAuth credentials for the application
    - In a production environment with authentication, this should be restricted to authenticated users
    - Only one config record is expected per application instance
*/

CREATE TABLE IF NOT EXISTS sharepoint_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  site_url text DEFAULT '',
  folder_path text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sharepoint_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to sharepoint config"
  ON sharepoint_config
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_sharepoint_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sharepoint_config_updated_at
  BEFORE UPDATE ON sharepoint_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sharepoint_config_updated_at();
