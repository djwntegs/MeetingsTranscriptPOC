import React, { useState } from 'react';
import { Search, FolderOpen, Loader2, AlertCircle, FileText, File } from 'lucide-react';
import { SharePointConfig } from '../types';

interface Folder {
  name: string;
  path: string;
  libraryName: string;
  webUrl: string;
}

interface FileItem {
  name: string;
  isFile: boolean;
  isFolder: boolean;
  size: number;
  lastModified: string;
  webUrl: string;
  extension: string;
  mimeType: string;
}

interface SharePointDiagnosticsProps {
  config: SharePointConfig;
}

export function SharePointDiagnostics({ config }: SharePointDiagnosticsProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scanFolders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-transcripts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'list-folders',
            config,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch folders');
      }

      setFolders(data.folders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const listFilesInFolder = async () => {
    setFilesLoading(true);
    setFilesError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-transcripts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'list-files',
            config,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch files');
      }

      setFiles(data.files);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setFilesLoading(false);
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.libraryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">SharePoint Diagnostics</h1>
          <p className="text-slate-600">
            Debug your SharePoint connection and browse files
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Configuration</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Site URL:</span>
              <p className="font-mono text-slate-900 break-all">{config.siteUrl}</p>
            </div>
            <div>
              <span className="text-slate-600">Folder Path:</span>
              <p className="font-mono text-slate-900 break-all">{config.folderPath}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Debug Tools</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={listFilesInFolder}
              disabled={filesLoading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              {filesLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  List Files in Folder
                </>
              )}
            </button>

            <button
              onClick={scanFolders}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Scan All Folders
                </>
              )}
            </button>

            {folders.length > 0 && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {filesError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-red-700 text-sm mt-1">{filesError}</p>
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">
                Files in {config.folderPath}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Found {files.length} {files.length === 1 ? 'item' : 'items'} -
                Supported transcript formats: .txt, .vtt, .docx
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {files.map((file, index) => (
                <div
                  key={index}
                  className={`p-4 ${file.isFile && (file.extension === 'txt' || file.extension === 'vtt' || file.extension === 'docx') ? 'bg-green-50' : 'hover:bg-slate-50'} transition-colors`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 ${file.isFolder ? 'bg-blue-100' : file.extension === 'vtt' || file.extension === 'txt' || file.extension === 'docx' ? 'bg-green-100' : 'bg-slate-100'} rounded-lg`}>
                      {file.isFolder ? (
                        <FolderOpen className={`w-5 h-5 ${file.isFolder ? 'text-blue-600' : 'text-slate-600'}`} />
                      ) : (
                        <File className={`w-5 h-5 ${file.extension === 'vtt' || file.extension === 'txt' || file.extension === 'docx' ? 'text-green-600' : 'text-slate-600'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 break-all">{file.name}</h3>
                        {file.isFile && (file.extension === 'txt' || file.extension === 'vtt' || file.extension === 'docx') && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                            Supported
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mb-2">
                        <span>Type: {file.isFile ? 'File' : 'Folder'}</span>
                        {file.isFile && (
                          <>
                            <span>Extension: .{file.extension}</span>
                            <span>Size: {formatFileSize(file.size)}</span>
                            <span>MIME: {file.mimeType}</span>
                          </>
                        )}
                      </div>

                      <a
                        href={file.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 inline-block"
                      >
                        View in SharePoint →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {folders.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900">
                Found {filteredFolders.length} {filteredFolders.length === 1 ? 'folder' : 'folders'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Click on any path to copy it to your clipboard
              </p>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredFolders.map((folder, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{folder.name}</h3>
                        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                          {folder.libraryName}
                        </span>
                      </div>

                      <button
                        onClick={() => copyToClipboard(folder.path)}
                        className="group flex items-center gap-2 text-sm"
                      >
                        <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                          {folder.path}
                        </code>
                        <span className="text-xs text-slate-500 group-hover:text-blue-600">
                          Click to copy
                        </span>
                      </button>

                      <a
                        href={folder.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                      >
                        View in SharePoint →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && folders.length === 0 && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No folders scanned yet
            </h3>
            <p className="text-slate-600">
              Click the "Scan SharePoint Site" button to discover all available folders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
