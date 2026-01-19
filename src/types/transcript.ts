export interface TranscriptEntry {
  timestamp: string;
  text: string;
  translation?: string;
  sessionId?: string | null;
}

export interface ProcessedTranscriptEntry extends TranscriptEntry {
  index: number;
  isActiveSessionBubble: boolean;
  showTranslation: boolean;
}
