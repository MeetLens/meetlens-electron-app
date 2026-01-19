import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../i18n/config';
import useTranscription from './useTranscription';
import type { Meeting, Transcript } from '../types/electron';

vi.mock('../services/webSocketConnectionManager', () => ({
  WebSocketConnectionManager: {
    getInstance: () => ({
      performHealthCheck: vi.fn(),
      cleanup: vi.fn(),
    }),
  },
}));

describe('useTranscription', () => {
  it('loads transcripts for the current meeting', async () => {
    const meeting: Meeting = {
      id: 1,
      name: 'Test Meeting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const transcripts: Transcript[] = [
      {
        id: 1,
        meeting_id: 1,
        timestamp: '10:00:00',
        text: 'Hello world',
        translation: 'Merhaba dunya',
      },
    ];

    const fetchTranscripts = vi.fn(async () => transcripts);

    const { result } = renderHook(() =>
      useTranscription({
        currentMeeting: meeting,
        fetchTranscripts,
        createMeeting: vi.fn().mockResolvedValue(meeting),
        saveTranscript: vi.fn(),
      })
    );

    await waitFor(() => expect(fetchTranscripts).toHaveBeenCalledWith(1));
    await waitFor(() => expect(result.current.processedTranscripts).toHaveLength(1));

    expect(result.current.processedTranscripts[0].showTranslation).toBe(true);
  });
});
