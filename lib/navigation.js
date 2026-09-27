import { areas, manages, canAccess } from "./workspaces.cjs";

// One source for the sidebar, the mobile tab bar and the launcher. Hiding an item
// is only a convenience; every page and API request is still checked on the server.
// `tone` picks the item's colour, `badge` the area whose open work it counts.
export function navigationFor(user) {
  if (!user) return [];
  const manager = manages(user);
  const admin = user.role === "ADMINISTRATOR";
  const item = (key, href, icon, tone, extra = {}) => ({
    key,
    href,
    icon,
    tone,
    ...extra,
  });
  const operations = [
    canAccess(user, "SHIPPING") &&
      item("shipping", areas.SHIPPING.href, "truck", "step-1", {
        step: 1,
        scene: "arrival",
        badge: "SHIPPING",
      }),
    canAccess(user, "PRE_STORAGE") &&
      item("pre", areas.PRE_STORAGE.href, "warehouse", "step-2", {
        step: 2,
        scene: "preStorage",
        badge: "PRE_STORAGE",
      }),
    canAccess(user, "FINAL_STORAGE") &&
      item("final", areas.FINAL_STORAGE.href, "layers", "step-3", {
        step: 3,
        scene: "finalStorage",
        badge: "FINAL_STORAGE",
      }),
    (manager || areas[user.workArea]) &&
      item("scan", "/scan", "scan", "primary"),
  ].filter(Boolean);
  const administration = [
    admin &&
      item("definitions", "/container-profile", "sliders", "tone-orange"),
    admin && item("preSetup", "/pre-storage/setup", "settings", "tone-blue"),
    admin &&
      item("finalSetup", "/final-storage/setup", "settings", "tone-blue"),
    manager &&
      item(
        "reconciliation",
        "/storage-reconciliation",
        "clipboard",
        "tone-teal",
      ),
    manager && item("users", "/users", "users", "tone-magenta"),
  ].filter(Boolean);
  return [
    // Employees start on their area's page; only management has an overview.
    manager && { key: "home", items: [item("overview", "/", "grid", "primary")] },
    { key: "operations", items: operations },
    { key: "administration", items: administration },
    {
      key: "insights",
      items: [
        item("statistics", "/statistics", "chart", "step-2"),
        item("account", "/account", "user", "tone-slate", { secondary: true }),
      ],
    },
  ].filter((section) => section && section.items.length);
}

// The most specific item wins; condition alerts belong to their area's item.
export function activeItemKey(sections, path) {
  let best = null;
  for (const section of sections)
    for (const entry of section.items) {
      const match =
        entry.href === "/"
          ? path === "/"
          : path === entry.href || path.startsWith(entry.href + "/");
      if (match && (!best || entry.href.length > best.href.length))
        best = entry;
    }
  return best?.key;
}

export function roleKey(user) {
  if (manages(user)) return `role.${user.role}`;
  return areas[user?.workArea] ? "role.step" : "role.unassigned";
}
