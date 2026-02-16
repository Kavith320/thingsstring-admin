"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchClient } from "@/lib/api-client";

export function DeleteDeviceButton({ deviceId }: { deviceId: string }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
            setIsDeleting(true);

            try {
                const res = await fetchClient(`/api/admin/devices/${deviceId}`, { method: 'DELETE' });
                if (res.ok) {
                    router.push("/devices");
                    router.refresh();
                } else {
                    throw new Error("Failed to delete device");
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting device");
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
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Device"}
        </button>
    );
}
