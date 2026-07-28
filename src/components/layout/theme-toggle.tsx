"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("fpm_theme");
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    // Deferred to a client-only effect on purpose: localStorage/matchMedia
    // aren't available during SSR, and the blocking ThemeScript already
    // set the real DOM attribute — this just syncs this button's label.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    localStorage.setItem("fpm_theme", next);
  }

  return (
    <button onClick={toggle} className="btn-ghost" title="Cambiar tema" type="button">
      {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
