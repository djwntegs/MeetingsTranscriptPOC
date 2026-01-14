import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Transcript, SharePointConfig } from './types';
import TranscriptsList from './components/TranscriptsList';
import TranscriptDetail from './components/TranscriptDetail';
import { SharePointDiagnostics } from './components/SharePointDiagnostics';
import { ConfigurationPage } from './components/ConfigurationPage';
import { ConsoleLogsViewer } from './components/ConsoleLogsViewer';
import { FileText, Settings, Wrench, Terminal } from 'lucide-react';

type ViewMode = 'transcripts' | 'diagnostics' | 'configuration' | 'logs';

function App() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('configuration');
  const [savedConfig, setSavedConfig] = useState<SharePointConfig | null>(null);

  useEffect(() => {
    loadTranscripts();
    loadSavedConfig();
  }, []);

  useEffect(() => {
    const handleNavigateToDiagnostics = () => {
      setViewMode('diagnostics');
    };
    window.addEventListener('navigate-to-diagnostics', handleNavigateToDiagnostics);
    return () => window.removeEventListener('navigate-to-diagnostics', handleNavigateToDiagnostics);
  }, []);

  const loadSavedConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('sharepoint_config')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading saved config:', error);
      } else if (data) {
        setSavedConfig({
          tenantId: data.tenant_id || '',
          clientId: data.client_id || '',
          clientSecret: data.client_secret || '',
          siteUrl: data.site_url || '',
          folderPath: data.folder_path || '',
        });
      }
    } catch (err) {
      console.error('Failed to load saved config:', err);
    }
  };

  const loadTranscripts = async () => {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading transcripts:', error);
    } else if (data) {
      setTranscripts(data);
      if (data.length > 0) {
        setViewMode('transcripts');
      }
    }
  };

  const handleFetchTranscripts = async (config: SharePointConfig) => {
    setLoading(true);
    setError(null);
    setSavedConfig(config);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-transcripts`;
      console.log('Starting fetch from:', apiUrl);
      console.log('Using config:', { ...config, clientSecret: '[HIDDEN]' });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fetch',
          config,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Failed to fetch transcripts');
      }

      const result = await response.json();
      console.log('Success response:', result);
      console.log('Transcripts found:', result.count, 'out of', result.total);

      if (result.errors && result.errors.length > 0) {
        console.warn('Errors during processing:', result.errors);
      }

      if (result.success) {
        await loadTranscripts();
        setViewMode('transcripts');
        setError(null);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (transcriptId: string) => {
    try {
      console.log('Starting summarization for transcript:', transcriptId);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-transcripts`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'summarize',
          transcriptId,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const result = await response.json();
      console.log('Summarization successful:', result);
    } catch (err) {
      console.error('Summarization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while generating summary';
      setError(errorMessage);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Meeting Transcript</h1>
                <p className="text-sm text-gray-600">AI-powered transcript analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('configuration')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'configuration'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Wrench className="w-4 h-4 inline mr-2" />
                Configuration
              </button>

              <button
                onClick={() => setViewMode('transcripts')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'transcripts'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Transcripts
              </button>

              <button
                onClick={() => setViewMode('diagnostics')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'diagnostics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Diagnostics
              </button>

              <button
                onClick={() => setViewMode('logs')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'logs'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Terminal className="w-4 h-4 inline mr-2" />
                Console Logs
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'logs' && <ConsoleLogsViewer />}

        {viewMode === 'configuration' && (
          <ConfigurationPage
            onFetch={handleFetchTranscripts}
            loading={loading}
          />
        )}

        {viewMode === 'diagnostics' && (
          savedConfig ? (
            <SharePointDiagnostics config={savedConfig} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <Settings className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Configuration Required
              </h3>
              <p className="text-slate-600 mb-6">
                Please configure your SharePoint connection in the Configuration tab first
              </p>
              <button
                onClick={() => setViewMode('configuration')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Configuration
              </button>
            </div>
          )
        )}

        {viewMode === 'transcripts' && (
          <>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error: {error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <TranscriptsList
                  transcripts={transcripts}
                  onSelectTranscript={setSelectedTranscript}
                  selectedId={selectedTranscript?.id}
                />
              </div>

              <div className="lg:col-span-2">
                {selectedTranscript ? (
                  <TranscriptDetail
                    transcript={selectedTranscript}
                    onSummarize={handleSummarize}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center h-full flex items-center justify-center">
                    <div>
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">Select a transcript to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
