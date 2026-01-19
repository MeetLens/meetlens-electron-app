import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_APP_LANGUAGES, TRANSLATION_LANGUAGES } from '../i18n/config';

interface TopBarProps {
  isRecording: boolean;
  isConnected: boolean;
  onStartStop: () => void;
  translationLanguage: string;
  onTranslationLanguageChange: (language: string) => void;
  appLanguage: string;
  onAppLanguageChange: (language: string) => void;
}

function TopBar({
  isRecording,
  isConnected,
  onStartStop,
  translationLanguage,
  onTranslationLanguageChange,
  appLanguage,
  onAppLanguageChange,
}: TopBarProps) {
  const { t, i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveSettings = () => {
    setShowSettings(false);
  };

  const handleAppLanguageChange = (lang: string) => {
    onAppLanguageChange(lang);
    i18n.changeLanguage(lang);
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
            {isRecording ? t('topbar.stop_meeting') : t('topbar.start_meeting')}
          </button>
        </div>

        <div className="top-bar-right">
          <div className="connection-status">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? t('topbar.connected') : t('topbar.disconnected')}</span>
          </div>

          <button
            className="clear-button"
            onClick={() => setShowSettings(!showSettings)}
            style={{ marginLeft: '12px' }}
          >
            {t('topbar.settings')}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="settings-title">{t('topbar.application_settings')}</h2>

            <div className="settings-field settings-field-large">
              <label htmlFor="appLanguage" className="settings-label">
                {t('topbar.app_language')}
              </label>
              <select
                id="appLanguage"
                className="api-key-input settings-select"
                value={appLanguage}
                onChange={(e) => handleAppLanguageChange(e.target.value)}
              >
                {SUPPORTED_APP_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-field settings-field-large" style={{ marginTop: '20px' }}>
              <label htmlFor="translationLanguage" className="settings-label">
                {t('topbar.translation_language')}
              </label>
              <select
                id="translationLanguage"
                className="api-key-input settings-select"
                value={translationLanguage}
                onChange={(e) => onTranslationLanguageChange(e.target.value)}
              >
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <p className="settings-helper">
                {t('topbar.translation_helper')}
              </p>
            </div>

            <div className="settings-feature-card">
              <h3 className="settings-feature-title">{t('topbar.features')}</h3>
              <ul className="settings-feature-list">
                {(t('topbar.feature_list', { returnObjects: true }) as string[]).map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="settings-actions">
              <button
                className="clear-button"
                onClick={() => setShowSettings(false)}
              >
                {t('topbar.cancel')}
              </button>
              <button
                className="record-button start"
                onClick={handleSaveSettings}
              >
                {t('topbar.save_settings')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(TopBar);
