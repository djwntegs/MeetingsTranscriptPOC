export interface Transcript {
  id: string;
  title: string;
  sharepoint_url: string | null;
  content: string;
  file_name: string;
  meeting_date: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface Summary {
  id: string;
  transcript_id: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  ai_model: string;
  created_at: string;
}

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
  folderPath: string;
}
