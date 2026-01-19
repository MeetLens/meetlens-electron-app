import { useState } from 'react';

interface TopBarProps {
  isRecording: boolean;
  isConnected: boolean;
  onStartStop: () => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English (No Translation)' },
  { code: 'tr', name: 'Turkish' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
];

function TopBar({
  isRecording,
  isConnected,
  onStartStop,
  selectedLanguage,
  onLanguageChange,
}: TopBarProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveSettings = () => {
    setShowSettings(false);
  };

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="app-logo">MeetLens</div>
        </div>

        <div className="top-bar-center">
          <button
            className={`record-button ${isRecording ? 'stop' : 'start'}`}
            onClick={onStartStop}
          >
            <svg className="record-icon" viewBox="0 0 24 24" fill="currentColor">
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" />
              ) : (
                <polygon points="8,5 19,12 8,19" />
              )}
            </svg>
            {isRecording ? 'Stop Meeting' : 'Start Meeting'}
          </button>
        </div>

        <div className="top-bar-right">
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <button
            className="clear-button"
            onClick={() => setShowSettings(!showSettings)}
            style={{ marginLeft: '12px' }}
          >
            Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="settings-title">Application Settings</h2>

            <div className="settings-field settings-field-large">
              <label htmlFor="translationLanguage" className="settings-label">
                Translation Language
              </label>
              <select
                id="translationLanguage"
                className="api-key-input settings-select"
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="settings-helper">
                Transcripts will be translated to this language in real-time
              </p>
            </div>

            <div className="settings-feature-card">
              <h3 className="settings-feature-title">Features</h3>
              <ul className="settings-feature-list">
                <li>Real-time multilingual transcription</li>
                <li>Instant translation to 12+ languages</li>
                <li>AI-powered meeting summaries</li>
              </ul>
            </div>

            <div className="settings-actions">
              <button
                className="clear-button"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                className="record-button start"
                onClick={handleSaveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TopBar;
