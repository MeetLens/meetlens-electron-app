import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, Settings } from 'lucide-react';
import { SUPPORTED_APP_LANGUAGES, TRANSLATION_LANGUAGES } from '../i18n/config';

interface TopBarProps {
  isRecording: boolean;
  isConnected: boolean;
  isOnline: boolean;
  backendReachable: boolean | null;
  onStartStop: () => void;
  translationLanguage: string;
  onTranslationLanguageChange: (language: string) => void;
  appLanguage: string;
  onAppLanguageChange: (language: string) => void;
}

function TopBar({
  isRecording,
  isConnected,
  isOnline,
  backendReachable,
  onStartStop,
  translationLanguage,
  onTranslationLanguageChange,
  appLanguage,
  onAppLanguageChange,
}: TopBarProps) {
  const { t, i18n } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  const connectionStatusLabel = () => {
    if (!isOnline) {
      return t('topbar.offline');
    }

    if (backendReachable === null) {
      return t('topbar.checking');
    }

    if (!backendReachable) {
      return t('topbar.backend_unavailable');
    }

    return isConnected ? t('topbar.connected') : t('topbar.disconnected');
  };

  const connectionStatusDot = () => {
    if (!isOnline || backendReachable === false) {
      return 'disconnected';
    }

    if (backendReachable === null) {
      return 'checking';
    }

    return isConnected ? 'connected' : 'disconnected';
  };

  const isRecordingDisabled = !isOnline || backendReachable === false;
  const recordingTooltip = !isOnline
    ? t('topbar.offline_tooltip')
    : backendReachable === false
      ? t('topbar.backend_unavailable_tooltip')
      : undefined;

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
            disabled={isRecordingDisabled && !isRecording}
            title={recordingTooltip}
          >
            {isRecording ? (
              <Square className="record-icon" size={16} fill="currentColor" />
            ) : (
              <Play className="record-icon" size={16} fill="currentColor" />
            )}
            {isRecording ? t('topbar.stop_meeting') : t('topbar.start_meeting')}
          </button>
        </div>

        <div className="top-bar-right">
          <div className="connection-status">
            <div className={`status-dot ${connectionStatusDot()}`}></div>
            <span>{connectionStatusLabel()}</span>
          </div>

          <button
            className="clear-button clear-button--icon"
            onClick={() => setShowSettings(!showSettings)}
            title={t('topbar.settings')}
          >
            <Settings size={16} />
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
