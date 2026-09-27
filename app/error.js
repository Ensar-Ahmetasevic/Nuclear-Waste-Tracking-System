"use client";
import Link from "next/link";
import { useMemo } from "react";
import { LuHouse } from "react-icons/lu";
import LoadingProblem from "../components/loading/loading-problem";
import { createProblem } from "../components/loading/problems";
import { useT } from "../components/shell/preferences";

// A page that failed to load or render: what happened, what to do, and a
// reference that matches the server log (digest) for IT.
export default function RouteError({ error, retry, reset }) {
  const t = useT();
  const problem = useMemo(
    () => createProblem({ error, context: t("problem.pageContext") }),
    [error, t],
  );
  return (
    <main className="mx-auto grid min-h-[60dvh] w-full max-w-xl place-items-center px-4 py-10">
      <LoadingProblem
        problem={problem}
        onRetry={retry || reset}
        actions={
          <Link href="/" className="btn min-h-11 border-base-content/20 btn-ghost">
            <LuHouse className="size-4.5" aria-hidden="true" />
            {t("problem.home")}
          </Link>
        }
      />
    </main>
  );
}
