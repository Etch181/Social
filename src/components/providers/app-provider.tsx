"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type DictionaryKey, type Locale } from "@/lib/i18n";

export type ThemeMode = "dark" | "light" | "system";

interface AppContextValue {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  setTheme: (t: ThemeMode) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
  t: (key: DictionaryKey) => string;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Reads a stored preference. SSR-safe: falls back on the server. */
function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return (window.localStorage.getItem(key) as T | null) ?? fallback;
}

export function AppProvider({
  children,
  initialTheme = "dark",
  initialLocale = "en",
}: {
  children: ReactNode;
  initialTheme?: ThemeMode;
  initialLocale?: Locale;
}) {
  // Stored preferences are read in lazy initializers so the first client
  // render already carries them — no mount effect, no cascading render.
  const [theme, setThemeState] = useState<ThemeMode>(() => readStored("fox-theme", initialTheme));
  const [locale, setLocaleState] = useState<Locale>(() => readStored("fox-locale", initialLocale));
  const [resolvedTheme, setResolved] = useState<"dark" | "light">(
    initialTheme === "system" ? "dark" : initialTheme,
  );
  // Kept on the context for API compatibility. Nothing waits on it any more:
  // the preferences it used to signal are applied during the first client
  // render. False during server rendering.
  const ready = typeof window !== "undefined";

  // Apply theme → <html data-theme>
  useEffect(() => {
    const apply = () => {
      const value = theme === "system" ? systemTheme() : theme;
      setResolved(value);
      document.documentElement.setAttribute("data-theme", value);
      document.documentElement.style.colorScheme = value;
    };
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // Apply language + direction → <html lang dir>
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", dir);
  }, [locale]);

  const setTheme = useCallback((value: ThemeMode) => {
    setThemeState(value);
    window.localStorage.setItem("fox-theme", value);
  }, []);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
    window.localStorage.setItem("fox-locale", value);
  }, []);

  const t = useCallback(
    (key: DictionaryKey) => dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? String(key),
    [locale],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      locale,
      setLocale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t,
      ready,
    }),
    [theme, resolvedTheme, setTheme, locale, setLocale, t, ready],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
