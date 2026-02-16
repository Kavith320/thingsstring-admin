"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight, Zap, Loader2 } from "lucide-react";
import { fetchClient } from "@/lib/api-client";

interface ActuatorState {
    status: boolean;
    value?: number;
}

interface DeviceControlPanelProps {
    deviceId?: string;
    initialControl: Record<string, ActuatorState>;
}

export function DeviceControlPanel({ deviceId, initialControl }: DeviceControlPanelProps) {
    const [control, setControl] = useState(initialControl);
    const [loading, setLoading] = useState(false);

    if (!deviceId) {
        return <div className="text-gray-500 italic">Device ID not available.</div>;
    }

    const toggle = async (key: string) => {
        setLoading(true);
        const newState = !control[key]?.status;

        // Optimistic update
        setControl(prev => ({
            ...prev,
            [key]: { ...prev[key], status: newState }
        }));

        try {
            const res = await fetchClient(`/api/admin/devices/${deviceId}/control`, {
                method: 'POST',
                body: JSON.stringify({ actuators: { [key]: { status: newState } } })
            });

            if (!res.ok) {
                throw new Error("Failed to control device");
            }

            console.log(`Toggled ${key} to ${newState} for device ${deviceId}`);
        } catch (error) {
            console.error("Failed to control device", error);
            // Revert on error
            setControl(prev => ({
                ...prev,
                [key]: { ...prev[key], status: !newState }
            }));
            alert("Failed to update device state");
        } finally {
            setLoading(false);
        }
    };

    if (Object.keys(control).length === 0) {
        return <div className="text-gray-500 italic">No controllable actuators found.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(control).map(([key, state]) => (
                <div key={key} className="flex items-center justify-between rounded border border-gray-200 p-4">
                    <div className="flex items-center gap-2">
                        <Zap className={`h-5 w-5 ${state.status ? "text-yellow-500" : "text-gray-400"}`} />
                        <span className="font-medium capitalize text-gray-700">{key}</span>
                    </div>
                    <button
                        onClick={() => toggle(key)}
                        disabled={loading}
                        className={`transition-all focus:outline-none flex items-center justify-center ${state.status ? "text-green-600" : "text-gray-400"} ${loading ? "opacity-50 cursor-wait" : "hover:scale-110 active:scale-95"}`}
                    >
                        {loading && control[key]?.status !== state.status ? (
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        ) : state.status ? (
                            <ToggleRight className="h-8 w-8" />
                        ) : (
                            <ToggleLeft className="h-8 w-8" />
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}
