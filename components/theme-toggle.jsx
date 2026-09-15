"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = (e) => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // fallback: browser tanpa View Transitions atau user minta reduced motion
    if (!document.startViewTransition || reduce) {
      setTheme(next);
      return;
    }
    // asal cahaya = titik klik; radius menjangkau sudut terjauh
    const x = e.clientX || window.innerWidth - 32;
    const y = e.clientY || 32;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement.style;
    root.setProperty("--reveal-x", `${x}px`);
    root.setProperty("--reveal-y", `${y}px`);
    root.setProperty("--reveal-r", `${r}px`);
    document.startViewTransition(() => flushSync(() => setTheme(next)));
  };

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={mounted && resolvedTheme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      onClick={toggleTheme}
    >
      {mounted ? (resolvedTheme === "dark" ? <Sun /> : <Moon />) : <Moon className="opacity-0" />}
    </Button>
  );
}
