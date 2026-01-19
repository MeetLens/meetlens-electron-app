import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n/config';
import useMeetings from './useMeetings';

const meetingList = [
  {
    id: 1,
    name: 'Meeting A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('useMeetings', () => {
  const createMeeting = vi.fn(async (name: string) => ({
    id: 2,
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  beforeEach(() => {
    createMeeting.mockClear();
    (window as any).electronAPI = {
      getMeetings: vi.fn().mockResolvedValue(meetingList),
      getMeetingSummary: vi.fn().mockResolvedValue({ summary: '' }),
      createMeeting,
      deleteMeeting: vi.fn(),
      clearTranscripts: vi.fn(),
      getTranscripts: vi.fn().mockResolvedValue([]),
      saveMeetingSummary: vi.fn(),
      saveTranscript: vi.fn(),
    };
  });

  it('loads meetings and selects the first meeting', async () => {
    const { result } = renderHook(() => useMeetings());

    await waitFor(() => expect(result.current.meetings).toHaveLength(1));
    expect(result.current.currentMeeting?.id).toBe(1);
  });

  it('creates a meeting and sets it as current', async () => {
    const { result } = renderHook(() => useMeetings());

    await waitFor(() => expect(result.current.meetings).toHaveLength(1));

    await act(async () => {
      await result.current.createMeeting();
    });

    await waitFor(() => expect(result.current.currentMeeting?.id).toBe(2));
    expect(createMeeting).toHaveBeenCalledTimes(1);
  });
});
