import React from 'react';
import { Settings, Info, Key, Globe, FolderOpen } from 'lucide-react';
import SharePointConfigForm from './SharePointConfigForm';
import { AzureOpenAIConfig } from './AzureOpenAIConfig';
import { SharePointConfig } from '../types';

interface ConfigurationPageProps {
  onFetch: (config: SharePointConfig) => Promise<void>;
  loading: boolean;
}

export function ConfigurationPage({ onFetch, loading }: ConfigurationPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Configuration</h1>
              <p className="text-slate-600">Configure SharePoint and Azure OpenAI settings</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SharePointConfigForm
              onFetch={onFetch}
              loading={loading}
            />
            <AzureOpenAIConfig />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Setup Guide</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">Azure App Registration</span>
                  </div>
                  <p className="ml-6">Register an app in Azure AD and grant it SharePoint permissions (Sites.Read.All)</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">Site URL Format</span>
                  </div>
                  <p className="ml-6">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded break-all">
                      https://tenant.sharepoint.com/sites/sitename
                    </code>
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-slate-700">Folder Path Format</span>
                  </div>
                  <p className="ml-6">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded break-all">
                      /Shared Documents/Folder
                    </code>
                  </p>
                  <p className="ml-6 mt-1 text-xs">Use the Diagnostics tab to discover available folders</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-2">Need help finding folders?</p>
                  <p className="text-blue-700 mb-3">
                    Use the Diagnostics tab to scan your SharePoint site and discover all available folders with their correct paths.
                  </p>
                  <a
                    href="#"
                    className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('navigate-to-diagnostics'));
                    }}
                  >
                    Go to Diagnostics →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
