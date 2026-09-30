"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEFINITIONS, DEFINITION_TEXT_LIMIT } from "@/lib/definitions";
import useContainerTypeQuery from "@/requests/request-container-profile/request-container-type/use-fetch-container-type-query";
import { useDefinitionText } from "./definition-text";
import { InlineLoader } from "../../loading/loaders";
import { ButtonSpinner } from "../../loading/spinner";
import { ProofreadPrompt, useProofread } from "../../ui/proofread";

// Normalized field value as the server compares and records it.
const fieldValue = (field, value) =>
  value == null
    ? value
    : field.type === "date"
      ? String(value).slice(0, 10)
      : value;

// One dialog for every administrative definition change. The reviewed version
// and the confirmation key stay fixed until the result is known.
export default function DefinitionChangeDialog({ kind, action, row, onClose }) {
  const text = useDefinitionText();
  const { t, format } = text;
  const formatDefinitionValue = text.value;
  const definition = DEFINITIONS[kind];
  const [original] = useState(row || null);
  const editing = action === "CREATE" || action === "UPDATE";
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        original?.[field.key] == null
          ? ""
          : String(fieldValue(field, original[field.key])),
      ]),
    ),
  );
  const [errors, setErrors] = useState({});
  const [reason, setReason] = useState("");
  const proofread = useProofread();
  const [phase, setPhase] = useState(editing ? "edit" : "review");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const dialog = useRef(null),
    heading = useRef(null),
    inputs = useRef({}),
    payload = useRef(null),
    busy = useRef(false);
  const titleId = useId(),
    client = useQueryClient();
  const hasReference = definition.fields.some(
    (field) => field.type === "reference",
  );
  const types = useContainerTypeQuery({ enabled: hasReference });

  useEffect(() => {
    const node = dialog.current,
      trigger = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      requestAnimationFrame(() => {
        if (trigger?.isConnected && !trigger.disabled) trigger.focus();
        else document.getElementById("definition-list-heading")?.focus();
      });
    };
  }, []);
  useEffect(() => {
    if (phase === "edit") inputs.current[definition.fields[0].key]?.focus();
    else heading.current?.focus();
  }, [phase, definition]);

  const typeOptions = (types.data || []).filter(
    (type) =>
      type.id === original?.containerTypeId ||
      (!type.archivedAt &&
        (!type.usage?.wasteProfile ||
          type.usage.wasteProfile.id === original?.id)),
  );
  const typeName = (id) => types.data?.find((type) => type.id === id)?.name;
  const values = Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      field.type === "text" || field.type === "date"
        ? form[field.key].trim()
        : field.type === "boolean"
          ? form[field.key] === "true"
          : Number(form[field.key]),
    ]),
  );
  const afterSnapshot = {
    ...values,
    containerTypeName: typeName(values.containerTypeId),
  };
  const beforeSnapshot = original && {
    ...original,
    containerTypeName: original.containerType?.name,
  };
  const changedFields = definition.fields.filter(
    (field) =>
      !original || values[field.key] !== fieldValue(field, original[field.key]),
  );
  const reasonRequired = action !== "CREATE";
  const reasonValid =
    reason.trim().length <= 1000 &&
    (!reasonRequired || reason.trim().length >= 3);

  function validate(event) {
    event.preventDefault();
    const found = {};
    for (const field of definition.fields) {
      const value = form[field.key].trim();
      if (!value)
        found[field.key] = t("def.error.required", {
          field: text.field(field),
        });
      else if (
        field.type === "number" &&
        !(Number(value) > 0 && Number.isFinite(Number(value)))
      )
        found[field.key] = t("def.error.positive", {
          field: text.field(field),
        });
      else if (
        field.type === "integer" &&
        !(
          Number.isSafeInteger(Number(value)) &&
          Number(value) > 0 &&
          Number(value) <= 2147483647
        )
      )
        found[field.key] = t("def.error.whole", { field: text.field(field) });
      else if (
        field.type === "date" &&
        !(
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
        )
      )
        found[field.key] = t("def.error.date", { field: text.field(field) });
      else if (field.type === "text" && value.length > DEFINITION_TEXT_LIMIT)
        found[field.key] = t("def.error.length", {
          field: text.field(field),
          limit: DEFINITION_TEXT_LIMIT,
        });
    }
    if (
      !Object.keys(found).length &&
      action === "UPDATE" &&
      !changedFields.length
    )
      found.form = t("def.error.unchanged");
    setErrors(found);
    const first = definition.fields.find((field) => found[field.key]);
    if (first) {
      inputs.current[first.key]?.focus();
      return;
    }
    if (found.form) return;
    payload.current = null;
    setMessage("");
    setPhase("review");
  }

  function finish() {
    if (busy.current) return;
    if (result || ["conflict", "unknown"].includes(phase)) {
      // Configuration feeds many operational lists (halls, people, options); refresh them all.
      client.invalidateQueries();
    }
    onClose(result);
  }

  async function save(event) {
    event?.preventDefault();
    if (busy.current || !reasonValid) return;
    // A retry resends the saved request unchanged; only the first send is checked.
    let written = reason.trim();
    if (!payload.current) {
      if (proofread.waiting) return;
      written = (await proofread.confirm(written)).trim();
      setReason(written);
    }
    busy.current = true;
    setPhase("saving");
    setMessage("");
    if (!payload.current) {
      const common = { reason: written, actionKey: crypto.randomUUID() };
      const existing = original && {
        id: original.id,
        expectedVersion: original.version,
      };
      payload.current = {
        CREATE: ["POST", { ...common, values }],
        UPDATE: ["PUT", { ...common, ...existing, values }],
        ARCHIVE: ["PATCH", { ...common, ...existing, action }],
        RESTORE: ["PATCH", { ...common, ...existing, action }],
        DELETE: ["DELETE", { ...common, ...existing }],
      }[action];
    }
    const [method, body] = payload.current;
    try {
      const response = await fetch(definition.path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status >= 500) throw Error();
        setPhase([404, 409].includes(response.status) ? "conflict" : "error");
        setMessage(data.message || t("def.error.save"));
        return;
      }
      if (!data.change?.id) throw Error();
      setResult(data.change);
      setPhase("success");
    } catch {
      setPhase("unknown");
      setMessage(t("def.error.unconfirmed"));
    } finally {
      busy.current = false;
    }
  }

  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.current.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary",
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      heading.current?.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === heading.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const name = [
    original?.name || values.name,
    original?.surname || values.surname,
  ]
    .filter(Boolean)
    .join(" ");
  const words = definition.archivable ? text.words(kind) : {};
  const kindLabel = text.kind(kind);
  const title = result
    ? t(`def.title.done.${action}`, {
        kind: kindLabel,
        word: action === "ARCHIVE" ? words.archived : words.restored,
      })
    : phase === "edit"
      ? t(`def.title.edit.${action}`, { kind: kindLabel })
      : t(`def.title.review.${action}`, {
          kind: kindLabel,
          word: action === "ARCHIVE" ? words.archiveNoun : words.restoreNoun,
        });
  const reviewRows =
    action === "CREATE"
      ? definition.fields.map((field) => [
          text.field(field),
          null,
          formatDefinitionValue(field, values[field.key], afterSnapshot),
        ])
      : action === "UPDATE"
        ? changedFields.map((field) => [
            text.field(field),
            formatDefinitionValue(field, original[field.key], beforeSnapshot),
            formatDefinitionValue(field, values[field.key], afterSnapshot),
          ])
        : action === "DELETE"
          ? definition.fields.map((field) => [
              text.field(field),
              formatDefinitionValue(field, original[field.key], beforeSnapshot),
              null,
            ])
          : [
              [t("def.field.name"), name, null],
              [
                t("field.truckStatus"),
                original.archivedAt
                  ? t("def.stateSince", {
                      state: words.state,
                      time: format.dateTime(original.archivedAt),
                    })
                  : t("users.active"),
                action === "ARCHIVE" ? words.state : t("users.active"),
              ],
            ];
  const confirmLabel = {
    CREATE: t("def.confirm.CREATE", { kind: kindLabel }),
    UPDATE: t("def.confirm.UPDATE", { kind: kindLabel }),
    ARCHIVE: `${words.archive} ${kindLabel} #${original?.id}`,
    RESTORE: `${words.restore} ${kindLabel} #${original?.id}`,
    DELETE: t("def.confirm.DELETE", { kind: kindLabel, id: original?.id }),
  }[action];

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={phase === "saving"}
      onKeyDown={keepFocus}
      className="receipt-dialog operational-panel rounded-box border border-base-content/20 bg-base-100 p-5 text-base-content sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id={titleId}
        className="text-2xl font-semibold"
      >
        {title}
      </h2>
      {original && (
        <p className="my-3 [overflow-wrap:anywhere]">
          {kindLabel} #{original.id} · {name}
          {original.archivedAt ? ` · ${words.state}` : ""}
        </p>
      )}
      {original && action !== "UPDATE" && (
        <p className="my-3 text-sm [overflow-wrap:anywhere]">
          {t("def.currentUse", { usage: text.usage(kind, original) })}
        </p>
      )}

      {phase === "edit" ? (
        <form noValidate className="space-y-4" onSubmit={validate}>
          {errors.form && <p role="alert">{errors.form}</p>}
          {Object.keys(errors).some((key) => key !== "form") && (
            <p role="alert">{t("def.error.fields")}</p>
          )}
          {definition.fields.map((field) => {
            const errorId = `${titleId}-${field.key}-error`;
            const common = {
              ref: (node) => {
                inputs.current[field.key] = node;
              },
              value: form[field.key],
              "aria-invalid": Boolean(errors[field.key]),
              "aria-describedby": errors[field.key] ? errorId : undefined,
              onChange: (event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [field.key]: value }));
              },
            };
            return (
              <div key={field.key}>
                <label className="block text-sm">
                  {text.field(field)}
                  {field.unit ? ` (${text.unit(field)})` : ""}
                  {field.type === "boolean" ? (
                    <select {...common} required className="select mt-1 w-full">
                      <option value="">{t("def.choose")}</option>
                      <option value="true">{t("def.yes")}</option>
                      <option value="false">{t("def.no")}</option>
                    </select>
                  ) : field.type === "reference" ? (
                    <select {...common} required className="select mt-1 w-full">
                      <option value="">{t("def.chooseType")}</option>
                      {typeOptions.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                          {type.archivedAt ? ` (${t("def.archivedTag")})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : field.multiline ? (
                    <textarea
                      {...common}
                      required
                      maxLength={DEFINITION_TEXT_LIMIT}
                      className="textarea mt-1 w-full"
                    />
                  ) : (
                    <input
                      {...common}
                      required
                      type={
                        field.type === "date"
                          ? "date"
                          : ["number", "integer"].includes(field.type)
                            ? "number"
                            : "text"
                      }
                      min={
                        ["number", "integer"].includes(field.type)
                          ? "0"
                          : undefined
                      }
                      step={
                        field.type === "integer"
                          ? "1"
                          : field.type === "number"
                            ? "0.1"
                            : undefined
                      }
                      maxLength={
                        field.type === "text"
                          ? DEFINITION_TEXT_LIMIT
                          : undefined
                      }
                      className="input mt-1 w-full"
                    />
                  )}
                </label>
                {errors[field.key] && (
                  <p id={errorId} className="mt-1 text-sm text-error">
                    {errors[field.key]}
                  </p>
                )}
              </div>
            );
          })}
          {hasReference && types.isPending && (
            <InlineLoader />
          )}
          {hasReference && types.isError && (
            <p role="alert">
              {t("def.typesError")}{" "}
              <button
                type="button"
                className="btn min-h-11"
                onClick={() => types.refetch()}
              >
                {t("alert.retry")}
              </button>
            </p>
          )}
          {hasReference && types.isSuccess && !typeOptions.length && (
            <p role="status">{t("def.noType")}</p>
          )}
          <button type="submit" className="btn min-h-11 btn-primary">
            {t(action === "CREATE" ? "def.reviewNew" : "users.reviewChanges")}
          </button>
        </form>
      ) : (
        <>
          <dl className="space-y-3">
            {reviewRows.map(([label, before, after]) => (
              <div
                key={label}
                className="rounded-xl bg-base-200/70 p-3 [overflow-wrap:anywhere]"
              >
                <dt className="font-semibold">{label}</dt>
                {before !== null && (
                  <dd className="whitespace-pre-line">
                    {after !== null
                      ? t("ship.before", { value: before })
                      : before}
                  </dd>
                )}
                {after !== null && (
                  <dd className="whitespace-pre-line">
                    {before !== null
                      ? t("ship.after", { value: after })
                      : after}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          {action === "UPDATE" && (
            <p className="mt-3 text-sm">
              {t("def.unchanged", {
                count: definition.fields.length - changedFields.length,
              })}
            </p>
          )}
          <p className="my-4">{text.consequence(kind, action, original)}</p>
          {action === "UPDATE" &&
            ["WASTE_PROFILE", "CONTAINER_TYPE"].includes(kind) &&
            changedFields.some((field) => field.key === "name") && (
              <p className="my-4 rounded-xl border border-warning p-3">
                {t("def.nameNotUpdated")}
              </p>
            )}
          {editing &&
            definition.matchingNote &&
            changedFields.some((field) =>
              ["containerType", "wasteProfile"].includes(field.key),
            ) && (
              <p className="my-4 rounded-xl border border-warning p-3">
                {t(`def.matching.${kind}`)}
              </p>
            )}
          {definition.fields.some((field) => field.personal) &&
            ["CREATE", "UPDATE", "DELETE"].includes(action) && (
              <p className="my-4 text-sm">{t("def.personalNote")}</p>
            )}
          {phase === "review" ? (
            <form className="space-y-4" onSubmit={save}>
              <label className="block text-sm">
                {reasonRequired ? t("def.reason") : t("def.noteOptional")}
                <textarea
                  required={reasonRequired}
                  minLength={reasonRequired ? 3 : undefined}
                  maxLength={1000}
                  className="textarea mt-1 w-full"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              {reasonRequired && (
                <p className="text-sm text-base-content/70">
                  {t("def.reasonHint")}
                </p>
              )}
              <ProofreadPrompt proofread={proofread} />
              <button
                type="submit"
                className={`btn min-h-11 ${action === "DELETE" ? "btn-error" : "btn-primary"}`}
                disabled={!reasonValid || proofread.waiting}
              >
                {proofread.checking && <ButtonSpinner />}
                {confirmLabel}
              </button>
            </form>
          ) : (
            <>
              {reason.trim() && (
                <p className="my-4 [overflow-wrap:anywhere]">
                  {t(reasonRequired ? "ship.reason" : "def.note", {
                    reason: reason.trim(),
                  })}
                </p>
              )}
              {phase === "saving" && <InlineLoader save />}
              {message && (
                <p role="alert" className="my-3">
                  {message}
                </p>
              )}
              {result && (
                <p
                  role="status"
                  className="operational-confirm my-4 text-success"
                >
                  {t("def.result", {
                    id: result.id,
                    kind: kindLabel,
                    definition: result.definitionId,
                    time: format.dateTime(result.createdAt),
                    actor: result.actorId,
                  })}
                  {name ? ` · ${name}` : ""}
                </p>
              )}
              {phase === "unknown" && (
                <button
                  type="button"
                  className="btn min-h-11 btn-primary"
                  onClick={save}
                >
                  {t("def.check")}
                </button>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {editing && ["review", "error"].includes(phase) && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("edit");
            }}
          >
            {t("users.review.back")}
          </button>
        )}
        {!editing && phase === "error" && (
          <button
            type="button"
            className="btn min-h-11 btn-outline"
            onClick={() => {
              payload.current = null;
              setMessage("");
              setPhase("review");
            }}
          >
            {t("def.backToReview")}
          </button>
        )}
        <button
          type="button"
          className="btn min-h-11 btn-outline"
          disabled={phase === "saving"}
          onClick={finish}
        >
          {result
            ? t("common.done")
            : phase === "conflict"
              ? t("def.closeReload")
              : phase === "unknown"
                ? t("def.closeUnconfirmed")
                : t("common.cancel")}
        </button>
      </div>
    </dialog>
  );
}
