import { Users, Cpu, FileText, Calendar } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import SystemActivityGraph from "@/components/SystemActivityGraph";

export const dynamic = "force-dynamic";

type Stats = {
    users: number;
    devices: number;
    telemetry_records: number;
    schedules: number;
};

async function getStats() {
    try {
        const res = await fetchWithAuth("/api/admin/stats", { next: { revalidate: 30 } });
        if (!res.ok) {
            console.error("Failed to fetch stats:", res.status, res.statusText);
            // Fallback or rethrow
            return {
                users: 0, devices: 0, telemetry_records: 0, schedules: 0
            };
        }
        const data = await res.json();
        return data.stats as Stats;

    } catch (error: any) {
        if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.digest === "DYNAMIC_SERVER_USAGE") {
            throw error;
        }
        console.error("Error fetching stats:", error);
        return { users: 0, devices: 0, telemetry_records: 0, schedules: 0 };
    }
}

export default async function DashboardPage() {
    const stats = await getStats();

    const cards = [
        { name: "Total Users", value: stats.users, icon: Users, color: "bg-blue-500" },
        { name: "Total Devices", value: stats.devices, icon: Cpu, color: "bg-green-500" },
        { name: "Telemetry Records", value: stats.telemetry_records, icon: FileText, color: "bg-yellow-500" },
        { name: "Active Schedules", value: stats.schedules, icon: Calendar, color: "bg-purple-500" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">System Overview</h1>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.name} className="overflow-hidden rounded-lg bg-white shadow hover:shadow-lg transition-shadow">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className={`rounded-md p-3 ${card.color}`}>
                                        <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="truncate text-sm font-medium text-gray-500">{card.name}</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{card.value}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4">System Activity</h2>
                <SystemActivityGraph />
            </div>
        </div>
    );
}
