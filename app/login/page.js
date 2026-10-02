"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { toast } from "react-toastify";

import { LuMoon, LuSun } from "react-icons/lu";
import { ButtonSpinner } from "../../components/loading/spinner";
import { BootLoader } from "../../components/loading/loaders";
import LoadingProblem from "../../components/loading/loading-problem";
import { createProblem } from "../../components/loading/problems";
import { useSessionTransition } from "../../components/loading/session-transition";
import { useLoadingWatchdog } from "../../components/loading/use-loading-watchdog";
import { LanguageOptions, usePreferences, useT } from "../../components/shell/preferences";
import { RadiationMark } from "../../components/shell/nav-parts";
import FlowScene, { FLOW_STAGES } from "../../components/ui/flow-scene";
import { SceneImage } from "../../components/ui/scene";

// Messages the credentials provider (lib/auth.js) uses for a refused sign-in;
// any other error means the service itself failed.
const CREDENTIAL_ERRORS = [
  "CredentialsSignin",
  "Email and password are required",
  "Invalid credentials",
  "Invalid email or password",
];
const VERIFY_STALLED_MS = 20000;

const STEP_EDGE = {
  "step-1": "border-t-step-1 text-step-1",
  "step-2": "border-t-step-2 text-step-2",
  "step-3": "border-t-step-3 text-step-3",
};

