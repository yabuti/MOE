import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ThemeContextValue {
    darkMode: boolean;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'edup_theme';

function getInitialDark(): boolean {
    return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [darkMode, setDarkMode] = useState<boolean>(getInitialDark);

    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem(STORAGE_KEY, darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const toggle = useCallback(() => setDarkMode((d) => !d), []);

    return <ThemeContext.Provider value={{ darkMode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
