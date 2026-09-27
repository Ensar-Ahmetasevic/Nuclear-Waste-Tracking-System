"use client";
import { useT } from "../shell/preferences";
import { useFormat } from "./format";

const W = 720,
  H = 260,
  LEFT = 48,
  RIGHT = 16,
  TOP = 14,
  BOTTOM = 30;
const DOT = {
  danger: "fill-error",
  warning: "fill-warning",
  optimal: "fill-success",
  unknown: "fill-base-content/40",
};

// Recorded values of one parameter against the range of the rule: the danger
// zones are tinted, the range and danger bounds are dashed lines, the moment the
// alert opened is marked. Points are only drawn where a measurement exists and
// the line only connects recorded values. The table below is the text version.
export default function MeasurementChart({
  series,
  rule = {},
  unit,
  from,
  openedAt,
  label,
}) {
  const t = useT();
  const format = useFormat();
  const values = series.map((row) => row.value).filter(Number.isFinite);
  const dataLow = values.length ? Math.min(...values) : 0;
  const dataHigh = values.length ? Math.max(...values) : 1;
  const reach = Math.max(dataHigh - dataLow, Math.abs(dataHigh) * 0.2, 1);
  // Only bounds near the recorded values set the scale; farther ones are
  // listed under the chart instead of squeezing the values into a thin band.
  const BOUNDS = ["upperDanger", "upperWarning", "lowerWarning", "lowerDanger"];
  const shown = BOUNDS.filter(
    (key) =>
      rule[key] != null &&
      rule[key] >= dataLow - reach * 0.8 &&
      rule[key] <= dataHigh + reach * 0.8,
  );
  const hidden = BOUNDS.filter(
    (key) => rule[key] != null && !shown.includes(key),
  );
  const scale = [...values, ...shown.map((key) => rule[key])];
  const low = scale.length ? Math.min(...scale) : 0;
  const high = scale.length ? Math.max(...scale) : 1;
  // Round tick values: 1, 2 or 5 times a power of ten.
  const raw = (high - low || 1) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 5, 10]
      .map((factor) => factor * power)
      .find((value) => value >= raw) || raw;
  const min = Math.floor((low - step * 0.3) / step) * step,
    max = Math.ceil((high + step * 0.3) / step) * step;
  const start = new Date(from).getTime();
  const end = Math.max(
    Date.now(),
    ...series.map((row) => new Date(row.at).getTime()),
  );
  const x = (time) =>
    LEFT +
    ((new Date(time).getTime() - start) / (end - start || 1)) *
      (W - LEFT - RIGHT);
  const y = (value) => TOP + ((max - value) / (max - min)) * (H - TOP - BOTTOM);
  const clampY = (value) => Math.min(H - BOTTOM, Math.max(TOP, y(value)));
  const ticks = [];
  for (let value = min; value <= max + step / 2; value += step)
    ticks.push(Number(value.toFixed(6)));
  // One tick per local midnight inside the period.
  const days = [];
  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  for (let day = midnight; day.getTime() <= end; day = new Date(day)) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  const localDate = (day) =>
    `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const line = series
    .filter((row) => Number.isFinite(row.value))
    .map((row) => `${x(row.at).toFixed(1)},${y(row.value).toFixed(1)}`)
    .join(" ");
  const last = series.at(-1);
  const summary = last
    ? t("chart.summary", {
        label,
        count: series.length,
        value: `${format.measure(last.value)} ${unit}`,
        time: format.dateTime(last.at),
        level: t(`records.level.${last.level}`),
      })
    : t("chart.empty");
  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full overflow-visible"
      >
        {rule.upperDanger != null && (
          <rect
            x={LEFT}
            y={TOP}
            width={W - LEFT - RIGHT}
            height={Math.max(0, clampY(rule.upperDanger) - TOP)}
            className="fill-error/10"
          />
        )}
        {rule.lowerDanger != null && (
          <rect
            x={LEFT}
            y={clampY(rule.lowerDanger)}
            width={W - LEFT - RIGHT}
            height={Math.max(0, H - BOTTOM - clampY(rule.lowerDanger))}
            className="fill-error/10"
          />
        )}
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={LEFT}
              x2={W - RIGHT}
              y1={y(value)}
              y2={y(value)}
              className="stroke-base-content/10"
            />
            <text
              x={LEFT - 8}
              y={y(value) + 4}
              textAnchor="end"
              className="fill-base-content/60 text-[11px]"
            >
              {format.measure(value)}
            </text>
          </g>
        ))}
        {days.map((day) => (
          <g key={day.toISOString()}>
            <line
              x1={x(day)}
              x2={x(day)}
              y1={H - BOTTOM}
              y2={H - BOTTOM + 4}
              className="stroke-base-content/30"
            />
            <text
              x={x(day)}
              y={H - 8}
              textAnchor="middle"
              className="fill-base-content/60 text-[11px]"
            >
              {format.day(localDate(day))}
            </text>
          </g>
        ))}
        {[
          ["upperDanger", "stroke-error", "6 5"],
          ["lowerDanger", "stroke-error", "6 5"],
          ["upperWarning", "stroke-warning", "3 5"],
          ["lowerWarning", "stroke-warning", "3 5"],
        ]
          .filter(([key]) => shown.includes(key))
          .map(([key, stroke, dash]) => (
            <g key={key}>
              <line
                x1={LEFT}
                x2={W - RIGHT}
                y1={y(rule[key])}
                y2={y(rule[key])}
                className={stroke}
                strokeWidth="1.5"
                strokeDasharray={dash}
              />
              <text
                x={LEFT + 6}
                y={y(rule[key]) + (key.endsWith("Danger") ? -5 : 13)}
                textAnchor="start"
                className={`text-[11px] ${key.endsWith("Danger") ? "fill-error" : "fill-warning"}`}
              >
                {t(`chart.bound.${key}`, {
                  value: `${format.measure(rule[key])} ${unit}`,
                })}
              </text>
            </g>
          ))}
        {openedAt && new Date(openedAt).getTime() >= start && (
          <g>
            <line
              x1={x(openedAt)}
              x2={x(openedAt)}
              y1={TOP}
              y2={H - BOTTOM}
              className="stroke-error/70"
              strokeDasharray="2 4"
            />
            <text
              x={x(openedAt) - 6}
              y={TOP + 12}
              textAnchor="end"
              className="fill-error text-[11px] font-semibold"
            >
              {t("chart.opened")}
            </text>
          </g>
        )}
        {line && (
          <polyline
            points={line}
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {series
          .filter((row) => Number.isFinite(row.value))
          .map((row) => (
            <circle
              key={row.id}
              cx={x(row.at)}
              cy={y(row.value)}
              r={row === last ? 6 : 3.5}
              className={`${DOT[row.level] || DOT.unknown} stroke-base-100`}
              strokeWidth={row === last ? 3 : 1.5}
            />
          ))}
      </svg>
      <figcaption className="space-y-1 text-xs text-base-content/65">
        <span className="block">{t("chart.caption")}</span>
        {hidden.length > 0 && (
          <span className="block">
            {t("chart.hidden", {
              bounds: hidden
                .map((key) =>
                  t(`chart.bound.${key}`, {
                    value: `${format.measure(rule[key])} ${unit}`,
                  }),
                )
                .join(" · "),
            })}
          </span>
        )}
      </figcaption>
      <details className="rounded-xl border border-base-content/10 px-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm">
          {t("chart.table", { count: series.length })}
        </summary>
        <div className="max-h-72 overflow-y-auto pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-base-content/65">
                <th scope="col" className="py-1.5 font-medium">
                  {t("chart.col.time")}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {t("chart.col.value", { unit })}
                </th>
                <th scope="col" className="py-1.5 pl-4 font-medium">
                  {t("chart.col.level")}
                </th>
                <th scope="col" className="py-1.5 pl-4 font-medium">
                  {t("chart.col.record")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-content/10">
              {[...series].reverse().map((row) => (
                <tr key={row.id}>
                  <td className="py-1.5">{format.dateTime(row.at)}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {format.measure(row.value)}
                  </td>
                  <td className="py-1.5 pl-4">
                    {t(`records.level.${row.level}`)}
                  </td>
                  <td className="py-1.5 pl-4 font-mono text-xs">
                    {t("alert.measurementRef", { id: row.id })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
