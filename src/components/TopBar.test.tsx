import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n/config';
import TopBar from './TopBar';

describe('TopBar', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
  });

  const defaultProps = {
    isRecording: false,
    isConnected: false,
    onStartStop: vi.fn(),
    translationLanguage: 'en',
    onTranslationLanguageChange: vi.fn(),
    appLanguage: 'en',
    onAppLanguageChange: vi.fn(),
  };

  it('renders start/stop button and toggles label based on recording state', () => {
    const { rerender } = render(<TopBar {...defaultProps} />);

    expect(screen.getByRole('button', { name: /start meeting/i })).toBeInTheDocument();
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();

    rerender(<TopBar {...defaultProps} isRecording isConnected />);

    expect(screen.getByRole('button', { name: /stop meeting/i })).toBeInTheDocument();
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('opens settings and handles language changes', async () => {
    const user = userEvent.setup();
    const onTranslationLanguageChange = vi.fn();
    const onAppLanguageChange = vi.fn();

    render(
      <TopBar
        {...defaultProps}
        onTranslationLanguageChange={onTranslationLanguageChange}
        onAppLanguageChange={onAppLanguageChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));

    const appLanguageSelect = await screen.findByLabelText(/app language/i);
    const translationLanguageSelect = screen.getByLabelText(/translation language/i);

    await user.selectOptions(translationLanguageSelect, 'tr');
    expect(onTranslationLanguageChange).toHaveBeenCalledWith('tr');

    await user.selectOptions(appLanguageSelect, 'de');
    expect(onAppLanguageChange).toHaveBeenCalledWith('de');

    const saveButton = await screen.findByRole('button', {
      name: /save settings|einstellungen speichern/i,
    });
    await user.click(saveButton);

    expect(
      screen.queryByRole('heading', { name: /application settings|anwendungseinstellungen/i }),
    ).not.toBeInTheDocument();
  });
});
