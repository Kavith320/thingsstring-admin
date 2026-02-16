"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { fetchClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface User {
    _id: string;
    userId8: string;
    name: string;
    email: string;
    role: string;
}

export function UsersTable({ users: initialUsers }: { users: User[] }) {
    const [users, setUsers] = useState(initialUsers);
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this user? This is destructive.")) {
            try {
                const res = await fetchClient(`/api/admin/users/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setUsers(users.filter((user) => user._id !== id));
                    router.refresh();
                } else {
                    alert("Failed to delete user");
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting user");
            }
        }
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">User ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">User ID8</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Role</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-900">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900">{user._id}</td>
                            <td className="px-4 py-2 text-gray-700">{user.userId8}</td>
                            <td className="px-4 py-2 text-gray-700">{user.name}</td>
                            <td className="px-4 py-2 text-gray-700">{user.email}</td>
                            <td className="px-4 py-2 text-gray-700">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                                <button
                                    onClick={() => handleDelete(user._id)}
                                    className="inline-flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
