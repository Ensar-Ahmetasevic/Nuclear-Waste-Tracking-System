// Read-only overview of who may do what. Every cell is computed from the same
// policy the server enforces (lib/workspaces.cjs) plus the options each route
// passes to withApiAuth; tests/validation.test.cjs compares those options with
// the route files so this table cannot silently drift from the server.
const { areas, apiAllowed, pageAllowed } = require("./workspaces.cjs");

const MANAGERS = ["ADMINISTRATOR", "SUPERVISION"];
const TRANSFER = "/api/final-storage-setup/final-storage-transver-request";

// Columns: both manager roles, and an employee for each work area.
const SUBJECTS = [
  { key: "ADMINISTRATOR", user: { role: "ADMINISTRATOR" } },
  { key: "SUPERVISION", user: { role: "SUPERVISION" } },
  ...Object.keys(areas).map((area) => ({
    key: area,
    area,
    user: { role: "EMPLOYEE", workArea: area },
  })),
];

// Rows. `request` is the request the server receives for the action; `access`
// and `allowedRoles` are the withApiAuth options of that route and method
// (mutations default to "admin": Administrator only). `handlerRoles` is a role
// check inside the handler. `limits` names roles for which the action has an
// extra condition, explained under the table.
const GROUPS = [
  {
    key: "general",
    actions: [
      {
        key: "overview",
        page: "/",
        request: ["GET", "/api/overview"],
        allowedRoles: MANAGERS,
      },
      {
        key: "statistics",
        page: "/statistics",
        request: ["GET", "/api/statistics"],
      },
      { key: "scan", page: "/scan" },
      {
        key: "account",
        page: "/account",
        request: ["PUT", "/api/account"],
        access: "member",
      },
    ],
  },
  {
    key: "SHIPPING",
    actions: [
      {
        key: "shipping.view",
        page: "/shipping-informations",
        request: ["GET", "/api/shipping-informations"],
      },
      {
        key: "shipping.record",
        request: ["POST", "/api/shipping-informations"],
        access: "shipping",
      },
      {
        key: "shipping.edit",
        request: ["PUT", "/api/shipping-informations"],
        access: "shipping",
        limits: { departed: ["SUPERVISION", "SHIPPING"] },
      },
      {
        key: "shipping.profiles",
        request: ["POST", "/api/container-profile"],
        access: "shipping",
        limits: { departed: ["SUPERVISION"] },
      },
      {
        key: "shipping.returnResend",
        request: ["POST", "/api/shipping-informations/returns"],
        access: "member",
        limits: { returnDecision: ["SHIPPING"] },
      },
      {
        key: "shipping.returnEscalate",
        request: ["POST", "/api/shipping-informations/returns"],
        access: "member",
      },
      {
        key: "shipping.depart",
        request: ["POST", "/api/shipping-informations/departure"],
        access: "member",
      },
      {
        key: "shipping.delete",
        request: ["DELETE", "/api/shipping-informations"],
        access: "member",
        limits: {
          departed: ["SUPERVISION", "SHIPPING"],
          deleteProfiles: ["SHIPPING"],
          stockHistory: ["ADMINISTRATOR", "SUPERVISION", "SHIPPING"],
        },
      },
      {
        key: "shipping.correct",
        request: ["PATCH", "/api/shipping-informations"],
        access: "admin",
      },
      {
        key: "shipping.deletions",
        page: "/shipping-informations/deletions",
        request: ["GET", "/api/shipping-informations/deletions"],
        allowedRoles: MANAGERS,
      },
    ],
  },
  {
    key: "PRE_STORAGE",
    actions: [
      {
        key: "pre.view",
        page: "/pre-storage",
        request: ["GET", "/api/pre-storage-setup"],
      },
      {
        key: "pre.receive",
        request: ["POST", "/api/pre-storage-setup"],
        access: "member",
      },
      {
        key: "pre.reject",
        request: ["POST", "/api/pre-storage-setup/rejections"],
        access: "member",
        limits: { returnReport: ["ADMINISTRATOR", "SUPERVISION", "PRE_STORAGE"] },
      },
      {
        key: "pre.measure",
        request: ["POST", "/api/pre-storage-setup/pre-storage-conditions"],
        access: "member",
      },
      {
        key: "pre.alerts",
        request: ["POST", "/api/pre-storage-setup/monitoring"],
        access: "member",
        limits: { criticalClose: ["PRE_STORAGE"] },
      },
      {
        key: "pre.approve",
        request: [
          "PUT",
          TRANSFER,
          { operationType: "PRE_STORAGE_ACCEPT_REQUEST" },
        ],
        access: "member",
      },
      {
        key: "pre.halls",
        page: "/pre-storage/setup",
        request: ["POST", "/api/pre-storage-setup/pre-storage-location"],
      },
      {
        key: "pre.rules",
        request: ["POST", "/api/pre-storage-setup/monitoring-rules"],
      },
    ],
  },
  {
    key: "FINAL_STORAGE",
    actions: [
      {
        key: "final.view",
        page: "/final-storage",
        request: ["GET", "/api/final-storage-setup/overview"],
      },
      { key: "final.request", request: ["POST", TRANSFER], access: "member" },
      {
        key: "final.receive",
        request: [
          "PUT",
          TRANSFER,
          { operationType: "FINAL_STORAGE_ACCEPT_RESPONSE" },
        ],
        access: "member",
      },
      {
        key: "final.measure",
        request: ["POST", "/api/final-storage-setup/final-storage-conditions"],
        access: "member",
      },
      {
        key: "final.alerts",
        request: ["POST", "/api/final-storage-setup/monitoring"],
        access: "member",
        limits: { criticalClose: ["FINAL_STORAGE"] },
      },
      {
        key: "final.rooms",
        page: "/final-storage/setup",
        request: ["POST", "/api/final-storage-setup/final-storage-location"],
      },
      {
        key: "final.rules",
        request: ["POST", "/api/final-storage-setup/monitoring-rules"],
      },
    ],
  },
  {
    key: "trace",
    actions: [
      {
        key: "trace.transfer",
        page: "/transfers/1",
        request: ["GET", "/api/transfers/1"],
      },
      {
        key: "trace.custody",
        page: "/profiles/1",
        request: ["GET", "/api/profiles/1"],
      },
    ],
  },
  {
    key: "management",
    actions: [
      {
        key: "users.view",
        page: "/users",
        request: ["GET", "/api/users"],
        access: "member",
        limits: { employeesOnly: ["SUPERVISION"] },
      },
      {
        key: "users.create",
        request: ["POST", "/api/users"],
        access: "member",
        limits: { employeesOnly: ["SUPERVISION"] },
      },
      {
        key: "users.edit",
        request: ["PUT", "/api/users"],
        access: "member",
        handlerRoles: ["ADMINISTRATOR"],
      },
      {
        key: "stock.view",
        page: "/storage-reconciliation",
        request: ["GET", "/api/storage-reconciliation"],
        allowedRoles: MANAGERS,
      },
      {
        key: "stock.verify",
        request: ["POST", "/api/storage-reconciliation/verifications"],
        access: "member",
        allowedRoles: MANAGERS,
      },
      {
        key: "stock.correct",
        request: ["POST", "/api/storage-reconciliation/corrections"],
      },
      {
        key: "definitions",
        page: "/container-profile",
        request: ["POST", "/api/container-profile/waste-profile"],
      },
    ],
  },
];

