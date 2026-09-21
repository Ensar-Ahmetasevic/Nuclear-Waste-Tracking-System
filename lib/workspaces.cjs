const areas = {
  SHIPPING: {
    title: "Shipping information",
    step: 1,
    href: "/shipping-informations",
    description: "Record arrivals and review truck contents.",
  },
  PRE_STORAGE: {
    title: "Pre-storage Entry",
    step: 2,
    href: "/pre-storage",
    description: "Receive containers, monitor halls and prepare transfers.",
  },
  FINAL_STORAGE: {
    title: "Final Storage Entry",
    step: 3,
    href: "/final-storage",
    description: "Manage transfer requests, receipts and storage conditions.",
  },
};
const manages = (user) => ["ADMINISTRATOR", "SUPERVISION"].includes(user?.role);
const canAccess = (user, area) =>
  manages(user) ||
  (user?.role === "EMPLOYEE" && Boolean(areas[area]) && user.workArea === area);
function pageAllowed(user, path) {
  if (!user) return false;
  if (path === "/" || path === "/account" || path === "/statistics")
    return true;
  if (path.startsWith("/users")) return manages(user);
  if (
    path.startsWith("/container-profile") ||
    /^\/(pre-storage|final-storage)\/setup/.test(path)
  )
    return user.role === "ADMINISTRATOR";
  const area = Object.keys(areas).find(
    (key) => path === areas[key].href || path.startsWith(areas[key].href + "/"),
  );
  return !area || canAccess(user, area);
}
// API policy is evaluated from current database membership on every request.
function apiAllowed(user, path, method, body = {}) {
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (path === "/api/account" || path === "/api/stats") return true;
  if (path === "/api/users") return manages(user);
  if (path === "/api/workspace")
    return manages(user) || Boolean(areas[user.workArea]);
  if (path === "/api/container-profile") {
    if (method === "PATCH") return canAccess(user, "PRE_STORAGE");
    return read ? canAccess(user, "SHIPPING") : manages(user);
  }
  if (path.startsWith("/api/container-profile/"))
    return read
      ? manages(user) || Boolean(areas[user.workArea])
      : user.role === "ADMINISTRATOR";
  if (path === "/api/shipping-informations/pending")
    return read
      ? canAccess(user, "PRE_STORAGE")
      : user.role === "ADMINISTRATOR";
  if (path.startsWith("/api/shipping-informations"))
    return canAccess(user, "SHIPPING");
  if (path === "/api/final-storage-setup/final-storage-transver-request") {
    if (read)
      return canAccess(user, "PRE_STORAGE") || canAccess(user, "FINAL_STORAGE");
    if (method === "POST") return canAccess(user, "FINAL_STORAGE");
    const area = {
      PRE_STORAGE_ACCEPT_REQUEST: "PRE_STORAGE",
      PRE_STORAGE_REJECT_REQUEST: "PRE_STORAGE",
      FINAL_STORAGE_ACCEPT_RESPONSE: "FINAL_STORAGE",
      FINAL_STORAGE_REJECT_RESPONSE: "FINAL_STORAGE",
    }[body.operationType];
    return Boolean(area) && canAccess(user, area);
  }
  const area = path.startsWith("/api/pre-storage-setup")
    ? "PRE_STORAGE"
    : path.startsWith("/api/final-storage-setup")
      ? "FINAL_STORAGE"
      : null;
  if (area) {
    const definitions = /-(location|employee)$/.test(path);
    return (
      canAccess(user, area) &&
      (read || !definitions || user.role === "ADMINISTRATOR")
    );
  }
  return user.role === "ADMINISTRATOR";
}
module.exports = { areas, manages, canAccess, pageAllowed, apiAllowed };
