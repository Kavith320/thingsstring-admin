"use client";

import { useEffect, useState } from "react";

/** Same theme behaviour as the ThingsString user app: `dark` class on <html>, light / dark / system. */
export type ThemePref = "light" | "dark" | "system";
const KEY = "ts_theme";

export function storedTheme(): ThemePref {
    try {
        const v = localStorage.getItem(KEY);
        return v === "light" || v === "dark" ? v : "system";
    } catch {
        return "system";
    }
}

export function applyTheme(pref: ThemePref) {
    try {
        localStorage.setItem(KEY, pref);
    } catch {
        // private mode: still apply for this page
    }
    const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Inline <head> script: applies the saved theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}");var m=window.matchMedia("(prefers-color-scheme: dark)");var d=p==="dark"||(p!=="light"&&m.matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";m.addEventListener("change",function(e){var q=localStorage.getItem("${KEY}");if(q!=="light"&&q!=="dark"){document.documentElement.classList.toggle("dark",e.matches);document.documentElement.style.colorScheme=e.matches?"dark":"light";}});}catch(e){}})();`;

/** True while <html> has the dark class (follows theme changes live). */
export function useIsDark(): boolean {
    const [dark, setDark] = useState(false);
    useEffect(() => {
        const el = document.documentElement;
        const update = () => setDark(el.classList.contains("dark"));
        update();
        const obs = new MutationObserver(update);
        obs.observe(el, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

/**
 * Categorical chart colours, in fixed order (validated for colour-vision deficiency with the
 * dataviz validator: light against white, dark against zinc-900). Same hues as the user app.
 */
const SERIES_LIGHT = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const SERIES_DARK = ["#6366f1", "#059669", "#d97706", "#e11d48", "#8b5cf6", "#0891b2"];
export const MAX_SERIES = SERIES_LIGHT.length;

export function useChartTheme() {
    const dark = useIsDark();
    return {
        dark,
        series: dark ? SERIES_DARK : SERIES_LIGHT,
        grid: dark ? "#27272a" : "#f4f4f5",
        axis: dark ? "#a1a1aa" : "#71717a",
        surface: dark ? "#18181b" : "#ffffff",
        status: {
            good: dark ? "#10b981" : "#059669",
            warning: dark ? "#f59e0b" : "#d97706",
            critical: dark ? "#f87171" : "#dc2626",
            neutral: dark ? "#52525b" : "#a1a1aa",
        },
    };
}
