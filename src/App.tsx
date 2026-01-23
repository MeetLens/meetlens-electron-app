import { Profiler, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import SummaryPanel from './components/SummaryPanel';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import TranscriptList from './components/TranscriptList';
import useMeetings from './hooks/useMeetings';
import useTranscription from './hooks/useTranscription';

function App() {
  const { t, i18n } = useTranslation();
  const [appLanguage, setAppLanguage] = useState(i18n.language || 'tr');
  const [translationLanguage, setTranslationLanguage] = useState('tr');

  const {
    meetings,
    currentMeeting,
    meetingSummary,
    structuredSummary,
    isGeneratingSummary,
    createMeeting,
    selectMeeting,
    deleteMeeting,
    clearMeetingTranscripts,
    fetchTranscripts,
    saveTranscript,
    generateMeetingSummary,
    resetMeetingSummary,
  } = useMeetings();

  const {
    currentMeetingTranscripts,
    processedTranscripts,
    partialTranscript,
    partialTranslation,
    stableTranslation,
    isRecording,
    isConnected,
    handleStartStop,
    clearTranscriptsForMeeting,
    removeMeetingTranscripts,
  } = useTranscription({
    currentMeeting,
    fetchTranscripts,
    createMeeting,
    saveTranscript,
    onGenerateSummary: (transcripts) =>
      generateMeetingSummary(transcripts, translationLanguage),
    translationLanguage,
  });

  const handleGenerateSummary = useCallback(async () => {
    await generateMeetingSummary(currentMeetingTranscripts, translationLanguage);
  }, [currentMeetingTranscripts, generateMeetingSummary, translationLanguage]);

  const handleClearTranscripts = useCallback(async () => {
    if (!currentMeeting) {
      return;
    }

    await clearMeetingTranscripts(currentMeeting.id);
    clearTranscriptsForMeeting(currentMeeting.id);
    resetMeetingSummary();
  }, [
    clearMeetingTranscripts,
    clearTranscriptsForMeeting,
    currentMeeting,
    resetMeetingSummary,
  ]);

  const handleDeleteMeeting = useCallback(async (meetingId: number) => {
    await deleteMeeting(meetingId);
    removeMeetingTranscripts(meetingId);
  }, [deleteMeeting, removeMeetingTranscripts]);

  const onRenderCallback = (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    _startTime: number,
    _commitTime: number
  ) => {
    if (actualDuration > 16.67) {
      console.log(
        `🔄 ${id} [${phase}]: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`
      );
    }
  };

  return (
    <div className="app-container">
      <Profiler id="TopBar" onRender={onRenderCallback}>
        <TopBar
          isRecording={isRecording}
          isConnected={isConnected}
          onStartStop={handleStartStop}
          translationLanguage={translationLanguage}
          onTranslationLanguageChange={setTranslationLanguage}
          appLanguage={appLanguage}
          onAppLanguageChange={setAppLanguage}
        />
      </Profiler>

      <div className="main-content">
        <Profiler id="Sidebar" onRender={onRenderCallback}>
          <Sidebar
            meetings={meetings}
            currentMeeting={currentMeeting}
            onSelectMeeting={selectMeeting}
            onNewMeeting={createMeeting}
            onDeleteMeeting={handleDeleteMeeting}
          />
        </Profiler>

        <Profiler id="CenterPanel" onRender={onRenderCallback}>
          <div className="center-panel">
            <div className="panel-header">
              <h2 className="panel-title">{t('transcript.title')}</h2>
              <div className="panel-actions">
                <button
                  className="record-button start summary-button"
                  onClick={handleGenerateSummary}
                  disabled={!processedTranscripts.length || isGeneratingSummary}
                >
                  {isGeneratingSummary ? t('summary.generating') : t('summary.title')}
                </button>
                <button className="clear-button" onClick={handleClearTranscripts} title={t('transcript.clear')}>
                  <Trash2 size={16} />
                  {t('transcript.clear')}
                </button>
              </div>
            </div>

            <TranscriptList
              transcripts={processedTranscripts}
              isRecording={isRecording}
              partialTranscript={partialTranscript}
              partialTranslation={partialTranslation}
              stableTranslation={stableTranslation}
            />
          </div>
        </Profiler>

        <Profiler id="SummaryPanel" onRender={onRenderCallback}>
          <SummaryPanel
            summary={meetingSummary}
            structuredSummary={structuredSummary}
            isGenerating={isGeneratingSummary}
            onGenerate={handleGenerateSummary}
            hasTranscripts={processedTranscripts.length > 0}
          />
        </Profiler>
      </div>
    </div>
  );
}

export default App;
