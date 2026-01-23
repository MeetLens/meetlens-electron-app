export interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
  translation?: string;
  sessionId?: string | null;
}

export interface ProcessedTranscriptEntry extends TranscriptEntry {
  index: number;
}
