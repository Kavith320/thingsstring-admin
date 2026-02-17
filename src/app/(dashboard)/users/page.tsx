
import { UsersTable } from "@/components/UsersTable";
import { fetchWithAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

type User = {
    _id: string;
    userId8: string;
    name: string;
    email: string;
    role: string;
};

async function getUsers() {
    try {
        const res = await fetchWithAuth("/api/admin/users", { next: { revalidate: 60 } });
        if (!res.ok) {
            console.error("Failed to fetch users");
            return [];
        }
        const data = await res.json();
        return data.users as User[];

    } catch (error: any) {
        if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.digest === "DYNAMIC_SERVER_USAGE") {
            throw error;
        }
        console.error("Error fetching users:", error);
        return [];
    }
}

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <UsersTable users={users} />
            </div>
        </div>
    );
}
