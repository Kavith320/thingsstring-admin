import { clearAuth, getToken } from "@/lib/auth";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

/** The server answered with an error status. */
export class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

/** No HTTP response at all (server down, network, CORS). */
export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NetworkError";
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    /** Send without the admin token (login). */
    anonymous?: boolean;
}

/**
 * JSON request to the ThingsString backend with the admin's Bearer token.
 * GETs are retried through short network blips; commands never are (they may have reached the server).
 * A 401 (expired or revoked session) or 403 on an admin route sends the admin back to login.
 */
export async function api<T = any>(endpoint: string, { method = "GET", body, anonymous = false }: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = anonymous ? null : getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const retryDelays = method === "GET" ? [600, 1500] : [];
    let res: Response | null = null;
    for (let attempt = 0; ; attempt++) {
        try {
            res = await fetch(`${API_URL}${endpoint}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                cache: "no-store",
            });
            break;
        } catch {
            if (attempt >= retryDelays.length) {
                throw new NetworkError(`Cannot reach the ThingsString server at ${API_URL}.`);
            }
            await new Promise((r) => setTimeout(r, retryDelays[attempt]));
        }
    }

    const text = await res.text();
    let data: any = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    const sessionEnded = res.status === 401 || (res.status === 403 && endpoint.startsWith("/api/admin"));
    if (sessionEnded && token && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        clearAuth();
        const reason = res.status === 403 ? "forbidden" : "expired";
        window.location.replace(`/login?reason=${reason}&next=${encodeURIComponent(window.location.pathname)}`);
    }

    if (!res.ok || (data && typeof data === "object" && data.ok === false)) {
        let msg = `Request failed (${res.status})`;
        if (data && typeof data === "object") msg = data.error || data.message || msg;
        else if (typeof data === "string" && data.trim() && !data.includes("<html")) msg = data;
        throw new ApiError(msg, res.status, data && typeof data === "object" ? data.code : undefined);
    }
    return data as T;
}

export function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : "Something went wrong";
}
