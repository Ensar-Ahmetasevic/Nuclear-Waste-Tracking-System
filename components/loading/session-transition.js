"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { areas, manages } from "../../lib/workspaces.cjs";
import { useReducedMotion } from "../shared/motion-preferences";
import { useT } from "../shell/preferences";
import SessionOverlay from "./session-overlay";
import { LoadingError, createProblem, fetchJson, withTimeout } from "./problems";

// Sign-in and sign-out run as short sequences of real steps under one overlay
// that survives the route change. Each step has a deadline; a step that misses
// it stops the sequence with a problem report instead of spinning forever.
const SessionTransitionContext = createContext({
  active: false,
  startSignIn: () => {},
  startSignOut: () => {},
});

export const SIGN_IN_STAGES = ["identity", "workspace", "enter"];
export const SIGN_OUT_STAGES = ["session", "device", "exit"];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathOf = (url) => url.split(/[?#]/)[0] || "/";
const welcomedKey = (id) => `nwts-welcomed:${id}`;

export function useSessionTransition() {
  return useContext(SessionTransitionContext);
}

export function SessionTransitionProvider({ children }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const reduced = useReducedMotion();
  const [run, setRun] = useState(null);
  const sessionName = session?.user?.name;
  const live = useRef({ pathname, status, reduced, sessionName });
  const plan = useRef(null);
  const token = useRef(0);
  useEffect(() => {
    live.current = { pathname, status, reduced, sessionName };
  }, [pathname, status, reduced, sessionName]);

  // Resolves once `check` holds for the current route and session state.
  const waitUntil = useCallback(
    (check, ms, message) =>
      new Promise((resolve, reject) => {
        const started = Date.now();
        const tick = () => {
          if (check(live.current)) return resolve();
          if (Date.now() - started > ms)
            return reject(new LoadingError(message, { kind: "timeout" }));
          setTimeout(tick, 100);
        };
        tick();
      }),
    [],
  );

  const execute = useCallback(
    async (from) => {
      const current = plan.current;
      const id = ++token.current;
      const alive = () => token.current === id;
      const { reduced: calm } = live.current;
      for (let index = from; index < current.stages.length; index += 1) {
        const stage = current.stages[index];
        setRun((value) => value && { ...value, index, attempt: id, status: "running", problem: null });
        try {
          await Promise.all([
            withTimeout(Promise.resolve().then(() => stage.work(current)), stage.timeout || 30000),
            delay(calm ? 0 : current.minStage),
          ]);
        } catch (error) {
          if (!alive()) return;
          const where = `${t(`${current.mode}.context`)} · ${t(`${current.mode}.stage.${stage.key}`)}`;
          setRun((value) => value && { ...value, status: "failed", problem: createProblem({ error, context: where }) });
          return;
        }
        if (!alive()) return;
      }
      current.onDone?.(current);
      setRun((value) => value && { ...value, index: current.stages.length, status: "done" });
      await delay(calm ? 700 : current.hold);
      if (!alive()) return;
      setRun((value) => value && { ...value, status: "leaving" });
      await delay(calm ? 0 : 450);
      if (alive()) setRun(null);
    },
    [t],
  );

  const startSignIn = useCallback(
    ({ callbackUrl = "/" } = {}) => {
      if (run) return;
      plan.current = {
        mode: "signin",
        minStage: 650,
        hold: 1600,
        stages: [
          {
            key: "identity",
            timeout: 20000,
            work: async (current) => {
              const { user } = await fetchJson("/api/account", { timeout: 15000 });
              if (!user) throw new LoadingError("Account not found", { status: 401 });
              current.user = user;
              current.target =
                callbackUrl === "/" ? (user.role === "ADMINISTRATOR" ? "/users" : "/") : callbackUrl;
              let first = false;
              try {
                first = !localStorage.getItem(welcomedKey(user.id));
              } catch {
                /* Storage may be disabled; greet as a returning user. */
              }
              setRun((value) =>
                value && {
                  ...value,
                  first,
                  // Same name the shell greets with; accounts may have none.
                  user: {
                    name: user.displayName || user.username || live.current.sessionName,
                    role: user.role,
                  },
                },
              );
              router.prefetch(current.target);
            },
          },
          {
            key: "workspace",
            timeout: 25000,
            work: async ({ user }) => {
              if (manages(user) || areas[user.workArea])
                await fetchJson("/api/workspace", { timeout: 20000 });
            },
          },
          {
            key: "enter",
            timeout: 30000,
            work: async ({ target }) => {
              router.push(target);
              router.refresh();
              await waitUntil(
                (state) => state.pathname === pathOf(target),
                25000,
                `The page ${pathOf(target)} did not open`,
              );
            },
          },
        ],
        onDone: ({ user }) => {
          try {
            localStorage.setItem(welcomedKey(user.id), new Date().toISOString());
          } catch {
            /* Storage may be disabled; the greeting is only cosmetic. */
          }
        },
      };
      setRun({ mode: "signin", index: 0, status: "running", user: null, first: false });
      execute(0);
    },
    [execute, router, run, waitUntil],
  );

  const startSignOut = useCallback(
    ({ callbackUrl = "/login" } = {}) => {
      if (run) return;
      plan.current = {
        mode: "signout",
        minStage: 520,
        hold: 1400,
        stages: [
          {
            key: "session",
            timeout: 20000,
            work: () => withTimeout(signOut({ redirect: false, callbackUrl }), 15000),
          },
          {
            key: "device",
            timeout: 15000,
            work: () =>
              waitUntil(
                (state) => state.status === "unauthenticated",
                10000,
                "The session was not cleared on this device",
              ),
          },
          {
            key: "exit",
            timeout: 30000,
            work: async () => {
              router.replace(callbackUrl);
              await waitUntil(
                (state) => state.pathname === pathOf(callbackUrl),
                25000,
                "The sign-in page did not open",
              );
            },
          },
        ],
      };
      setRun({
        mode: "signout",
        index: 0,
        status: "running",
        user: session?.user ? { name: session.user.name, role: session.user.role } : null,
      });
      execute(0);
    },
    [execute, router, run, session, waitUntil],
  );

  const actions = useMemo(
    () => ({
      retry: () => run && execute(run.index),
      // The work area summary is a convenience; the application still opens.
      skip: () => run && execute(run.index + 1),
      reload: () => window.location.assign(plan.current?.target || "/"),
      dismiss: () => {
        token.current += 1;
        setRun(null);
      },
      backToSignIn: async () => {
        token.current += 1;
        try {
          await withTimeout(signOut({ redirect: false }), 8000);
        } catch {
          /* The login page is shown either way; a stale session expires. */
        }
        setRun(null);
        if (pathOf(live.current.pathname) !== "/login") router.replace("/login");
      },
    }),
    [execute, router, run],
  );

  const value = useMemo(
    () => ({ active: Boolean(run), startSignIn, startSignOut }),
    [run, startSignIn, startSignOut],
  );
  return (
    <SessionTransitionContext.Provider value={value}>
      {children}
      {run &&
        createPortal(
          <SessionOverlay
            run={run}
            stages={run.mode === "signin" ? SIGN_IN_STAGES : SIGN_OUT_STAGES}
            actions={actions}
          />,
          document.body,
        )}
    </SessionTransitionContext.Provider>
  );
}
