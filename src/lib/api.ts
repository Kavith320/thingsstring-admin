
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

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

        if (res.status === 401) {
            redirect("/login");
        }

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
