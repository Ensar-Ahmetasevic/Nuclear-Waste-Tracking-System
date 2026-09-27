"use client";

import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import Segmented from "../../ui/segmented";
import DefinitionList from "./definition-list";
import DefinitionHistory from "./definition-history";
import DefinitionChangeDialog from "./definition-change-dialog";
import { useDefinitionText } from "./definition-text";

// Shared administrator view for configuration that other records refer to:
// current entries, recorded change history and a reviewed "Add new" flow.
export default function ConfigurationManager({ kinds }) {
  const { t, kind } = useDefinitionText();
  const [selected, setSelected] = useState(kinds[0]);
  const [view, setView] = useState("list");
  const [creating, setCreating] = useState(false);
  return (
    <section
      className="w-full min-w-0 space-y-5 rounded-box border border-base-content/10 bg-base-100 p-5"
      aria-label={t("setup.manage")}
    >
      <div
        role="group"
        aria-label={t("setup.choose")}
        className="flex flex-wrap gap-2"
      >
        {kinds.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            className={`btn min-h-11 ${selected === value ? "btn-primary" : "border-base-content/20 btn-ghost"}`}
            onClick={() => {
              setSelected(value);
              setView("list");
            }}
          >
            {kind(value)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-base-content/10 pt-4">
        <h2 className="text-lg font-semibold">{kind(selected)}</h2>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label={t("setup.view")}
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: t("setup.entries") },
              { value: "history", label: t("setup.history") },
            ]}
          />
          <button
            type="button"
            className="btn min-h-11 btn-primary"
            onClick={() => setCreating(true)}
          >
            <LuPlus className="size-4.5" aria-hidden="true" />
            {t("setup.add", { kind: kind(selected) })}
          </button>
        </div>
      </div>
      {view === "list" ? (
        <DefinitionList key={selected} kind={selected} />
      ) : (
        <DefinitionHistory key={selected} kind={selected} />
      )}
      {creating && (
        <DefinitionChangeDialog
          kind={selected}
          action="CREATE"
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}
