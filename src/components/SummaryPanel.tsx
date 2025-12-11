import { SummaryResponse } from '../services/backendSummaryService';

interface SummaryPanelProps {
  summary: string;
  structuredSummary: SummaryResponse | null;
  isGenerating: boolean;
  onGenerate: () => void;
  hasTranscripts: boolean;
}

function SummaryPanel({ summary, structuredSummary, isGenerating, onGenerate, hasTranscripts }: SummaryPanelProps) {
  return (
    <div className="right-panel" style={{ width: '380px' }}>
      <div className="translation-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="panel-title" style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>
            AI Summary
          </h3>
          <button
            className="record-button start"
            onClick={onGenerate}
            disabled={!hasTranscripts || isGenerating}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              opacity: !hasTranscripts || isGenerating ? 0.5 : 1,
              cursor: !hasTranscripts || isGenerating ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#8e8e8e', margin: 0 }}>
          Powered by MeetLens AI
        </p>
      </div>

      <div className="translation-container" style={{ padding: '16px' }}>
        {isGenerating ? (
          <div className="empty-state">
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(16, 163, 127, 0.2)',
              borderTop: '3px solid #10a37f',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div className="empty-text">Generating summary...</div>
          </div>
        ) : structuredSummary ? (
          <div style={{ color: '#111', fontSize: '13px', lineHeight: '1.7' }}>
            {/* Short Overview */}
            <div style={{
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#10a37f',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Overview
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.7' }}>
                {structuredSummary.summary.short_overview}
              </div>
            </div>

            {/* Action Items */}
            {structuredSummary.summary.action_items && structuredSummary.summary.action_items.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#10a37f',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Action Items
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  listStyleType: 'disc'
                }}>
                  {structuredSummary.summary.action_items.map((item, index) => (
                    <li key={index} style={{
                      marginBottom: '8px',
                      fontSize: '13px',
                      lineHeight: '1.6'
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Decisions */}
            {structuredSummary.summary.decisions && structuredSummary.summary.decisions.length > 0 && (
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#10a37f',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Decisions
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  listStyleType: 'disc'
                }}>
                  {structuredSummary.summary.decisions.map((decision, index) => (
                    <li key={index} style={{
                      marginBottom: '8px',
                      fontSize: '13px',
                      lineHeight: '1.6'
                    }}>
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : summary ? (
          // Fallback to plain text summary for backward compatibility
          <div style={{ color: '#111111', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
              <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div className="empty-text">
              {hasTranscripts
                ? 'Click "Generate" to create summary'
                : 'Start meeting to generate summary'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryPanel;