// The same checks, in the same order, as withApiAuth and the page guard.
function allowed(action, user) {
  if (action.page && !pageAllowed(user, action.page)) return false;
  if (!action.request) return true;
  const [method, path, body = {}] = action.request;
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (action.allowedRoles && !action.allowedRoles.includes(user.role))
    return false;
  if (
    !read &&
    (action.access || "admin") === "admin" &&
    user.role !== "ADMINISTRATOR"
  )
    return false;
  if (!apiAllowed(user, path, method, body)) return false;
  return !action.handlerRoles || action.handlerRoles.includes(user.role);
}

// { subjects, groups: [{ key, actions: [{ key, cells: { subject: "yes" | "limited" | "no" }, limits }] }] }
function permissionMatrix() {
  return {
    subjects: SUBJECTS.map(({ key, area }) => ({ key, area: area || null })),
    groups: GROUPS.map((group) => ({
      key: group.key,
      actions: group.actions.map((action) => {
        const limits = Object.entries(action.limits || {});
        const cells = {};
        for (const subject of SUBJECTS) {
          const yes = allowed(action, subject.user);
          cells[subject.key] = !yes
            ? "no"
            : limits.some(([, who]) => who.includes(subject.key))
              ? "limited"
              : "yes";
        }
        return {
          key: action.key,
          cells,
          limits: limits.map(([key, who]) => ({ key, subjects: who })),
        };
      }),
    })),
  };
}

module.exports = { GROUPS, SUBJECTS, allowed, permissionMatrix };
