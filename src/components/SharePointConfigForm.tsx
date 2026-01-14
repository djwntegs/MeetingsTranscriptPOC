import { useState, useEffect } from 'react';
import { SharePointConfig } from '../types';
import { FileText, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  onFetch: (config: SharePointConfig) => Promise<void>;
  loading: boolean;
}

export default function SharePointConfigForm({ onFetch, loading }: Props) {
  const [config, setConfig] = useState<SharePointConfig>({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    siteUrl: '',
    folderPath: '',
  });
  const [configId, setConfigId] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('sharepoint_config')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error loading config:', error);
      } else if (data) {
        setConfig({
          tenantId: data.tenant_id || '',
          clientId: data.client_id || '',
          clientSecret: data.client_secret || '',
          siteUrl: data.site_url || '',
          folderPath: data.folder_path || '',
        });
        setConfigId(data.id);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const saveConfig = async () => {
    setSaveStatus('saving');
    try {
      const configData = {
        tenant_id: config.tenantId,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        site_url: config.siteUrl,
        folder_path: config.folderPath,
      };

      if (configId) {
        const { error } = await supabase
          .from('sharepoint_config')
          .update(configData)
          .eq('id', configId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('sharepoint_config')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        if (data) setConfigId(data.id);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setSaveStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveConfig();
    await onFetch(config);
  };

  if (loadingConfig) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">SharePoint Configuration</h2>
        </div>
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Save className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tenant ID
          </label>
          <input
            type="text"
            value={config.tenantId}
            onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId}
            onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={config.clientSecret}
            onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="Your client secret"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SharePoint Site URL
          </label>
          <input
            type="url"
            value={config.siteUrl}
            onChange={(e) => setConfig({ ...config, siteUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="https://yourtenant.sharepoint.com/sites/yoursite"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Folder Path
          </label>
          <input
            type="text"
            value={config.folderPath}
            onChange={(e) => setConfig({ ...config, folderPath: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder="/Shared Documents/Meeting Transcripts"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={loading || saveStatus === 'saving'}
            className="flex-1 bg-slate-600 text-white py-2 px-4 rounded-md hover:bg-slate-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Configuration
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={loading || saveStatus === 'saving'}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching...
              </>
            ) : (
              'Save & Fetch Transcripts'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
