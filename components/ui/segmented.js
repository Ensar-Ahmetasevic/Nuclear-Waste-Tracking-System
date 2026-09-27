"use client";
// Small set of mutually exclusive options (period, filter).
export default function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-field border border-base-content/10 bg-base-200 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`operational-control min-h-9 rounded-lg px-3 text-sm ${
            option.value === value
              ? "bg-base-100 font-semibold shadow-sm"
              : "text-base-content/70 hover:text-base-content"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
