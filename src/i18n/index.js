import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import vi from './locales/vi.json';

export const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const ALL_CODES = LANGUAGES.map(l => l.code);

// Detect system language, fallback to zh-CN if no match.
const STORAGE_KEY = 'skiapi_lang_v2';
const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

function detectSystemLang() {
  const nav = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage || '') : '';
  // Exact match first (e.g. zh-CN, zh-TW)
  if (ALL_CODES.includes(nav)) return nav;
  // Prefix match (e.g. "en-US" → "en", "fr-FR" → "fr", "zh" → "zh-CN")
  const prefix = nav.split('-')[0];
  if (prefix === 'zh') return 'zh-CN';
  const match = ALL_CODES.find(c => c.startsWith(prefix));
  return match || 'zh-CN';
}

const initialLang = savedLang && ALL_CODES.includes(savedLang) ? savedLang : detectSystemLang();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': zhCN,
      'zh-TW': zhTW,
      en,
      ja,
      fr,
      ru,
      vi,
    },
    lng: initialLang,
    fallbackLng: 'zh-CN',
    supportedLngs: ALL_CODES,
    load: 'currentOnly',
    interpolation: { escapeValue: false },
    // Keys are Chinese source strings; missing keys fall through to the key itself.
    returnEmptyString: false,
    parseMissingKeyHandler: (key) => key,
  });

// Persist user selection
i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem(STORAGE_KEY, lng); } catch {}
});

export default i18n;