function LoginForm() {
  const { t, locale, theme, setLocale, setTheme } = usePreferences();
  const { startSignIn, active } = useSessionTransition();
  const searchParams = useSearchParams();
  const requestedUrl = searchParams.get("callbackUrl") || "/";
  const callbackUrl =
    requestedUrl.startsWith("/") &&
    !requestedUrl.startsWith("//") &&
    !requestedUrl.includes("\\") &&
    !/[\u0000-\u0020]/.test(requestedUrl)
      ? requestedUrl
      : "/";

  const [verifying, setVerifying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [problem, setProblem] = useState(null);
  const latest = useRef(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  // The credential check keeps waiting after the deadline (a late answer still
  // signs in), but the user is told it stalled and can try again.
  const phase = useLoadingWatchdog(verifying, {
    key: attempt,
    slowAfter: 6000,
    failAfter: VERIFY_STALLED_MS,
  });
  const stalled = useMemo(
    () =>
      phase === "stalled"
        ? createProblem({
            kind: navigator.onLine === false ? "offline" : "timeout",
            context: t("signin.context"),
            seconds: VERIFY_STALLED_MS / 1000,
          })
        : null,
    [phase, t],
  );
  const shownProblem = problem || stalled;

  // Verifies the credentials here; a successful sign-in hands over to the
  // welcome sequence, which loads the account and opens the workspace.
  const onSubmit = async ({ email, password }) => {
    const id = ++latest.current;
    const context = t("signin.context");
    setAttempt(id);
    setProblem(null);
    setVerifying(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (id !== latest.current) return;
      if (result?.ok && !result.error) startSignIn({ callbackUrl });
      else if (/too many/i.test(result?.error || "")) toast.error(t("login.tooMany"));
      else if (result && CREDENTIAL_ERRORS.includes(result.error))
        toast.error(t("login.failed"));
      else
        setProblem(
          createProblem({
            kind: "server",
            status: result?.status,
            error: new Error(result?.error || "No answer from the sign-in service"),
            context,
          }),
        );
    } catch (error) {
      if (id === latest.current) setProblem(createProblem({ error, context }));
    } finally {
      if (id === latest.current) setVerifying(false);
    }
  };
  const busy = verifying || active;

  const dark = theme === "nwts-dark";
  return (
    <main className="min-h-dvh bg-base-300 [--page:var(--color-base-300)]">
      <div
        data-theme="nwts-dark"
        className="relative isolate bg-base-300 text-base-content"
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 p-4 sm:px-8 sm:py-6 lg:static lg:mx-auto lg:max-w-[1800px] lg:py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/25">
              <RadiationMark className="size-6.5" />
            </span>
            <span className="flex flex-col [text-shadow:0_1px_6px_rgb(0_0_0/0.5)]">
              <span className="text-xl font-bold tracking-wide">
                {t("app.name")}
              </span>
              <span className="text-xs text-base-content/85 max-sm:hidden">
                {t("app.fullName")}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="login-language">
              {t("shell.language")}
            </label>
            <select
              id="login-language"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              className="select h-11 w-auto shrink-0 border-base-content/20 bg-base-300/80 bg-none px-3 text-sm font-medium backdrop-blur"
            >
              <LanguageOptions short />
            </select>
            <button
              type="button"
              aria-label={t(dark ? "shell.themeToLight" : "shell.themeToDark")}
              title={t(dark ? "shell.themeToLight" : "shell.themeToDark")}
              onClick={() => setTheme(dark ? "nwts-light" : "nwts-dark")}
              className="btn btn-square min-h-11 border-base-content/20 bg-base-300/80 backdrop-blur"
            >
              {dark ? (
                <LuSun className="size-5" aria-hidden="true" />
              ) : (
                <LuMoon className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <div className="relative h-72 sm:h-96 lg:hidden">
          <SceneImage scene="worker" position="50% 40%" />
        </div>
        <div className="mx-auto hidden max-w-[1800px] lg:block">
          <FlowScene sizes="100vw" />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-base-300/85 to-transparent lg:hidden"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-(--page) to-transparent"
        />
      </div>
      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-16">
        <div className="-mt-20 lg:order-2 lg:-mt-32">
          <div className="space-y-5 rounded-box border border-base-content/10 bg-base-100 p-6 shadow-2xl shadow-black/30 sm:p-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
              <p className="text-sm text-base-content/70">
                {t("login.subtitle")}
              </p>
            </div>
            {searchParams.get("passwordChanged") === "1" && (
              <p
                role="status"
                className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm"
              >
                {t("login.passwordChanged")}
              </p>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="form-control">
                <label className="label" htmlFor="login-email">
                  <span className="label-text">{t("login.user")}</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder={t("login.user.placeholder")}
                  id="login-email"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "login-email-error" : undefined
                  }
                  {...register("email", { required: t("login.user.required") })}
                />
                {errors.email && (
                  <span
                    id="login-email-error"
                    role="alert"
                    className="text-sm text-error"
                  >
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="form-control">
                <label className="label" htmlFor="login-password">
                  <span className="label-text">{t("login.password")}</span>
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  id="login-password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "login-password-error" : undefined
                  }
                  {...register("password", {
                    required: t("login.password.required"),
                  })}
                />
                {errors.password && (
                  <span
                    id="login-password-error"
                    role="alert"
                    className="text-sm text-error"
                  >
                    {errors.password.message}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="btn min-h-12 btn-primary"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? (
                  <>
                    <ButtonSpinner />
                    {t("login.verifying")}
                  </>
                ) : (
                  t("login.submit")
                )}
              </button>
              {phase === "slow" && (
                <p role="status" className="text-sm text-warning">
                  {t("login.slow")}
                </p>
              )}
            </form>
            {shownProblem && (
              <LoadingProblem
                compact
                problem={shownProblem}
                onRetry={handleSubmit(onSubmit)}
              />
            )}

            <p className="text-center text-sm text-base-content/70">
              {t("login.note")}
            </p>
            <ul
              className="flex flex-wrap justify-center gap-2 text-xs"
              aria-label={t("login.levels")}
            >
              {["ADMINISTRATOR", "SUPERVISION", "EMPLOYEE"].map((role) => (
                <li
                  key={role}
                  className="rounded-full border border-base-content/20 px-2.5 py-0.5"
                >
                  {t(`role.${role}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <section className="space-y-5 lg:order-1 lg:pt-10">
          <p className="font-mono text-xs font-semibold tracking-widest text-step-2 uppercase">
            {t("login.eyebrow")}
          </p>
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
            {t("login.headline")}
          </h2>
          <p className="max-w-xl text-base-content/80 sm:text-lg">
            {t("login.lead")}
          </p>
          <ol className="grid gap-3 sm:grid-cols-3">
            {FLOW_STAGES.map((stage, index) => (
              <li
                key={stage.key}
                className={`flex flex-col gap-1 rounded-xl border-t-3 bg-base-100 p-4 ${STEP_EDGE[stage.tone]}`}
              >
                <span className="font-mono text-sm font-semibold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold text-base-content">
                  {t(`flow.${stage.key}.title`)}
                </span>
                <span className="text-sm text-base-content/70">
                  {t(`flow.${stage.key}.caption`)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  const t = useT();
  return (
    <Suspense fallback={<BootLoader label={t("loading.page")} />}>
      <LoginForm />
    </Suspense>
  );
}
