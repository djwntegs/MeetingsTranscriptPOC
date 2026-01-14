import React, { useState, useEffect } from 'react';
import { Brain, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AzureOpenAIConfigData {
  endpoint: string;
  deployment_name: string;
  api_version: string;
  api_key: string;
}

export function AzureOpenAIConfig() {
  const [config, setConfig] = useState<AzureOpenAIConfigData>({
    endpoint: '',
    deployment_name: '',
    api_version: '2025-01-01-preview',
    api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('azure_openai_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          endpoint: data.endpoint,
          deployment_name: data.deployment_name,
          api_version: data.api_version,
          api_key: data.api_key || '',
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      console.log('Attempting to save config:', config);

      const { data: existingConfig, error: selectError } = await supabase
        .from('azure_openai_config')
        .select('id')
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing config:', selectError);
        throw new Error(`Database access error: ${selectError.message}`);
      }

      console.log('Existing config:', existingConfig);

      if (existingConfig) {
        console.log('Updating existing record with ID:', existingConfig.id);
        const { data: updateResult, error: updateError } = await supabase
          .from('azure_openai_config')
          .update({
            endpoint: config.endpoint,
            deployment_name: config.deployment_name,
            api_version: config.api_version,
            api_key: config.api_key,
          })
          .eq('id', existingConfig.id)
          .select();

        if (updateError) {
          console.error('Update error details:', {
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code
          });
          throw new Error(`Update failed: ${updateError.message}`);
        }

        console.log('Update successful:', updateResult);
      } else {
        console.log('Inserting new record');
        const { data: insertResult, error: insertError } = await supabase
          .from('azure_openai_config')
          .insert([config])
          .select();

        if (insertError) {
          console.error('Insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        console.log('Insert successful:', insertResult);
      }

      setMessage({ type: 'success', text: 'Azure OpenAI configuration saved successfully!' });
      setTimeout(() => setMessage(null), 5000);

      await loadConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save configuration. Please check the browser console for details.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Azure OpenAI Configuration</h2>
          <p className="text-sm text-slate-600">Configure your Azure AI Foundry settings</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="endpoint" className="block text-sm font-medium text-slate-700 mb-1.5">
            Azure OpenAI Endpoint
          </label>
          <input
            type="text"
            id="endpoint"
            value={config.endpoint}
            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
            placeholder="https://your-resource.openai.azure.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Found in Azure AI Foundry under your deployment settings
          </p>
        </div>

        <div>
          <label htmlFor="deployment_name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Deployment Name
          </label>
          <input
            type="text"
            id="deployment_name"
            value={config.deployment_name}
            onChange={(e) => setConfig({ ...config, deployment_name: e.target.value })}
            placeholder="gpt-4o-mini"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            The name of your GPT deployment in Azure
          </p>
        </div>

        <div>
          <label htmlFor="api_version" className="block text-sm font-medium text-slate-700 mb-1.5">
            API Version
          </label>
          <input
            type="text"
            id="api_version"
            value={config.api_version}
            onChange={(e) => setConfig({ ...config, api_version: e.target.value })}
            placeholder="2025-01-01-preview"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            The API version to use (e.g., 2025-01-01-preview)
          </p>
        </div>

        <div>
          <label htmlFor="api_key" className="block text-sm font-medium text-slate-700 mb-1.5">
            API Key
          </label>
          <input
            type="password"
            id="api_key"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            placeholder="Your Azure OpenAI API key"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Found in Azure AI Foundry under Keys and Endpoint
          </p>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">Where to find these values</p>
              <p>
                All these values can be found in Azure AI Foundry under your deployment's "Keys and Endpoint" section.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Configuration
            </>
          )}
        </button>
      </form>
    </div>
  );
}
