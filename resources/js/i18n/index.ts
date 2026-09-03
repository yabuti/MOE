import en from './en';
import am from './am';
import om from './om';
// import ti from './ti';

export type Locale = 'en' | 'am' | 'om'; // | 'ti'

const translations: Record<Locale, Record<string, string>> = { en, am, om }; // ti

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
    const dict = translations[locale] ?? translations.en;
    let value = dict[key] ?? translations.en[key] ?? key;
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
    }
    return value;
}

export const localeNames: Record<Locale, string> = {
    en: 'English',
    am: 'አማርኛ',
    om: 'Afaan Oromoo',
    // ti: 'ትግርኛ',
};

export const locales: Locale[] = ['en', 'am', 'om']; // 'ti'
