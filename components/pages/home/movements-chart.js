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
import { useT } from "../../shell/preferences";
import { useFormat } from "../../ui/format";

// Containers received per day in pre-storage and in final storage. The bars are
// decorative for screen readers; the totals above the chart carry the numbers.
export default function MovementsChart({ movements }) {
  const t = useT();
  const format = useFormat();
  const short = movements.days <= 7;
  const data = movements.series.map((row) => ({
    ...row,
    label: format.day(row.date, short),
  }));
  return (
    <div aria-hidden="true" className="h-60 w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
          barGap={3}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--color-base-content)"
            strokeOpacity={0.1}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={short ? 0 : "preserveStartEnd"}
            tick={{ fill: "var(--color-base-content)", fillOpacity: 0.7 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-base-content)", fillOpacity: 0.6 }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-base-content)", fillOpacity: 0.06 }}
            contentStyle={{
              background: "var(--color-base-200)",
              border:
                "1px solid color-mix(in oklab, var(--color-base-content) 15%, transparent)",
              borderRadius: 12,
              color: "var(--color-base-content)",
            }}
            labelStyle={{ color: "var(--color-base-content)", fontWeight: 600 }}
          />
          <Bar
            name={t("movements.received")}
            dataKey="received"
            fill="var(--color-step-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
          <Bar
            name={t("movements.final")}
            dataKey="final"
            fill="var(--color-step-3)"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
