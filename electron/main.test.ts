import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted so the mocks exist before vi.mock is hoisted
const electronMocks = vi.hoisted(() => {
  const loadURLMock = vi.fn();
  const loadFileMock = vi.fn();
  const openDevToolsMock = vi.fn();
  const windowOnMock = vi.fn();

  const mocks: any = {
    loadURLMock,
    loadFileMock,
    openDevToolsMock,
    windowOnMock,
    lastBrowserWindowOptions: undefined as any,
  };

  const browserWindowInstance = {
    loadURL: loadURLMock,
    loadFile: loadFileMock,
    webContents: { openDevTools: openDevToolsMock },
    on: windowOnMock,
  };

  mocks.browserWindowInstance = browserWindowInstance;
  mocks.BrowserWindowMock = vi.fn((options) => {
    mocks.lastBrowserWindowOptions = options;
    return browserWindowInstance as any;
  });

  mocks.appMock = {
    isPackaged: false,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    getPath: vi.fn(() => '/tmp/userData'),
    quit: vi.fn(),
  };

  mocks.ipcMainMock = {
    handle: vi.fn(),
  };

  mocks.desktopCapturerMock = {
    getSources: vi.fn(),
  };

  return mocks;
});

vi.mock('electron', () => ({
  app: electronMocks.appMock,
  BrowserWindow: electronMocks.BrowserWindowMock,
  ipcMain: electronMocks.ipcMainMock,
  desktopCapturer: electronMocks.desktopCapturerMock,
}));

const sqliteMocks = vi.hoisted(() => {
  const runMock = vi.fn();
  const allMock = vi.fn();
  const getMock = vi.fn();
  const prepareMock = vi.fn(() => ({ run: runMock, all: allMock, get: getMock }));
  const execMock = vi.fn();
  const closeMock = vi.fn();
  const DatabaseMock = vi.fn(() => ({ exec: execMock, prepare: prepareMock, close: closeMock }));

  return { runMock, allMock, getMock, prepareMock, execMock, closeMock, DatabaseMock };
});

vi.mock('better-sqlite3', () => ({
  __esModule: true,
  default: sqliteMocks.DatabaseMock,
}));

import { createDatabase, createWindow, registerIpcHandlers } from './main';

describe('electron main process helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronMocks.appMock.isPackaged = false;
    electronMocks.lastBrowserWindowOptions = undefined;
  });

  it('creates a dev window with expected options and devtools', () => {
    createWindow();

    expect(electronMocks.BrowserWindowMock).toHaveBeenCalledTimes(1);
    expect(electronMocks.lastBrowserWindowOptions).toMatchObject({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: expect.objectContaining({
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      }),
      autoHideMenuBar: true,
    });
    expect(electronMocks.loadURLMock).toHaveBeenCalledWith('http://localhost:5173');
    expect(electronMocks.openDevToolsMock).toHaveBeenCalled();
    expect(electronMocks.loadFileMock).not.toHaveBeenCalled();
  });

  it('creates a production window that loads the built file', () => {
    electronMocks.appMock.isPackaged = true;

    createWindow();

    expect(electronMocks.loadFileMock).toHaveBeenCalledWith(
      path.join(__dirname, '../renderer/index.html'),
    );
    expect(electronMocks.loadURLMock).not.toHaveBeenCalled();
    expect(electronMocks.openDevToolsMock).not.toHaveBeenCalled();
  });

  it('registers IPC handlers for meeting and translation operations', () => {
    const database = createDatabase();

    registerIpcHandlers(database);

    const expectedChannels = [
      'get-audio-sources',
      'create-meeting',
      'get-meetings',
      'get-meeting',
      'save-transcript',
      'get-transcripts',
      'clear-transcripts',
      'delete-meeting',
      'save-meeting-summary',
      'get-meeting-summary',
      'translate-text',
    ];

    expect(electronMocks.ipcMainMock.handle.mock.calls.map((call) => call[0])).toEqual(expectedChannels);
    expectedChannels.forEach((channel) => {
      expect(electronMocks.ipcMainMock.handle).toHaveBeenCalledWith(channel, expect.any(Function));
    });
  });
});
