import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "edifice-theme";

function apply(theme: Theme) {
  const el = document.documentElement;
  el.classList.toggle("light", theme === "light");
  el.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    setTheme(stored);
    apply(stored);
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(KEY, next);
      apply(next);
      return next;
    });
  }, []);

  return { theme, toggle, mounted };
}
