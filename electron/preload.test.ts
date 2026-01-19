import { describe, expect, it, vi, beforeEach } from 'vitest';
import { registerPreloadApi } from './preload';

describe('registerPreloadApi', () => {
  const mockExposeInMainWorld = vi.fn();
  const mockInvoke = vi.fn();

  const mockContextBridge = { exposeInMainWorld: mockExposeInMainWorld } as const;
  const mockIpcRenderer = { invoke: mockInvoke } as const;

  const getExposedApi = () => mockExposeInMainWorld.mock.calls[0][1] as Record<string, Function>;

  beforeEach(() => {
    mockExposeInMainWorld.mockClear();
    mockInvoke.mockClear();
    registerPreloadApi(mockContextBridge, mockIpcRenderer);
  });

  it('exposes the expected API keys in the main world', () => {
    const apiKeys = Object.keys(getExposedApi()).sort();

    expect(mockExposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
    expect(apiKeys).toEqual(
      [
        'checkScreenPermission',
        'clearTranscripts',
        'createMeeting',
        'deleteMeeting',
        'getAudioSources',
        'getMeeting',
        'getMeetingSummary',
        'getMeetings',
        'getScreenSourceId',
        'getTranscripts',
        'openScreenRecordingSettings',
        'saveMeetingSummary',
        'saveTranscript',
      ].sort()
    );
  });

  it.each([
    ['checkScreenPermission', [], ['check-screen-permission']],
    ['getAudioSources', [], ['get-audio-sources']],
    ['createMeeting', ['New Meeting'], ['create-meeting', 'New Meeting']],
    ['getMeetings', [], ['get-meetings']],
    ['getMeeting', [3], ['get-meeting', 3]],
    ['saveTranscript', [2, '00:01', 'Hello', 'Hola'], ['save-transcript', 2, '00:01', 'Hello', 'Hola']],
    ['getScreenSourceId', [], ['get-screen-source-id']],
    ['getTranscripts', [5], ['get-transcripts', 5]],
    ['clearTranscripts', [8], ['clear-transcripts', 8]],
    ['deleteMeeting', [1], ['delete-meeting', 1]],
    [
      'saveMeetingSummary',
      [4, 'Summary', 'Full transcript'],
      ['save-meeting-summary', 4, 'Summary', 'Full transcript'],
    ],
    ['getMeetingSummary', [6], ['get-meeting-summary', 6]],
    ['openScreenRecordingSettings', [], ['open-screen-recording-settings']],
  ])('routes %s to ipcRenderer.invoke', (
    methodName: string,
    args: unknown[],
    expectedInvokeArgs: unknown[],
  ) => {
    const api = getExposedApi();

    api[methodName as keyof typeof api](...(args as never[]));

    expect(mockInvoke).toHaveBeenCalledWith(...expectedInvokeArgs);
  });
});
