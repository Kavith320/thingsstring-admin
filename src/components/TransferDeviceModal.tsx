"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { UserCheck, AlertTriangle, X } from "lucide-react";

interface TransferDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    deviceId: string;
    onSuccess: () => void;
}

export function TransferDeviceModal({ isOpen, onClose, deviceId, onSuccess }: TransferDeviceModalProps) {
    const [targetUserId, setTargetUserId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetchClient(`/api/admin/devices/${deviceId}/transfer`, {
                method: "PUT",
                body: JSON.stringify({ targetUserId }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                alert(`Device ${deviceId} transferred successfully.`);
                setTargetUserId("");
                onSuccess();
                onClose();
            } else {
                setError(data.message || data.error || "Failed to transfer device ownership");
            }
        } catch (err: any) {
            console.error("Error transferring device:", err);
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
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        Transfer Device Ownership
                    </div>
                    <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Reassign ownership of device <span className="font-mono font-semibold text-gray-900">{deviceId}</span>.
                    </p>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Target User ID or ID8</label>
                        <input
                            type="text"
                            required
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            placeholder="Enter MongoDB User ID or 8-char userId8"
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
                            {loading ? "Transferring..." : "Transfer Ownership"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
