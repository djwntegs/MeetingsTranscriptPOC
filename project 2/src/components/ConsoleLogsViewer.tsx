import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Terminal, RefreshCw, AlertCircle, Info, AlertTriangle, Bug, Trash2 } from 'lucide-react';

interface ConsoleLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  action: string;
  message: string;
  details: any;
  created_at: string;
}

export function ConsoleLogsViewer() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [actions, setActions] = useState<string[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('console_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error loading logs:', error);
      } else if (data) {
        setLogs(data);

        const uniqueActions = Array.from(new Set(data.map(log => log.action)));
        setActions(uniqueActions);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all console logs?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('console_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Error clearing logs:', error);
      } else {
        await loadLogs();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    return true;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'debug':
        return <Bug className="w-4 h-4 text-purple-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200';
      case 'debug':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-800 rounded-xl">
                <Terminal className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Console Logs</h1>
                <p className="text-slate-600">View all system activity and debug information</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={clearLogs}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear Logs
              </button>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Filter by Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  {actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Filter by Level
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{filteredLogs.length}</span> of <span className="font-semibold text-slate-900">{logs.length}</span> logs
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <RefreshCw className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600">Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Terminal className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No logs found</h3>
            <p className="text-slate-600">
              {logs.length === 0
                ? "Start using the application to generate logs"
                : "No logs match your current filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`bg-white rounded-lg shadow-sm border p-4 ${getLevelStyles(log.level)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-slate-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-white text-xs rounded font-mono">
                        {log.action}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                        log.level === 'error' ? 'bg-red-100 text-red-700' :
                        log.level === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                        log.level === 'debug' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-slate-900 font-medium mb-2">{log.message}</p>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900">
                          View details
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-900 text-green-400 rounded-md text-xs overflow-x-auto font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
