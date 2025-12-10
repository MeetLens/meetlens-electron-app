import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App', () => {
  const createMeeting = vi.fn(async (name: string) => ({ id: 1, name, created_at: new Date().toISOString() }));

  beforeEach(() => {
    createMeeting.mockClear();
    (window as any).electronAPI = {
      getMeetings: vi.fn().mockResolvedValue([]),
      getTranscripts: vi.fn().mockResolvedValue([]),
      getMeetingSummary: vi.fn().mockResolvedValue({ summary: '' }),
      createMeeting,
      deleteMeeting: vi.fn(),
      clearTranscripts: vi.fn(),
    };
    localStorage.clear();
  });

  it('renders core UI and triggers new meeting flow', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/your spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/no meetings yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+' }));

    expect(createMeeting).toHaveBeenCalledTimes(1);
  });
});
