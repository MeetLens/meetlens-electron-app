import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic } from 'lucide-react';
import type { ProcessedTranscriptEntry } from '../types/transcript';

interface TranscriptListProps {
  transcripts: ProcessedTranscriptEntry[];
  isRecording: boolean;
  activeSessionId: string | null;
  partialTranscript: string;
  partialTranslation: string;
  stableTranslation: string;
}

function TranscriptList({
  transcripts,
  isRecording,
  activeSessionId,
  partialTranscript,
  partialTranslation,
  stableTranslation,
}: TranscriptListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const checkNearBottom = useCallback(() => {
    if (!containerRef.current) {
      return true;
    }

    const container = containerRef.current;
    const threshold = 120;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  }, []);

  const handleScroll = useCallback(() => {
    setIsAutoScrollEnabled(checkNearBottom());
  }, [checkNearBottom]);

  useEffect(() => {
    if (containerRef.current && isAutoScrollEnabled) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [
    isAutoScrollEnabled,
    partialTranscript,
    partialTranslation,
    stableTranslation,
    transcripts,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  return (
    <div className="transcript-container" ref={containerRef}>
      {transcripts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Mic size={64} />
          </div>
          <div className="empty-text">
            {isRecording ? (
              <div className="empty-listening">
                <div className="recording-dots">
                  <div className="recording-dot recording-dot--large" />
                  <div className="recording-dot recording-dot--large recording-dot--delay-1" />
                  <div className="recording-dot recording-dot--large recording-dot--delay-2" />
                </div>
                <span>{t('transcript.empty_listening')}</span>
              </div>
            ) : (
              t('transcript.empty_start')
            )}
          </div>
        </div>
      ) : (
        <>
          {transcripts.map((entry, index) => {
            const isActiveSessionBubble =
              isRecording &&
              entry.sessionId &&
              entry.sessionId === activeSessionId;
            const showTranslation =
              !!entry.translation ||
              (isActiveSessionBubble && !!(stableTranslation || partialTranslation));

            return (
              <div
                key={entry.id}
                className={`transcript-entry ${
                  index === transcripts.length - 1 ? 'transcript-entry--latest' : ''
                }`}
              >
                <div className="transcript-timestamp">{entry.timestamp}</div>
                <div
                  className={`transcript-columns ${
                    showTranslation ? '' : 'transcript-columns--single'
                  }`}
                >
                  <div className="transcript-column transcript-column--source">
                    <div className="transcript-text">
                      {entry.text}
                      {isActiveSessionBubble && partialTranscript && (
                        <span className="transcript-partial">
                          {entry.text ? ' ' : ''}
                          {partialTranscript}
                        </span>
                      )}
                    </div>
                  </div>
                  {showTranslation && (
                    <div className="transcript-column transcript-column--translation">
                      <div className="transcript-translation">
                        {isActiveSessionBubble ? (
                          <>
                            {(stableTranslation || (!partialTranslation && entry.translation)) && (
                              <span className="translation-stable">
                                {stableTranslation || entry.translation}
                              </span>
                            )}
                            {partialTranslation && (
                              <span className="translation-partial">
                                {stableTranslation ? ' ' : ''}
                                {partialTranslation}
                              </span>
                            )}
                          </>
                        ) : (
                          entry.translation
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isRecording && (
            <div className="transcript-recording-indicator">
              <div className="recording-dot recording-dot--small" />
              <span>{t('transcript.empty_listening')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TranscriptList;
