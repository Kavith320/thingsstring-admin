"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { Database, Trash2, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

export default function MaintenancePage() {
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupResult, setBackupResult] = useState<string | null>(null);

    const [daysToKeep, setDaysToKeep] = useState<number>(30);
    const [cleanLoading, setCleanLoading] = useState(false);
    const [cleanResult, setCleanResult] = useState<string | null>(null);

    const handleTriggerBackup = async () => {
        if (!confirm("Are you sure you want to trigger an on-demand database backup?")) return;

        setBackupLoading(true);
        setBackupResult(null);

        try {
            const res = await fetchClient("/api/admin/maintenance/backup", {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok && data.ok) {
                setBackupResult(data.message || "Database dump completed successfully.");
            } else {
                setBackupResult(`Error: ${data.message || data.error || "Backup failed"}`);
            }
        } catch (err: any) {
            console.error("Backup error:", err);
            setBackupResult(`Error: ${err.message || "Request failed"}`);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleCleanTelemetry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(`Are you sure you want to purge telemetry data older than ${daysToKeep} days? This cannot be undone.`)) return;

        setCleanLoading(true);
        setCleanResult(null);

        try {
            const res = await fetchClient("/api/admin/maintenance/clean-telemetry", {
                method: "POST",
                body: JSON.stringify({ daysToKeep: Number(daysToKeep) }),
            });
            const data = await res.json();

            if (res.ok && data.ok) {
                setCleanResult(data.message || `Telemetry records older than ${daysToKeep} days purged.`);
            } else {
                setCleanResult(`Error: ${data.message || data.error || "Telemetry cleanup failed"}`);
            }
        } catch (err: any) {
            console.error("Cleanup error:", err);
            setCleanResult(`Error: ${err.message || "Request failed"}`);
        } finally {
            setCleanLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Operations & Maintenance</h1>
                <p className="text-sm text-gray-500">Run manual maintenance jobs, system backups, and database cleanups</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* On-Demand Database Backup */}
                <div className="rounded-lg bg-white p-6 shadow space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                        <Database className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-medium text-gray-900">Database Backup</h2>
                    </div>

                    <p className="text-sm text-gray-600">
                        Trigger an immediate full MongoDB dump backup of all collections (`users`, `device_config`, `device_telemetry`, `schedules`, `automation_flows`).
                    </p>

                    {backupResult && (
                        <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                            backupResult.startsWith("Error:") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                        }`}>
                            {backupResult.startsWith("Error:") ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            <span>{backupResult}</span>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleTriggerBackup}
                            disabled={backupLoading}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Database className="h-4 w-4" />
                            {backupLoading ? "Creating Backup..." : "Run Database Backup Now"}
                        </button>
                    </div>
                </div>

                {/* Telemetry Cleanup */}
                <div className="rounded-lg bg-white p-6 shadow space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        <h2 className="text-lg font-medium text-gray-900">Purge Telemetry History</h2>
                    </div>

                    <p className="text-sm text-gray-600">
                        Purge historical sensor telemetry data older than the specified threshold to reduce MongoDB storage usage.
                    </p>

                    <form onSubmit={handleCleanTelemetry} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Keep Data From Last (Days):</label>
                            <input
                                type="number"
                                min={1}
                                max={365}
                                required
                                value={daysToKeep}
                                onChange={(e) => setDaysToKeep(Number(e.target.value))}
                                className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        {cleanResult && (
                            <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                                cleanResult.startsWith("Error:") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                            }`}>
                                {cleanResult.startsWith("Error:") ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                <span>{cleanResult}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={cleanLoading}
                                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {cleanLoading ? "Cleaning..." : "Purge Telemetry"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
