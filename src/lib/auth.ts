/** Admin session storage. A separate key from the user app, so both can be open in one browser profile. */
const TOKEN_KEY = "ts_admin_token";
const USER_KEY = "ts_admin_user";

export interface AdminUser {
    id: string;
    name?: string;
    email: string;
    role: string;
    userId8?: string;
    avatar?: string | null;
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function getStoredUser(): AdminUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as AdminUser) : null;
    } catch {
        return null;
    }
}

export function setAuth(token: string, user: AdminUser) {
    try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
        // storage blocked: the session lasts for this page only
    }
}

export function clearAuth() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    } catch {
        // ignore
    }
}

export function logout() {
    clearAuth();
    window.location.href = "/login";
}
