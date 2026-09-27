export default function EmptyState({ children, className = "" }) {
  return (
    <p
      className={`rounded-xl border border-dashed border-base-content/20 px-4 py-6 text-center text-sm text-base-content/70 ${className}`}
    >
      {children}
    </p>
  );
}
