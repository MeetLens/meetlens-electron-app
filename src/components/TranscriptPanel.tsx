import { useEffect, useRef } from 'react';

interface TranscriptEntry {
  timestamp: string;
  text: string;
  translation?: string;
}

interface TranscriptPanelProps {
  transcripts: TranscriptEntry[];
  onClear: () => void;
  isRecording: boolean;
}

function TranscriptPanel({ transcripts, onClear, isRecording }: TranscriptPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isRecording) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts, isRecording]);

  return (
    <div className="center-panel">
      <div className="panel-header">
        <h2 className="panel-title">Live Transcript</h2>
        <button className="clear-button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="transcript-container" ref={containerRef}>
        {transcripts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <div className="empty-text">
              {isRecording
                ? 'Listening... Speak to see transcription'
                : 'Click "Start Meeting" to begin transcription'}
            </div>
          </div>
        ) : (
          transcripts.map((entry, index) => (
            <div key={index} className="transcript-entry">
              <div className="transcript-timestamp">{entry.timestamp}</div>
              <div className="transcript-text">{entry.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TranscriptPanel;
