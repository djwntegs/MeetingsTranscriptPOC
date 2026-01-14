import { Transcript } from '../types';
import { FileText, Calendar, ExternalLink } from 'lucide-react';

interface Props {
  transcripts: Transcript[];
  onSelectTranscript: (transcript: Transcript) => void;
  selectedId?: string;
}

export default function TranscriptsList({ transcripts, onSelectTranscript, selectedId }: Props) {
  if (transcripts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No transcripts found. Fetch transcripts from SharePoint to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Meeting Transcripts</h2>
        <p className="text-sm text-gray-600 mt-1">{transcripts.length} transcript(s) available</p>
      </div>

      <div className="divide-y divide-gray-200">
        {transcripts.map((transcript) => (
          <div
            key={transcript.id}
            onClick={() => onSelectTranscript(transcript)}
            className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedId === transcript.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{transcript.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{transcript.file_name}</p>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {transcript.meeting_date
                      ? new Date(transcript.meeting_date).toLocaleDateString()
                      : 'No date'}
                  </div>

                  {transcript.sharepoint_url && (
                    <a
                      href={transcript.sharepoint_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in SharePoint
                    </a>
                  )}
                </div>
              </div>

              <FileText className={`w-5 h-5 ${selectedId === transcript.id ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
