"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fill: "var(--color-base-content)", fillOpacity: 0.7 };
const tooltip = {
  contentStyle: {
    background: "var(--color-base-200)",
    border:
      "1px solid color-mix(in oklab, var(--color-base-content) 15%, transparent)",
    borderRadius: 12,
    color: "var(--color-base-content)",
  },
  labelStyle: { color: "var(--color-base-content)", fontWeight: 600 },
  cursor: { fill: "var(--color-base-content)", fillOpacity: 0.06 },
};

// Bar chart for the statistics page. The figures are also given as text or in a
// table next to each chart, so the chart itself is hidden from screen readers.
export default function StatsBarChart({
  data,
  xKey,
  series,
  stacked = false,
  height = "h-64",
}) {
  return (
    <div aria-hidden="true" className={`${height} w-full text-xs`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
          barGap={2}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-base-content)"
            strokeOpacity={0.1}
          />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={axis}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={axis}
          />
          <Tooltip {...tooltip} />
          {series.map((item, index) => (
            <Bar
              key={item.key}
              name={item.label}
              dataKey={item.key}
              fill={item.color}
              stackId={stacked ? "total" : undefined}
              radius={stacked && index < series.length - 1 ? 0 : [4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
