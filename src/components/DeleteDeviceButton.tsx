"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchClient } from "@/lib/api-client";

export function DeleteDeviceButton({ deviceId }: { deviceId?: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    if (!deviceId) {
        return null; // Don't render if no deviceId
    }

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
            setIsDeleting(true);

            try {
                let res = await fetchClient(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
                if (res.status === 404) {
                    res = await fetchClient(`/api/devices/${deviceId}`, { method: 'DELETE' });
                }
                if (res.ok) {
                    router.push("/devices");
                    router.refresh();
                } else {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.message || data.error || "Failed to delete device");
                }
            } catch (err: any) {
                console.error(err);
                alert(err.message || "Error deleting device");
                setIsDeleting(false);
            }
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
            {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? "Deleting..." : "Delete Device"}
        </button>
    );
}
