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

contextBridge.exposeInMainWorld('electronAPI', {
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),
  createMeeting: (name: string) => ipcRenderer.invoke('create-meeting', name),
  getMeetings: () => ipcRenderer.invoke('get-meetings'),
  getMeeting: (id: number) => ipcRenderer.invoke('get-meeting', id),
  saveTranscript: (meetingId: number, timestamp: string, text: string, translation?: string) =>
    ipcRenderer.invoke('save-transcript', meetingId, timestamp, text, translation),
  getTranscripts: (meetingId: number) => ipcRenderer.invoke('get-transcripts', meetingId),
  clearTranscripts: (meetingId: number) => ipcRenderer.invoke('clear-transcripts', meetingId),
  deleteMeeting: (id: number) => ipcRenderer.invoke('delete-meeting', id),
  saveMeetingSummary: (meetingId: number, summary: string, fullTranscript: string) =>
    ipcRenderer.invoke('save-meeting-summary', meetingId, summary, fullTranscript),
  getMeetingSummary: (meetingId: number) => ipcRenderer.invoke('get-meeting-summary', meetingId),
  translateText: (text: string, targetLang: string, apiKey: string) =>
    ipcRenderer.invoke('translate-text', text, targetLang, apiKey),
});
