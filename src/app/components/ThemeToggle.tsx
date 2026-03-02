"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";

const STORAGE_KEY = "kaist-graduation-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light") {
      document.documentElement.classList.add("light");
      setTheme("light");
      return;
    }

    document.documentElement.classList.remove("light");
    setTheme("dark");
  }, []);

  const toggleTheme = () => {
    setTheme((previous) => {
      const next = previous === "dark" ? "light" : "dark";
      if (next === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
      window.localStorage.setItem(STORAGE_KEY, next);
      track("theme_toggled", { theme: next });
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label="테마 전환"
    >
      <span>{theme === "dark" ? "다크" : "라이트"}</span>
      <span className="text-text-muted">모드</span>
    </button>
  );
}
