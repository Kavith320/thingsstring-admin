"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, errorMessage } from "@/lib/api";

interface UseApiResult<T> {
    data: T | null;
    error: string;
    loading: boolean;
    /** Re-fetch. `silent` keeps the current data on screen (no skeleton). */
    reload: (silent?: boolean) => Promise<void>;
    setData: React.Dispatch<React.SetStateAction<T | null>>;
    updatedAt: number | null;
}

/**
 * Load an admin endpoint on mount (and whenever `endpoint` changes), optionally polling.
 * Pass `null` to skip loading.
 */
export function useApi<T = any>(endpoint: string | null, { pollMs }: { pollMs?: number } = {}): UseApiResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(!!endpoint);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const seq = useRef(0);

    const reload = useCallback(
        async (silent = false) => {
            if (!endpoint) return;
            const my = ++seq.current;
            if (!silent) setLoading(true);
            try {
                const res = await api<T>(endpoint);
                if (my !== seq.current) return;
                setData(res);
                setError("");
                setUpdatedAt(Date.now());
            } catch (e) {
                if (my !== seq.current) return;
                setError(errorMessage(e));
            } finally {
                if (my === seq.current) setLoading(false);
            }
        },
        [endpoint]
    );

    useEffect(() => {
        reload();
        if (!pollMs || !endpoint) return;
        const t = setInterval(() => {
            if (document.visibilityState === "visible") reload(true);
        }, pollMs);
        return () => clearInterval(t);
    }, [reload, pollMs, endpoint]);

    return { data, error, loading, reload, setData, updatedAt };
}

/** Debounced value, for search boxes that hit the server. */
export function useDebounced<T>(value: T, ms = 300): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/** A URL query parameter, read without an effect (empty during server render). */
export function useQueryParam(name: string): string {
    return useSyncExternalStore(
        subscribeToUrl,
        () => new URLSearchParams(window.location.search).get(name) || "",
        () => ""
    );
}
function subscribeToUrl(cb: () => void) {
    window.addEventListener("popstate", cb);
    return () => window.removeEventListener("popstate", cb);
}

/** Current time, refreshed every `ms` (keeps render pure while "x ago" labels stay fresh). */
export function useNow(ms = 10_000): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(t);
    }, [ms]);
    return now;
}
