import { useEffect, useRef } from 'react';

interface TranscriptEntry {
  timestamp: string;
  text: string;
  translation?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Turkish' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];

interface TranslationPanelProps {
  transcripts: TranscriptEntry[];
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

function TranslationPanel({
  transcripts,
  selectedLanguage,
  onLanguageChange,
}: TranslationPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="right-panel">
      <div className="translation-header">
        <h3 className="panel-title" style={{ marginBottom: '16px', fontSize: '16px' }}>
          Translation
        </h3>
        <select
          className="language-selector"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="translation-container" ref={containerRef}>
        {transcripts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <div className="empty-text">Translations will appear here</div>
          </div>
        ) : (
          transcripts
            .filter((entry) => entry.translation)
            .map((entry, index) => (
              <div key={index} className="translation-entry">
                <div className="translation-timestamp">{entry.timestamp}</div>
                <div className="translation-text">{entry.translation}</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default TranslationPanel;
