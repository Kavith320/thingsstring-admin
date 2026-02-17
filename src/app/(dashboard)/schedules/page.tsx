
import { SchedulesTable } from "@/components/SchedulesTable";
import { fetchWithAuth } from "@/lib/api";

export const dynamic = "force-dynamic";

type Schedule = {
    _id: string;
    name: string;
    device_id: string;
    schedule: string;
    active: boolean;
};

async function getSchedules() {
    try {
        const res = await fetchWithAuth("/api/admin/schedules", { next: { revalidate: 60 } });
        if (!res.ok) {
            console.error("Failed to fetch schedules");
            return [];
        }
        const data = await res.json();
        return data.schedules as Schedule[];
    } catch (error: any) {
        if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.digest === "DYNAMIC_SERVER_USAGE") {
            throw error;
        }
        console.error("Error fetching schedules:", error);
        return [];
    }
}

export default async function SchedulesPage() {
    const schedules = await getSchedules();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <SchedulesTable schedules={schedules} />
            </div>
        </div>
    );
}
