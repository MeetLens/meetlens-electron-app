import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadURLMock = vi.fn();
const loadFileMock = vi.fn();
const openDevToolsMock = vi.fn();
const windowOnMock = vi.fn();
let lastBrowserWindowOptions: any;

const browserWindowInstance = {
  loadURL: loadURLMock,
  loadFile: loadFileMock,
  webContents: { openDevTools: openDevToolsMock },
  on: windowOnMock,
};

const BrowserWindowMock = vi.fn((options) => {
  lastBrowserWindowOptions = options;
  return browserWindowInstance as any;
});

const appMock = {
  isPackaged: false,
  whenReady: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  getPath: vi.fn(() => '/tmp/userData'),
  quit: vi.fn(),
};

const ipcMainMock = {
  handle: vi.fn(),
};

const desktopCapturerMock = {
  getSources: vi.fn(),
};

vi.mock('electron', () => ({
  app: appMock,
  BrowserWindow: BrowserWindowMock,
  ipcMain: ipcMainMock,
  desktopCapturer: desktopCapturerMock,
}));

const runMock = vi.fn();
const allMock = vi.fn();
const getMock = vi.fn();
const prepareMock = vi.fn(() => ({ run: runMock, all: allMock, get: getMock }));
const execMock = vi.fn();
const closeMock = vi.fn();
const DatabaseMock = vi.fn(() => ({ exec: execMock, prepare: prepareMock, close: closeMock }));

vi.mock('better-sqlite3', () => ({
  __esModule: true,
  default: DatabaseMock,
}));

import { createDatabase, createWindow, registerIpcHandlers } from './main';

describe('electron main process helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock.isPackaged = false;
    lastBrowserWindowOptions = undefined;
  });

  it('creates a dev window with expected options and devtools', () => {
    createWindow();

    expect(BrowserWindowMock).toHaveBeenCalledTimes(1);
    expect(lastBrowserWindowOptions).toMatchObject({
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
    expect(loadURLMock).toHaveBeenCalledWith('http://localhost:5173');
    expect(openDevToolsMock).toHaveBeenCalled();
    expect(loadFileMock).not.toHaveBeenCalled();
  });

  it('creates a production window that loads the built file', () => {
    appMock.isPackaged = true;

    createWindow();

    expect(loadFileMock).toHaveBeenCalledWith(
      path.join(__dirname, '../renderer/index.html'),
    );
    expect(loadURLMock).not.toHaveBeenCalled();
    expect(openDevToolsMock).not.toHaveBeenCalled();
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

    expect(ipcMainMock.handle.mock.calls.map((call) => call[0])).toEqual(expectedChannels);
    expectedChannels.forEach((channel) => {
      expect(ipcMainMock.handle).toHaveBeenCalledWith(channel, expect.any(Function));
    });
  });
});
