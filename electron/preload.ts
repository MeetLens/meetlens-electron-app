import { contextBridge, ipcRenderer } from 'electron';

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

export const registerPreloadApi = (
  bridge: Pick<typeof contextBridge, 'exposeInMainWorld'>,
  ipc: Pick<typeof ipcRenderer, 'invoke'>
) => {
  bridge.exposeInMainWorld('electronAPI', {
    checkScreenPermission: () => ipc.invoke('check-screen-permission'),
    openScreenRecordingSettings: () => ipc.invoke('open-screen-recording-settings'),
    getScreenSourceId: () => ipc.invoke('get-screen-source-id'),
    getAudioSources: () => ipc.invoke('get-audio-sources'),
    createMeeting: (name: string) => ipc.invoke('create-meeting', name),
    getMeetings: () => ipc.invoke('get-meetings'),
    getMeeting: (id: number) => ipc.invoke('get-meeting', id),
    saveTranscript: (meetingId: number, timestamp: string, text: string, translation?: string) =>
      ipc.invoke('save-transcript', meetingId, timestamp, text, translation),
    getTranscripts: (meetingId: number) => ipc.invoke('get-transcripts', meetingId),
    clearTranscripts: (meetingId: number) => ipc.invoke('clear-transcripts', meetingId),
    deleteMeeting: (id: number) => ipc.invoke('delete-meeting', id),
    saveMeetingSummary: (meetingId: number, summary: string, fullTranscript: string) =>
      ipc.invoke('save-meeting-summary', meetingId, summary, fullTranscript),
    getMeetingSummary: (meetingId: number) => ipc.invoke('get-meeting-summary', meetingId),
  });
};

if (process.env.NODE_ENV !== 'test') {
  registerPreloadApi(contextBridge, ipcRenderer);
}
