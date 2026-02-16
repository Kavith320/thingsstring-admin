"use client";

import { useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Brush,
} from "recharts";
import { Calendar, Maximize2, Minimize2 } from "lucide-react";

/* -------- Types -------- */
interface TelemetryPoint {
    _id?: string;
    updatedAt?: string;
    createdAt?: string;
    ts?: string;
    timestamp?: string;
    [key: string]: any;
}

interface TelemetryGraphProps {
    history?: TelemetryPoint[];
    timeFrameHours?: number;
}

/* -------- Time Frame Options -------- */
const TIME_FRAMES = [
    { label: "1H", hours: 1 },
    { label: "6H", hours: 6 },
    { label: "12H", hours: 12 },
    { label: "24H", hours: 24 },
    { label: "3D", hours: 72 },
    { label: "7D", hours: 168 },
    { label: "All", hours: Infinity },
];

/* -------- Color Palette for Multiple Sensors -------- */
const SENSOR_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
];

/* -------- Custom Tooltip -------- */
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
            <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
            <div className="space-y-1">
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <span className="text-xs font-medium" style={{ color: entry.color }}>
                            {entry.name}:
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                            {typeof entry.value === "number" ? entry.value.toFixed(2) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* -------- Main Component -------- */
export default function TelemetryGraph({ history = [], timeFrameHours = 1 }: TelemetryGraphProps) {
    const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrameHours);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedSensors, setSelectedSensors] = useState<string[]>([]);

    // Sensor key mapping (abbreviated to readable names)
    const SENSOR_KEY_MAP: Record<string, string> = {
        t: "Temperature",
        h: "Humidity",
        n: "Nitrogen (N)",
        p: "Phosphorus (P)",
        k: "Potassium (K)",
        ph: "pH",
        ec: "EC",
        vb: "Battery Voltage",
        rssi: "Signal Strength",
    };

    // Extract timestamp from MongoDB ObjectId
    const extractTimestampFromId = (id: string): Date | null => {
        try {
            if (id && id.length === 24) {
                const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
                return new Date(timestamp);
            }
        } catch (e) {
            // Ignore
        }
        return null;
    };

    // Process and filter telemetry data
    const { chartData, availableSensors } = useMemo(() => {
        if (!history || history.length === 0) {
            return { chartData: [], availableSensors: [] };
        }

        // Filter by time frame
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - selectedTimeFrame * 60 * 60 * 1000);

        const filtered = history.filter((point) => {
            let timestamp = point.ts || point.timestamp || point.createdAt || point.updatedAt;

            // If no timestamp, try to extract from MongoDB _id
            if (!timestamp && point._id) {
                const extractedTime = extractTimestampFromId(point._id);
                if (extractedTime) {
                    timestamp = extractedTime.toISOString();
                }
            }

            if (!timestamp) return false;
            const pointTime = new Date(timestamp);
            return selectedTimeFrame === Infinity || pointTime >= cutoffTime;
        });

        // Sort by timestamp (oldest first)
        const sorted = [...filtered].sort((a, b) => {
            let timeA = a.ts || a.timestamp || a.createdAt || a.updatedAt;
            let timeB = b.ts || b.timestamp || b.createdAt || b.updatedAt;

            // Extract from _id if needed
            if (!timeA && a._id) timeA = extractTimestampFromId(a._id)?.toISOString();
            if (!timeB && b._id) timeB = extractTimestampFromId(b._id)?.toISOString();

            return new Date(timeA || 0).getTime() - new Date(timeB || 0).getTime();
        });

        // Extract sensor keys (exclude metadata fields)
        const excludeKeys = ["_id", "updatedAt", "createdAt", "ts", "timestamp", "__v", "deviceId", "id", "up", "fw"];
        const sensorKeys = new Set<string>();

        sorted.forEach((point) => {
            Object.keys(point).forEach((key) => {
                if (!excludeKeys.includes(key) && typeof point[key] === "number") {
                    sensorKeys.add(key);
                }
            });
        });

        const sensors = Array.from(sensorKeys);

        // Format data for recharts
        const data = sorted.map((point) => {
            let timestamp = point.ts || point.timestamp || point.createdAt || point.updatedAt;

            // Extract from _id if needed
            if (!timestamp && point._id) {
                const extractedTime = extractTimestampFromId(point._id);
                if (extractedTime) {
                    timestamp = extractedTime.toISOString();
                }
            }

            const formattedTime = timestamp
                ? new Date(timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : "Unknown";

            const dataPoint: any = { time: formattedTime };
            sensors.forEach((sensor) => {
                // Use mapped name if available, otherwise use original key
                const displayName = SENSOR_KEY_MAP[sensor] || sensor;
                dataPoint[displayName] = point[sensor];
            });
            return dataPoint;
        });

        // Map sensor keys to display names
        const displaySensors = sensors.map(key => SENSOR_KEY_MAP[key] || key);

        return { chartData: data, availableSensors: displaySensors };
    }, [history, selectedTimeFrame]);

    // Initialize selected sensors (select first 4 by default)
    useMemo(() => {
        if (availableSensors.length > 0 && selectedSensors.length === 0) {
            setSelectedSensors(availableSensors.slice(0, 4));
        }
    }, [availableSensors, selectedSensors.length]);

    // Toggle sensor selection
    const toggleSensor = (sensor: string) => {
        setSelectedSensors((prev) =>
            prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
        );
    };

    if (!history || history.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <p className="text-gray-500">No telemetry data available</p>
            </div>
        );
    }

    return (
        <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-white p-8" : ""}`}>
            <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Time Frame Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                            {TIME_FRAMES.map((tf) => (
                                <button
                                    key={tf.label}
                                    onClick={() => setSelectedTimeFrame(tf.hours)}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${selectedTimeFrame === tf.hours
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-5 w-5 text-gray-600" />
                        ) : (
                            <Maximize2 className="h-5 w-5 text-gray-600" />
                        )}
                    </button>
                </div>

                {/* Sensor Selection */}
                {availableSensors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {availableSensors.map((sensor, index) => {
                            const isSelected = selectedSensors.includes(sensor);
                            const color = SENSOR_COLORS[index % SENSOR_COLORS.length];
                            return (
                                <button
                                    key={sensor}
                                    onClick={() => toggleSensor(sensor)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${isSelected
                                        ? "shadow-sm"
                                        : "opacity-50 hover:opacity-75"
                                        }`}
                                    style={{
                                        borderColor: color,
                                        backgroundColor: isSelected ? color : "transparent",
                                        color: isSelected ? "white" : color,
                                    }}
                                >
                                    {sensor}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Chart */}
                <div className={`${isFullscreen ? "h-[calc(100vh-200px)]" : "h-96"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                                stroke="#6b7280"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ paddingTop: "20px" }}
                                iconType="line"
                            />
                            {selectedSensors.map((sensor, index) => (
                                <Line
                                    key={sensor}
                                    type="monotone"
                                    dataKey={sensor}
                                    stroke={SENSOR_COLORS[availableSensors.indexOf(sensor) % SENSOR_COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    name={sensor}
                                />
                            ))}
                            {chartData.length > 50 && (
                                <Brush
                                    dataKey="time"
                                    height={30}
                                    stroke="#3b82f6"
                                    fill="#eff6ff"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>{chartData.length} data points</span>
                    <span>{selectedSensors.length} of {availableSensors.length} sensors displayed</span>
                </div>
            </div>
        </div>
    );
}
