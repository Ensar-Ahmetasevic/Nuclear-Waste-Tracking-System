// Placeholder while data loads; hidden from assistive technology.
export default function Skeleton({ className = "h-24" }) {
  return <div aria-hidden="true" className={`nwts-skeleton rounded-box ${className}`} />;
}
