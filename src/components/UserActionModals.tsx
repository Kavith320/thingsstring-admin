"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { KeyRound, Shield, AlertTriangle, X } from "lucide-react";

interface ResetPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    onSuccess: () => void;
}

export function ResetPasswordModal({ isOpen, onClose, userId, userName, onSuccess }: ResetPasswordModalProps) {
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetchClient(`/api/admin/users/${userId}/reset-password`, {
                method: "POST",
                body: JSON.stringify({ newPassword }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                alert(`Password successfully reset for ${userName}`);
                setNewPassword("");
                onSuccess();
                onClose();
            } else {
                setError(data.message || data.error || "Failed to reset password");
            }
        } catch (err: any) {
            console.error("Error resetting password:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <KeyRound className="h-5 w-5 text-blue-600" />
                        Reset Password
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Set a new password for <span className="font-semibold text-gray-900">{userName}</span>.
                    </p>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-600">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
