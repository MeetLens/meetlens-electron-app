export interface Meeting {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  summary?: string;
  full_transcript?: string;
}

export interface Transcript {
  id: number;
  meeting_id: number;
  timestamp: string;
  text: string;
  translation: string | null;
}

export interface AudioSource {
  id: string;
  name: string;
  thumbnail: string;
}

declare global {
  interface Window {
    electronAPI: {
      checkScreenPermission: () => Promise<boolean>;
      openScreenRecordingSettings: () => Promise<boolean>;
      getScreenSourceId: () => Promise<{ id: string; name: string } | null>;
      getAudioSources: () => Promise<AudioSource[]>;
      createMeeting: (name: string) => Promise<Meeting>;
      getMeetings: () => Promise<Meeting[]>;
      getMeeting: (id: number) => Promise<Meeting>;
      saveTranscript: (
        meetingId: number,
        timestamp: string,
        text: string,
        translation?: string
      ) => Promise<{ id: number }>;
      getTranscripts: (meetingId: number) => Promise<Transcript[]>;
      clearTranscripts: (meetingId: number) => Promise<{ success: boolean }>;
      deleteMeeting: (id: number) => Promise<{ success: boolean }>;
      saveMeetingSummary: (
        meetingId: number,
        summary: string,
        fullTranscript: string
      ) => Promise<{ success: boolean }>;
      getMeetingSummary: (meetingId: number) => Promise<{ summary: string | null; full_transcript: string | null }>;
      translateText: (text: string, targetLang: string, apiKey: string) => Promise<string>;
    };
  }
}

export { };
