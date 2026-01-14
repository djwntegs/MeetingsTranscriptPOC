import { useState, useEffect } from 'react';
import { Transcript, Summary } from '../types';
import { supabase } from '../lib/supabase';
import { Sparkles, Loader2, CheckCircle, ListChecks, Copy, Check } from 'lucide-react';

interface Props {
  transcript: Transcript;
  onSummarize: (transcriptId: string) => Promise<void>;
}

export default function TranscriptDetail({ transcript, onSummarize }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSummary();
  }, [transcript.id]);

  const loadSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('transcript_id', transcript.id)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (!error && data) {
      setSummary(data);
    } else {
      setSummary(null);
    }
    setLoading(false);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setError(null);
    try {
      await onSummarize(transcript.id);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;

    let text = `SUMMARY\n${summary.summary}\n\n`;

    if (summary.key_points && summary.key_points.length > 0) {
      text += `KEY POINTS\n`;
      summary.key_points.forEach((point) => {
        text += `• ${point}\n`;
      });
      text += '\n';
    }

    if (summary.action_items && summary.action_items.length > 0) {
      text += `ACTION ITEMS\n`;
      summary.action_items.forEach((item) => {
        text += `→ ${item}\n`;
      });
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{transcript.title}</h2>
        <p className="text-sm text-gray-600">{transcript.file_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* AI Summary Section */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
            </div>

            <div className="flex items-center gap-2">
              {summary && (
                <button
                  onClick={handleCopySummary}
                  className="px-3 py-2 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm text-blue-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              )}

              {!summary && !loading && (
                <button
                  onClick={handleSummarize}
                  disabled={summarizing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {summarizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Summary
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <p className="text-gray-700 leading-relaxed">{summary.summary}</p>
              </div>

              {summary.key_points && summary.key_points.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Key Points</h4>
                  </div>
                  <ul className="space-y-2">
                    {summary.key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.action_items && summary.action_items.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 text-orange-600" />
                    <h4 className="font-semibold text-gray-900">Action Items</h4>
                  </div>
                  <ul className="space-y-2">
                    {summary.action_items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">→</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Generated using {summary.ai_model} on{' '}
                {new Date(summary.created_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No summary available. Click "Generate Summary" to create one.
            </p>
          )}
        </div>

        {/* Full Transcript */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Full Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {transcript.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
