
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchClient(endpoint: string, options: RequestInit = {}) {
    // Get token from cookie manually
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    return res;
}
