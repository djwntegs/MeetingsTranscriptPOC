import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteUrl: string;
  folderPath: string;
}

interface TranscriptFile {
  name: string;
  content: string;
  url: string;
  lastModified: string;
  videoUrl?: string;
  videoFileName?: string;
}

let supabaseClient: any = null;

async function logToDatabase(
  level: 'info' | 'warn' | 'error' | 'debug',
  action: string,
  message: string,
  details?: any
) {
  try {
    if (!supabaseClient) return;

    await supabaseClient
      .from('console_logs')
      .insert({
        level,
        action,
        message,
        details: details || {}
      });
  } catch (err) {
    console.error('Failed to log to database:', err);
  }
}

function log(action: string, message: string, details?: any) {
  console.log(message);
  logToDatabase('info', action, message, details);
}

function logError(action: string, message: string, details?: any) {
  console.error(message);
  logToDatabase('error', action, message, details);
}

function logWarn(action: string, message: string, details?: any) {
  console.warn(message);
  logToDatabase('warn', action, message, details);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    supabaseClient = supabase;

    const { action, config, transcriptId } = await req.json();
    log(action, `Starting action: ${action}`, { action });

    if (action === "fetch-from-recordings") {
      const transcripts = await fetchOneDriveRecordings(config);
      console.log(`Found ${transcripts.length} VTT files from Recordings folder`);

      const storedTranscripts = [];
      const errors = [];

      for (const transcript of transcripts) {
        try {
          const { data, error } = await supabase
            .from("transcripts")
            .upsert({
              title: transcript.name.replace(/\.[^/.]+$/, ""),
              sharepoint_url: transcript.url,
              content: transcript.content,
              file_name: transcript.name,
              meeting_date: new Date(transcript.lastModified),
              video_url: transcript.videoUrl || null,
              video_file_name: transcript.videoFileName || null,
            }, {
              onConflict: 'sharepoint_url',
              ignoreDuplicates: false
            })
            .select()
            .maybeSingle();

          if (error) {
            console.error("Error storing transcript:", error);
            errors.push({ file: transcript.name, error: error.message });
            continue;
          }

          if (data) {
            storedTranscripts.push(data);
            console.log(`Successfully processed: ${transcript.name}`);
          }
        } catch (err) {
          console.error("Exception processing transcript:", err);
          errors.push({ file: transcript.name, error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: storedTranscripts.length,
          total: transcripts.length,
          transcripts: storedTranscripts,
          errors: errors.length > 0 ? errors : undefined
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "fetch") {
      log('fetch', `Fetching transcripts from SharePoint`, { siteUrl: config.siteUrl, folderPath: config.folderPath });

      const transcripts = await fetchSharePointTranscripts(config);
      log('fetch', `Found ${transcripts.length} transcript files to process`, { count: transcripts.length });

      const storedTranscripts = [];
      const errors = [];

      for (const transcript of transcripts) {
        try {
          log('fetch', `Processing file: ${transcript.name}`, { fileName: transcript.name });

          const { data, error } = await supabase
            .from("transcripts")
            .upsert({
              title: transcript.name.replace(/\.[^/.]+$/, ""),
              sharepoint_url: transcript.url,
              content: transcript.content,
              file_name: transcript.name,
              meeting_date: new Date(transcript.lastModified),
              video_url: transcript.videoUrl || null,
              video_file_name: transcript.videoFileName || null,
            }, {
              onConflict: 'sharepoint_url',
              ignoreDuplicates: false
            })
            .select()
            .maybeSingle();

          if (error) {
            logError('fetch', `Error storing transcript: ${transcript.name}`, { fileName: transcript.name, error: error.message });
            errors.push({ file: transcript.name, error: error.message });
            continue;
          }

          if (data) {
            storedTranscripts.push(data);
            log('fetch', `Successfully processed: ${transcript.name}`, { fileName: transcript.name, transcriptId: data.id });
          }
        } catch (err) {
          logError('fetch', `Exception processing transcript: ${transcript.name}`, { fileName: transcript.name, error: String(err) });
          errors.push({ file: transcript.name, error: String(err) });
        }
      }

      log('fetch', `Fetch completed - ${storedTranscripts.length} of ${transcripts.length} files processed successfully`, {
        successCount: storedTranscripts.length,
        totalCount: transcripts.length,
        errorCount: errors.length
      });

      return new Response(
        JSON.stringify({
          success: true,
          count: storedTranscripts.length,
          total: transcripts.length,
          transcripts: storedTranscripts,
          errors: errors.length > 0 ? errors : undefined
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "list-folders") {
      const folders = await listSharePointFolders(config);

      return new Response(
        JSON.stringify({
          success: true,
          folders: folders
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "list-files") {
      const files = await listFilesInFolder(config);

      return new Response(
        JSON.stringify({
          success: true,
          files: files
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "summarize") {
      const { data: transcript, error: fetchError } = await supabase
        .from("transcripts")
        .select("*")
        .eq("id", transcriptId)
        .maybeSingle();

      if (fetchError || !transcript) {
        throw new Error("Transcript not found");
      }

      const { data: azureConfig, error: configError } = await supabase
        .from("azure_openai_config")
        .select("*")
        .maybeSingle();

      if (configError || !azureConfig) {
        throw new Error("Azure OpenAI configuration not found");
      }

      if (!azureConfig.api_key) {
        throw new Error("Azure OpenAI API key not configured - please add it in the Configuration tab");
      }

      const summary = await summarizeWithAI(
        transcript.content,
        azureConfig.api_key,
        azureConfig
      );

      const { data: summaryData, error: summaryError } = await supabase
        .from("summaries")
        .insert({
          transcript_id: transcriptId,
          summary: summary.summary,
          key_points: summary.keyPoints,
          action_items: summary.actionItems,
          ai_model: `azure-${azureConfig.deployment_name}`,
        })
        .select()
        .maybeSingle();

      if (summaryError) {
        throw new Error("Error storing summary: " + summaryError.message);
      }

      return new Response(
        JSON.stringify({ success: true, summary: summaryData }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function getSharePointAccessToken(config: SharePointConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Token error:", errorData);
    throw new Error(`Failed to get SharePoint access token: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function tryFetchTranscriptFromStream(
  driveItemId: string,
  siteId: string,
  accessToken: string,
  fileName: string,
  videoUrl?: string
): Promise<TranscriptFile | null> {
  try {
    console.log(`Checking for Stream transcript for: ${fileName}`);

    const itemUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${driveItemId}`;

    const childrenUrl = `${itemUrl}/children`;
    const childrenResponse = await fetch(childrenUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (childrenResponse.ok) {
      const childrenData = await childrenResponse.json();
      console.log(`Checking ${childrenData.value?.length || 0} child items for transcripts`);

      for (const child of childrenData.value || []) {
        if (child.file && child.name.endsWith('.vtt')) {
          console.log(`Found VTT file as child of recording: ${child.name}`);

          const downloadUrl = child["@microsoft.graph.downloadUrl"];
          const contentResponse = await fetch(downloadUrl);
          const content = await contentResponse.text();

          return {
            name: child.name,
            content: content,
            url: child.webUrl,
            lastModified: child.lastModifiedDateTime,
            videoUrl: videoUrl,
            videoFileName: fileName,
          };
        }
      }
    }

    const betaItemUrl = `https://graph.microsoft.com/beta/sites/${siteId}/drive/items/${driveItemId}`;
    const betaResponse = await fetch(betaItemUrl + '?$select=id,name,file,media', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (betaResponse.ok) {
      const betaData = await betaResponse.json();
      console.log(`Beta API response for ${fileName}:`, JSON.stringify(betaData, null, 2));

      if (betaData.media?.isTranscriptionEnabled) {
        console.log(`Transcription is enabled for ${fileName}`);
      }
    }

    const thumbnailsUrl = `${itemUrl}/thumbnails`;
    const thumbnailsResponse = await fetch(thumbnailsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (thumbnailsResponse.ok) {
      const thumbnailsData = await thumbnailsResponse.json();
      console.log(`Thumbnails data available for ${fileName}`);
    }

    return null;
  } catch (error) {
    console.error(`Error checking Stream transcript for ${fileName}:`, error);
    return null;
  }
}

async function tryFetchTranscriptFromDriveItem(
  driveItemId: string,
  siteId: string,
  accessToken: string,
  fileName: string,
  videoUrl?: string
): Promise<TranscriptFile | null> {
  try {
    console.log(`Attempting to fetch transcript for: ${fileName}`);

    const streamTranscript = await tryFetchTranscriptFromStream(driveItemId, siteId, accessToken, fileName, videoUrl);
    if (streamTranscript) {
      return streamTranscript;
    }

    const itemUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${driveItemId}`;
    const itemResponse = await fetch(itemUrl + '?$expand=permissions', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!itemResponse.ok) {
      console.log(`Could not access drive item for ${fileName}`);
      return null;
    }

    const itemData = await itemResponse.json();

    const parentUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${itemData.parentReference.id}/children`;
    console.log(`Checking parent folder for related transcript files`);

    const parentResponse = await fetch(parentUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (parentResponse.ok) {
      const parentData = await parentResponse.json();
      const baseName = fileName
        .replace(/_\d{6}UTC-Meeting Recording\.mp4$/i, '')
        .replace(/-Meeting Recording\.mp4$/i, '')
        .replace(/\.mp4$/i, '');

      console.log(`Looking for VTT files matching base name: ${baseName}`);

      const allItems = parentData.value || [];

      for (const file of allItems) {
        const matchPatterns = [
          file.name === `${baseName}.vtt`,
          file.name === `${baseName}-transcript.vtt`,
          file.name.startsWith(baseName) && file.name.endsWith('.vtt'),
          file.name.includes(baseName.split('-')[0]) && file.name.endsWith('.vtt'),
        ];

        if (file.file && file.name.endsWith('.vtt') && matchPatterns.some(m => m)) {
          console.log(`Found matching VTT file in parent folder: ${file.name}`);

          const downloadUrl = file["@microsoft.graph.downloadUrl"];
          const contentResponse = await fetch(downloadUrl);
          const content = await contentResponse.text();

          return {
            name: file.name,
            content: content,
            url: file.webUrl,
            lastModified: file.lastModifiedDateTime,
            videoUrl: videoUrl,
            videoFileName: fileName,
          };
        }
      }

      const folderNameMatch = allItems.find((item: any) =>
        item.folder && (item.name === baseName || item.name.includes(baseName))
      );

      if (folderNameMatch) {
        console.log(`Found folder matching recording name: ${folderNameMatch.name}`);

        const folderUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderNameMatch.id}/children`;
        const folderResponse = await fetch(folderUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          console.log(`Files in folder ${folderNameMatch.name}:`, folderData.value.map((f: any) => f.name).join(', '));

          for (const file of folderData.value || []) {
            if (file.file && file.name.endsWith('.vtt')) {
              console.log(`Found VTT file in subfolder: ${file.name}`);

              const downloadUrl = file["@microsoft.graph.downloadUrl"];
              const contentResponse = await fetch(downloadUrl);
              const content = await contentResponse.text();

              return {
                name: file.name,
                content: content,
                url: file.webUrl,
                lastModified: file.lastModifiedDateTime,
                videoUrl: videoUrl,
                videoFileName: fileName,
              };
            }
          }
        }
      }

      const transcriptFolder = allItems.find((item: any) =>
        item.folder && (item.name === 'Transcript' || item.name === 'Transcripts')
      );

      if (transcriptFolder) {
        console.log(`Found Transcript folder, checking for VTT files`);

        const transcriptFolderUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${transcriptFolder.id}/children`;
        const transcriptFolderResponse = await fetch(transcriptFolderUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (transcriptFolderResponse.ok) {
          const transcriptFolderData = await transcriptFolderResponse.json();

          for (const file of transcriptFolderData.value || []) {
            if (file.file && file.name.endsWith('.vtt') && file.name.includes(baseName.split('-')[0])) {
              console.log(`Found VTT file in Transcript folder: ${file.name}`);

              const downloadUrl = file["@microsoft.graph.downloadUrl"];
              const contentResponse = await fetch(downloadUrl);
              const content = await contentResponse.text();

              return {
                name: file.name,
                content: content,
                url: file.webUrl,
                lastModified: file.lastModifiedDateTime,
                videoUrl: videoUrl,
                videoFileName: fileName,
              };
            }
          }
        }
      }

      console.log(`Files in parent folder: ${allItems.map((f: any) => f.name).join(', ')}`);
    }

    const versionsUrl = `${itemUrl}/versions`;
    const versionsResponse = await fetch(versionsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (versionsResponse.ok) {
      const versionsData = await versionsResponse.json();
      console.log(`Found ${versionsData.value?.length || 0} versions for ${fileName}`);
    }

    const relatedUrl = `https://graph.microsoft.com/beta/sites/${siteId}/drive/items/${driveItemId}/analytics/allTime`;
    const relatedResponse = await fetch(relatedUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (relatedResponse.ok) {
      console.log(`Successfully fetched analytics for ${fileName}`);
    }

    const baseName = fileName
      .replace(/_\d{6}UTC-Meeting Recording\.mp4$/i, '')
      .replace(/-Meeting Recording\.mp4$/i, '')
      .replace(/\.mp4$/i, '');

    const searchQueries = [
      `${baseName}.vtt`,
      `${baseName}-transcript.vtt`,
      `${baseName.split('-')[0]}.vtt`,
      baseName.split('-')[0],
    ];

    for (const query of searchQueries) {
      const transcriptSearchUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='${encodeURIComponent(query)}')`;
      console.log(`Searching with query: ${query}`);

      const searchResponse = await fetch(transcriptSearchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log(`Search returned ${searchData.value?.length || 0} results`);

        for (const result of searchData.value || []) {
          if (result.file && result.name.endsWith('.vtt')) {
            console.log(`Found potential VTT via search: ${result.name}`);

            const downloadUrl = result["@microsoft.graph.downloadUrl"];
            const contentResponse = await fetch(downloadUrl);
            const content = await contentResponse.text();

            return {
              name: result.name,
              content: content,
              url: result.webUrl,
              lastModified: result.lastModifiedDateTime,
              videoUrl: videoUrl,
              videoFileName: fileName,
            };
          }
        }
      }
    }

    console.log(`No transcript found for ${fileName} after exhaustive search`);
    return null;
  } catch (error) {
    console.error(`Error fetching transcript for ${fileName}:`, error);
    return null;
  }
}

async function fetchSharePointTranscripts(
  config: SharePointConfig
): Promise<TranscriptFile[]> {
  const accessToken = await getSharePointAccessToken(config);

  const siteUrl = new URL(config.siteUrl);
  const hostname = siteUrl.hostname;
  const sitePath = siteUrl.pathname;

  const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  console.log("Fetching site info from:", siteApiUrl);

  const siteResponse = await fetch(siteApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!siteResponse.ok) {
    const errorData = await siteResponse.text();
    console.error("Site fetch error:", errorData);
    throw new Error(`Failed to get SharePoint site information: ${siteResponse.status} - Check that your Site URL is correct (format: https://tenant.sharepoint.com/sites/sitename)`);
  }

  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  const filesApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${config.folderPath}:/children`;
  console.log("Fetching files from:", filesApiUrl);

  const filesResponse = await fetch(filesApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!filesResponse.ok) {
    const errorData = await filesResponse.text();
    console.error("Files fetch error:", errorData);
    throw new Error(`Failed to fetch files from SharePoint: ${filesResponse.status} - Check that your Folder Path is correct (e.g., /Shared Documents/Meeting Transcripts) and that the app has permission to access it`);
  }

  const filesData = await filesResponse.json();
  const transcripts: TranscriptFile[] = [];

  const allFiles = filesData.value;
  const vttFiles = allFiles.filter((f: any) => f.file && f.name.endsWith(".vtt"));
  const mp4Files = allFiles.filter((f: any) => f.file && f.name.endsWith(".mp4") && f.name.includes("Meeting Recording"));

  console.log(`Found ${vttFiles.length} VTT files and ${mp4Files.length} meeting recordings`);

  const processedVttNames = new Set<string>();

  for (const vttFile of vttFiles) {
    try {
      const downloadUrl = vttFile["@microsoft.graph.downloadUrl"];
      const contentResponse = await fetch(downloadUrl);
      const content = await contentResponse.text();

      transcripts.push({
        name: vttFile.name,
        content: content,
        url: vttFile.webUrl,
        lastModified: vttFile.lastModifiedDateTime,
      });

      processedVttNames.add(vttFile.name);
      console.log(`Processed VTT file: ${vttFile.name}`);
    } catch (error) {
      console.error(`Error processing ${vttFile.name}:`, error);
    }
  }

  for (const mp4File of mp4Files) {
    try {
      const baseName = mp4File.name
        .replace(/_\d{6}UTC-Meeting Recording\.mp4$/i, '')
        .replace(/-Meeting Recording\.mp4$/i, '');

      const possibleVttName = `${baseName}.vtt`;

      if (processedVttNames.has(possibleVttName)) {
        console.log(`VTT for ${mp4File.name} already processed: ${possibleVttName}`);
        continue;
      }

      const vttFile = vttFiles.find((f: any) => f.name === possibleVttName);
      if (vttFile && !processedVttNames.has(vttFile.name)) {
        const downloadUrl = vttFile["@microsoft.graph.downloadUrl"];
        const contentResponse = await fetch(downloadUrl);
        const content = await contentResponse.text();

        transcripts.push({
          name: vttFile.name,
          content: content,
          url: vttFile.webUrl,
          lastModified: vttFile.lastModifiedDateTime,
          videoUrl: mp4File.webUrl,
          videoFileName: mp4File.name,
        });

        processedVttNames.add(vttFile.name);
        console.log(`Found and processed VTT for recording ${mp4File.name}: ${vttFile.name}`);
      } else {
        console.log(`No matching VTT found in same folder for recording: ${mp4File.name}`);

        const transcriptFromDriveItem = await tryFetchTranscriptFromDriveItem(
          mp4File.id,
          siteId,
          accessToken,
          mp4File.name,
          mp4File.webUrl
        );

        if (transcriptFromDriveItem) {
          transcripts.push(transcriptFromDriveItem);
          console.log(`Found transcript through Graph API for: ${mp4File.name}`);
        } else {
          console.log(`No transcript available for: ${mp4File.name}`);
        }
      }
    } catch (error) {
      console.error(`Error finding VTT for ${mp4File.name}:`, error);
    }
  }

  for (const file of allFiles) {
    if (file.file && (file.name.endsWith(".txt") || file.name.endsWith(".docx"))) {
      try {
        const downloadUrl = file["@microsoft.graph.downloadUrl"];
        const contentResponse = await fetch(downloadUrl);
        const content = await contentResponse.text();

        transcripts.push({
          name: file.name,
          content: content,
          url: file.webUrl,
          lastModified: file.lastModifiedDateTime,
        });

        console.log(`Processed text file: ${file.name}`);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }
    }
  }

  console.log(`Total transcripts found: ${transcripts.length}`);
  return transcripts;
}

async function listFilesInFolder(
  config: SharePointConfig
): Promise<any[]> {
  const accessToken = await getSharePointAccessToken(config);

  const siteUrl = new URL(config.siteUrl);
  const hostname = siteUrl.hostname;
  const sitePath = siteUrl.pathname;

  const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  console.log("Fetching site info from:", siteApiUrl);

  const siteResponse = await fetch(siteApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!siteResponse.ok) {
    const errorData = await siteResponse.text();
    console.error("Site fetch error:", errorData);
    throw new Error(`Failed to get SharePoint site information: ${siteResponse.status}`);
  }

  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  const filesApiUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${config.folderPath}:/children`;
  console.log("Fetching files from:", filesApiUrl);

  const filesResponse = await fetch(filesApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    });

  if (!filesResponse.ok) {
    const errorData = await filesResponse.text();
    console.error("Files fetch error:", errorData);
    throw new Error(`Failed to fetch files from folder: ${filesResponse.status} - ${errorData}`);
  }

  const filesData = await filesResponse.json();
  const files = [];

  for (const item of filesData.value) {
    files.push({
      name: item.name,
      isFile: !!item.file,
      isFolder: !!item.folder,
      size: item.size,
      lastModified: item.lastModifiedDateTime,
      webUrl: item.webUrl,
      extension: item.name.includes('.') ? item.name.split('.').pop() : '',
      mimeType: item.file?.mimeType || 'N/A',
    });
  }

  return files;
}

async function listSharePointFolders(
  config: SharePointConfig
): Promise<any[]> {
  const accessToken = await getSharePointAccessToken(config);

  const siteUrl = new URL(config.siteUrl);
  const hostname = siteUrl.hostname;
  const sitePath = siteUrl.pathname;

  const siteApiUrl = `https://graph.microsoft.com/v1.0/sites/${hostname}:${sitePath}`;
  console.log("Fetching site info from:", siteApiUrl);

  const siteResponse = await fetch(siteApiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!siteResponse.ok) {
    const errorData = await siteResponse.text();
    console.error("Site fetch error:", errorData);
    throw new Error(`Failed to get SharePoint site information: ${siteResponse.status} - Check that your Site URL is correct`);
  }

  const siteData = await siteResponse.json();
  const siteId = siteData.id;

  const drivesResponse = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!drivesResponse.ok) {
    throw new Error("Failed to fetch document libraries");
  }

  const drivesData = await drivesResponse.json();
  const folders = [];

  for (const drive of drivesData.value) {
    try {
      const rootResponse = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/root/children`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (rootResponse.ok) {
        const rootData = await rootResponse.json();

        for (const item of rootData.value) {
          if (item.folder) {
            folders.push({
              name: item.name,
              path: `/${item.name}`,
              libraryName: drive.name,
              webUrl: item.webUrl,
            });

            try {
              const subFoldersResponse = await fetch(
                `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${drive.id}/items/${item.id}/children`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              if (subFoldersResponse.ok) {
                const subFoldersData = await subFoldersResponse.json();
                for (const subItem of subFoldersData.value) {
                  if (subItem.folder) {
                    folders.push({
                      name: subItem.name,
                      path: `/${item.name}/${subItem.name}`,
                      libraryName: drive.name,
                      webUrl: subItem.webUrl,
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching subfolders:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing drive:", drive.name, error);
    }
  }

  return folders;
}

async function fetchOneDriveRecordings(
  config: SharePointConfig
): Promise<TranscriptFile[]> {
  const accessToken = await getSharePointAccessToken(config);

  const transcripts: TranscriptFile[] = [];

  const recordingsFolderUrl = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/Recordings`;
  console.log("Searching for Recordings folder in OneDrive");

  try {
    const folderResponse = await fetch(recordingsFolderUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!folderResponse.ok) {
      console.log("Recordings folder not found in special approot, trying alternative paths");

      const searchUrl = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='Recordings')`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const recordingsFolder = searchData.value.find((item: any) =>
          item.folder && item.name === 'Recordings'
        );

        if (recordingsFolder) {
          const filesUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${recordingsFolder.id}/children`;
          const filesResponse = await fetch(filesUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            return await processVTTFiles(filesData.value, accessToken);
          }
        }
      }

      throw new Error("Could not find Recordings folder in OneDrive");
    }

    const folderData = await folderResponse.json();
    const folderId = folderData.id;

    const filesUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;
    const filesResponse = await fetch(filesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!filesResponse.ok) {
      throw new Error(`Failed to fetch files from Recordings folder: ${filesResponse.status}`);
    }

    const filesData = await filesResponse.json();
    return await processVTTFiles(filesData.value, accessToken);

  } catch (error) {
    console.error("Error fetching OneDrive recordings:", error);
    throw error;
  }
}

async function processVTTFiles(files: any[], accessToken: string): Promise<TranscriptFile[]> {
  const transcripts: TranscriptFile[] = [];

  for (const file of files) {
    if (file.file && file.name.endsWith(".vtt")) {
      try {
        const downloadUrl = file["@microsoft.graph.downloadUrl"];
        const contentResponse = await fetch(downloadUrl);
        const content = await contentResponse.text();

        transcripts.push({
          name: file.name,
          content: content,
          url: file.webUrl,
          lastModified: file.lastModifiedDateTime,
        });

        console.log(`Found VTT file: ${file.name}`);
      } catch (error) {
        console.error(`Error downloading ${file.name}:`, error);
      }
    }
  }

  return transcripts;
}

async function summarizeWithAI(
  transcript: string,
  azureApiKey: string,
  azureConfig: any
): Promise<{ summary: string; keyPoints: string[]; actionItems: string[] }> {
  const url = `${azureConfig.endpoint}/openai/deployments/${azureConfig.deployment_name}/chat/completions?api-version=${azureConfig.api_version}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": azureApiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are a professional meeting transcript analyzer. Summarize the transcript and extract key points and action items. Return your response as JSON with fields: summary (string), keyPoints (array of strings), actionItems (array of strings).",
        },
        {
          role: "user",
          content: `Please analyze this meeting transcript and provide a summary, key points, and action items:\n\n${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure OpenAI error:", errorText);
    throw new Error(`Failed to generate summary with Azure OpenAI: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    summary: result.summary || "",
    keyPoints: result.keyPoints || [],
    actionItems: result.actionItems || [],
  };
}
