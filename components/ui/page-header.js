import SceneHeader from "./scene";

// Page title block. With `scene` the header sits on a photo of that part of the
// site (hub pages); without it, it stays a plain heading (detail and admin pages).
export default function PageHeader({
  scene,
  tone,
  position,
  eyebrow,
  title,
  description,
  actions,
  children,
  footer,
}) {
  if (scene)
    return (
      <SceneHeader
        scene={scene}
        tone={tone}
        position={position}
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        footer={footer}
      >
        {children}
      </SceneHeader>
    );
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="text-sm text-base-content/60">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && <p className="text-base-content/75">{description}</p>}
      </div>
      {actions}
      {children}
    </header>
  );
}
