import { useState } from 'react';

interface TopBarProps {
  isRecording: boolean;
  isConnected: boolean;
  onStartStop: () => void;
  elevenLabsApiKey: string;
  deeplApiKey: string;
  geminiApiKey: string;
  selectedLanguage: string;
  onSaveApiKeys: (elevenLabsKey: string, deeplKey: string, geminiKey: string) => void;
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
  elevenLabsApiKey,
  deeplApiKey,
  geminiApiKey,
  selectedLanguage,
  onSaveApiKeys,
  onLanguageChange,
}: TopBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [elevenLabsKey, setElevenLabsKey] = useState(elevenLabsApiKey);
  const [deeplKey, setDeeplKey] = useState(deeplApiKey);
  const [geminiKey, setGeminiKey] = useState(geminiApiKey);

  const handleSaveSettings = () => {
    onSaveApiKeys(elevenLabsKey, deeplKey, geminiKey);
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              background: '#202020',
              padding: '28px',
              borderRadius: '16px',
              width: '540px',
              maxHeight: '85vh',
              overflow: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: '#ececec' }}>API Settings</h2>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#d4d4d4' }}>
                ElevenLabs API Key
              </label>
              <input
                type="password"
                className="api-key-input"
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="sk_..."
              />
              <p style={{ fontSize: '11px', color: '#8e8e8e', marginTop: '6px' }}>
                Get your key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{ color: '#10a37f', textDecoration: 'none' }}>elevenlabs.io</a> • Used for speech-to-text
              </p>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#d4d4d4' }}>
                DeepL API Key
              </label>
              <input
                type="password"
                className="api-key-input"
                value={deeplKey}
                onChange={(e) => setDeeplKey(e.target.value)}
                placeholder="xxx:fx"
              />
              <p style={{ fontSize: '11px', color: '#8e8e8e', marginTop: '6px' }}>
                Get your key at <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" style={{ color: '#10a37f', textDecoration: 'none' }}>deepl.com/pro-api</a> • Real-time translation
              </p>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#d4d4d4' }}>
                Google Gemini API Key
              </label>
              <input
                type="password"
                className="api-key-input"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
              />
              <p style={{ fontSize: '11px', color: '#8e8e8e', marginTop: '6px' }}>
                Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#10a37f', textDecoration: 'none' }}>Google AI Studio</a> • AI summaries
              </p>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#d4d4d4' }}>
                Translation Language
              </label>
              <select
                className="api-key-input"
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: '#2a2a2a',
                  color: '#ececec',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  width: '100%',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                {LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    style={{ backgroundColor: '#2a2a2a', color: '#ececec' }}
                  >
                    {lang.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: '#8e8e8e', marginTop: '6px' }}>
                Transcripts will be translated to this language in real-time
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(16, 163, 127, 0.1)', borderRadius: '10px', marginBottom: '24px', border: '1px solid rgba(16, 163, 127, 0.2)' }}>
              <h3 style={{ fontSize: '13px', marginBottom: '10px', color: '#10a37f', fontWeight: 600 }}>Features</h3>
              <ul style={{ fontSize: '12px', lineHeight: '1.7', paddingLeft: '18px', color: '#d4d4d4', margin: 0 }}>
                <li>Real-time multilingual transcription</li>
                <li>Instant translation to 12+ languages</li>
                <li>AI-powered meeting summaries</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="clear-button"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button
                className="record-button start"
                onClick={handleSaveSettings}
                style={{ padding: '8px 24px' }}
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
