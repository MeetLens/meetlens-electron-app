# Localization Guide

This guide explains how to add support for a new application language (UI labels, buttons, tooltips, etc.) to MeetLens.

## Overview

MeetLens uses `i18next` and `react-i18next` for internationalization. UI translations are stored in JSON files located in `src/i18n/locales/`.

## Steps to Add a New App Language

### 1. Create the Translation File

1.  Navigate to `src/i18n/locales/`.
2.  Create a new directory named after the ISO 639-1 language code (e.g., `fr` for French, `de` for German).
3.  Create a `translation.json` file inside that directory.
4.  Copy the contents of `src/i18n/locales/en/translation.json` and translate the values into the new language.

Example for French (`src/i18n/locales/fr/translation.json`):
```json
{
  "sidebar": {
    "title": "Vos Espaces",
    "new_meeting": "Nouvelle Réunion",
    ...
  }
}
```

### 2. Register the New Language in Config

Modify `src/i18n/config.ts` to include the new translation and register it in the `resources` object.

1.  **Import the JSON file:**
    ```typescript
    import translationFR from './locales/fr/translation.json';
    ```

2.  **Add to the `resources` object:**
    ```typescript
    const resources = {
      en: { translation: translationEN },
      tr: { translation: translationTR },
      fr: { translation: translationFR }, // Add this line
    };
    ```

### 3. Add to Supported App Languages List

In the same file (`src/i18n/config.ts`), add the new language to the `SUPPORTED_APP_LANGUAGES` array. This array is used to populate the language selection dropdown in the Settings modal.

```typescript
export const SUPPORTED_APP_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'fr', name: 'Français' }, // Add this line
];
```

## Using Translations in Components

### In Functional Components

Use the `useTranslation` hook:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('sidebar.title')}</h1>;
}
```

### In Non-Component Files

If you need translations outside of a React component, you can import the `i18n` instance directly:

```typescript
import i18n from './i18n/config';

const title = i18n.t('sidebar.title');
```

## Dynamic Features

### Locale-Aware Date Formatting

The sidebar and other components use the active language for date formatting automatically:

```typescript
// Inside a component with useTranslation()
const { i18n } = useTranslation();
const formattedDate = date.toLocaleString(i18n.language, options);
```

### Nested Objects

For lists like `feature_list`, use the `returnObjects` option:

```tsx
const features = t('topbar.feature_list', { returnObjects: true }) as string[];
```

## Translation Language vs. App Language

- **App Language**: Controls the UI labels (buttons, titles, etc.). Managed via `i18n.changeLanguage()`.
- **Translation Language**: Controls the language that live audio is translated into. This is passed to the backend API and does not affect the UI labels.
