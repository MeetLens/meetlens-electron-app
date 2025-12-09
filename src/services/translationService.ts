export class TranslationService {
  private apiKey: string;
  private targetLanguage: string;

  constructor(apiKey: string, targetLanguage: string = 'tr') {
    this.apiKey = apiKey;
    this.targetLanguage = targetLanguage;
  }

  setTargetLanguage(language: string) {
    this.targetLanguage = language;
  }

  async translate(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    try {
      // Use IPC to call translation in main process (avoids CORS)
      const translated = await window.electronAPI.translateText(
        text,
        this.targetLanguage,
        this.apiKey
      );
      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Turkish' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];
