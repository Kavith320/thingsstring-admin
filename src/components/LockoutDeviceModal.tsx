"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { Lock, Unlock, AlertTriangle, X } from "lucide-react";

interface LockoutDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
    isCurrentlyLocked?: boolean;
    onSuccess: () => void;
}

export function LockoutDeviceModal({ isOpen, onClose, deviceId, isCurrentlyLocked, onSuccess }: LockoutDeviceModalProps) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const willLock = !isCurrentlyLocked;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetchClient(`/api/admin/devices/${deviceId}/lockout`, {
                method: "POST",
                body: JSON.stringify({
                    disabled: willLock,
                    reason: willLock ? (reason || "Administrative lockout") : "Unlocked by Admin"
                }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                alert(`Device ${deviceId} ${willLock ? "locked out" : "unlocked"} successfully.`);
                setReason("");
                onSuccess();
                onClose();
            } else {
                setError(data.message || data.error || "Failed to change device lockout state");
            }
        } catch (err: any) {
            console.error("Error updating lockout status:", err);
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
                        {willLock ? <Lock className="h-5 w-5 text-red-600" /> : <Unlock className="h-5 w-5 text-green-600" />}
                        {willLock ? "Lockout Device" : "Unlock Device"}
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        {willLock ? (
                            <>Locking device <span className="font-mono font-semibold text-gray-900">{deviceId}</span> will prevent non-admin interactions and commands.</>
                        ) : (
                            <>Unlocking device <span className="font-mono font-semibold text-gray-900">{deviceId}</span> will restore normal user interactions.</>
                        )}
                    </p>

                    {willLock && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Reason for Lockout</label>
                            <textarea
                                required
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., High power consumption spike detected"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                            />
                        </div>
                    )}

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
                            className={`rounded-md px-4 py-2 text-xs font-medium text-white disabled:opacity-50 ${willLock ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                        >
                            {loading ? "Updating..." : (willLock ? "Confirm Lockout" : "Confirm Unlock")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
