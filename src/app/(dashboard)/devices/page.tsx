import { fetchWithAuth } from "@/lib/api";
import Link from "next/link";
import { Cpu, ChevronRight } from "lucide-react";

type Device = {
    _id: string;
    device: { user_id: string; name?: string };
    actuators: Record<string, any>;
    sensors: any[];
};

async function getDevices() {
    try {
        const res = await fetchWithAuth("/api/admin/devices", { cache: "no-store" });
        if (!res.ok) {
            console.error("Failed to fetch devices");
            return [];
        }
        const data = await res.json();
        return data.devices as Device[];
    } catch (error: any) {
        if (error?.digest?.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        console.error("Error fetching devices:", error);
        return [];
    }
}

export default async function DevicesPage() {
    const devices = await getDevices();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {devices.map((device) => (
                    <Link
                        key={device._id}
                        href={`/devices/${device._id}`}
                        className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                    <Cpu className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{device.device.name || "Unnamed Device"}</h3>
                                    <p className="text-sm text-gray-500">ID: {device._id}</p>
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="mt-4 border-t pt-4">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Sensors: {device.sensors.length}</span>
                                <span>Actuators: {Object.keys(device.actuators).length}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
