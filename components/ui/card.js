// Surface for one block of content. `as="section"` with a CardHeader id gives the
// block an accessible name.
export function Card({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag
      className={`rounded-box border border-base-content/10 bg-base-100 p-5 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ id, title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 ${className}`}
    >
      <div className="min-w-0 space-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-base-content/70">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
