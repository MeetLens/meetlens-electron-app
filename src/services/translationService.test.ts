// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationService } from './translationService';

describe('TranslationService', () => {
  let mockTranslateText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTranslateText = vi.fn();
    vi.stubGlobal('window', {
      electronAPI: {
        translateText: mockTranslateText,
      },
    } as unknown as Window & typeof globalThis);
  });

  it('translates text using electron API', async () => {
    mockTranslateText.mockResolvedValue('translated text');
    const service = new TranslationService('api-key', 'es');

    const result = await service.translate('hello world');

    expect(result).toBe('translated text');
    expect(mockTranslateText).toHaveBeenCalledWith('hello world', 'es', 'api-key');
  });

  it('returns empty string when input is empty', async () => {
    const service = new TranslationService('api-key', 'es');

    const result = await service.translate('   ');

    expect(result).toBe('');
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it('returns original text when translation fails', async () => {
    mockTranslateText.mockRejectedValue(new Error('translation failed'));
    const service = new TranslationService('api-key', 'es');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.translate('original text');

    expect(result).toBe('original text');
    expect(mockTranslateText).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
