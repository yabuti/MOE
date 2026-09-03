import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { type Locale, t as translate, locales } from '../i18n';

interface LanguageContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'edup_locale';

function getInitialLocale(): Locale {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales.includes(saved as Locale)) return saved as Locale;
    return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

    const setLocale = useCallback((l: Locale) => {
        setLocaleState(l);
        localStorage.setItem(STORAGE_KEY, l);
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>) => translate(locale, key, params), [locale]);

    return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
