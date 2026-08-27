"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { Radio, AlertOctagon, CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";

export default function BroadcastPage() {
    const [actuatorsJson, setActuatorsJson] = useState<string>(
        JSON.stringify({ light: { status: false }, main_relay: { status: false } }, null, 2)
    );
    const [filterJson, setFilterJson] = useState<string>("{}");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleConfirmBroadcast = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        setResult(null);

        try {
            const actuators = JSON.parse(actuatorsJson);
            const filter = JSON.parse(filterJson || "{}");

            const res = await fetchClient("/api/admin/broadcast/control", {
                method: "POST",
                body: JSON.stringify({ actuators, filter }),
            });

            const data = await res.json();

            if (res.ok && data.ok) {
                setResult(data.message || "Broadcast control message sent to MQTT broker successfully.");
            } else {
                setResult(`Error: ${data.message || data.error || "Broadcast command failed"}`);
            }
        } catch (err: any) {
            console.error("Broadcast error:", err);
            setResult(`Error: ${err.message || "Invalid JSON or network error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Radio className="h-6 w-6 text-red-600 animate-pulse" />
                    Emergency Mass Broadcast Control
                </h1>
                <p className="text-sm text-gray-500">
                    Broadcast retained MQTT control messages across ALL devices or a targeted group simultaneously
                </p>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-xs text-red-800 space-y-1">
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldAlert className="h-4 w-4 text-red-600" />
                    High Impact Administrative Command
                </div>
                <p>
                    Executing this operation publishes control payloads to MQTT topics matching target devices immediately. Use with caution.
                </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow space-y-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Actuators Control Payload (JSON):
                    </label>
                    <textarea
                        rows={6}
                        value={actuatorsJson}
                        onChange={(e) => setActuatorsJson(e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-3 font-mono text-xs text-gray-900 focus:border-red-500 focus:outline-none"
                        placeholder='{ "light": { "status": false } }'
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Device Filter Query (Optional MongoDB Filter JSON):
                    </label>
                    <textarea
                        rows={3}
                        value={filterJson}
                        onChange={(e) => setFilterJson(e.target.value)}
                        className="w-full rounded-md border border-gray-300 p-3 font-mono text-xs text-gray-900 focus:border-red-500 focus:outline-none"
                        placeholder='{} or { "model": "HUB_V1" }'
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave as `{}` to target all registered devices.</p>
                </div>

                {result && (
                    <div className={`p-4 rounded text-xs flex items-center gap-2 ${
                        result.startsWith("Error:") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                        {result.startsWith("Error:") ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        <span>{result}</span>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                    >
                        <AlertOctagon className="h-4 w-4" />
                        {loading ? "Broadcasting..." : "Broadcast Emergency Command"}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-lg border-b pb-2">
                            <AlertOctagon className="h-6 w-6" />
                            Confirm Emergency Broadcast
                        </div>

                        <p className="text-sm text-gray-700">
                            You are about to issue a mass broadcast control command to MQTT topics across all matching devices.
                        </p>

                        <div className="rounded bg-gray-50 p-3 font-mono text-xs text-gray-800 overflow-x-auto max-h-40">
                            <strong>Payload:</strong>
                            <pre>{actuatorsJson}</pre>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmBroadcast}
                                className="rounded-md bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                            >
                                Yes, Broadcast Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
