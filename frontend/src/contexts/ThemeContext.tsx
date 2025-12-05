import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';


type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to apply theme to DOM
function applyThemeToDOM(themeToApply: 'light' | 'dark') {
    const root = document.documentElement;
    console.log('[ThemeProvider] Applying theme to DOM:', themeToApply);

    if (themeToApply === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    console.log('[ThemeProvider] HTML element classes:', root.className);
}

// Helper function to resolve system theme
function resolveSystemTheme(): 'light' | 'dark' {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    console.log('[ThemeProvider] System prefers dark:', prefersDark);
    return prefersDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

    // Fetch theme from backend and apply on mount
    useEffect(() => {
        console.log('[ThemeProvider] Fetching theme from backend...');
        fetch('http://localhost:8000/api/settings')
            .then(res => res.json())
            .then(data => {
                const savedTheme = data.general.theme || 'dark';
                console.log('[ThemeProvider] Loaded theme from backend:', savedTheme);

                // Apply theme immediately
                if (savedTheme === 'system') {
                    const resolved = resolveSystemTheme();
                    applyThemeToDOM(resolved);
                    setActualTheme(resolved);
                } else {
                    applyThemeToDOM(savedTheme);
                    setActualTheme(savedTheme);
                }

                setThemeState(savedTheme);
            })
            .catch(err => {
                console.error('[ThemeProvider] Failed to load theme:', err);
                // Apply default dark theme
                applyThemeToDOM('dark');
                setActualTheme('dark');
            });
    }, []);

    // Listen for system theme changes when theme is 'system'
    useEffect(() => {
        if (theme !== 'system') return;

        console.log('[ThemeProvider] Setting up system theme listener');
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handler = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            console.log('[ThemeProvider] System theme changed to:', newTheme);
            applyThemeToDOM(newTheme);
            setActualTheme(newTheme);
        };

        mediaQuery.addEventListener('change', handler);
        return () => {
            console.log('[ThemeProvider] Removing system theme listener');
            mediaQuery.removeEventListener('change', handler);
        };
    }, [theme]);

    // Create stable setTheme function that applies theme immediately
    const setTheme = useCallback((newTheme: Theme) => {
        console.log('[ThemeProvider] setTheme called with:', newTheme);

        // Apply theme immediately to DOM (synchronous)
        if (newTheme === 'system') {
            const resolved = resolveSystemTheme();
            applyThemeToDOM(resolved);
            setActualTheme(resolved);
        } else {
            applyThemeToDOM(newTheme);
            setActualTheme(newTheme);
        }

        // Update state (triggers re-render)
        setThemeState(newTheme);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
