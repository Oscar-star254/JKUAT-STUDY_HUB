import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, GradeBand } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSetting, setSetting } from '@/db/database';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  dark: boolean;
  toggleDark: () => void;
  lang: 'en' | 'sw';
  toggleLang: () => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    library: 'PDF Library',
    units: 'Units',
    timetable: 'Timetable',
    grades: 'Grades',
    notes: 'Notes',
    settings: 'Settings',
    admin: 'Admin',
    upload: 'Upload PDF',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    search: 'Search…',
    noData: 'No data yet',
    loading: 'Loading…',
    error: 'Something went wrong',
    gpa: 'GPA',
    semester: 'Semester',
    year: 'Year',
    credits: 'Credit Hours',
    welcome: 'Welcome back',
    upcoming: 'Upcoming',
    predictor: 'Grade Predictor',
    catScore: 'CAT / Assignment Score',
    examScore: 'Exam Score',
    needed: 'Needed to pass',
  },
  sw: {
    dashboard: 'Dashibodi',
    library: 'Maktaba ya PDF',
    units: 'Vitengo',
    timetable: 'Ratiba',
    grades: 'Alama',
    notes: 'Maelezo',
    settings: 'Mipangilio',
    admin: 'Usimamizi',
    upload: 'Pakia PDF',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    add: 'Ongeza',
    close: 'Funga',
    search: 'Tafuta…',
    noData: 'Hakuna data bado',
    loading: 'Inapakia…',
    error: 'Hitilafu imetokea',
    gpa: 'GPA',
    semester: 'Semester',
    year: 'Mwaka',
    credits: 'Masaa ya Mkopo',
    welcome: 'Karibu tena',
    upcoming: 'Zinazokuja',
    predictor: 'Kinabii cha Alama',
    catScore: 'Alama za CAT / Kazi',
    examScore: 'Alama za Mtihani',
    needed: 'Inayohitajika kupita',
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<AppSettings>('appSettings', DEFAULT_SETTINGS).then(s => {
      setSettings(s);
      applyDark(s.darkMode);
      setLoaded(true);
    });
  }, []);

  function applyDark(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
  }

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      setSetting('appSettings', next);
      if (patch.darkMode !== undefined) applyDark(patch.darkMode);
      return next;
    });
  }, []);

  const toggleDark = useCallback(() => {
    updateSettings({ darkMode: !settings.darkMode });
  }, [settings.darkMode, updateSettings]);

  const toggleLang = useCallback(() => {
    updateSettings({ language: settings.language === 'en' ? 'sw' : 'en' });
  }, [settings.language, updateSettings]);

  const t = useCallback((key: string) => {
    return translations[settings.language]?.[key] ?? translations.en[key] ?? key;
  }, [settings.language]);

  if (!loaded) return null;

  return (
    <AppContext.Provider value={{ settings, updateSettings, dark: settings.darkMode, toggleDark, lang: settings.language, toggleLang, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
