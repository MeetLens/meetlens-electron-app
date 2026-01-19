import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackendSummaryService, type SummaryResponse } from '../services/backendSummaryService';
import type { Meeting, Transcript } from '../types/electron';
import type { TranscriptEntry } from '../types/transcript';

interface UseMeetingsResult {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  meetingSummary: string;
  structuredSummary: SummaryResponse | null;
  isGeneratingSummary: boolean;
  createMeeting: () => Promise<Meeting>;
  selectMeeting: (meeting: Meeting) => void;
  deleteMeeting: (meetingId: number) => Promise<void>;
  clearMeetingTranscripts: (meetingId: number) => Promise<void>;
  fetchTranscripts: (meetingId: number) => Promise<Transcript[]>;
  saveTranscript: (
    meetingId: number,
    timestamp: string,
    text: string,
    translation?: string
  ) => Promise<void>;
  generateMeetingSummary: (
    transcripts: TranscriptEntry[],
    translationLanguage: string
  ) => Promise<void>;
  resetMeetingSummary: () => void;
}

const buildMeetingName = () => {
  const now = new Date();
  return `Meeting ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

function useMeetings(): UseMeetingsResult {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [structuredSummary, setStructuredSummary] = useState<SummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const backendSummaryServiceRef = useRef<BackendSummaryService | null>(null);

  const resetMeetingSummary = useCallback(() => {
    setMeetingSummary('');
    setStructuredSummary(null);
  }, []);

  const loadMeetings = useCallback(async () => {
    const loadedMeetings = await window.electronAPI.getMeetings();
    setMeetings(loadedMeetings);

    setCurrentMeeting((previous) => {
      if (loadedMeetings.length === 0) {
        return null;
      }

      if (previous && loadedMeetings.some((meeting) => meeting.id === previous.id)) {
        return previous;
      }

      return loadedMeetings[0];
    });
  }, []);

  const loadMeetingSummary = useCallback(async (meetingId: number) => {
    const result = await window.electronAPI.getMeetingSummary(meetingId);
    setMeetingSummary(result.summary || '');
    setStructuredSummary(null);
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (currentMeeting) {
      loadMeetingSummary(currentMeeting.id);
    }
  }, [currentMeeting, loadMeetingSummary]);

  const createMeeting = useCallback(async () => {
    const meeting = await window.electronAPI.createMeeting(buildMeetingName());
    setMeetings((prevMeetings) => [meeting, ...prevMeetings]);
    setCurrentMeeting(meeting);
    resetMeetingSummary();
    return meeting;
  }, [resetMeetingSummary]);

  const selectMeeting = useCallback((meeting: Meeting) => {
    setCurrentMeeting(meeting);
  }, []);

  const deleteMeeting = useCallback(async (meetingId: number) => {
    await window.electronAPI.deleteMeeting(meetingId);
    const updatedMeetings = meetings.filter((meeting) => meeting.id !== meetingId);
    setMeetings(updatedMeetings);

    if (currentMeeting?.id === meetingId) {
      const nextMeeting = updatedMeetings.length > 0 ? updatedMeetings[0] : null;
      setCurrentMeeting(nextMeeting);
      resetMeetingSummary();
    }
  }, [currentMeeting, meetings, resetMeetingSummary]);

  const clearMeetingTranscripts = useCallback(async (meetingId: number) => {
    await window.electronAPI.clearTranscripts(meetingId);
  }, []);

  const fetchTranscripts = useCallback(async (meetingId: number) => {
    return window.electronAPI.getTranscripts(meetingId);
  }, []);

  const saveTranscript = useCallback(async (
    meetingId: number,
    timestamp: string,
    text: string,
    translation?: string
  ) => {
    await window.electronAPI.saveTranscript(meetingId, timestamp, text, translation);
  }, []);

  const generateMeetingSummary = useCallback(async (
    transcripts: TranscriptEntry[],
    translationLanguage: string
  ) => {
    if (!currentMeeting) {
      alert(t('common.no_meeting_selected'));
      return;
    }

    if (transcripts.length === 0) {
      alert(t('common.no_transcripts_to_summarize'));
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const fullTranscript = transcripts.map((entry) => entry.text).join(' ');

      if (!backendSummaryServiceRef.current) {
        backendSummaryServiceRef.current = new BackendSummaryService();
      }

      const summaryResponse = await backendSummaryServiceRef.current.generateSummary(
        currentMeeting.id.toString(),
        fullTranscript,
        translationLanguage
      );

      const formattedSummary =
        backendSummaryServiceRef.current.formatSummaryForDisplay(summaryResponse);
      setMeetingSummary(formattedSummary);
      setStructuredSummary(summaryResponse);

      await window.electronAPI.saveMeetingSummary(
        currentMeeting.id,
        formattedSummary,
        fullTranscript
      );
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(
        t('common.failed_to_generate_summary', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [currentMeeting, t]);

  return {
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
  };
}

export default useMeetings;
