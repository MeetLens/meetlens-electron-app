import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopBar from './TopBar';

describe('TopBar', () => {
  const defaultProps = {
    isRecording: false,
    isConnected: false,
    onStartStop: vi.fn(),
    elevenLabsApiKey: 'eleven-key',
    deeplApiKey: 'deepl-key',
    geminiApiKey: 'gemini-key',
    selectedLanguage: 'en',
    onSaveApiKeys: vi.fn(),
    onLanguageChange: vi.fn(),
  };

  it('renders start/stop button and toggles label based on recording state', () => {
    const { rerender } = render(<TopBar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /start meeting/i })).toBeInTheDocument();
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();

    rerender(<TopBar {...defaultProps} isRecording isConnected />);

    expect(screen.getByRole('button', { name: /stop meeting/i })).toBeInTheDocument();
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('opens settings, saves API keys, and handles language change', async () => {
    const user = userEvent.setup();
    const onSaveApiKeys = vi.fn();
    const onLanguageChange = vi.fn();

    render(
      <TopBar
        {...defaultProps}
        onSaveApiKeys={onSaveApiKeys}
        onLanguageChange={onLanguageChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));

    const elevenInput = await screen.findByLabelText(/elevenlabs api key/i);
    const deeplInput = screen.getByLabelText(/deepl api key/i);
    const geminiInput = screen.getByLabelText(/google gemini api key/i);
    const languageSelect = screen.getByLabelText(/translation language/i);

    await user.clear(elevenInput);
    await user.type(elevenInput, 'new-eleven');
    await user.clear(deeplInput);
    await user.type(deeplInput, 'new-deepl');
    await user.clear(geminiInput);
    await user.type(geminiInput, 'new-gemini');

    await user.selectOptions(languageSelect, 'tr');
    expect(onLanguageChange).toHaveBeenCalledWith('tr');

    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(onSaveApiKeys).toHaveBeenCalledWith('new-eleven', 'new-deepl', 'new-gemini');
    expect(screen.queryByText(/api settings/i)).not.toBeInTheDocument();
  });
});
