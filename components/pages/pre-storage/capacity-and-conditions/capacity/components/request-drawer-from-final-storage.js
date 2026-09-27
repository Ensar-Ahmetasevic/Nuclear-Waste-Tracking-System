"use client";
import { useState } from "react";
import RequestFromFinalStorage from "./inner-components/request-from-final-storage";
import { useT } from "../../../../../shell/preferences";
export default function RequestDrawerFromFinalStorage({
  hasPendingContainersFromFinalStorage,
  requestData,
}) {
  const t = useT();
  const [selectedPage, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(requestData.length / 10));
  const page = Math.min(selectedPage, pages);
  if (!hasPendingContainersFromFinalStorage) return null;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">{t("xfer.pre.title")}</h3>
      <p className="text-sm text-base-content/70">{t("xfer.pre.desc")}</p>
      {[...requestData]
        .sort((a, b) => a.id - b.id)
        .slice((page - 1) * 10, page * 10)
        .map((request) => (
          <RequestFromFinalStorage key={request.id} requestData={request} />
        ))}
      {pages > 1 && (
        <nav aria-label={t("xfer.pages")} className="flex items-center gap-3">
          <button
            className="btn min-h-11"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            {t("ship.previous")}
          </button>
          <span>{t("ship.page", { page, total: pages })}</span>
          <button
            className="btn min-h-11"
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
          >
            {t("ship.next")}
          </button>
        </nav>
      )}
    </section>
  );
}
