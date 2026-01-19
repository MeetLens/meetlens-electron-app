import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if user is near bottom of scroll container
  const checkNearBottom = useCallback(() => {
    if (!containerRef.current) return true;

    const container = containerRef.current;
    const threshold = 100; // pixels from bottom to consider "near bottom"
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  }, []);

  // Handle scroll events to track user interaction
  const handleScroll = useCallback(() => {
    const nearBottom = checkNearBottom();
    setIsNearBottom(nearBottom);

    // If user scrolls to bottom, re-enable auto-scroll
    if (nearBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
    // If user scrolls away from bottom, disable auto-scroll
    else if (!nearBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    }
  }, [checkNearBottom, isAutoScrollEnabled]);

  // Smart auto-scroll: only scroll if auto-scroll is enabled and we're recording
  useEffect(() => {
    if (containerRef.current && isRecording && isAutoScrollEnabled) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts, isRecording, isAutoScrollEnabled]);

  // Set up scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="center-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="panel-title">{t('transcript.title')}</h2>
          {isRecording && !isAutoScrollEnabled && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#666',
                backgroundColor: '#f5f5f5',
                padding: '2px 6px',
                borderRadius: '10px',
                border: '1px solid #e0e0e0'
              }}
              title={t('transcript.scroll_paused_title')}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ff6b35',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              <span>{t('transcript.scroll_paused')}</span>
            </div>
          )}
        </div>
        <button className="clear-button" onClick={onClear}>
          {t('transcript.clear')}
        </button>
      </div>

      <div className="transcript-container" ref={containerRef}>
        {transcripts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎙️</div>
            <div className="empty-text">
              {isRecording
                ? t('transcript.empty_listening')
                : t('transcript.empty_start')}
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
