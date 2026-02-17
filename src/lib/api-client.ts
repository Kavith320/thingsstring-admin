
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchClient(endpoint: string, options: RequestInit = {}) {
    // Get token from cookie manually
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return res;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`Fetch to ${endpoint} timed out`);
            throw new Error('Request timed out');
        }
        throw error;
    }
}
