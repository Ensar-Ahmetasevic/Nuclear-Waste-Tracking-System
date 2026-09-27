"use client";
import { useState } from "react";
import { LuSend, LuShieldAlert } from "react-icons/lu";
import { useT } from "../../shell/preferences";
import ReturnReport from "./container-data/return-report";
import ModalReturnAction from "./components/modals/modal-return-action";

// Pre-storage returns that still need a decision. Step 1 corrects and resends, or
// hands the return to Supervision; an escalated return waits for Supervision.
export default function ReturnCases({ returns, profiles, truckStatus, canDecide }) {
  const t = useT();
  const [modal, setModal] = useState(null);
  const active = returns.filter((report) => ["open", "escalated"].includes(report.state));
  if (!active.length) return null;
  return (
    <section aria-labelledby="return-cases-title" className="space-y-3">
      <h2 id="return-cases-title" className="text-lg font-semibold">
        {t("retCase.title")}
      </h2>
      {active.map((report) => {
        const escalated = report.state === "escalated";
        const canResend = truckStatus === "IN" && (!escalated || canDecide);
        return (
          <article
            key={report.id}
            className={`space-y-3 rounded-box border-2 bg-base-100 p-4 ${escalated ? "border-warning" : "border-error/60"}`}
          >
            <p className={`text-sm font-medium ${escalated ? "text-warning" : "text-error"}`}>
              {t(`retCase.next.${escalated ? (canDecide ? "decide" : "wait") : "step1"}`)}
            </p>
            <ReturnReport report={report} showState />
            {truckStatus !== "IN" ? (
              <p className="text-sm text-base-content/70">{t("retCase.departed")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {canResend && (
                  <button
                    type="button"
                    className="btn min-h-11 btn-primary"
                    onClick={() => setModal({ mode: "RESEND", report })}
                  >
                    <LuSend className="size-4" aria-hidden="true" />
                    {t("retCase.resend")}
                  </button>
                )}
                {!escalated && (
                  <button
                    type="button"
                    className="btn min-h-11 btn-outline btn-warning"
                    onClick={() => setModal({ mode: "ESCALATE", report })}
                  >
                    <LuShieldAlert className="size-4" aria-hidden="true" />
                    {t("retCase.escalate")}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
      {modal && (
        <ModalReturnAction
          mode={modal.mode}
          report={modal.report}
          profiles={profiles}
          closeModal={() => setModal(null)}
        />
      )}
    </section>
  );
}
