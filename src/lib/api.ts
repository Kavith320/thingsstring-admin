
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

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

        if (res.status === 401 || res.status === 403) {
            redirect("/login");
        }

        return res;
    } catch (error: any) {
        throw error;
    }
}
