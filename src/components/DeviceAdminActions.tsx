"use client";

import { useState } from "react";
import { UserCheck, Lock, Unlock } from "lucide-react";
import { TransferDeviceModal } from "@/components/TransferDeviceModal";
import { LockoutDeviceModal } from "@/components/LockoutDeviceModal";
import { useRouter } from "next/navigation";

interface DeviceAdminActionsProps {
    deviceId: string;
    isLocked?: boolean;
}

export function DeviceAdminActions({ deviceId, isLocked = false }: DeviceAdminActionsProps) {
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isLockoutOpen, setIsLockoutOpen] = useState(false);
    const router = useRouter();

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => setIsTransferOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
                <UserCheck className="h-4 w-4 text-blue-600" />
                Transfer Ownership
            </button>

            <button
                onClick={() => setIsLockoutOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                    isLocked
                        ? "border-green-600 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-red-600 bg-red-50 text-red-700 hover:bg-red-100"
                }`}
            >
                {isLocked ? (
                    <>
                        <Unlock className="h-4 w-4 text-green-600" />
                        Unlock Device
                    </>
                ) : (
                    <>
                        <Lock className="h-4 w-4 text-red-600" />
                        Lockout Device
                    </>
                )}
            </button>

            <TransferDeviceModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                deviceId={deviceId}
                onSuccess={() => router.refresh()}
            />

            <LockoutDeviceModal
                isOpen={isLockoutOpen}
                onClose={() => setIsLockoutOpen(false)}
                deviceId={deviceId}
                isCurrentlyLocked={isLocked}
                onSuccess={() => router.refresh()}
            />
        </div>
    );
}
