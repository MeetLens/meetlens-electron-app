import { SummaryResponse } from '../services/backendSummaryService';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface SummaryPanelProps {
  summary: string;
  structuredSummary: SummaryResponse | null;
  isGenerating: boolean;
  onGenerate: () => void;
  hasTranscripts: boolean;
}

function SummaryPanel({ summary, structuredSummary, isGenerating, onGenerate, hasTranscripts }: SummaryPanelProps) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className={`right-panel ${isCollapsed ? 'right-panel--collapsed' : ''}`}>
      <div className="translation-header">
        <div className="summary-header-row">
          {!isCollapsed && (
            <h3 className="panel-title summary-title">
              {t('summary.title')}
            </h3>
          )}
          <div className="summary-actions">
            {!isCollapsed && (
              <button
                className="record-button start summary-generate"
                onClick={onGenerate}
                disabled={!hasTranscripts || isGenerating}
              >
                <Sparkles size={14} />
                {isGenerating ? t('summary.generating') : t('summary.generate')}
              </button>
            )}
            <button
              className="summary-toggle"
              onClick={toggleCollapsed}
              aria-label={isCollapsed ? t('summary.expand') : t('summary.collapse')}
              title={isCollapsed ? t('summary.expand') : t('summary.collapse')}
            >
              {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <p className="summary-powered">
            {t('summary.powered_by')}
          </p>
        )}
      </div>

      {!isCollapsed && (
        <div className="translation-container">
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
            <div className="empty-text">{t('summary.generating')}</div>
          </div>
        ) : structuredSummary ? (
          <div className="summary-content" style={{ color: '#111', fontSize: '13px', lineHeight: '1.7' }}>
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
                {t('summary.overview')}
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
                  {t('summary.action_items')}
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
                  {t('summary.decisions')}
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
          <div className="summary-content" style={{ color: '#111111', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        ) : (
          <div className="empty-state">
            <FileText size={48} style={{ opacity: 0.3 }} />
            <div className="empty-text">
              {hasTranscripts
                ? t('summary.empty_has_transcripts')
                : t('summary.empty_no_transcripts')}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export default memo(SummaryPanel);
