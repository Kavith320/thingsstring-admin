import { fetchWithAuth } from "@/lib/api";
import { Activity, Database, Cpu, HardDrive, Radio, CheckCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

type HealthData = {
    status?: string;
    uptimeSeconds?: number;
    memory?: {
        rssMB?: number;
        heapUsedMB?: number;
        heapTotalMB?: number;
    };
    mongo?: {
        connected?: boolean;
        dataSizeMB?: number;
        storageSizeMB?: number;
        collections?: number;
        objectsCount?: number;
    };
    mqtt?: {
        connected?: boolean;
    };
};

async function getSystemHealth(): Promise<HealthData | null> {
    try {
        const res = await fetchWithAuth("/api/admin/health", { cache: "no-store" });
        if (!res.ok) {
            console.error(`Failed to fetch health stats: ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.health || data;
    } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        console.error("Error fetching system health:", err);
        return null;
    }
}

function formatUptime(seconds?: number): string {
    if (!seconds) return "N/A";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ""}${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}

export default async function HealthPage() {
    const health = await getSystemHealth();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Health & Infrastructure Diagnostics</h1>
                    <p className="text-sm text-gray-500">Real-time status of Node.js process, MongoDB, and MQTT broker</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        health?.status === "healthy" || health?.mongo?.connected
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                    }`}>
                        {health?.status === "healthy" || health?.mongo?.connected ? (
                            <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Operational
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                Warning / Degraded
                            </>
                        )}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Node Uptime */}
                <div className="rounded-lg bg-white p-5 shadow">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-blue-100 p-3 text-blue-600">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Node.js Process Uptime</p>
                            <p className="text-lg font-bold text-gray-900">{formatUptime(health?.uptimeSeconds)}</p>
                        </div>
                    </div>
                </div>

                {/* Process Memory */}
                <div className="rounded-lg bg-white p-5 shadow">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-purple-100 p-3 text-purple-600">
                            <Cpu className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">Heap Memory Used</p>
                            <p className="text-lg font-bold text-gray-900">
                                {health?.memory?.heapUsedMB !== undefined ? `${health.memory.heapUsedMB} MB` : "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                                RSS: {health?.memory?.rssMB ?? "N/A"} MB / Total: {health?.memory?.heapTotalMB ?? "N/A"} MB
                            </p>
                        </div>
                    </div>
                </div>

                {/* Database Health */}
                <div className="rounded-lg bg-white p-5 shadow">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-emerald-100 p-3 text-emerald-600">
                            <Database className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">MongoDB Database</p>
                            <p className="text-lg font-bold text-gray-900">
                                {health?.mongo?.connected ? "Connected" : "Disconnected"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {health?.mongo?.collections ?? 0} collections ({health?.mongo?.objectsCount ?? 0} docs)
                            </p>
                        </div>
                    </div>
                </div>

                {/* MQTT Health */}
                <div className="rounded-lg bg-white p-5 shadow">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-amber-100 p-3 text-amber-600">
                            <Radio className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">MQTT Broker</p>
                            <p className="text-lg font-bold text-gray-900">
                                {health?.mqtt?.connected ? "Connected" : "Disconnected"}
                            </p>
                            <p className="text-xs text-gray-500">Retained Messaging active</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comprehensive Metrics Breakdown */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
                <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Detailed Infrastructure Metrics</h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Database className="h-4 w-4 text-emerald-600" />
                            Database Storage Stats
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                                <span>Data Size:</span>
                                <span className="font-medium">{health?.mongo?.dataSizeMB ?? 0} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Storage Size:</span>
                                <span className="font-medium">{health?.mongo?.storageSizeMB ?? 0} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Collections:</span>
                                <span className="font-medium">{health?.mongo?.collections ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Document Objects:</span>
                                <span className="font-medium">{health?.mongo?.objectsCount ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-purple-600" />
                            Memory & Resource Utilization
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                                <span>Resident Set Size (RSS):</span>
                                <span className="font-medium">{health?.memory?.rssMB ?? 0} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Heap Total:</span>
                                <span className="font-medium">{health?.memory?.heapTotalMB ?? 0} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Heap Used:</span>
                                <span className="font-medium">{health?.memory?.heapUsedMB ?? 0} MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Node.js Environment:</span>
                                <span className="font-medium">{process.env.NODE_ENV || "production"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
