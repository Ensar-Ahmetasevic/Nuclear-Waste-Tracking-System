"use client";
import PageHeader from "../../ui/page-header";
import { useDefinitionText } from "./definition-text";

// Frame of the setup pages: what the area needs, numbered, then the managers.
export default function SetupPage({
  scene,
  tone,
  position,
  eyebrow,
  title,
  description,
  kinds,
  status,
  children,
}) {
  const { t, kind } = useDefinitionText();
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        scene={scene}
        tone={tone}
        position={position}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <section
        aria-labelledby="setup-needs-title"
        className="space-y-4 rounded-box border border-base-content/10 bg-base-100 p-5"
      >
        <h2 id="setup-needs-title" className="font-semibold">
          {t("setup.needs", { count: kinds.length })}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {kinds.map((value, index) => (
            <li
              key={value}
              className="flex items-center gap-3 rounded-xl bg-base-200/70 px-3 py-2.5"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
                {index + 1}
              </span>
              <span className="font-medium">{kind(value)}</span>
            </li>
          ))}
        </ol>
        {status}
      </section>
      {children}
    </main>
  );
}
