
import { DeviceControlPanel } from "@/components/DeviceControlPanel";
import { DeleteDeviceButton } from "@/components/DeleteDeviceButton";
import SensorsGrid from "@/components/SensorsGrid";
import TelemetryGraph from "@/components/TelemetryGraph";
import { ArrowLeft, Clock, History, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";


interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

import { fetchWithAuth } from "@/lib/api";

type DeviceDetail = {
    _id?: string;
    config?: {
        _id?: string;
        user_id?: string;
        device?: {
            name?: string;
            device_id?: string;
            model?: string;
        };
        sensors?: Record<string, boolean>;
        update_interval?: number;
    };
    control?: Record<string, any>;
    telemetry_history?: any[];
};

async function getDeviceDetails(id: string) {
    try {
        const res = await fetchWithAuth(`/api/admin/devices/${id}`, { cache: "no-store" });
        if (!res.ok) {
            if (res.status === 404) {
                return null;
            }
            console.error(`Failed to fetch device ${id}: ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.device as DeviceDetail;
    } catch (error: any) {
        if (error?.digest?.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        console.error("Error fetching device details:", error);
        return null;
    }
}

async function getTelemetryHistory(deviceId: string) {
    try {
        const res = await fetchWithAuth(`/api/admin/devices/${deviceId}/telemetry?limit=500`, { cache: "no-store" });
        if (!res.ok) {
            console.error(`Failed to fetch telemetry for ${deviceId}: ${res.status}`);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data?.telemetry || data?.items || [];
    } catch (error: any) {
        console.error("Error fetching telemetry history:", error);
        return [];
    }
}

export default async function DeviceDetailPage({ params }: PageProps) {
    const { id } = await params;

    try {
        const [device, telemetryHistory] = await Promise.all([
            getDeviceDetails(id),
            getTelemetryHistory(id)
        ]);

        if (!device) {
            return (
                <div className="p-6">
                    <h1 className="text-xl text-red-600">Device not found or error loading details.</h1>
                    <Link href="/devices" className="text-blue-500 hover:underline">Back to devices</Link>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/devices" className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 text-gray-600 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Device Details: {device.config?.device?.name || "Unknown Device"}</h1>
                    </div>
                    <DeleteDeviceButton deviceId={device._id || device.config?._id} />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Device Config / Info */}
                    <div className="rounded-lg bg-white p-6 shadow space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Settings className="h-5 w-5 text-gray-500" />
                            <h2 className="text-lg font-medium text-gray-900">Configuration</h2>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p><strong>Device ID:</strong> {device.config?.device?.device_id || device._id || "N/A"}</p>
                            <p><strong>User ID:</strong> {device.config?.user_id || "N/A"}</p>
                            <p><strong>Model:</strong> {device.config?.device?.model || "N/A"}</p>
                            <p><strong>Sensors:</strong> {device.config?.sensors ? Object.keys(device.config.sensors).join(", ") : "None"}</p>
                        </div>
                    </div>

                    {/* Device Control */}
                    <div className="rounded-lg bg-white p-6 shadow space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <h2 className="text-lg font-medium text-gray-900">Control Panel</h2>
                        </div>
                        <DeviceControlPanel deviceId={device._id || device.config?._id} initialControl={device.control || {}} />
                    </div>
                </div>

                {/* Latest Sensor Readings */}
                <div className="rounded-lg bg-white p-6 shadow space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <History className="h-5 w-5 text-gray-500" />
                        <h2 className="text-lg font-medium text-gray-900">Latest Sensor Readings</h2>
                    </div>

                    <SensorsGrid lastTelemetry={device.telemetry_history?.[0]} />
                </div>

                {/* Telemetry Graph */}
                <div className="rounded-lg bg-white p-6 shadow space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <TrendingUp className="h-5 w-5 text-gray-500" />
                        <h2 className="text-lg font-medium text-gray-900">Telemetry Graphs</h2>
                    </div>

                    <TelemetryGraph history={telemetryHistory} />
                </div>
            </div>
        );
    } catch (e: any) {
        if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        console.error("Error in DeviceDetailPage:", e);
        return (
            <div className="p-6">
                <h1 className="text-xl text-red-600">Failed to load device data.</h1>
                <Link href="/devices" className="text-blue-500 hover:underline">Back to devices</Link>
            </div>
        );
    }
}
