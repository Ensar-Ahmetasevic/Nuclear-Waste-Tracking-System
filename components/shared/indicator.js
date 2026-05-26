export default function Indicator({ color }) {
  return (
    <div className="relative inline-flex h-4 w-4">
      <span
        className={`absolute inline-flex h-3 w-3 animate-ping rounded-full ${color} opacity-75 `}
      ></span>
      <span
        className={`relative inline-flex h-3 w-3 rounded-full ${color}`}
      ></span>
    </div>
  );
}
