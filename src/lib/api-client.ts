
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export async function fetchClient(endpoint: string, options: RequestInit = {}) {
    const token = getCookie('token');

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if ((res.status === 401 || res.status === 403) && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }

        return res;
    } catch (error: any) {
        throw error;
    }
}

