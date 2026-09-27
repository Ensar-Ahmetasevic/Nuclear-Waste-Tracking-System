"use client";
import { usePreferences } from "../shell/preferences";

const TAGS = { en: "en-GB", de: "de-DE" };

// Numbers, dates and waiting times in the interface language.
export function useFormat() {
  const { locale } = usePreferences();
  const tag = TAGS[locale] || TAGS.en;
  const number = (value) => new Intl.NumberFormat(tag).format(value ?? 0);
  const decimal = (value) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(value ?? 0);
  // Measured values as recorded: radiation needs more than one decimal
  // (0.08 µSv/h must not read as 0.1).
  const measure = (value) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: 3 }).format(value ?? 0);
  // Fully numeric in every language: 27.09.2026, 12:00.
  const dateTime = (value) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat(tag, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(value))
        .map((part) => [part.type, part.value]),
    );
    return `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`;
  };
  const time = (value) =>
    new Intl.DateTimeFormat(tag, { timeStyle: "short" }).format(
      new Date(value),
    );
  const longDate = (value) =>
    new Intl.DateTimeFormat(tag, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  const day = (isoDate, long) =>
    new Intl.DateTimeFormat(
      tag,
      long ? { weekday: "short" } : { day: "numeric", month: "numeric" },
    ).format(new Date(`${isoDate}T12:00:00Z`));
  // Largest whole unit of the time since `value`: minutes, hours or days.
  const age = (value, now = Date.now()) => {
    const minutes = Math.max(
      0,
      Math.round((now - new Date(value).getTime()) / 60000),
    );
    const [amount, unit] =
      minutes < 60
        ? [minutes, "minute"]
        : minutes < 2880
          ? [Math.round(minutes / 60), "hour"]
          : [Math.round(minutes / 1440), "day"];
    return new Intl.NumberFormat(tag, {
      style: "unit",
      unit,
      unitDisplay: "short",
    }).format(amount);
  };
  return { tag, number, decimal, measure, dateTime, time, longDate, day, age };
}
