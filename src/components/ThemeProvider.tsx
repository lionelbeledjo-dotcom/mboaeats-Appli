import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "mboa-theme";
const HC_STORAGE_KEY = "mboa-high-contrast";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  toggleHighContrast: () => void;
};

const ThemeContext = createContext<Ctx | undefined>(undefined);

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = t;
}

function applyHighContrast(v: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (v) root.classList.add("hc");
  else root.classList.remove("hc");
}

export function ThemeProvider({ children, defaultTheme = "light" }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [highContrast, setHighContrastState] = useState<boolean>(false);

  // Hydrate from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const initial = stored === "dark" || stored === "light" ? stored : defaultTheme;
      setThemeState(initial);
      applyTheme(initial);
      const hc = localStorage.getItem(HC_STORAGE_KEY) === "1";
      setHighContrastState(hc);
      applyHighContrast(hc);
    } catch {
      applyTheme(defaultTheme);
    }
  }, [defaultTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  };

  const setHighContrast = (v: boolean) => {
    setHighContrastState(v);
    applyHighContrast(v);
    try { localStorage.setItem(HC_STORAGE_KEY, v ? "1" : "0"); } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
        highContrast,
        setHighContrast,
        toggleHighContrast: () => setHighContrast(!highContrast),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
