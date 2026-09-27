// What went wrong while loading, told in the user's terms: each kind has a
// title, an explanation and next steps in lib/i18n.js under problem.<kind>.*.
export const PROBLEM_CODES = {
  offline: "NET",
  timeout: "TMO",
  stalled: "STL",
  session: "AUT",
  forbidden: "ACC",
  server: "SRV",
  notFound: "NFD",
  unknown: "UNK",
};

// Thrown by our own fetch helpers so the HTTP status reaches the classifier.
export class LoadingError extends Error {
  constructor(message, { status, kind } = {}) {
    super(message);
    this.name = "LoadingError";
    this.status = status;
    this.kind = kind;
  }
}

export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function classify(error, status = error?.status) {
  if (error?.kind && PROBLEM_CODES[error.kind]) return error.kind;
  if (isOffline()) return "offline";
  if (error?.name === "TimeoutError" || error?.name === "AbortError")
    return "timeout";
  if (status === 401) return "session";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "server";
  // fetch() rejects with a TypeError when the server cannot be reached at all.
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
    return "offline";
  return "unknown";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// Short, readable reference for the IT service desk: NWTS-TMO-260926-1432-7F3A.
export function referenceCode(kind, date = new Date()) {
  const stamp = `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  const random = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `NWTS-${PROBLEM_CODES[kind] || "UNK"}-${stamp}-${random}`;
}

/**
 * One problem report. `context` names where it happened ("Sign-in · Load work
 * area data"); `seconds` is how long loading waited. The details hold no
 * personal data, only what IT needs to find the event in the server logs.
 */
export function createProblem({ error, kind, status, context, seconds } = {}) {
  const resolved = kind || classify(error, status);
  const at = new Date();
  const problem = {
    kind: resolved,
    status: status ?? error?.status,
    context,
    seconds,
    digest: error?.digest,
    message: error?.message,
    at: at.toISOString(),
    path: typeof window === "undefined" ? "" : window.location.pathname,
    reference: referenceCode(resolved, at),
  };
  // Handled here, so a warning: the reference ties the console to the report.
  if (error) console.warn(`[${problem.reference}]`, error);
  return problem;
}

export function problemDetails(problem) {
  return [
    "NWTS loading problem",
    `Reference: ${problem.reference}`,
    `Type: ${problem.kind}`,
    problem.context && `Where: ${problem.context}`,
    `Page: ${problem.path || "-"}`,
    `Time: ${problem.at}`,
    problem.status && `HTTP status: ${problem.status}`,
    problem.seconds && `Waited: ${problem.seconds} s`,
    problem.digest && `Server digest: ${problem.digest}`,
    problem.message && `Message: ${problem.message}`,
    `Browser online: ${isOffline() ? "no" : "yes"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// fetch() that fails with a LoadingError carrying the status, and gives up
// after `timeout` ms instead of waiting forever.
export async function fetchJson(url, { timeout = 20000, ...options } = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    signal: options.signal || AbortSignal.timeout(timeout),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new LoadingError(data.message || `Request failed (${response.status})`, {
      status: response.status,
    });
  return data;
}

// Rejects with a timeout LoadingError when `promise` does not settle in time.
export function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new LoadingError(`No answer after ${Math.round(ms / 1000)} s`, { kind: "timeout" })),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
