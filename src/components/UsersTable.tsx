"use client";

import { useState } from "react";
import { Trash2, KeyRound, Shield, Ban, CheckCircle } from "lucide-react";
import { fetchClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { ResetPasswordModal } from "@/components/UserActionModals";

interface User {
    _id: string;
    userId8?: string;
    name?: string;
    email: string;
    role: string;
    status?: string;
}

export function UsersTable({ users: initialUsers }: { users: User[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [selectedUserForReset, setSelectedUserForReset] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this user? This will also delete all their devices, telemetry records, and schedules.")) {
            try {
                let res = await fetchClient(`/api/admin/users/${id}`, { method: 'DELETE' });
                if (res.status === 404) {
                    res = await fetchClient(`/api/users/${id}`, { method: 'DELETE' });
                }
                if (res.ok) {
                    setUsers(users.filter((user) => user._id !== id));
                    router.refresh();
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.message || data.error || "Failed to delete user");
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting user");
            }
        }
    };

    const handleRoleChange = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "admin" ? "user" : "admin";
        if (confirm(`Are you sure you want to change user's role to ${newRole}?`)) {
            try {
                let res = await fetchClient(`/api/admin/users/${userId}/role`, {
                    method: "PUT",
                    body: JSON.stringify({ role: newRole }),
                });
                if (res.status === 404) {
                    res = await fetchClient(`/api/users/${userId}`, {
                        method: "PUT",
                        body: JSON.stringify({ role: newRole }),
                    });
                }
                if (res.ok) {
                    setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
                    router.refresh();
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.message || data.error || "Failed to update role");
                }
            } catch (err) {
                console.error(err);
                alert("Error updating role");
            }
        }
    };

    const handleStatusToggle = async (userId: string, currentStatus?: string) => {
        const newStatus = currentStatus === "disabled" ? "active" : "disabled";
        if (confirm(`Are you sure you want to set user status to ${newStatus}?`)) {
            try {
                let res = await fetchClient(`/api/admin/users/${userId}/status`, {
                    method: "PUT",
                    body: JSON.stringify({ status: newStatus }),
                });
                if (res.status === 404) {
                    res = await fetchClient(`/api/users/${userId}`, {
                        method: "PUT",
                        body: JSON.stringify({ status: newStatus }),
                    });
                }
                if (res.ok) {
                    setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
                    router.refresh();
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.message || data.error || "Failed to update user status");
                }
            } catch (err) {
                console.error(err);
                alert("Error updating user status");
            }
        }
    };

    return (
        <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">User ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">User ID8</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Name</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Email</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Role</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-900">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-900">{user._id}</td>
                                <td className="px-4 py-3 text-gray-700">{user.userId8 || "N/A"}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{user.name || "N/A"}</td>
                                <td className="px-4 py-3 text-gray-700">{user.email}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleRoleChange(user._id, user.role)}
                                        title="Click to toggle role"
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}
                                    >
                                        <Shield className="h-3 w-3" />
                                        {user.role}
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleStatusToggle(user._id, user.status)}
                                        title="Click to toggle account status"
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${user.status === 'disabled' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                    >
                                        {user.status === 'disabled' ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                        {user.status || 'active'}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setSelectedUserForReset({ id: user._id, name: user.name || user.email })}
                                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            title="Reset User Password"
                                        >
                                            <KeyRound className="h-3 w-3 text-blue-600" />
                                            Reset Password
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user._id)}
                                            className="inline-flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                                            title="Delete User"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedUserForReset && (
                <ResetPasswordModal
                    isOpen={!!selectedUserForReset}
                    onClose={() => setSelectedUserForReset(null)}
                    userId={selectedUserForReset.id}
                    userName={selectedUserForReset.name}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}

