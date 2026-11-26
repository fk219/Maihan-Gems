'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ClientSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('maihan_portal_theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('maihan_portal_theme', theme); } catch { return; }
  }, [theme]);

  useEffect(() => {
    document.body.classList.add('portal-surface');
    return () => { document.body.classList.remove('portal-surface'); };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((value) => (value === 'light' ? 'dark' : 'light')) }}>
      <div className={`portal-theme ${className}`.trim()} data-portal-theme={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function ClientThemeToggle({ className = '' }: { className?: string }) {
  const context = useContext(ThemeContext);
  if (!context) return null;
  return (
    <button
      type="button"
      className={`portal-icon-btn ${className}`.trim()}
      aria-label={context.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      onClick={context.toggle}
    >
      {context.theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
}
